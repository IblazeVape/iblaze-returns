# Multi-Tenancy Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the returns portal multi-tenant: any Shopify merchant who installs the app gets an isolated returns portal served on their own store domain via Shopify App Proxy, with per-shop tokens/config in Redis.

**Architecture:** A `tenant:{shop}` Redis record replaces the single global token. The app-install flow writes one per shop. A new App-Proxy route verifies Shopify's signed request (shop + logged-in customer) and renders the portal for that tenant. `lib/shopify.ts` and every API route become tenant-scoped (take a `shop`). iBlaze becomes tenant #1; the existing `/` keeps working during transition.

**Tech Stack:** Next.js 15 (App Router), Upstash Redis, Shopify Admin GraphQL/REST + Customer Account API + App Proxy, Node `crypto` (HMAC), TypeScript.

## Global Constraints

- Build alongside the existing `/` + OAuth (transition option "b") — do NOT remove the current customer OAuth or the `/` portal in this plan; keep tenant #1 (iBlaze) working throughout.
- Tenant store is Upstash Redis; a tenant is a hash keyed by shop domain. No relational DB.
- App Proxy is the customer path: trust Shopify's signed `shop` + `logged_in_customer_id`; never trust an unsigned `shop` param.
- Resolution must be a single swappable function (`resolveTenant`) so a custom-domain Host-header branch can be added later without touching callers.
- Every Shopify call is tenant-scoped: pass `shop`, look up `getTenantToken(shop)`, call `https://{shop}/admin/api/...`. No `process.env.SHOPIFY_STORE_URL` / `SHOPIFY_ACCESS_TOKEN` reads left in request paths (they remain only as tenant-#1 migration seed).
- Shopify API version stays `2025-04`.
- Verify with `npm run build` + `npx tsc --noEmit` green, and a Vercel preview; `/demo` remains a no-Shopify design check.
- Work on branch `feat/multitenancy-foundation`.

---

### Task 1: Tenant model in Redis

**Files:**
- Create: `lib/tenant.ts`
- Modify: `lib/redis.ts` (make `get/setShopifyToken` shims over tenant #1)
- Test: `lib/__tests__/tenant.test.ts`

**Interfaces:**
- Produces:
  - `type Tenant = { shop: string; accessToken: string; installedAt: string; scopes: string; plan: string; returnWindowDays: number; branding: { name: string; logoUrl: string; accentColor: string } }`
  - `getTenant(shop: string): Promise<Tenant | null>`
  - `setTenant(shop: string, patch: Partial<Tenant> & { accessToken?: string }): Promise<void>` (merges into existing record)
  - `getTenantToken(shop: string): Promise<string | null>`
  - `tenantExists(shop: string): Promise<boolean>`
  - `DEFAULT_TENANT_FIELDS` (plan `"free"`, `returnWindowDays` 30, default branding)

- [ ] **Step 1: Write failing tests for tenant helpers**

```ts
// lib/__tests__/tenant.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";

const store = new Map<string, unknown>();
vi.mock("@/lib/redis", () => ({
  redis: {
    hgetall: vi.fn(async (k: string) => store.get(k) ?? null),
    hset: vi.fn(async (k: string, v: Record<string, unknown>) => {
      store.set(k, { ...(store.get(k) as object ?? {}), ...v });
    }),
  },
}));

import { getTenant, setTenant, getTenantToken, tenantExists } from "@/lib/tenant";

beforeEach(() => store.clear());

describe("tenant store", () => {
  it("returns null for an unknown shop", async () => {
    expect(await getTenant("nope.myshopify.com")).toBeNull();
    expect(await tenantExists("nope.myshopify.com")).toBe(false);
  });

  it("writes and reads a tenant with defaults applied", async () => {
    await setTenant("a.myshopify.com", { accessToken: "tok_a", scopes: "read_orders" });
    const t = await getTenant("a.myshopify.com");
    expect(t?.shop).toBe("a.myshopify.com");
    expect(t?.accessToken).toBe("tok_a");
    expect(t?.plan).toBe("free");
    expect(t?.returnWindowDays).toBe(30);
    expect(await getTenantToken("a.myshopify.com")).toBe("tok_a");
    expect(await tenantExists("a.myshopify.com")).toBe(true);
  });

  it("isolates tenants", async () => {
    await setTenant("a.myshopify.com", { accessToken: "tok_a" });
    await setTenant("b.myshopify.com", { accessToken: "tok_b" });
    expect(await getTenantToken("a.myshopify.com")).toBe("tok_a");
    expect(await getTenantToken("b.myshopify.com")).toBe("tok_b");
  });
});
```

- [ ] **Step 2: Run the test, confirm it fails**

Run: `npx vitest run lib/__tests__/tenant.test.ts`
Expected: FAIL — `lib/tenant.ts` doesn't exist. (If vitest isn't installed, `npm i -D vitest` first and add `"test": "vitest"` to package.json scripts.)

- [ ] **Step 3: Implement `lib/tenant.ts`**

```ts
// lib/tenant.ts
import { redis } from "@/lib/redis";

export type Tenant = {
  shop: string;
  accessToken: string;
  installedAt: string;
  scopes: string;
  plan: string;
  returnWindowDays: number;
  branding: { name: string; logoUrl: string; accentColor: string };
};

export const DEFAULT_TENANT_FIELDS = {
  plan: "free",
  returnWindowDays: 30,
  branding: { name: "", logoUrl: "", accentColor: "#000000" },
};

const key = (shop: string) => `tenant:${shop}`;

export async function getTenant(shop: string): Promise<Tenant | null> {
  const raw = await redis.hgetall(key(shop));
  if (!raw || Object.keys(raw).length === 0) return null;
  const r = raw as Record<string, unknown>;
  return {
    shop,
    accessToken: String(r.accessToken ?? ""),
    installedAt: String(r.installedAt ?? ""),
    scopes: String(r.scopes ?? ""),
    plan: String(r.plan ?? DEFAULT_TENANT_FIELDS.plan),
    returnWindowDays: Number(r.returnWindowDays ?? DEFAULT_TENANT_FIELDS.returnWindowDays),
    branding:
      typeof r.branding === "string"
        ? JSON.parse(r.branding)
        : (r.branding as Tenant["branding"]) ?? DEFAULT_TENANT_FIELDS.branding,
  };
}

export async function setTenant(
  shop: string,
  patch: Partial<Tenant> & { accessToken?: string }
): Promise<void> {
  const existing = await getTenant(shop);
  const next = {
    ...DEFAULT_TENANT_FIELDS,
    ...(existing ?? {}),
    ...patch,
    shop,
  };
  await redis.hset(key(shop), {
    accessToken: next.accessToken ?? "",
    installedAt: next.installedAt ?? new Date().toISOString(),
    scopes: next.scopes ?? "",
    plan: next.plan,
    returnWindowDays: next.returnWindowDays,
    branding: JSON.stringify(next.branding),
  });
}

export async function getTenantToken(shop: string): Promise<string | null> {
  const t = await getTenant(shop);
  return t?.accessToken || null;
}

export async function tenantExists(shop: string): Promise<boolean> {
  return (await getTenant(shop)) !== null;
}
```

- [ ] **Step 4: Make `lib/redis.ts` shims delegate to tenant #1**

Replace the body of `getShopifyToken`/`setShopifyToken` so legacy callers keep working against the single iBlaze shop (`process.env.SHOPIFY_STORE_URL`), and re-export `redis`:

```ts
// lib/redis.ts
import { Redis } from "@upstash/redis";
export const redis = Redis.fromEnv();

// Legacy single-tenant shims — delegate to tenant #1 (iBlaze) during transition.
import { getTenantToken, setTenant } from "@/lib/tenant";

export async function getShopifyToken(): Promise<string | null> {
  const shop = process.env.SHOPIFY_STORE_URL;
  if (!shop) return await redis.get<string>("shopify_access_token");
  return await getTenantToken(shop);
}

export async function setShopifyToken(token: string): Promise<void> {
  const shop = process.env.SHOPIFY_STORE_URL;
  if (!shop) { await redis.set("shopify_access_token", token); return; }
  await setTenant(shop, { accessToken: token });
}
```

- [ ] **Step 5: Run tests + typecheck**

Run: `npx vitest run lib/__tests__/tenant.test.ts && npx tsc --noEmit`
Expected: tests PASS, tsc clean. (Note the `lib/redis.ts` ↔ `lib/tenant.ts` import cycle is safe — `tenant.ts` only uses the exported `redis` client, not the shims.)

- [ ] **Step 6: Commit**

```bash
git add lib/tenant.ts lib/redis.ts lib/__tests__/tenant.test.ts package.json
git commit -m "feat: per-shop tenant model in Redis with legacy shims"
```

---

### Task 2: App Proxy signature verification + tenant resolution

**Files:**
- Create: `lib/app-proxy.ts` (verify signature, extract shop + customer)
- Create: `lib/resolve-tenant.ts` (the single swappable resolution step)
- Test: `lib/__tests__/app-proxy.test.ts`

**Interfaces:**
- Consumes: `getTenant` (Task 1).
- Produces:
  - `verifyAppProxySignature(query: URLSearchParams, secret: string): boolean` — Shopify App Proxy uses a `signature` param = hex HMAC-SHA256 over the sorted `key=value` params (joined WITHOUT `&`, values with duplicate keys joined by `,`), keyed by the app's API secret.
  - `parseProxyRequest(query: URLSearchParams): { shop: string; loggedInCustomerId: string | null }`
  - `resolveTenant(req: Request): Promise<{ tenant: Tenant; loggedInCustomerId: string | null } | null>` — foundation impl: verify proxy signature → shop → `getTenant(shop)`. Returns null if unsigned/unknown.

- [ ] **Step 1: Write failing tests for signature verification**

```ts
// lib/__tests__/app-proxy.test.ts
import { describe, it, expect } from "vitest";
import crypto from "crypto";
import { verifyAppProxySignature, parseProxyRequest } from "@/lib/app-proxy";

const SECRET = "test_secret";

function sign(params: Record<string, string>): URLSearchParams {
  const sorted = Object.keys(params).sort().map((k) => `${k}=${params[k]}`).join("");
  const signature = crypto.createHmac("sha256", SECRET).update(sorted).digest("hex");
  return new URLSearchParams({ ...params, signature });
}

describe("app proxy signature", () => {
  it("accepts a correctly signed request", () => {
    const q = sign({ shop: "a.myshopify.com", logged_in_customer_id: "42", path_prefix: "/apps/returns" });
    expect(verifyAppProxySignature(q, SECRET)).toBe(true);
  });

  it("rejects a tampered request", () => {
    const q = sign({ shop: "a.myshopify.com", logged_in_customer_id: "42" });
    q.set("shop", "evil.myshopify.com");
    expect(verifyAppProxySignature(q, SECRET)).toBe(false);
  });

  it("rejects a request with no signature", () => {
    expect(verifyAppProxySignature(new URLSearchParams({ shop: "a.myshopify.com" }), SECRET)).toBe(false);
  });

  it("parses shop + customer id", () => {
    const q = sign({ shop: "a.myshopify.com", logged_in_customer_id: "42" });
    expect(parseProxyRequest(q)).toEqual({ shop: "a.myshopify.com", loggedInCustomerId: "42" });
  });

  it("returns null customer when logged out", () => {
    const q = sign({ shop: "a.myshopify.com", logged_in_customer_id: "" });
    expect(parseProxyRequest(q).loggedInCustomerId).toBeNull();
  });
});
```

- [ ] **Step 2: Run tests, confirm they fail**

Run: `npx vitest run lib/__tests__/app-proxy.test.ts`
Expected: FAIL — module missing.

- [ ] **Step 3: Implement `lib/app-proxy.ts`**

```ts
// lib/app-proxy.ts
import crypto from "crypto";

export function verifyAppProxySignature(query: URLSearchParams, secret: string): boolean {
  const signature = query.get("signature");
  if (!signature) return false;
  const params: Record<string, string[]> = {};
  query.forEach((value, key) => {
    if (key === "signature") return;
    (params[key] ??= []).push(value);
  });
  const message = Object.keys(params)
    .sort()
    .map((k) => `${k}=${params[k].join(",")}`)
    .join("");
  const expected = crypto.createHmac("sha256", secret).update(message).digest("hex");
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

export function parseProxyRequest(query: URLSearchParams): {
  shop: string;
  loggedInCustomerId: string | null;
} {
  const shop = query.get("shop") ?? "";
  const cid = query.get("logged_in_customer_id");
  return { shop, loggedInCustomerId: cid && cid.length > 0 ? cid : null };
}
```

- [ ] **Step 4: Implement `lib/resolve-tenant.ts`**

```ts
// lib/resolve-tenant.ts
import type { Tenant } from "@/lib/tenant";
import { getTenant } from "@/lib/tenant";
import { verifyAppProxySignature, parseProxyRequest } from "@/lib/app-proxy";

// Foundation: resolve via signed App Proxy request. A future custom-domain
// branch can resolve by Host header before this, without touching callers.
export async function resolveTenant(
  req: Request
): Promise<{ tenant: Tenant; loggedInCustomerId: string | null } | null> {
  const url = new URL(req.url);
  const secret = process.env.SHOPIFY_CLIENT_SECRET;
  if (!secret) return null;
  if (!verifyAppProxySignature(url.searchParams, secret)) return null;
  const { shop, loggedInCustomerId } = parseProxyRequest(url.searchParams);
  if (!shop) return null;
  const tenant = await getTenant(shop);
  if (!tenant) return null;
  return { tenant, loggedInCustomerId };
}
```

- [ ] **Step 5: Run tests + typecheck**

Run: `npx vitest run lib/__tests__/app-proxy.test.ts && npx tsc --noEmit`
Expected: PASS + clean.

- [ ] **Step 6: Commit**

```bash
git add lib/app-proxy.ts lib/resolve-tenant.ts lib/__tests__/app-proxy.test.ts
git commit -m "feat: App Proxy signature verification + swappable tenant resolution"
```

---

### Task 3: Per-shop install flow

**Files:**
- Modify: `app/api/shopify-callback/route.ts`

**Interfaces:**
- Consumes: `setTenant` (Task 1).
- Produces: after install, `tenant:{shop}` exists with that shop's token + scopes.

- [ ] **Step 1: Rewrite the install to be per-shop**

In `app/api/shopify-callback/route.ts`:
- Step-1 redirect (`!code || !shop`): build the install URL from the **incoming `shop`** param, not `process.env.SHOPIFY_STORE_URL`. If `shop` is missing here, return 400.
- After HMAC verify + token exchange, replace `setShopifyToken(token)` with:
```ts
import { setTenant } from "@/lib/tenant";
// ...after obtaining `accessToken` and the granted `scope` from Shopify's token response:
await setTenant(shop!, {
  accessToken,
  scopes: tokenJson.scope ?? "",
  installedAt: new Date().toISOString(),
});
```
(Keep the existing HMAC verification against `SHOPIFY_CLIENT_SECRET`.)

- [ ] **Step 2: Typecheck + build**

Run: `npx tsc --noEmit && npm run build`
Expected: clean/green.

- [ ] **Step 3: Commit**

```bash
git add app/api/shopify-callback/route.ts
git commit -m "feat: per-shop app install writes tenant record"
```

---

### Task 4: Tenant-scope the Shopify data layer

**Files:**
- Modify: `lib/shopify.ts` (add `shop` param, look up tenant token)
- Modify: `lib/customerAccount.ts` (add `shop` param)

**Interfaces:**
- Consumes: `getTenantToken` (Task 1).
- Produces:
  - `shopifyAdmin(shop: string, query: string, variables?, operationName?)`
  - `shopifyAdminRest(shop: string, path: string, params?)`
  - `getCustomerAccountEndpoint(shop: string)`

- [ ] **Step 1: Add `shop` as the first arg in `lib/shopify.ts`**

In both `shopifyAdmin` and `shopifyAdminRest`, add `shop: string` as the first parameter, delete the `const shop = process.env.SHOPIFY_STORE_URL!` line, and replace the token lookup with `const token = await getTenantToken(shop);` (import from `@/lib/tenant`; drop the `process.env.SHOPIFY_ACCESS_TOKEN` fallback). Throw `No token for {shop}` if null.

- [ ] **Step 2: Add `shop` to `getCustomerAccountEndpoint`**

Change signature to `getCustomerAccountEndpoint(shop: string)`, remove the env read and the module-level `cachedEndpoint` (or make the cache a `Map<shop, endpoint>` to stay per-tenant).

- [ ] **Step 3: Typecheck to surface all callers**

Run: `npx tsc --noEmit 2>&1 | grep -E 'shopifyAdmin|shopifyAdminRest|getCustomerAccountEndpoint' | head`
Expected: errors listing every call site — these are fixed in Task 5. Do not "fix" by passing `process.env.SHOPIFY_STORE_URL`; Task 5 threads the real per-request shop.

- [ ] **Step 4: Commit (WIP — callers fixed next task)**

```bash
git add lib/shopify.ts lib/customerAccount.ts
git commit -m "feat: tenant-scope lib/shopify + customerAccount (shop param)"
```

---

### Task 5: Thread `shop` through the API routes + App Proxy portal route

**Files:**
- Create: `app/api/portal/orders/route.ts` (or reuse existing routes) — proxy-verified order fetch
- Modify: `app/api/get-orders/route.ts`, `app/api/order-eligible/route.ts`, `app/api/calculate-return/route.ts`, `app/api/submit-return/route.ts`, `app/api/submit-claim/route.ts`
- Create: `app/apps/returns/[[...slug]]/page.tsx` (App-Proxy-served portal) OR a route matching the proxy subpath
- Modify: `shopify.app.toml` (add `[app_proxy]`)

**Interfaces:**
- Consumes: `resolveTenant` (Task 2), tenant-scoped `lib/shopify` (Task 4).
- Produces: customer requests arriving via App Proxy render the correct tenant's portal + data.

- [ ] **Step 1: Add App Proxy to `shopify.app.toml`**

```toml
[app_proxy]
url = "https://iblaze-returns.vercel.app/apps/returns"
subpath = "returns"
prefix = "apps"
```
Then `shopify app deploy` is run by the human at rollout (note it in the PR; do not run here).

- [ ] **Step 2: Refactor each API route to resolve the tenant, then call tenant-scoped libs**

For each of `get-orders`, `order-eligible`, `calculate-return`, `submit-return`, `submit-claim`: at the top of the handler, `const resolved = await resolveTenant(request); if (!resolved) return NextResponse.json({ error: "unauthorized" }, { status: 401 });` then use `resolved.tenant.shop` in every `shopifyAdmin(shop, ...)` / `shopifyAdminRest(shop, ...)` / `getCustomerAccountEndpoint(shop)` call, and `resolved.loggedInCustomerId` where the customer is needed. Remove `process.env.SHOPIFY_STORE_URL` / `SHOPIFY_ACCESS_TOKEN` / `getShopifyToken()` from the request path. `submit-claim`'s direct `process.env.SHOPIFY_ACCESS_TOKEN` becomes `resolved.tenant.accessToken`.

- [ ] **Step 3: Create the App-Proxy portal page**

`app/apps/returns/[[...slug]]/page.tsx`: read the signed request (via `headers()`/`searchParams`), `resolveTenant`; if null, render a "open this from your store" notice; else render `<DashboardClient />` seeded with the tenant's branding + `loggedInCustomerId`. (The existing `/` page + its OAuth stays untouched per the Global Constraints.)

- [ ] **Step 4: Build + typecheck**

Run: `npm run build && npx tsc --noEmit`
Expected: green/clean; route list shows `/apps/returns/...` plus the existing `/`, `/demo`, `/api/*`.

- [ ] **Step 5: Commit**

```bash
git add app shopify.app.toml
git commit -m "feat: App Proxy portal route + tenant-scoped API routes"
```

---

### Task 6: Seed iBlaze as tenant #1 + verify

**Files:**
- Create: `scripts/seed-tenant-one.ts` (one-off migration)
- Test: manual + preview

**Interfaces:**
- Consumes: `setTenant`.
- Produces: `tenant:{iblaze-shop}` populated from the existing global token so `/` keeps working and iBlaze is reachable via App Proxy.

- [ ] **Step 1: Write the seed script**

```ts
// scripts/seed-tenant-one.ts — run once with SHOPIFY_STORE_URL + the existing token in env
import { redis } from "@/lib/redis";
import { setTenant } from "@/lib/tenant";
async function main() {
  const shop = process.env.SHOPIFY_STORE_URL!;
  const legacy = (await redis.get<string>("shopify_access_token")) || process.env.SHOPIFY_ACCESS_TOKEN!;
  await setTenant(shop, { accessToken: legacy, scopes: "read_orders,write_returns,read_customers,read_fulfillments", installedAt: new Date().toISOString() });
  console.log("seeded tenant:", shop);
}
main();
```

- [ ] **Step 2: Run it against the real Redis (human, with prod env)**

Run: `npx tsx scripts/seed-tenant-one.ts` (or via `vercel env pull` then run). Confirm log prints the shop.

- [ ] **Step 3: Push branch → Vercel preview; verify**

```bash
git add scripts/seed-tenant-one.ts && git commit -m "chore: seed iBlaze as tenant #1"
git push -u origin feat/multitenancy-foundation
```
On the preview: (1) iBlaze portal at `/` still loads orders (tenant #1 shim path). (2) A second dev store installs the app → `tenant:{shop2}` is created → its App-Proxy portal (`shop2.myshopify.com/apps/returns`) shows shop2's orders, not iBlaze's. (3) Tenant isolation: a proxy request signed for shop2 never returns iBlaze data.

- [ ] **Step 4: STOP — human gate**

Get explicit approval on the preview (both tenants isolated, iBlaze unbroken) before merging to `main`. Retiring the old `/` OAuth is a separate later step, NOT part of this plan.

---

## Self-Review Notes

- **Spec coverage:** tenant model → Task 1; App Proxy verify + resolution → Task 2; per-shop install → Task 3; data-layer refactor → Tasks 4–5; App Proxy config/route → Task 5; iBlaze tenant #1 + verification → Task 6. Custom-domain future is explicitly out of scope (resolution left swappable in Task 2). Settings/Billing out of scope (defaults in Task 1).
- **TDD vs integration:** Tasks 1–2 are pure logic → real unit tests. Tasks 3–6 are integration/refactor → verified by `tsc`/`build`/preview + the two-tenant isolation check (no meaningful unit test for "route reads the right store").
- **Type consistency:** `shop` is the first arg on `shopifyAdmin`/`shopifyAdminRest`/`getCustomerAccountEndpoint`; `resolveTenant(req) → { tenant, loggedInCustomerId }` used uniformly.
- **Placeholders:** none — new modules have full code; refactor tasks specify exact edits + a verification gate.
