# Returns Management Page — Design

## Context

The embedded Shopify admin app (`/app`) currently has exactly one page: Settings. There is no in-app way for a merchant to see which orders have returns in progress — they'd have to know to search for it in Shopify's own order list. This is the first of two planned additions to the embedded app (the second, deferred, is a merchant-facing stats Dashboard driven by a webhook-stored summary in Redis — out of scope here).

This is a standalone sub-project: a **Returns Management** list page inside the embedded app. It does not implement approve/decline logic itself — it lists orders with active returns and deep-links out to Shopify's own native order page, where the merchant takes the actual action.

## Goals

- Merchant can open a "Returns" page (alongside Settings) inside the embedded app and see every order with an active return.
- List is filterable by return status.
- Clicking a row opens that order in Shopify admin's native UI, where the merchant approves/declines.
- No new Shopify OAuth scope required (order-level data only, using scopes the app already has).
- No new backend storage — always a live snapshot from Shopify.

## Non-goals

- No custom approve/decline UI — that stays entirely in Shopify's native order page.
- No per-return line-item detail (reasons, refund amounts) — would require the `read_returns` scope, which the app doesn't currently request and this project doesn't add.
- No stats/aggregation (return rate, refund value, top reasons, most-returned products) — that's the deferred Dashboard sub-project.
- No polling/auto-refresh — the merchant reloads the page to see updated data.

## Architecture

A new page at `app/app/returns/page.tsx`, structurally identical to the existing `app/app/page.tsx`: a thin server shell (`dynamic = "force-dynamic"`) wrapping a new client component, `ReturnsManagementGate`, that performs the same App Bridge token-exchange auth `MerchantAppGate` already does (session token → `POST /api/app/token-exchange` → stored access token). No new auth mechanism is introduced.

Both `app/app/page.tsx` and `app/app/returns/page.tsx` render an `<s-app-nav>` with two `<s-link>` children:

```html
<s-app-nav>
  <s-link href="/app">Settings</s-link>
  <s-link href="/app/returns">Returns</s-link>
</s-app-nav>
```

This causes Shopify admin to render both pages as sub-entries under the app's name in the left sidebar (desktop) / title-bar dropdown (mobile) — today there is no nav menu registered at all, since there's only ever been one page.

## Data flow

1. `ReturnsManagementGate` mounts, completes token exchange (reusing existing session-token logic), then calls `GET /api/app/returns?status=<value>`.
2. The new API route (`app/api/app/returns/route.ts`) loads the tenant's stored access token the same way `app/api/app/branding/route.ts` does, then issues one Shopify Admin GraphQL `orders` query:
   - `status` param maps to a `return_status:` search filter value: `return_requested`, `in_progress`, `inspection_complete`, `returned`, `return_failed`.
   - An "All" tab (default) queries with `-return_status:no_return` in the search string, so only orders with some return activity are returned (rather than every order in the shop).
3. Each order in the response includes: order `id`, `name` (order number), customer display name, `returnStatus`, `createdAt` (or `updatedAt`, whichever the order list already surfaces elsewhere in this app — match existing convention). No return-detail fields (`returnableFulfillments`, `return{...}`) are requested — order-level fields only, staying inside current scopes.
4. Response is returned as plain JSON, no caching, no storage — every page load / tab switch triggers a fresh query.

## UI

- Reuses the existing table styling already used for the order list in `DashboardClient` (rather than a new table component) for visual consistency.
- Status filter as tabs across the top: All, Return requested, In progress, Inspection complete, Returned, Failed — mirrors the existing order-list toolbar tab pattern already in this app (manual tab state + `s-button` row, since `s-tabs` is confirmed broken in this app's embedded runtime — see prior fixes this session).
- Each row is clickable; click opens `shopify:admin/orders/{id}` via the App Home Navigation API (`window.location` / the `shopify:admin` protocol), in a new tab so the merchant doesn't lose their place in the Returns list.
- Empty state per tab: "No returns in this status" (plain text, consistent with other empty states in this app).

## Error handling

- Missing/expired access token: same "reconnect" messaging the Settings page (`MerchantAppGate`) already shows for this case — no new pattern.
- GraphQL/network failure on the returns query: inline error banner with a manual "Retry" button (re-fires the same fetch) — no silent failure, no auto-retry loop.
- Empty result set: empty state text, not an error.

## Testing

- Unit tests (Vitest, following `lib/__tests__/*` conventions) for the new API route's pure logic: status-value → GraphQL `return_status:` filter string mapping, and response shaping (GraphQL edges → flat row objects). Both testable without hitting Shopify.
- No new e2e/Playwright infra. Manual verification in the live embedded app (screenshot/live-testing loop), consistent with how the Settings page was verified throughout this session.

## Open items resolved during brainstorming

- List detail level: **order-level only** (no `read_returns` scope, no per-return line items).
- Data freshness: **live fetch** on every load, no stored/synced copy.
- Filtering: **status filter tabs**, not one combined list.
- Deep-link target: **Shopify's native order page** (`shopify:admin/orders/{id}`), not a dedicated per-return URL.
- Page structure: **new route (`/app/returns`) + `<s-app-nav>` sidebar entry**, not a tab bolted onto the existing Settings page.
