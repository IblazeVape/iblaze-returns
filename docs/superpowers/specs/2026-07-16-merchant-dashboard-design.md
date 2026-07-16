# Merchant Dashboard — Design

## Context

The embedded Shopify admin app currently has two sidebar pages: Settings and Returns (the latter just added this session — a single "Return requests" button deep-linking to Shopify's native Orders page, filtered to `return_status:"return_requested"`). This spec replaces the "Returns" nav entry with a full "Dashboard" page: merchant-facing stats (return rate, return volume, refund value, top return reasons, most-returned products) plus the existing "Return requests" deep-link button, relocated into a card on this new page.

This was originally planned as a separate, deferred sub-project (see `docs/superpowers/specs/2026-07-14-returns-management-design.md`'s "Non-goals" — stats were explicitly deferred until after Returns Management). It's being pulled forward now because a real dashboard card is also the cleanest fix for a UX problem discovered while building the Returns page: opening Shopify's native Orders page in a new tab needs a genuine user click to avoid the browser's popup blocker, and a dashboard card *is* that click, framed usefully rather than as a bare button on an otherwise-empty page.

## Goals

- Merchant opens "Dashboard" (renamed from "Returns" in the sidebar) and sees, over a rolling 30-day window: return rate, return volume, total refund value, top 5 return reasons, top 5 most-returned products.
- A "Return requests" card/button remains, opening Shopify's native Orders page in a new tab (unchanged behavior from the current Returns page — see `2026-07-14-returns-management-design.md`).
- Stats are computed from a webhook-driven stored summary in Redis, not real-time GraphQL aggregation on every page load (explicit decision from the original Returns Management brainstorm, reconfirmed here).
- No new Shopify OAuth scopes beyond what a webhook subscription itself requires (`read_orders` covers `orders/create` and `refunds/create`; `read_returns` — already granted this session — covers the return topics).

## Non-goals

- No historical range picker (fixed rolling 30-day window only, no "last 7 days" / "last 90 days" toggle).
- No per-product or per-reason drill-down pages — just the top-5 lists, no click-through to a filtered view.
- No real-time recomputation on page load — stats can lag by however long it takes Shopify to deliver the triggering webhook (typically seconds).
- No backfill of historical data from before this feature ships — the 30-day window starts accumulating from install/deploy forward; a freshly-deployed shop shows zeros/empty lists until real events occur.

## Architecture

Four Shopify webhook topics feed a per-shop, per-day Redis counter scheme:

- **`orders/create`** — increments a daily "total orders" counter (the denominator for return rate).
- **`returns/request`** — increments a daily "returns" counter, a daily "reasons" hash (reason → count), and a daily "products" hash (product title → count).
- **`refunds/create`** — increments a daily "refund value" counter (sum of refunded amounts).
- (`returns/approve`, `returns/decline`, `returns/cancel`, `returns/close` are NOT subscribed for this feature — only `returns/request` and `refunds/create` carry data this spec's stats need. Subscribing to the others would be dead weight.)

A new `GET /api/app/dashboard` route reads the last 30 daily buckets per metric (pipelined into one Redis round trip), sums/merges them, and returns the aggregated stats. The Dashboard page fetches this once on load — no polling, no auto-refresh.

## Webhook handlers

All three new handlers follow the exact pattern already used by `app/api/webhooks/app-uninstalled/route.ts`: read the raw body, verify `x-shopify-hmac-sha256` via the existing `verifyWebhookHmac()` helper, resolve the shop from the `x-shopify-shop-domain` header, and return `200 { ok: true }` on success. Each handler is intentionally tolerant of partial failures — a webhook must be ack'd quickly, and a stats-enrichment failure should never cause Shopify to retry-storm the endpoint.

- **`app/api/webhooks/orders-create/route.ts`**: parses `{ id }` from the payload (not otherwise used), increments `stats:{shop}:orders:{YYYY-MM-DD}` by 1 with a 31-day TTL.

- **`app/api/webhooks/returns-request/route.ts`**: parses the payload's `return_line_items[]`, each with `quantity`, `return_reason` (already present inline — no extra API call needed for this part), and `fulfillment_line_item.line_item.id`. Then:
  1. Increments `stats:{shop}:returns:{YYYY-MM-DD}` by 1 (one increment per return event, not per line item — this is "return volume," not "returned item volume").
  2. For each line item, increments `stats:{shop}:reasons:{YYYY-MM-DD}` hash field `return_reason` by `quantity`. The webhook's `return_reason` is a raw snake_case code (e.g. `"wrong_item"`), stored as-is — humanizing it (`"Wrong item"`) happens only at render time in the Dashboard UI, the same `humanizeEnum`-style transform already used elsewhere in this app, so the stored key stays compact and stable even if display copy changes later.
  3. Makes one GraphQL call to `shopifyAdmin(shop, ...)` resolving the order's line items to their product titles (batched — one call per webhook event, not one per line item), then increments `stats:{shop}:products:{YYYY-MM-DD}` hash field `productTitle` by `quantity` for each. If this call fails (network error, missing scope, deleted product), the handler logs the error and skips step 3 only — steps 1 and 2 still commit, and the handler still returns 200.

- **`app/api/webhooks/refunds-create/route.ts`**: parses `refund_line_items[]`, sums `subtotal` (+ `total_tax` per line) across all entries, increments `stats:{shop}:refundValue:{YYYY-MM-DD}` (stored as an integer count of minor currency units, i.e. pence/cents, to avoid floating-point drift) by that sum with a 31-day TTL.

`shopify.app.toml`'s `[[webhooks.subscriptions]]` gains three new blocks for `orders/create`, `returns/request`, and `refunds/create`, each pointing at its respective route — deployed via `shopify app deploy` alongside the code, same as the earlier scope-addition deploy this session.

## Redis storage schema

Per shop, per UTC calendar day, four key patterns (mirroring the existing `lib/tenant.ts` per-shop namespacing convention):

```
stats:{shop}:orders:{YYYY-MM-DD}        -> integer (redis INCR)
stats:{shop}:returns:{YYYY-MM-DD}       -> integer (redis INCR)
stats:{shop}:refundValue:{YYYY-MM-DD}   -> integer, minor units (redis INCRBY)
stats:{shop}:reasons:{YYYY-MM-DD}       -> hash { reasonCode: count }  (redis HINCRBY)
stats:{shop}:products:{YYYY-MM-DD}      -> hash { productTitle: count } (redis HINCRBY)
```

Every key gets a 31-day TTL on first write (`EXPIRE` immediately after the first `INCR`/`HINCRBY` on a new key) — old days simply fall out of Redis on their own; no cleanup job, no explicit "rolling window" bookkeeping beyond "read the last 30 date-keys and sum them."

## Read path (`GET /api/app/dashboard`)

1. Verify the merchant session token (same `verifyMerchantSessionToken` pattern as every other `/api/app/*` route this session).
2. Compute the last 30 UTC calendar dates as `YYYY-MM-DD` strings.
3. Build all 120 key names (30 days × 4 metrics — `reasons`/`products` hashes count as one key each for this purpose) and fetch them in a single Upstash pipeline call.
4. Sum `orders` and `returns` across the 30 days; `returnRate = returns / orders` (0 if `orders` is 0, not a divide-by-zero).
5. Sum `refundValue` across the 30 days, convert minor units back to a display amount.
6. Merge the 30 daily `reasons` hashes into one map, sort descending by count, take the top 5. Same for `products`.
7. Return `{ returnRate, returnVolume, refundValue: { amount, currency }, topReasons: [{reason, count}], topProducts: [{title, count}], nativeReturnsUrl }` — `nativeReturnsUrl` is `buildNativeReturnsUrl(shop)`, reused unchanged from the existing Returns feature, so the "Return requests" card doesn't need a second API round trip.

## UI

Dashboard page (`components/app-dashboard/dashboard-summary.tsx`, replacing `returns-summary.tsx`; same auth-bootstrap gate pattern, renamed `DashboardGate`) renders:
- A row of stat cards: Return rate (%), Return volume (count), Refund value (currency-formatted).
- Two compact list cards: Top 5 return reasons, Top 5 most-returned products (label + count each, no icons/images — keeps this a fast first version).
- A "Return requests" card: heading + one-line description + the existing "Open return requests" button (unchanged behavior — new tab, click-triggered, no auto-open attempt, per this session's earlier finding that auto-open is unreliable).

`components/app-nav.tsx` changes its second `<s-link>` label from "Returns" to "Dashboard" (href stays `/app/returns` — the route itself is not renamed, only the page's rendered content and nav label change, to avoid an unnecessary URL/route rename mid-feature).

## Error handling

- Dashboard API route: if the Redis pipeline fails entirely, return `500` with a generic error; the page shows the existing `MorphingInfinity` loading state's error-banner sibling pattern already used elsewhere (`s-banner tone="critical"`).
- Individual webhook handlers: HMAC failure → `401`; missing shop header → `400`; any other processing error → still `200` after logging (per the "never block Shopify's retry behavior on our own bug" principle already established for `app-uninstalled`).
- A shop with zero events in the last 30 days (e.g. immediately after install) shows `0%` return rate, `0` volume, `£0.00` refund value, and empty top-5 lists with a plain "No returns yet" message — not an error state.

## Testing

- Unit tests (Vitest) for the pure logic: daily-key generation for a 30-day window, hash-merging across days, top-5 sort/truncate, `returnRate` divide-by-zero guard, minor-units currency formatting.
- No live webhook integration tests (consistent with `app-uninstalled`, which also has none) — webhook handlers are verified manually post-deploy by triggering real events in the dev store, same verification method used throughout this session.
- Manual live verification checklist (post-deploy): trigger a test order, a test return request, and a test refund in the dev store; confirm the Dashboard's numbers update within a few seconds to a minute.
