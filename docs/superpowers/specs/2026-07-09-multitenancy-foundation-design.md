# Multi-Tenancy Foundation — Design Spec

**Date:** 2026-07-09
**Status:** Approved (design), pending implementation plan
**Branch:** `feat/multitenancy-foundation`

## Goal

Turn the single-store iBlaze returns portal into a **multi-tenant** app: any Shopify
merchant who installs the app gets their own isolated returns portal (their store's
orders, their branding), served on **their own store domain** via **Shopify App
Proxy** (`theirstore.com/apps/returns`). This is the first of three SaaS
sub-projects (foundation → Settings page → Shopify Billing); it does not build the
merchant Settings UI or billing, but lays the tenant model everything else sits on.

## Context (current single-tenant state)

- The app is hardwired to one store via env vars: `SHOPIFY_STORE_URL`,
  `SHOPIFY_ACCESS_TOKEN`, `SHOPIFY_CLIENT_ID/SECRET`, plus a hardcoded customer-login
  URL `account.iblazevape.co.uk`.
- `lib/redis.ts` stores a single global key `shopify_access_token`.
- `lib/shopify.ts` + every API route (`get-orders`, `order-eligible`, `calculate-return`,
  `submit-return`, `submit-claim`, `shopify-callback`) read the single store from env.
- The app-install OAuth exists (`app/api/shopify-callback`, HMAC verify + token
  exchange) but stores one token, not one per shop.
- Customers reach the portal at `/` and authenticate via the app's own customer
  OAuth. **App Proxy is NOT yet configured** in `shopify.app.toml`.
- App handle/client: `client_id = 699e9ffee4fd5d72b8126884d37584be`,
  `application_url = https://iblaze-returns.vercel.app`.

## Decision record

- **Customer delivery + identity: Shopify App Proxy.** The returns portal is served
  under each merchant's store domain at `theirstore.com/apps/returns`. Shopify signs
  every proxy request with the **shop** and the **`logged_in_customer_id`** — so the
  app gets both tenant identity and customer identity for free, and the custom
  `account.iblazevape.co.uk` OAuth is **removed** on the proxy path. Chosen over
  custom domains (free, automatic on install, no per-merchant DNS, tamper-proof
  identity) and over a shop query param (less secure/professional).
- **Tenant store: Upstash Redis** (already integrated). A tenant is a hash keyed by
  shop domain. No relational DB introduced yet.
- **Transition strategy: (b) build App Proxy alongside the existing `/`.** Keep
  iBlaze's current `/` + OAuth flow working during transition; cut it over to App
  Proxy once the new path is verified, then retire the old one. (Chosen over a hard
  cutover for safety.)
- **iBlaze becomes tenant #1** — migrate the existing single token into its
  `tenant:{shop}` record so nothing breaks.
- **Resolution is a single swappable step** so a future custom-domain option drops in
  additively (see Future).

## Architecture

### 1. Tenant model (`lib/tenant.ts` + `lib/redis.ts`)
Replace the global `shopify_access_token` with per-shop records:
```
tenant:{shop} (Redis hash) = {
  shop, accessToken, installedAt, scopes,
  plan,                       // default "free" until Billing sub-project
  returnWindowDays,           // default (e.g. 30) until Settings sub-project
  branding: { name, logoUrl, accentColor, ... }  // defaults until Settings
}
```
Helpers: `getTenant(shop)`, `setTenant(shop, patch)`, `getTenantToken(shop)`,
`tenantExists(shop)`. Keep `getShopifyToken/setShopifyToken` as thin
backward-compatible shims over tenant #1 during transition.

### 2. Per-shop install (`app/api/shopify-callback`)
Use the incoming `shop` param (not `SHOPIFY_STORE_URL`); verify HMAC with
`SHOPIFY_CLIENT_SECRET`; exchange `code` → access token against `https://{shop}/...`;
write `tenant:{shop}` with the token + granted scopes + `installedAt`. Any merchant
can install and gets an isolated tenant.

### 3. App Proxy portal (customer side)
- Add `[app_proxy]` to `shopify.app.toml`: prefix `apps`, subpath `returns`, url =
  the app's proxy endpoint.
- New proxy-served route: **verify the Shopify proxy signature** (HMAC of sorted
  query params with the API secret); read `shop` + `logged_in_customer_id`; resolve
  the tenant; render the existing portal (`DashboardClient`) with that tenant's
  branding and that store's orders. No app-owned customer OAuth on this path —
  Shopify's signed `logged_in_customer_id` is trusted.

### 4. Data-layer refactor (`lib/shopify.ts` + API routes)
Every Shopify call becomes tenant-scoped: functions take a `shop` and look up
`getTenantToken(shop)` + use `https://{shop}/admin/api/...`, instead of reading
`SHOPIFY_STORE_URL`/`SHOPIFY_ACCESS_TOKEN`. API routes obtain `shop` from the verified
proxy request and thread it down. This is the bulk of the work — mechanical, touches
`get-orders`, `order-eligible`, `calculate-return`, `submit-return`, `submit-claim`,
`lib/customerAccount.ts`.

### 5. Tenant resolution abstraction (`lib/resolve-tenant.ts`)
A single function that returns the tenant for a request. Foundation implementation:
verify the App Proxy signature → `shop`. Written so a future branch can add: if the
request arrives on a custom domain, resolve by `Host` header instead.

## Out of scope (next sub-projects)
- **Merchant Settings UI** (embedded Shopify app page to edit branding, return window,
  custom domain). Foundation stores these fields with defaults; the editing UI is the
  next sub-project.
- **Shopify Billing** (plan selection + charges). Foundation stores `plan: "free"`.

## Future: custom-domain option (`returns.theirstore.com`)
Additive, no rework, when wanted:
- Add `customDomain` to the tenant record.
- Front with **Cloudflare for SaaS** (free to 100 custom hostnames, auto-SSL, no
  Vercel upgrade) — merchants CNAME their domain to the Cloudflare endpoint.
- `resolve-tenant` gains a Host-header branch.
- **Note:** the custom-domain path does NOT go through Shopify's proxy, so it needs
  its own shopper auth (per-shop Shopify customer OAuth or order-number + email
  lookup) — the only piece not shared with the App Proxy path.

## Verification & rollback
- Feature branch → Vercel preview → verify: iBlaze (tenant #1) portal still works via
  the existing `/`; a second test shop installs and its App-Proxy portal renders its
  own orders; tenant isolation (one shop can't read another's token/orders).
- The existing `/demo` route remains a design-verification surface (no Shopify
  session needed).
- Backward-compat shims keep tenant #1 working throughout; retiring the old `/` +
  OAuth is a deliberate later step, not part of this foundation.
