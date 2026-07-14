# Returns Management Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a "Returns" page to the embedded Shopify admin app that lists orders with active returns, filterable by status, deep-linking each row out to Shopify's native order page for the merchant to actually approve/decline.

**Architecture:** A new `/app/returns` route mirrors the existing `/app` (Settings) page's shell-plus-client-gate shape. Both pages render a shared `<s-app-nav>` component so Shopify shows "Settings" and "Returns" as sibling entries under the app's sidebar name. A new `GET /api/app/returns` route queries Shopify's `orders` GraphQL field with a `return_status:` search filter, using the same session-token verification and `shopifyAdmin()` helper the rest of the app already uses — no new scope, no new storage.

**Tech Stack:** Next.js App Router (route handlers), Shopify App Bridge web components (`s-page`, `s-app-nav`, `s-link`, `s-banner`, `s-spinner`), existing `lib/shopify.ts` GraphQL helper, Vitest for unit tests.

## Global Constraints

- No new Shopify OAuth scope — only order-level fields already covered by `read_orders`/`read_all_orders` (per spec: "No new Shopify OAuth scope required").
- No new backend storage or caching — every request is a live Shopify query (per spec: "No new backend storage — always a live snapshot from Shopify").
- No custom approve/decline UI — rows deep-link out to Shopify's native order page only (per spec Non-goals).
- Status filter values are exactly: `return_requested`, `in_progress`, `inspection_complete`, `returned`, `return_failed`, plus an "All" option that excludes `no_return` (per spec Data flow).
- `s-tabs`/`s-tab-list`/`s-tab`/`s-tab-panel` are confirmed broken in this app's embedded runtime — status filter UI must use manual state + `s-button` row, the same pattern already used in `components/app-settings/settings-form.tsx`'s tab bar. Do not use `s-tabs`.
- Auth for both the page bootstrap and the API call reuses the exact existing patterns: App Bridge `shopify.idToken()` → `Authorization: Bearer <token>` → `verifyMerchantSessionToken()` server-side. Do not invent a new auth mechanism.

---

## File Structure

- `lib/returns-management.ts` (new) — pure logic: status filter list/type, Shopify search-query builder, GraphQL response shaping. No I/O, fully unit-testable.
- `lib/__tests__/returns-management.test.ts` (new) — unit tests for the above.
- `app/api/app/returns/route.ts` (new) — `GET` handler: verifies the session token, calls `shopifyAdmin()` with the query built by `lib/returns-management.ts`, returns shaped JSON.
- `components/app-nav.tsx` (new) — shared `<AppNav />` component rendering `<s-app-nav>` with links to `/app` and `/app/returns`. Used by both the Settings and Returns pages so Shopify renders the two-item sidebar nav on either page.
- `components/app-settings/merchant-app-gate.tsx` (modify) — render `<AppNav />` in every state (loading/error/ready) so the nav appears on the Settings page too.
- `app/app/returns/page.tsx` (new) — thin server shell, identical shape to `app/app/page.tsx`.
- `components/app-returns-management/returns-management-gate.tsx` (new) — client auth bootstrap (App Bridge token exchange), mirrors `merchant-app-gate.tsx`'s bootstrap logic, renders `<AppNav />` + `<ReturnsList />` once ready.
- `components/app-returns-management/returns-list.tsx` (new) — status filter tabs, fetch, table, empty/error states, deep-link to Shopify's native order page.

---

### Task 1: Returns-management query logic (pure, unit-tested)

**Files:**
- Create: `lib/returns-management.ts`
- Test: `lib/__tests__/returns-management.test.ts`

**Interfaces:**
- Produces:
  - `RETURN_STATUS_FILTERS: readonly ["all", "return_requested", "in_progress", "inspection_complete", "returned", "return_failed"]`
  - `type ReturnStatusFilter = typeof RETURN_STATUS_FILTERS[number]`
  - `isReturnStatusFilter(value: unknown): value is ReturnStatusFilter`
  - `buildReturnStatusSearchQuery(status: ReturnStatusFilter): string`
  - `type ReturnManagementOrder = { id: string; numericId: string; name: string; customerName: string; returnStatus: string; createdAt: string }`
  - `shapeReturnsResponse(data: unknown): ReturnManagementOrder[]`

- [ ] **Step 1: Write the failing tests**

Create `lib/__tests__/returns-management.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import {
  RETURN_STATUS_FILTERS,
  isReturnStatusFilter,
  buildReturnStatusSearchQuery,
  shapeReturnsResponse,
} from "@/lib/returns-management";

describe("isReturnStatusFilter", () => {
  it("accepts every value in RETURN_STATUS_FILTERS", () => {
    for (const value of RETURN_STATUS_FILTERS) {
      expect(isReturnStatusFilter(value)).toBe(true);
    }
  });

  it("rejects unknown strings", () => {
    expect(isReturnStatusFilter("bogus")).toBe(false);
    expect(isReturnStatusFilter("no_return")).toBe(false);
  });

  it("rejects non-string values", () => {
    expect(isReturnStatusFilter(undefined)).toBe(false);
    expect(isReturnStatusFilter(42)).toBe(false);
    expect(isReturnStatusFilter(null)).toBe(false);
  });
});

describe("buildReturnStatusSearchQuery", () => {
  it("builds a return_status: filter for a specific status", () => {
    expect(buildReturnStatusSearchQuery("return_requested")).toBe("return_status:return_requested");
    expect(buildReturnStatusSearchQuery("in_progress")).toBe("return_status:in_progress");
    expect(buildReturnStatusSearchQuery("inspection_complete")).toBe("return_status:inspection_complete");
    expect(buildReturnStatusSearchQuery("returned")).toBe("return_status:returned");
    expect(buildReturnStatusSearchQuery("return_failed")).toBe("return_status:return_failed");
  });

  it("excludes no_return orders for the 'all' filter instead of matching a single status", () => {
    expect(buildReturnStatusSearchQuery("all")).toBe("-return_status:no_return");
  });
});

describe("shapeReturnsResponse", () => {
  it("maps GraphQL order edges into flat rows with numeric id extracted from the gid", () => {
    const data = {
      orders: {
        edges: [
          {
            node: {
              id: "gid://shopify/Order/123456789",
              name: "#1001",
              customer: { displayName: "Jane Doe" },
              returnStatus: "RETURN_REQUESTED",
              createdAt: "2026-07-01T12:00:00Z",
            },
          },
        ],
      },
    };
    expect(shapeReturnsResponse(data)).toEqual([
      {
        id: "gid://shopify/Order/123456789",
        numericId: "123456789",
        name: "#1001",
        customerName: "Jane Doe",
        returnStatus: "RETURN_REQUESTED",
        createdAt: "2026-07-01T12:00:00Z",
      },
    ]);
  });

  it("falls back to 'Guest' when the order has no customer", () => {
    const data = {
      orders: {
        edges: [
          {
            node: {
              id: "gid://shopify/Order/1",
              name: "#1002",
              customer: null,
              returnStatus: "IN_PROGRESS",
              createdAt: "2026-07-02T12:00:00Z",
            },
          },
        ],
      },
    };
    expect(shapeReturnsResponse(data)[0].customerName).toBe("Guest");
  });

  it("returns an empty array for malformed or missing data", () => {
    expect(shapeReturnsResponse(null)).toEqual([]);
    expect(shapeReturnsResponse({})).toEqual([]);
    expect(shapeReturnsResponse({ orders: {} })).toEqual([]);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run lib/__tests__/returns-management.test.ts`
Expected: FAIL — `Cannot find module '@/lib/returns-management'` (file doesn't exist yet).

- [ ] **Step 3: Write the implementation**

Create `lib/returns-management.ts`:

```ts
export const RETURN_STATUS_FILTERS = [
  "all",
  "return_requested",
  "in_progress",
  "inspection_complete",
  "returned",
  "return_failed",
] as const;

export type ReturnStatusFilter = (typeof RETURN_STATUS_FILTERS)[number];

export function isReturnStatusFilter(value: unknown): value is ReturnStatusFilter {
  return typeof value === "string" && (RETURN_STATUS_FILTERS as readonly string[]).includes(value);
}

/**
 * "all" isn't a real Shopify return_status value — it means "any order with
 * some return activity", which Shopify expresses as excluding no_return
 * rather than matching a single status.
 */
export function buildReturnStatusSearchQuery(status: ReturnStatusFilter): string {
  if (status === "all") return "-return_status:no_return";
  return `return_status:${status}`;
}

export type ReturnManagementOrder = {
  id: string;
  numericId: string;
  name: string;
  customerName: string;
  returnStatus: string;
  createdAt: string;
};

type OrdersQueryNode = {
  id: string;
  name: string;
  customer: { displayName: string } | null;
  returnStatus: string;
  createdAt: string;
};

export function shapeReturnsResponse(data: unknown): ReturnManagementOrder[] {
  const edges = (data as { orders?: { edges?: { node: OrdersQueryNode }[] } } | null)?.orders?.edges;
  if (!Array.isArray(edges)) return [];

  return edges.map(({ node }) => ({
    id: node.id,
    numericId: node.id.split("/").pop() ?? node.id,
    name: node.name,
    customerName: node.customer?.displayName ?? "Guest",
    returnStatus: node.returnStatus,
    createdAt: node.createdAt,
  }));
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run lib/__tests__/returns-management.test.ts`
Expected: PASS — 9 tests.

- [ ] **Step 5: Commit**

```bash
git add lib/returns-management.ts lib/__tests__/returns-management.test.ts
git commit -m "feat: add returns-management query filter and response shaping logic"
```

---

### Task 2: `GET /api/app/returns` route

**Files:**
- Create: `app/api/app/returns/route.ts`

**Interfaces:**
- Consumes: `verifyMerchantSessionToken(token: string): { shop: string; exp: number } | null` (from `lib/merchant-session-token.ts`), `shopifyAdmin(shop: string, query: string, variables?: Record<string, unknown>, operationName?: string): Promise<any>` (from `lib/shopify.ts`), `RETURN_STATUS_FILTERS`, `isReturnStatusFilter`, `buildReturnStatusSearchQuery`, `shapeReturnsResponse` (from Task 1's `lib/returns-management.ts`).
- Produces: `GET /api/app/returns?status=<ReturnStatusFilter>` → `200 { shop: string; orders: ReturnManagementOrder[] }` on success; `401 { error: "unauthorized" }` if the bearer token is missing/invalid; `400 { error: "invalid status" }` if `status` isn't a recognized filter; `500 { error: "failed to load returns" }` on a Shopify API failure.

- [ ] **Step 1: Write the route**

Create `app/api/app/returns/route.ts`:

```ts
import { NextRequest, NextResponse } from "next/server";
import { verifyMerchantSessionToken } from "@/lib/merchant-session-token";
import { shopifyAdmin } from "@/lib/shopify";
import {
  isReturnStatusFilter,
  buildReturnStatusSearchQuery,
  shapeReturnsResponse,
} from "@/lib/returns-management";

export const dynamic = "force-dynamic";

const RETURNS_QUERY = `
  query ReturnsManagementList($query: String!) {
    orders(first: 50, query: $query, sortKey: CREATED_AT, reverse: true) {
      edges {
        node {
          id
          name
          customer { displayName }
          returnStatus
          createdAt
        }
      }
    }
  }
`;

export async function GET(request: NextRequest) {
  const auth = request.headers.get("authorization") || "";
  const sessionToken = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  const claims = sessionToken ? verifyMerchantSessionToken(sessionToken) : null;
  if (!claims) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const statusParam = request.nextUrl.searchParams.get("status") ?? "all";
  if (!isReturnStatusFilter(statusParam)) {
    return NextResponse.json({ error: "invalid status" }, { status: 400 });
  }

  try {
    const data = await shopifyAdmin(
      claims.shop,
      RETURNS_QUERY,
      { query: buildReturnStatusSearchQuery(statusParam) },
      "ReturnsManagementList"
    );
    return NextResponse.json({ shop: claims.shop, orders: shapeReturnsResponse(data) });
  } catch (err) {
    console.error("returns-management query error:", err instanceof Error ? err.message : String(err));
    return NextResponse.json({ error: "failed to load returns" }, { status: 500 });
  }
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add app/api/app/returns/route.ts
git commit -m "feat: add GET /api/app/returns route for the Returns Management list"
```

---

### Task 3: Shared `<AppNav />` and wiring it into the existing Settings page

**Files:**
- Create: `components/app-nav.tsx`
- Modify: `components/app-settings/merchant-app-gate.tsx`

**Interfaces:**
- Produces: `AppNav(): JSX.Element` — a component with no props, rendering `<s-app-nav>` with links to `/app` and `/app/returns`.

- [ ] **Step 1: Create the shared nav component**

Create `components/app-nav.tsx`:

```tsx
// components/app-nav.tsx

/**
 * Registers the app's sidebar navigation in Shopify admin. `<s-app-nav>`
 * renders no visible UI of its own — it must be present in every page's DOM
 * (including loading/error states) for Shopify to keep showing "Settings"
 * and "Returns" as sibling entries under the app's name in the sidebar.
 */
export function AppNav() {
  return (
    <s-app-nav>
      <s-link href="/app">Settings</s-link>
      <s-link href="/app/returns">Returns</s-link>
    </s-app-nav>
  );
}
```

- [ ] **Step 2: Render it in every state of the Settings gate**

Read `components/app-settings/merchant-app-gate.tsx` (already loaded above — 3 return branches: `loading`, `error`, `ready`).

Add the import:

```tsx
import { AppNav } from "@/components/app-nav";
```

Wrap the `loading` branch:

```tsx
  if (state.status === "loading") {
    return (
      <>
        <AppNav />
        <s-page heading="Returns Settings">
          <s-box padding="large">
            <s-stack direction="block" alignItems="center">
              <s-spinner accessibilityLabel="Loading" />
            </s-stack>
          </s-box>
        </s-page>
      </>
    );
  }
```

Wrap the `error` branch:

```tsx
  if (state.status === "error") {
    return (
      <>
        <AppNav />
        <s-page heading="Returns Settings">
          <s-banner heading="Couldn't load settings" tone="critical">
            <s-paragraph>{state.message}</s-paragraph>
          </s-banner>
        </s-page>
      </>
    );
  }
```

Wrap the `ready` branch:

```tsx
  return (
    <>
      <AppNav />
      <SettingsForm initialBranding={state.branding} initialReturnWindowDays={state.returnWindowDays} />
    </>
  );
```

- [ ] **Step 3: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add components/app-nav.tsx components/app-settings/merchant-app-gate.tsx
git commit -m "feat: add shared AppNav sidebar nav, wire into Settings page"
```

---

### Task 4: Returns page shell + auth bootstrap

**Files:**
- Create: `app/app/returns/page.tsx`
- Create: `components/app-returns-management/returns-management-gate.tsx`

**Interfaces:**
- Consumes: `AppNav` (Task 3), `POST /api/app/token-exchange` (existing route, unchanged).
- Produces: `ReturnsManagementGate(): JSX.Element` — client component that performs the same App Bridge token-exchange bootstrap as `MerchantAppGate`, then renders `<AppNav />` + `<ReturnsList shop={shop} />` (the `ReturnsList` component is built in Task 5; this task can render a placeholder `<s-paragraph>Loading returns…</s-paragraph>` in its place until Task 5 lands, since each task must be independently testable — Task 5 replaces that placeholder with the real import).

- [ ] **Step 1: Create the page shell**

Create `app/app/returns/page.tsx`:

```tsx
import { ReturnsManagementGate } from "@/components/app-returns-management/returns-management-gate";

export const dynamic = "force-dynamic";

/**
 * Returns Management page — sibling to the Settings page (`/app`), reached
 * via the sidebar nav both pages register through <AppNav />. Auth happens
 * client-side (ReturnsManagementGate), same token-exchange flow as Settings.
 */
export default function ReturnsManagementEntry() {
  return (
    <div id="returns-management-root">
      <ReturnsManagementGate />
    </div>
  );
}
```

- [ ] **Step 2: Create the auth-bootstrap gate**

Create `components/app-returns-management/returns-management-gate.tsx`:

```tsx
// components/app-returns-management/returns-management-gate.tsx
"use client";

import { useEffect, useState } from "react";
import { AppNav } from "@/components/app-nav";

declare const shopify: {
  idToken: () => Promise<string>;
};

type GateState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; shop: string };

/**
 * Same App Bridge token-exchange bootstrap as MerchantAppGate
 * (components/app-settings/merchant-app-gate.tsx) — each embedded page gets
 * its own fresh JS context on load, so this can't assume Settings already
 * ran token-exchange first.
 */
export function ReturnsManagementGate() {
  const [state, setState] = useState<GateState>({ status: "loading" });

  useEffect(() => {
    let cancelled = false;

    async function bootstrap() {
      try {
        const deadline = Date.now() + 5000;
        while (typeof shopify === "undefined" && Date.now() < deadline) {
          await new Promise((r) => setTimeout(r, 50));
        }
        if (typeof shopify === "undefined") {
          throw new Error("Shopify App Bridge did not load.");
        }

        const token = await shopify.idToken();
        const res = await fetch("/api/app/token-exchange", {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok || !data.ok) {
          throw new Error(data.error || "Could not verify this app installation.");
        }
        if (!cancelled) {
          const payload = JSON.parse(atob(token.split(".")[1]));
          const shop = String(payload.dest || "").replace(/^https:\/\//, "");
          setState({ status: "ready", shop });
        }
      } catch (err) {
        if (!cancelled) {
          setState({ status: "error", message: err instanceof Error ? err.message : "Something went wrong." });
        }
      }
    }

    bootstrap();
    return () => { cancelled = true; };
  }, []);

  if (state.status === "loading") {
    return (
      <>
        <AppNav />
        <s-page heading="Returns">
          <s-box padding="large">
            <s-stack direction="block" alignItems="center">
              <s-spinner accessibilityLabel="Loading" />
            </s-stack>
          </s-box>
        </s-page>
      </>
    );
  }
  if (state.status === "error") {
    return (
      <>
        <AppNav />
        <s-page heading="Returns">
          <s-banner heading="Couldn't load returns" tone="critical">
            <s-paragraph>{state.message}</s-paragraph>
          </s-banner>
        </s-page>
      </>
    );
  }
  return (
    <>
      <AppNav />
      <s-page heading="Returns">
        <s-paragraph>Loading returns…</s-paragraph>
      </s-page>
    </>
  );
}
```

- [ ] **Step 3: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add app/app/returns/page.tsx components/app-returns-management/returns-management-gate.tsx
git commit -m "feat: add Returns Management page shell and auth bootstrap"
```

---

### Task 5: Returns list — status tabs, fetch, table, deep-link

**Files:**
- Create: `components/app-returns-management/returns-list.tsx`
- Modify: `components/app-returns-management/returns-management-gate.tsx`

**Interfaces:**
- Consumes: `GET /api/app/returns?status=<ReturnStatusFilter>` (Task 2), `RETURN_STATUS_FILTERS`, `ReturnStatusFilter`, `ReturnManagementOrder` (Task 1's `lib/returns-management.ts`).
- Produces: `ReturnsList({ shop }: { shop: string }): JSX.Element`.

- [ ] **Step 1: Create the list component**

Create `components/app-returns-management/returns-list.tsx`:

```tsx
// components/app-returns-management/returns-list.tsx
"use client";

import { useEffect, useState } from "react";
import { RETURN_STATUS_FILTERS, type ReturnStatusFilter, type ReturnManagementOrder } from "@/lib/returns-management";

declare const shopify: {
  idToken: () => Promise<string>;
};

const STATUS_LABELS: Record<ReturnStatusFilter, string> = {
  all: "All",
  return_requested: "Return requested",
  in_progress: "In progress",
  inspection_complete: "Inspection complete",
  returned: "Returned",
  return_failed: "Failed",
};

type FetchState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; orders: ReturnManagementOrder[] };

async function authedFetch(input: string, init: RequestInit = {}) {
  const token = await shopify.idToken();
  return fetch(input, { ...init, headers: { ...init.headers, Authorization: `Bearer ${token}` } });
}

export function ReturnsList({ shop }: { shop: string }) {
  const [activeStatus, setActiveStatus] = useState<ReturnStatusFilter>("all");
  const [state, setState] = useState<FetchState>({ status: "loading" });

  useEffect(() => {
    let cancelled = false;
    setState({ status: "loading" });

    authedFetch(`/api/app/returns?status=${activeStatus}`)
      .then(async (res) => {
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || "Couldn't load returns.");
        if (!cancelled) setState({ status: "ready", orders: data.orders });
      })
      .catch((err) => {
        if (!cancelled) setState({ status: "error", message: err instanceof Error ? err.message : "Something went wrong." });
      });

    return () => { cancelled = true; };
  }, [activeStatus]);

  function retry() {
    setActiveStatus((s) => s);
    setState({ status: "loading" });
    authedFetch(`/api/app/returns?status=${activeStatus}`)
      .then(async (res) => {
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || "Couldn't load returns.");
        setState({ status: "ready", orders: data.orders });
      })
      .catch((err) => setState({ status: "error", message: err instanceof Error ? err.message : "Something went wrong." }));
  }

  return (
    <s-page heading="Returns">
      <div className="flex items-center gap-2 flex-wrap mb-4">
        {RETURN_STATUS_FILTERS.map((value) => (
          <s-button
            key={value}
            variant={activeStatus === value ? "primary" : "secondary"}
            onClick={() => setActiveStatus(value)}
          >
            {STATUS_LABELS[value]}
          </s-button>
        ))}
      </div>

      {state.status === "loading" && (
        <s-box padding="large">
          <s-stack direction="block" alignItems="center">
            <s-spinner accessibilityLabel="Loading" />
          </s-stack>
        </s-box>
      )}

      {state.status === "error" && (
        <s-banner heading="Couldn't load returns" tone="critical">
          <s-paragraph>{state.message}</s-paragraph>
          <s-button onClick={retry}>Retry</s-button>
        </s-banner>
      )}

      {state.status === "ready" && state.orders.length === 0 && (
        <s-paragraph>No returns in this status.</s-paragraph>
      )}

      {state.status === "ready" && state.orders.length > 0 && (
        <div className="border border-border rounded-lg divide-y divide-border overflow-hidden">
          {state.orders.map((order) => (
            <a
              key={order.id}
              href={`https://${shop}/admin/orders/${order.numericId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between px-4 py-3 hover:bg-muted/40 transition-colors"
            >
              <div className="flex flex-col">
                <span className="font-medium">{order.name}</span>
                <span className="text-sm text-muted-foreground">{order.customerName}</span>
              </div>
              <span className="text-sm text-muted-foreground">{STATUS_LABELS_FOR_GRAPHQL_VALUE(order.returnStatus)}</span>
            </a>
          ))}
        </div>
      )}
    </s-page>
  );
}

/**
 * Shopify's GraphQL OrderReturnStatus enum comes back SCREAMING_SNAKE_CASE
 * (e.g. "RETURN_REQUESTED"); STATUS_LABELS above is keyed by the lowercase
 * search-filter values instead, so this maps the enum shape to the same
 * label set for display.
 */
function STATUS_LABELS_FOR_GRAPHQL_VALUE(value: string): string {
  const key = value.toLowerCase() as ReturnStatusFilter;
  return STATUS_LABELS[key] ?? value;
}
```

- [ ] **Step 2: Wire it into the gate, replacing the placeholder**

Modify `components/app-returns-management/returns-management-gate.tsx`:

Add the import:

```tsx
import { ReturnsList } from "@/components/app-returns-management/returns-list";
```

Replace the `ready` branch's placeholder body:

```tsx
  return (
    <>
      <AppNav />
      <ReturnsList shop={state.shop} />
    </>
  );
```

(Remove the now-unused `<s-page heading="Returns"><s-paragraph>Loading returns…</s-paragraph></s-page>` placeholder from Task 4 — `ReturnsList` renders its own `<s-page>`.)

- [ ] **Step 3: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Full verification build**

Run: `rm -rf .next && npm run build`
Expected: build succeeds.

- [ ] **Step 5: Commit**

```bash
git add components/app-returns-management/returns-list.tsx components/app-returns-management/returns-management-gate.tsx
git commit -m "feat: add Returns Management list with status filters and deep-link to Shopify admin"
```

- [ ] **Step 6: Manual live verification**

Deploy and open the embedded app in Shopify admin (same verification loop used throughout this session: push, confirm the Vercel deployment matches the new commit, then load the app).

Check:
1. Sidebar under the app's name now shows "Settings" and "Returns".
2. `/app/returns` loads, shows status filter buttons, and lists any real orders with active returns (or "No returns in this status" if none exist in the dev store).
3. Switching status filters re-fetches and updates the list.
4. Clicking a row opens `https://<shop>/admin/orders/<id>` in a new tab.
5. `/app` (Settings) still loads normally and now also shows the "Settings"/"Returns" sidebar nav.

---

## Self-Review Notes

- **Spec coverage:** order-level-only data (Task 1/2, no `read_returns` fields requested) ✅; live fetch, no storage (Task 2, no caching layer) ✅; status filter tabs (Task 5) ✅; deep-link to native order page (Task 5, `https://{shop}/admin/orders/{id}`) ✅; new route + `<s-app-nav>` (Tasks 3–4) ✅; error handling — reconnect-style banner + retry (Task 5), empty state (Task 5) ✅; testing — unit tests for pure logic only, manual verification for the rest (Task 1 tests, Task 5 Step 6) ✅.
- **Deep-link protocol deviation from initial draft:** Shopify's App Bridge web-component docs show `shopify://admin/orders/{id}` with `target="_top"` for in-admin navigation, but that replaces the merchant's current page rather than opening a new tab. Since the approved design explicitly calls for opening the order "in a new tab" (not losing the merchant's place in the Returns list), Task 5 instead builds a plain `https://{shop}/admin/orders/{id}` URL with `target="_blank"` — a normal HTTPS link the browser can open in a new tab, landing on the same Shopify admin order page. This is called out explicitly here since it's a judgment call, not a literal transcription of the Shopify doc example.
- **Placeholder scan:** none found.
- **Type consistency:** `ReturnStatusFilter` and `ReturnManagementOrder` are defined once in Task 1 and imported (not redefined) by Tasks 2 and 5.
