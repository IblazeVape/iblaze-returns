# Merchant Dashboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the embedded app's "Returns" page with a "Dashboard" page showing webhook-driven, Redis-stored return stats (return rate, return volume, refund value, top 5 return reasons, top 5 most-returned products) over a rolling 30-day window, plus the existing "Return requests" deep-link button.

**Architecture:** Three new Shopify webhooks (`orders/create`, `returns/request`, `refunds/create`) write into per-shop, per-UTC-day Redis counters/hashes with a 31-day TTL. A new `GET /api/app/dashboard` route pipelines the last 30 daily buckets per metric into one Redis round trip, sums/merges them, and returns the aggregated stats. The Dashboard page (client component, same App Bridge token-exchange auth pattern as the existing Settings/Returns pages) fetches this once on load.

**Tech Stack:** Next.js App Router route handlers, `@upstash/redis` (already in use via `lib/redis.ts`), Shopify Admin GraphQL API (`lib/shopify.ts`'s `shopifyAdmin()`), Shopify webhook HMAC verification (`lib/shopify-hmac.ts`'s `verifyWebhookHmac()`), Vitest.

## Global Constraints

- Stats cover a **rolling 30-day window**, recomputed from daily buckets on every read — no separate "rolling window" bookkeeping beyond reading the last 30 date-keys (per spec's Architecture section).
- Redis keys are namespaced `stats:{shop}:{metric}:{YYYY-MM-DD}` (UTC calendar day) and carry a **31-day TTL**, set on every write (per spec's Redis storage schema section).
- Only **`orders/create`**, **`returns/request`**, and **`refunds/create`** are subscribed — NOT `returns/approve`/`decline`/`cancel`/`close` (per spec's Architecture section: "would be dead weight").
- `return_reason` is stored as Shopify's **raw snake_case code** (e.g. `"wrong_item"`); humanizing happens only at UI render time (per spec's Webhook handlers section).
- Refund value is stored as an **integer count of minor currency units** (pence/cents) to avoid floating-point drift, converted to major units only when read (per spec's Webhook handlers and Read path sections).
- Product resolution (line item → product title) in the `returns/request` handler is a **non-critical enrichment step** — its failure must never prevent the handler from returning `200` or from committing the returns/reasons counters (per spec's Webhook handlers section).
- The route path stays `/app/returns` — **not renamed** to `/app/dashboard`. Only the page's rendered content and the sidebar nav label change (explicit scope decision, avoiding unrelated URL churn).
- No new Shopify OAuth scopes are needed: `orders/create` and `refunds/create` are covered by the existing `read_orders` scope; `returns/request` is covered by the existing `read_returns` scope (added earlier this session); the product-resolution query is covered by the existing `read_products` scope.
- Top-5 lists only (both reasons and products) — no pagination, no "view all" (per spec's UI section and the earlier brainstorm answer).

---

## File Structure

- `lib/dashboard-stats.ts` (new) — pure logic: date-key generation, Redis key builders, response shaping (sum/merge/top-N/unit conversion). No I/O — fully unit-testable.
- `lib/__tests__/dashboard-stats.test.ts` (new) — unit tests for the above.
- `app/api/webhooks/orders-create/route.ts` (new) — increments the daily orders counter.
- `app/api/webhooks/returns-request/route.ts` (new) — increments the daily returns counter + reasons hash, resolves and increments the products hash.
- `app/api/webhooks/refunds-create/route.ts` (new) — increments the daily refund-value counter.
- `app/api/app/dashboard/route.ts` (new) — `GET` route: reads and aggregates the last 30 days, returns `DashboardStats` + the existing native-Orders deep-link URL.
- `components/app-dashboard/dashboard-summary.tsx` (new) — stat cards + top-5 lists + "Return requests" card. Replaces `components/app-returns-management/returns-summary.tsx`.
- `components/app-dashboard/dashboard-gate.tsx` (new) — App Bridge auth bootstrap, same pattern as the existing gates. Replaces `components/app-returns-management/returns-management-gate.tsx`.
- `components/app-returns-management/returns-summary.tsx` (delete) — superseded by `dashboard-summary.tsx`.
- `components/app-returns-management/returns-management-gate.tsx` (delete) — superseded by `dashboard-gate.tsx`.
- `app/app/returns/page.tsx` (modify) — imports `DashboardGate` instead of `ReturnsManagementGate`.
- `components/app-nav.tsx` (modify) — sidebar label "Returns" → "Dashboard" (href unchanged).
- `shopify.app.toml` (modify) — three new `[[webhooks.subscriptions]]` blocks.

---

### Task 1: Dashboard stats pure logic

**Files:**
- Create: `lib/dashboard-stats.ts`
- Test: `lib/__tests__/dashboard-stats.test.ts`

**Interfaces:**
- Produces:
  - `DASHBOARD_STATS_TTL_SECONDS: number` (31 days in seconds)
  - `formatDateKey(date: Date): string` — `"YYYY-MM-DD"` in UTC
  - `last30DateKeys(now?: Date): string[]` — 30 date-key strings, oldest first, ending on `now`'s date
  - `ordersKey(shop: string, dateKey: string): string`
  - `returnsKey(shop: string, dateKey: string): string`
  - `refundValueKey(shop: string, dateKey: string): string`
  - `reasonsKey(shop: string, dateKey: string): string`
  - `productsKey(shop: string, dateKey: string): string`
  - `computeReturnRate(returns: number, orders: number): number` — `returns / orders`, `0` if `orders <= 0`
  - `sumCounts(values: (number | null)[]): number`
  - `mergeHashCounts(hashes: (Record<string, string> | null)[]): Record<string, number>`
  - `topN(counts: Record<string, number>, n: number): { key: string; count: number }[]` — sorted descending, truncated
  - `minorUnitsToMajor(minorUnits: number): number`
  - `majorUnitsToMinor(majorUnits: number): number`

- [ ] **Step 1: Write the failing tests**

Create `lib/__tests__/dashboard-stats.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import {
  DASHBOARD_STATS_TTL_SECONDS,
  formatDateKey,
  last30DateKeys,
  ordersKey,
  returnsKey,
  refundValueKey,
  reasonsKey,
  productsKey,
  computeReturnRate,
  sumCounts,
  mergeHashCounts,
  topN,
  minorUnitsToMajor,
  majorUnitsToMinor,
} from "@/lib/dashboard-stats";

describe("formatDateKey", () => {
  it("formats a date as YYYY-MM-DD in UTC", () => {
    expect(formatDateKey(new Date("2026-07-16T23:59:00Z"))).toBe("2026-07-16");
    expect(formatDateKey(new Date("2026-01-05T00:00:00Z"))).toBe("2026-01-05");
  });
});

describe("last30DateKeys", () => {
  it("returns exactly 30 date keys, oldest first, ending on the given date", () => {
    const keys = last30DateKeys(new Date("2026-07-16T12:00:00Z"));
    expect(keys).toHaveLength(30);
    expect(keys[0]).toBe("2026-06-17");
    expect(keys[29]).toBe("2026-07-16");
  });

  it("has no duplicate dates", () => {
    const keys = last30DateKeys(new Date("2026-07-16T12:00:00Z"));
    expect(new Set(keys).size).toBe(30);
  });
});

describe("redis key builders", () => {
  it("namespace every key by shop, metric, and date", () => {
    expect(ordersKey("shop1.myshopify.com", "2026-07-16")).toBe("stats:shop1.myshopify.com:orders:2026-07-16");
    expect(returnsKey("shop1.myshopify.com", "2026-07-16")).toBe("stats:shop1.myshopify.com:returns:2026-07-16");
    expect(refundValueKey("shop1.myshopify.com", "2026-07-16")).toBe("stats:shop1.myshopify.com:refundValue:2026-07-16");
    expect(reasonsKey("shop1.myshopify.com", "2026-07-16")).toBe("stats:shop1.myshopify.com:reasons:2026-07-16");
    expect(productsKey("shop1.myshopify.com", "2026-07-16")).toBe("stats:shop1.myshopify.com:products:2026-07-16");
  });
});

describe("computeReturnRate", () => {
  it("divides returns by orders", () => {
    expect(computeReturnRate(5, 100)).toBe(0.05);
    expect(computeReturnRate(0, 100)).toBe(0);
  });

  it("returns 0 instead of dividing by zero when there are no orders", () => {
    expect(computeReturnRate(5, 0)).toBe(0);
    expect(computeReturnRate(0, 0)).toBe(0);
  });
});

describe("sumCounts", () => {
  it("sums numeric values and treats null as 0", () => {
    expect(sumCounts([1, 2, null, 3])).toBe(6);
    expect(sumCounts([])).toBe(0);
    expect(sumCounts([null, null])).toBe(0);
  });
});

describe("mergeHashCounts", () => {
  it("sums matching fields across multiple hashes", () => {
    const merged = mergeHashCounts([
      { wrong_item: "2", damaged: "1" },
      { wrong_item: "3" },
      null,
    ]);
    expect(merged).toEqual({ wrong_item: 5, damaged: 1 });
  });

  it("returns an empty object when every hash is null", () => {
    expect(mergeHashCounts([null, null])).toEqual({});
  });

  it("ignores non-numeric field values", () => {
    expect(mergeHashCounts([{ a: "not-a-number" }])).toEqual({});
  });
});

describe("topN", () => {
  it("sorts descending by count and truncates to n", () => {
    const result = topN({ a: 1, b: 5, c: 3, d: 4, e: 2 }, 3);
    expect(result).toEqual([
      { key: "b", count: 5 },
      { key: "d", count: 4 },
      { key: "c", count: 3 },
    ]);
  });

  it("returns everything when there are fewer entries than n", () => {
    expect(topN({ a: 1 }, 5)).toEqual([{ key: "a", count: 1 }]);
  });

  it("returns an empty array for an empty input", () => {
    expect(topN({}, 5)).toEqual([]);
  });
});

describe("minorUnitsToMajor / majorUnitsToMinor", () => {
  it("converts minor units (pence) to major units (pounds) with 2dp precision", () => {
    expect(minorUnitsToMajor(12345)).toBe(123.45);
    expect(minorUnitsToMajor(0)).toBe(0);
  });

  it("converts major units to minor units, rounding to avoid float drift", () => {
    expect(majorUnitsToMinor(89.99)).toBe(8999);
    expect(majorUnitsToMinor(0.1 + 0.2)).toBe(30);
  });
});

describe("DASHBOARD_STATS_TTL_SECONDS", () => {
  it("is 31 days in seconds", () => {
    expect(DASHBOARD_STATS_TTL_SECONDS).toBe(31 * 24 * 60 * 60);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run lib/__tests__/dashboard-stats.test.ts`
Expected: FAIL — `Cannot find module '@/lib/dashboard-stats'`.

- [ ] **Step 3: Write the implementation**

Create `lib/dashboard-stats.ts`:

```ts
export const DASHBOARD_STATS_TTL_SECONDS = 31 * 24 * 60 * 60;

export function formatDateKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/** 30 date keys, oldest first, ending on `now`'s UTC calendar date. */
export function last30DateKeys(now: Date = new Date()): string[] {
  const keys: string[] = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
    keys.push(formatDateKey(d));
  }
  return keys;
}

export function ordersKey(shop: string, dateKey: string): string {
  return `stats:${shop}:orders:${dateKey}`;
}
export function returnsKey(shop: string, dateKey: string): string {
  return `stats:${shop}:returns:${dateKey}`;
}
export function refundValueKey(shop: string, dateKey: string): string {
  return `stats:${shop}:refundValue:${dateKey}`;
}
export function reasonsKey(shop: string, dateKey: string): string {
  return `stats:${shop}:reasons:${dateKey}`;
}
export function productsKey(shop: string, dateKey: string): string {
  return `stats:${shop}:products:${dateKey}`;
}

export function computeReturnRate(returns: number, orders: number): number {
  if (orders <= 0) return 0;
  return returns / orders;
}

export function sumCounts(values: (number | null)[]): number {
  return values.reduce<number>((sum, v) => sum + (typeof v === "number" ? v : 0), 0);
}

export function mergeHashCounts(hashes: (Record<string, string> | null)[]): Record<string, number> {
  const merged: Record<string, number> = {};
  for (const hash of hashes) {
    if (!hash) continue;
    for (const [field, value] of Object.entries(hash)) {
      const n = Number(value);
      if (!Number.isFinite(n)) continue;
      merged[field] = (merged[field] ?? 0) + n;
    }
  }
  return merged;
}

export function topN(counts: Record<string, number>, n: number): { key: string; count: number }[] {
  return Object.entries(counts)
    .map(([key, count]) => ({ key, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, n);
}

export function minorUnitsToMajor(minorUnits: number): number {
  return Math.round(minorUnits) / 100;
}

export function majorUnitsToMinor(majorUnits: number): number {
  return Math.round(majorUnits * 100);
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run lib/__tests__/dashboard-stats.test.ts`
Expected: PASS — 15 tests.

- [ ] **Step 5: Commit**

```bash
git add lib/dashboard-stats.ts lib/__tests__/dashboard-stats.test.ts
git commit -m "feat: add dashboard stats date/key helpers and aggregation logic"
```

---

### Task 2: Webhook handler — orders/create

**Files:**
- Create: `app/api/webhooks/orders-create/route.ts`
- Modify: `shopify.app.toml`

**Interfaces:**
- Consumes: `verifyWebhookHmac(rawBody: string, hmacHeader: string | null, secret: string): boolean` (from `lib/shopify-hmac.ts`), `redis` (from `lib/redis.ts`, an `@upstash/redis` `Redis` instance with `.incr(key)` and `.expire(key, seconds)`), `formatDateKey`, `ordersKey`, `DASHBOARD_STATS_TTL_SECONDS` (from Task 1's `lib/dashboard-stats.ts`).

- [ ] **Step 1: Write the route**

Create `app/api/webhooks/orders-create/route.ts`:

```ts
import { NextRequest, NextResponse } from "next/server";
import { verifyWebhookHmac } from "@/lib/shopify-hmac";
import { redis } from "@/lib/redis";
import { formatDateKey, ordersKey, DASHBOARD_STATS_TTL_SECONDS } from "@/lib/dashboard-stats";

export const dynamic = "force-dynamic";

/**
 * orders/create webhook. Feeds the Dashboard's return-rate denominator
 * (return rate = returns ÷ total orders over the last 30 days). Follows the
 * same HMAC-verification pattern as app/api/webhooks/app-uninstalled/route.ts.
 */
export async function POST(request: NextRequest) {
  const rawBody = await request.text();
  const secret = process.env.SHOPIFY_CLIENT_SECRET!;
  const hmac = request.headers.get("x-shopify-hmac-sha256");

  if (!verifyWebhookHmac(rawBody, hmac, secret)) {
    return NextResponse.json({ error: "invalid hmac" }, { status: 401 });
  }

  const shop = request.headers.get("x-shopify-shop-domain") || "";
  if (!shop) return NextResponse.json({ error: "no shop" }, { status: 400 });

  const key = ordersKey(shop, formatDateKey(new Date()));
  await redis.incr(key);
  await redis.expire(key, DASHBOARD_STATS_TTL_SECONDS);

  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 2: Add the webhook subscription**

In `shopify.app.toml`, add a new `[[webhooks.subscriptions]]` block after the existing `app/uninstalled` one:

```toml
  [[webhooks.subscriptions]]
  topics = [ "orders/create" ]
  uri = "https://iblaze-returns.vercel.app/api/webhooks/orders-create"
```

- [ ] **Step 3: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add app/api/webhooks/orders-create/route.ts shopify.app.toml
git commit -m "feat: add orders/create webhook handler for dashboard order counts"
```

---

### Task 3: Webhook handler — returns/request

**Files:**
- Create: `app/api/webhooks/returns-request/route.ts`
- Modify: `shopify.app.toml`

**Interfaces:**
- Consumes: `verifyWebhookHmac` (from `lib/shopify-hmac.ts`), `shopifyAdmin(shop: string, query: string, variables?: Record<string, unknown>, operationName?: string): Promise<any>` (from `lib/shopify.ts`), `redis` (`.incr`, `.expire`, `.hincrby(key, field, increment)`), `formatDateKey`, `returnsKey`, `reasonsKey`, `productsKey`, `DASHBOARD_STATS_TTL_SECONDS` (from Task 1's `lib/dashboard-stats.ts`).

The `returns/request` webhook payload (confirmed against Shopify's own documented example) has this shape:

```json
{
  "id": 1,
  "admin_graphql_api_id": "gid://shopify/Return/1",
  "status": "requested",
  "order": { "id": 1, "admin_graphql_api_id": "gid://shopify/Order/1" },
  "total_return_line_items": 1,
  "return_line_items": [
    {
      "id": 1,
      "admin_graphql_api_id": "gid://shopify/ReturnLineItem/1",
      "fulfillment_line_item": {
        "id": 1,
        "admin_graphql_api_id": "gid://shopify/FulfillmentLineItem/1",
        "line_item": { "id": 1, "admin_graphql_api_id": "gid://shopify/LineItem/1" }
      },
      "quantity": 2,
      "return_reason": "wrong_item",
      "return_reason_note": "",
      "customer_note": "..."
    }
  ]
}
```

`return_reason` is already the raw reason code (no extra call needed). Product titles are NOT in the payload — they're resolved via a single batched GraphQL `nodes(ids: ...)` query against the line items' `admin_graphql_api_id` values (validated against Shopify's live schema; requires only `read_orders` + `read_products`, both already granted).

- [ ] **Step 1: Write the route**

Create `app/api/webhooks/returns-request/route.ts`:

```ts
import { NextRequest, NextResponse } from "next/server";
import { verifyWebhookHmac } from "@/lib/shopify-hmac";
import { shopifyAdmin } from "@/lib/shopify";
import { redis } from "@/lib/redis";
import {
  formatDateKey,
  returnsKey,
  reasonsKey,
  productsKey,
  DASHBOARD_STATS_TTL_SECONDS,
} from "@/lib/dashboard-stats";

export const dynamic = "force-dynamic";

type ReturnLineItemPayload = {
  quantity: number;
  return_reason: string;
  fulfillment_line_item?: { line_item?: { admin_graphql_api_id?: string } };
};

const LINE_ITEM_PRODUCT_QUERY = `
  query DashboardStatsLineItemProducts($ids: [ID!]!) {
    nodes(ids: $ids) {
      ... on LineItem {
        id
        product { title }
      }
    }
  }
`;

/**
 * returns/request webhook. Feeds the Dashboard's return-volume counter, the
 * top-return-reasons hash (return_reason comes inline in the payload — no
 * extra call needed), and the most-returned-products hash (product titles
 * are NOT in the payload, resolved via one batched GraphQL call per event).
 * Product resolution is a non-critical enrichment step: if it fails, the
 * returns/reasons counters still commit and the handler still returns 200 —
 * a webhook must be ack'd quickly, and Shopify will retry-storm an endpoint
 * that keeps failing.
 */
export async function POST(request: NextRequest) {
  const rawBody = await request.text();
  const secret = process.env.SHOPIFY_CLIENT_SECRET!;
  const hmac = request.headers.get("x-shopify-hmac-sha256");

  if (!verifyWebhookHmac(rawBody, hmac, secret)) {
    return NextResponse.json({ error: "invalid hmac" }, { status: 401 });
  }

  const shop = request.headers.get("x-shopify-shop-domain") || "";
  if (!shop) return NextResponse.json({ error: "no shop" }, { status: 400 });

  let payload: { return_line_items?: ReturnLineItemPayload[] };
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }

  const lineItems = Array.isArray(payload.return_line_items) ? payload.return_line_items : [];
  const dateKey = formatDateKey(new Date());

  const rvKey = returnsKey(shop, dateKey);
  await redis.incr(rvKey);
  await redis.expire(rvKey, DASHBOARD_STATS_TTL_SECONDS);

  if (lineItems.length > 0) {
    const rKey = reasonsKey(shop, dateKey);
    for (const item of lineItems) {
      if (item.return_reason) {
        await redis.hincrby(rKey, item.return_reason, item.quantity ?? 1);
      }
    }
    await redis.expire(rKey, DASHBOARD_STATS_TTL_SECONDS);
  }

  try {
    const lineItemIds = lineItems
      .map((item) => item.fulfillment_line_item?.line_item?.admin_graphql_api_id)
      .filter((id): id is string => Boolean(id));

    if (lineItemIds.length > 0) {
      const data = await shopifyAdmin(
        shop,
        LINE_ITEM_PRODUCT_QUERY,
        { ids: lineItemIds },
        "DashboardStatsLineItemProducts"
      );
      const nodes = (data?.nodes ?? []) as ({ id: string; product: { title: string } | null } | null)[];
      const titleByLineItemId = new Map(nodes.filter((n): n is NonNullable<typeof n> => n !== null).map((n) => [n.id, n.product?.title]));

      const pKey = productsKey(shop, dateKey);
      let wroteAny = false;
      for (const item of lineItems) {
        const lineItemId = item.fulfillment_line_item?.line_item?.admin_graphql_api_id;
        const title = lineItemId ? titleByLineItemId.get(lineItemId) : undefined;
        if (title) {
          await redis.hincrby(pKey, title, item.quantity ?? 1);
          wroteAny = true;
        }
      }
      if (wroteAny) await redis.expire(pKey, DASHBOARD_STATS_TTL_SECONDS);
    }
  } catch (err) {
    console.error(
      "dashboard-stats returns/request product resolution error:",
      err instanceof Error ? err.message : String(err)
    );
  }

  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 2: Add the webhook subscription**

In `shopify.app.toml`, add:

```toml
  [[webhooks.subscriptions]]
  topics = [ "returns/request" ]
  uri = "https://iblaze-returns.vercel.app/api/webhooks/returns-request"
```

- [ ] **Step 3: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add app/api/webhooks/returns-request/route.ts shopify.app.toml
git commit -m "feat: add returns/request webhook handler for return volume, reasons, and products"
```

---

### Task 4: Webhook handler — refunds/create

**Files:**
- Create: `app/api/webhooks/refunds-create/route.ts`
- Modify: `shopify.app.toml`

**Interfaces:**
- Consumes: `verifyWebhookHmac` (from `lib/shopify-hmac.ts`), `redis` (`.incrby(key, increment)`, `.expire`), `formatDateKey`, `refundValueKey`, `majorUnitsToMinor`, `DASHBOARD_STATS_TTL_SECONDS` (from Task 1's `lib/dashboard-stats.ts`).

The `refunds/create` webhook payload (confirmed against Shopify's own documented example) includes `refund_line_items[]`, each with plain-number `subtotal` and `total_tax` fields (major units, e.g. pounds):

```json
{
  "id": 890088186047892319,
  "order_id": 820982911946154508,
  "refund_line_items": [
    { "id": 487817672276298627, "quantity": 1, "line_item_id": 487817672276298554, "subtotal": 89.99, "total_tax": 0.0 }
  ]
}
```

- [ ] **Step 1: Write the route**

Create `app/api/webhooks/refunds-create/route.ts`:

```ts
import { NextRequest, NextResponse } from "next/server";
import { verifyWebhookHmac } from "@/lib/shopify-hmac";
import { redis } from "@/lib/redis";
import { formatDateKey, refundValueKey, majorUnitsToMinor, DASHBOARD_STATS_TTL_SECONDS } from "@/lib/dashboard-stats";

export const dynamic = "force-dynamic";

type RefundLineItemPayload = { subtotal?: number; total_tax?: number };

/**
 * refunds/create webhook. Feeds the Dashboard's refund-value counter. Sums
 * subtotal + total_tax across every refund_line_item, converts to minor
 * currency units (pence) before storing to avoid floating-point drift when
 * many small refunds accumulate over 30 days.
 */
export async function POST(request: NextRequest) {
  const rawBody = await request.text();
  const secret = process.env.SHOPIFY_CLIENT_SECRET!;
  const hmac = request.headers.get("x-shopify-hmac-sha256");

  if (!verifyWebhookHmac(rawBody, hmac, secret)) {
    return NextResponse.json({ error: "invalid hmac" }, { status: 401 });
  }

  const shop = request.headers.get("x-shopify-shop-domain") || "";
  if (!shop) return NextResponse.json({ error: "no shop" }, { status: 400 });

  let payload: { refund_line_items?: RefundLineItemPayload[] };
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }

  const lineItems = Array.isArray(payload.refund_line_items) ? payload.refund_line_items : [];
  const totalMajorUnits = lineItems.reduce((sum, item) => sum + (item.subtotal ?? 0) + (item.total_tax ?? 0), 0);
  const totalMinorUnits = majorUnitsToMinor(totalMajorUnits);

  if (totalMinorUnits > 0) {
    const key = refundValueKey(shop, formatDateKey(new Date()));
    await redis.incrby(key, totalMinorUnits);
    await redis.expire(key, DASHBOARD_STATS_TTL_SECONDS);
  }

  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 2: Add the webhook subscription**

In `shopify.app.toml`, add:

```toml
  [[webhooks.subscriptions]]
  topics = [ "refunds/create" ]
  uri = "https://iblaze-returns.vercel.app/api/webhooks/refunds-create"
```

- [ ] **Step 3: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add app/api/webhooks/refunds-create/route.ts shopify.app.toml
git commit -m "feat: add refunds/create webhook handler for dashboard refund value"
```

---

### Task 5: Dashboard read API

**Files:**
- Create: `app/api/app/dashboard/route.ts`

**Interfaces:**
- Consumes: `verifyMerchantSessionToken(token: string): { shop: string; exp: number } | null` (from `lib/merchant-session-token.ts`), `redis` (`.pipeline()`, whose queued `.get`/`.hgetall` calls resolve via `.exec()`), `buildNativeReturnsUrl(shop: string): string` (from `lib/returns-management.ts`), `last30DateKeys`, `ordersKey`, `returnsKey`, `refundValueKey`, `reasonsKey`, `productsKey`, `computeReturnRate`, `sumCounts`, `mergeHashCounts`, `topN`, `minorUnitsToMajor` (from Task 1's `lib/dashboard-stats.ts`).
- Produces: `GET /api/app/dashboard` → `200 { returnRate: number; returnVolume: number; refundValue: number; topReasons: {reason: string; count: number}[]; topProducts: {title: string; count: number}[]; nativeReturnsUrl: string }` on success; `401 { error: "unauthorized" }` on a missing/invalid bearer token; `500 { error: "failed to load dashboard stats" }` on a Redis failure.

- [ ] **Step 1: Write the route**

Create `app/api/app/dashboard/route.ts`:

```ts
import { NextRequest, NextResponse } from "next/server";
import { verifyMerchantSessionToken } from "@/lib/merchant-session-token";
import { redis } from "@/lib/redis";
import { buildNativeReturnsUrl } from "@/lib/returns-management";
import {
  last30DateKeys,
  ordersKey,
  returnsKey,
  refundValueKey,
  reasonsKey,
  productsKey,
  computeReturnRate,
  sumCounts,
  mergeHashCounts,
  topN,
  minorUnitsToMajor,
} from "@/lib/dashboard-stats";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const auth = request.headers.get("authorization") || "";
  const sessionToken = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  const claims = sessionToken ? verifyMerchantSessionToken(sessionToken) : null;
  if (!claims) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const shop = claims.shop;
  const dateKeys = last30DateKeys();
  const n = dateKeys.length;

  try {
    const pipeline = redis.pipeline();
    for (const dateKey of dateKeys) pipeline.get(ordersKey(shop, dateKey));
    for (const dateKey of dateKeys) pipeline.get(returnsKey(shop, dateKey));
    for (const dateKey of dateKeys) pipeline.get(refundValueKey(shop, dateKey));
    for (const dateKey of dateKeys) pipeline.hgetall(reasonsKey(shop, dateKey));
    for (const dateKey of dateKeys) pipeline.hgetall(productsKey(shop, dateKey));

    const results = (await pipeline.exec()) as unknown[];
    const orderCounts = results.slice(0, n) as (number | null)[];
    const returnCounts = results.slice(n, 2 * n) as (number | null)[];
    const refundValues = results.slice(2 * n, 3 * n) as (number | null)[];
    const reasonHashes = results.slice(3 * n, 4 * n) as (Record<string, string> | null)[];
    const productHashes = results.slice(4 * n, 5 * n) as (Record<string, string> | null)[];

    const orders = sumCounts(orderCounts);
    const returns = sumCounts(returnCounts);
    const refundValueMinor = sumCounts(refundValues);
    const mergedReasons = mergeHashCounts(reasonHashes);
    const mergedProducts = mergeHashCounts(productHashes);

    return NextResponse.json({
      returnRate: computeReturnRate(returns, orders),
      returnVolume: returns,
      refundValue: minorUnitsToMajor(refundValueMinor),
      topReasons: topN(mergedReasons, 5).map(({ key, count }) => ({ reason: key, count })),
      topProducts: topN(mergedProducts, 5).map(({ key, count }) => ({ title: key, count })),
      nativeReturnsUrl: buildNativeReturnsUrl(shop),
    });
  } catch (err) {
    console.error("dashboard stats read error:", err instanceof Error ? err.message : String(err));
    return NextResponse.json({ error: "failed to load dashboard stats" }, { status: 500 });
  }
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors. **Known risk to watch for**: this is the first use of `redis.pipeline()` in this codebase (every other Redis call site uses single commands). If `@upstash/redis`'s `Pipeline` type doesn't expose `.get`/`.hgetall`/`.exec` with exactly this shape, `tsc` will surface a type error here — if so, check `node_modules/@upstash/redis/**/*.d.ts` for the actual `Pipeline` class signature and adjust the calls to match (the aggregation logic in Task 1 doesn't change, only how results are fetched).

- [ ] **Step 3: Commit**

```bash
git add app/api/app/dashboard/route.ts
git commit -m "feat: add GET /api/app/dashboard route aggregating 30-day return stats"
```

---

### Task 6: Dashboard UI

**Files:**
- Create: `components/app-dashboard/dashboard-summary.tsx`
- Create: `components/app-dashboard/dashboard-gate.tsx`
- Delete: `components/app-returns-management/returns-summary.tsx`
- Delete: `components/app-returns-management/returns-management-gate.tsx`
- Modify: `app/app/returns/page.tsx`
- Modify: `components/app-nav.tsx`

**Interfaces:**
- Consumes: `GET /api/app/dashboard` (Task 5), `AppNav` (from `components/app-nav.tsx`, unchanged export), `MorphingInfinity` (from `components/loading-ui/morphing-infinity.tsx`, unchanged export).
- Produces: `DashboardSummary(): JSX.Element` (no props), `DashboardGate(): JSX.Element` (no props).

- [ ] **Step 1: Create the Dashboard summary component**

Create `components/app-dashboard/dashboard-summary.tsx`:

```tsx
// components/app-dashboard/dashboard-summary.tsx
"use client";

import { useEffect, useState } from "react";
import { MorphingInfinity } from "@/components/loading-ui/morphing-infinity";

declare const shopify: {
  idToken: () => Promise<string>;
};

type DashboardStats = {
  returnRate: number;
  returnVolume: number;
  refundValue: number;
  topReasons: { reason: string; count: number }[];
  topProducts: { title: string; count: number }[];
  nativeReturnsUrl: string;
};

type FetchState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; stats: DashboardStats };

async function authedFetch(input: string, init: RequestInit = {}) {
  const token = await shopify.idToken();
  return fetch(input, { ...init, headers: { ...init.headers, Authorization: `Bearer ${token}` } });
}

/** "wrong_item" -> "Wrong item". Reason codes are stored raw (stable Redis keys); humanized only here, at render time. */
function humanizeReason(reason: string): string {
  const words = reason.toLowerCase().split("_");
  return words[0].charAt(0).toUpperCase() + words[0].slice(1) + (words.length > 1 ? " " + words.slice(1).join(" ") : "");
}

export function DashboardSummary() {
  const [state, setState] = useState<FetchState>({ status: "loading" });

  useEffect(() => {
    let cancelled = false;
    authedFetch("/api/app/dashboard")
      .then(async (res) => {
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || "Couldn't load dashboard stats.");
        if (!cancelled) setState({ status: "ready", stats: data });
      })
      .catch((err) => {
        if (!cancelled) setState({ status: "error", message: err instanceof Error ? err.message : "Something went wrong." });
      });
    return () => { cancelled = true; };
  }, []);

  return (
    <s-page heading="Dashboard" inlineSize="large">
      {state.status === "loading" && (
        <s-box padding="large">
          <s-stack direction="block" alignItems="center">
            <MorphingInfinity className="size-8 text-muted-foreground" />
          </s-stack>
        </s-box>
      )}

      {state.status === "error" && (
        <s-banner heading="Couldn't load dashboard" tone="critical">
          <s-paragraph>{state.message}</s-paragraph>
        </s-banner>
      )}

      {state.status === "ready" && (
        <s-stack direction="block" gap="base">
          <s-stack direction="inline" gap="base" wrap>
            <s-box padding="base" border="base" borderRadius="base" minInlineSize="180px">
              <s-stack direction="block" gap="small-300">
                <s-text color="subdued">Return rate (30 days)</s-text>
                <s-heading>{(state.stats.returnRate * 100).toFixed(1)}%</s-heading>
              </s-stack>
            </s-box>
            <s-box padding="base" border="base" borderRadius="base" minInlineSize="180px">
              <s-stack direction="block" gap="small-300">
                <s-text color="subdued">Return volume (30 days)</s-text>
                <s-heading>{state.stats.returnVolume}</s-heading>
              </s-stack>
            </s-box>
            <s-box padding="base" border="base" borderRadius="base" minInlineSize="180px">
              <s-stack direction="block" gap="small-300">
                <s-text color="subdued">Refund value (30 days)</s-text>
                <s-heading>£{state.stats.refundValue.toFixed(2)}</s-heading>
              </s-stack>
            </s-box>
          </s-stack>

          <s-stack direction="inline" gap="base" wrap>
            <s-box padding="base" border="base" borderRadius="base" minInlineSize="220px">
              <s-stack direction="block" gap="small-300">
                <s-text color="subdued">Top return reasons</s-text>
                {state.stats.topReasons.length === 0 && <s-paragraph>No returns yet.</s-paragraph>}
                {state.stats.topReasons.map((r) => (
                  <s-stack key={r.reason} direction="inline" gap="small-300">
                    <s-text>{humanizeReason(r.reason)}</s-text>
                    <s-text color="subdued">{r.count}</s-text>
                  </s-stack>
                ))}
              </s-stack>
            </s-box>
            <s-box padding="base" border="base" borderRadius="base" minInlineSize="220px">
              <s-stack direction="block" gap="small-300">
                <s-text color="subdued">Most-returned products</s-text>
                {state.stats.topProducts.length === 0 && <s-paragraph>No returns yet.</s-paragraph>}
                {state.stats.topProducts.map((p) => (
                  <s-stack key={p.title} direction="inline" gap="small-300">
                    <s-text>{p.title}</s-text>
                    <s-text color="subdued">{p.count}</s-text>
                  </s-stack>
                ))}
              </s-stack>
            </s-box>
          </s-stack>

          <s-box padding="base" border="base" borderRadius="base">
            <s-stack direction="block" gap="small">
              <s-text color="subdued">Return requests</s-text>
              <s-paragraph>
                Orders with an active return request, filtered and columned in Shopify's own Orders page.
              </s-paragraph>
              <s-button href={state.stats.nativeReturnsUrl} target="_blank" variant="primary">
                Open return requests
              </s-button>
            </s-stack>
          </s-box>
        </s-stack>
      )}
    </s-page>
  );
}
```

- [ ] **Step 2: Create the Dashboard auth-bootstrap gate**

Create `components/app-dashboard/dashboard-gate.tsx`:

```tsx
// components/app-dashboard/dashboard-gate.tsx
"use client";

import { useEffect, useState } from "react";
import { AppNav } from "@/components/app-nav";
import { DashboardSummary } from "@/components/app-dashboard/dashboard-summary";
import { MorphingInfinity } from "@/components/loading-ui/morphing-infinity";

declare const shopify: {
  idToken: () => Promise<string>;
};

type GateState = "loading" | "error" | "ready";

/**
 * Same App Bridge token-exchange bootstrap as MerchantAppGate
 * (components/app-settings/merchant-app-gate.tsx) — each embedded page gets
 * its own fresh JS context on load, so this can't assume Settings already
 * ran token-exchange first.
 */
export function DashboardGate() {
  const [state, setState] = useState<GateState>("loading");
  const [errorMessage, setErrorMessage] = useState("");

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
        if (!cancelled) setState("ready");
      } catch (err) {
        if (!cancelled) {
          setErrorMessage(err instanceof Error ? err.message : "Something went wrong.");
          setState("error");
        }
      }
    }

    bootstrap();
    return () => { cancelled = true; };
  }, []);

  if (state === "loading") {
    return (
      <>
        <AppNav />
        <s-page heading="Dashboard" inlineSize="large">
          <s-box padding="large">
            <s-stack direction="block" alignItems="center">
              <MorphingInfinity className="size-8 text-muted-foreground" />
            </s-stack>
          </s-box>
        </s-page>
      </>
    );
  }
  if (state === "error") {
    return (
      <>
        <AppNav />
        <s-page heading="Dashboard" inlineSize="large">
          <s-banner heading="Couldn't load dashboard" tone="critical">
            <s-paragraph>{errorMessage}</s-paragraph>
          </s-banner>
        </s-page>
      </>
    );
  }
  return (
    <>
      <AppNav />
      <DashboardSummary />
    </>
  );
}
```

- [ ] **Step 3: Delete the superseded Returns components**

```bash
git rm components/app-returns-management/returns-summary.tsx
git rm components/app-returns-management/returns-management-gate.tsx
```

- [ ] **Step 4: Update the page entry to use the Dashboard gate**

Modify `app/app/returns/page.tsx` — replace its entire contents:

```tsx
import { DashboardGate } from "@/components/app-dashboard/dashboard-gate";

export const dynamic = "force-dynamic";

/**
 * Dashboard page — sibling to the Settings page (`/app`), reached via the
 * sidebar nav both pages register through <AppNav />. Auth happens
 * client-side (DashboardGate), same token-exchange flow as Settings.
 * Route path stays `/app/returns` (not renamed to `/app/dashboard`) — only
 * the page's rendered content and the sidebar nav label changed; renaming
 * the URL wasn't needed for this feature and would be unrelated churn.
 */
export default function DashboardEntry() {
  return (
    <div id="dashboard-root">
      <DashboardGate />
    </div>
  );
}
```

- [ ] **Step 5: Update the sidebar nav label**

Modify `components/app-nav.tsx` — replace its entire contents:

```tsx
// components/app-nav.tsx

/**
 * Registers the app's sidebar navigation in Shopify admin. `<s-app-nav>`
 * renders no visible UI of its own — it must be present in every page's DOM
 * (including loading/error states) for Shopify to keep showing "Settings"
 * and "Dashboard" as sibling entries under the app's name in the sidebar.
 */
export function AppNav() {
  return (
    <s-app-nav>
      <s-link href="/app">Settings</s-link>
      <s-link href="/app/returns">Dashboard</s-link>
    </s-app-nav>
  );
}
```

- [ ] **Step 6: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 7: Full local build**

Run: `rm -rf .next && npm run build`
Expected: build succeeds; `/app/returns` route still present in the output (content changed, path unchanged).

- [ ] **Step 8: Commit**

```bash
git add components/app-dashboard/dashboard-summary.tsx components/app-dashboard/dashboard-gate.tsx app/app/returns/page.tsx components/app-nav.tsx
git commit -m "feat: replace Returns page with Dashboard (stat cards + return requests card)"
```

---

### Task 7: Whole-branch verification and deploy

**Files:** none (verification + deployment only)

**Interfaces:** none — this task runs the full existing test/build suite and deploys the updated `shopify.app.toml` webhook subscriptions.

- [ ] **Step 1: Run the full test suite**

Run: `npx vitest run`
Expected: all tests pass, including the 15 new tests from Task 1.

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Full production build**

Run: `rm -rf .next && npm run build`
Expected: build succeeds. Confirm the three new webhook routes and `/api/app/dashboard` appear in the build output route list.

- [ ] **Step 4: Deploy the updated webhook subscriptions to Shopify**

**This step requires the user's own Shopify CLI session — do not run unattended.** Run:

```bash
npx shopify app deploy
```

Expected: a new app version is released (same flow as the earlier scope-addition deploy this session, e.g. `iblaze-returns-55`), now including the three new `[[webhooks.subscriptions]]` blocks from Tasks 2–4.

- [ ] **Step 5: Push to main**

```bash
git push origin main
```

- [ ] **Step 6: Manual live verification**

In the live embedded app (Shopify admin, dev store):
1. Confirm the sidebar now shows "Settings" and "Dashboard" (not "Returns").
2. Open the Dashboard page — confirm it loads with `0%`/`0`/`£0.00` and empty top-5 lists if no events have fired yet (or real numbers if the dev store already has return activity from earlier in this session).
3. Trigger a real test order, a real test return request, and a real test refund in the dev store.
4. Reload the Dashboard within a minute or two — confirm the numbers reflect the new activity.
5. Click "Open return requests" — confirm it still opens Shopify's native Orders page in a new tab, unchanged from before.
