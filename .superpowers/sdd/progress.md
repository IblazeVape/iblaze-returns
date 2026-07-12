# Multi-Tenancy Foundation — Progress Ledger

Plan: docs/superpowers/plans/2026-07-09-multitenancy-foundation.md
Branch: feat/multitenancy-foundation
Mode: HYBRID (subagents for code tasks; controller runs shopify app deploy, tenant-#1 seed vs real Redis, preview verification)
Pre-flight refinement: Task 1 legacy getShopifyToken shim must fall back to legacy `shopify_access_token` key when tenant record absent (keeps / working until Task 6 seeds).

## Tasks
(none complete yet)
- Task 1: per-shop tenant model in Redis + legacy shims (w/ fallback refinement) — complete (commit 7efab93, 3 vitest tests pass, tsc clean, controller-reviewed). BASE for Task 2 = 7efab93.
- Task 2: App Proxy signature verification + swappable resolveTenant — complete (commit 83db705, 8 vitest tests pass across 2 files, tsc clean, verbatim from plan). BASE for Task 3 = 83db705.

## CHECKPOINT after Task 2: Tasks 1-2 (pure-logic foundation, unit-tested) DONE. Remaining Tasks 3-6 are integration + infra:
- Task 3: per-shop install (shopify-callback route change)
- Task 4: tenant-scope lib/shopify.ts + customerAccount.ts (add shop param)
- Task 5: thread shop through API routes + App Proxy portal route + shopify.app.toml [app_proxy]
- Task 6: seed iBlaze tenant #1 (NEEDS prod Redis + user), `shopify app deploy` (NEEDS user), preview 2-tenant isolation verification + human merge gate
- Task 3: per-shop app install writes tenant record — complete (commit 9fe2512, tsc clean, build green). BASE for Task 4 = 9fe2512.
- Task 4: tenant-scope lib/shopify + customerAccount (shop param) — complete (commit 1a0dee5, vitest green). CONCERN: plan Task 5 undercounted callers — tsc breaks in app/api/get-orders(6), order-eligible(1), AND lib/auth.ts(1), lib/returnEligibility.ts(4). Task 5 must thread shop through ALL of these. BASE for Task 5 = 1a0dee5.
- Task 5: thread shop through all callers + getRequestShop helper (legacy fallback) + shopify.app.toml [app_proxy] — complete (commit c038494, tsc 0 errors, build green, 8 tests). CONCERNS: routes now use getTenantToken directly → iBlaze routes need tenant #1 SEEDED (Task 6) before they work; order-eligible always hits legacy fallback (caller not via signed proxy). App-Proxy portal PAGE deferred to Task 6. BASE for Task 6 = c038494.
- Task 6 (in progress): seed script scripts/seed-tenant-one.ts created + committed. REMAINING (user infra): (1) shopify app deploy [App Proxy], (2) run seed vs prod Redis, (3) second-store preview verification. Then finish App-Proxy portal PAGE + get-orders proxy-customer identity path against a real signed request.

- Redis prod-creds fix + runtime seed route — commit 2a8d376 (tsc 0, 8 tests). Prod Upstash creds are KV_REST_API_* (integration-managed, pull empty locally) — lib/redis.ts now uses KV_* w/ UPSTASH_* fallback. Local seed impossible (no creds); added protected GET /api/admin/seed-tenant?secret=ADMIN_SECRET (runtime seed where creds are injected).
- App Proxy registered in Partner Dashboard (apps/returns -> https://iblaze-returns.vercel.app/apps/returns). Done by user.

## REMAINING (Task 6 final piece) — the App-Proxy portal PAGE:
DESIGN NUANCE discovered: App Proxy signs the initial PAGE request, but DashboardClient (client component) fetches /api/get-orders as a plain browser XHR carrying NO proxy signature and NO session. So get-orders can't identify the customer on that XHR.
CLEAN SOLUTION: the /apps/returns page verifies the proxy sig server-side (resolveTenant), looks up the customer email from logged_in_customer_id (Shopify), then MINTS the same session cookie the OAuth callback (app/api/callback) already sets (shop + email). Then DashboardClient + get-orders work UNCHANGED via validateSession. i.e. App Proxy becomes an alternative session-minting entry.
STEPS: (1) build app/apps/returns page that verifies proxy + mints session; (2) push branch -> Vercel preview; (3) hit /api/admin/seed-tenant?secret=... on preview to seed tenant #1; (4) verify portal renders via a REAL signed proxy request (theirstore.com/apps/returns) + second-store isolation; (5) merge gate.
BASE for portal-page task = 2a8d376.

## GO-LIVE (2026-07-10): merged to main (2a727f8), prod deployed.
- Fixed missing ADMIN_SECRET (generated + added to Vercel prod, redeployed).
- Tenant #1 SEEDED on prod Redis: shop=6jjpzt-jz.myshopify.com, hasToken=true, plan=free, window=30.
- Prod verified: /apps/returns rejects unsigned+fake-sig requests (security gate OK); / still 307->Shopify OAuth (portal intact); /demo 200; seed route 401 without secret, idempotent with.
- REMAINING: (1) real end-to-end test — open live yourstore.com/apps/returns from a logged-in customer order (only the merchant can do this); (2) build the full branded portal UI on /apps/returns (currently a verification stub) — session-minting + server-rendered orders, developed against the live proxy; (3) remove /api/admin/seed-tenant route after go-live; (4) second-store isolation test.

## EXTENSION FIX + DEPLOY (2026-07-10):
- Fixed return-action extension: removed unused React deps (ui-extensions-react/react/react-reconciler) that forced a peer conflict pinning @shopify/ui-extensions below the ./preact-exporting version. Commit 9163ace. Extension now bundles.
- `shopify app deploy --force` SUCCEEDED → app version iblaze-returns-49 released (includes [app_proxy] config). Extension built clean (47ms).

## APP PROXY STILL NOT FORWARDING (open issue, Shopify-side):
- store.com/apps/returns still 404s after deploy + 5min. Vercel runtime logs show ZERO /apps/returns requests → Shopify is NOT forwarding to our app despite signing the request (shop + logged_in_customer_id + signature present in the redirect URL).
- OUR SIDE IS CORRECT: iblaze-returns.vercel.app/apps/returns returns 200 directly; signature verification unit-tested; tenant #1 seeded; app_proxy config deployed in version 49 (url=https://iblaze-returns.vercel.app/apps/returns, subpath=returns, prefix=apps).
- LIKELY CAUSE: dev store 6jjpzt-jz.myshopify.com (primary domain iblazevape.co.uk) hasn't picked up the new app version's app-proxy route. App-proxy config changes often require the store to UPDATE/REINSTALL the app.
- NEXT STEPS (need user + Partner Dashboard): (1) retry the REAL logged-in customer flow now (their 404 screenshot was PRE-deploy); (2) if still 404, in Partner Dashboard confirm App Proxy shows prefix=apps/subpath=returns/url=https://iblaze-returns.vercel.app/apps/returns AND reinstall/update the app on the dev store to pick up version 49's proxy route; (3) then finish the branded portal UI on /apps/returns (currently a verification stub).

## AUTOMATIC INSTALL LIFECYCLE (2026-07-10, commit 63a516a, deployed prod + shopify app v50):
Built so any merchant install "just works" with NO manual token URL:
- NEW merchant entry app/app/page.tsx = application_url (changed / -> /app in toml). On signed Shopify app-load (?shop&hmac verified via lib/shopify-hmac verifyQueryHmac): no token -> auto-redirect to /api/shopify-callback (captures admin token); has token -> MerchantHome (placeholder for Settings sub-project). Customer portal stays at /.
- shopify-callback now sets signed merchant_session cookie (lib/merchant-session) + redirects to /app on success (no more dead-end JSON).
- app/uninstalled webhook: app/api/webhooks/app-uninstalled verifies webhook HMAC (base64 body) -> deleteTenant(shop). Registered in toml [[webhooks.subscriptions]].
- Verified on prod: /app 200 shows merchant shell; webhook 401 unsigned. 8 unit tests still green.
- ALSO FIXED earlier today: get-orders 500 was stale admin token after user's uninstall/reinstall (token revoked). User manually hit /api/shopify-callback?shop=... -> fresh token saved. The new auto-lifecycle prevents this recurring.

## STILL OPEN:
- /apps/returns (App Proxy) still 404s on storefront despite correct config + reinstall + v50. Our app gets ZERO proxy requests. Suspect headless: Online Store sales channel may be inactive (App Proxy routes through it). NEEDS user to check Settings->Sales channels->Online Store active + theme published on 6jjpzt-jz.
- Settings page (merchant branding/return-window/domain controls) = NEXT sub-project. MerchantHome at /app is the placeholder where it goes.
- Start-a-return extension is deployed/active; entry point for headless needs a link into /apps/returns from custom account UI.

## DIAGNOSTIC FINDING (tenant-status route, commit fe98378):
- tenant record for 6jjpzt-jz.myshopify.com = DELETED (tenantExists:false). 
- ROOT CAUSE of persistent get-orders 500: uninstall webhook WORKED (deleted tenant on uninstall ✓), but reinstall did NOT re-capture token because auto-OAuth fires on /app LOAD (app open), and installing != opening. So no token -> get-orders falls to stale env token -> invalid.
- FIX/TEST: user clicks "Open app" in Shopify admin -> loads /app -> auto-OAuth -> captures fresh token -> "connected ✅". Proves the lifecycle. Then get-orders works.
- Diagnostic endpoint: GET /api/admin/tenant-status?secret=ADMIN_SECRET (live-tests token; remove after go-live).
- CONSIDER: capture token at install-time not just app-open, for robustness (but non-embedded install normally redirects to application_url=/app which triggers it).

## INSTALL LIFECYCLE PROVEN WORKING (2026-07-11):
- Root cause of persistent get-orders 500 was the getTenantToken env-token FALLBACK: it returned a REVOKED SHOPIFY_ACCESS_TOKEN that masqueraded as installed (false "connected ✅"), so /app never triggered real OAuth. Removed fallback (commit 9e2adc0). Also cleaned shopify.app.toml [auth] redirect_urls to only /api/shopify-callback (was wrongly including customer /api/callback).
- After fix: user clicked "Open app" → real OAuth fired → FRESH VALID token captured. Diagnostic liveTest = httpStatus 200, ok:true, shopName "IblazeVape". Token valid against Admin API. Install lifecycle DONE + proven.
- Removed obsolete /api/admin/seed-tenant route (kept /api/admin/tenant-status diagnostic for now).

## REMAINING for full any-store multi-tenancy:
1. App Proxy /apps/returns 404 (Shopify-side, likely headless Online Store channel) — BLOCKS universal customer path. User must check Settings->Sales channels->Online Store active.
2. /apps/returns full portal UI using SIGNED customer (get-orders currently reads account.iblazevape.co.uk portal_session — iBlaze-legacy; needs to accept App Proxy logged_in_customer_id for any store).
3. Settings page (merchant branding/return-window/domain) at /app — buildable + testable NOW (merchant entry works), store-agnostic, doesn't depend on proxy.

## 🎉 MULTI-TENANT APP PROXY PROVEN WORKING END-TO-END (2026-07-11):
ROOT CAUSE FOUND (not a Shopify platform bug, not headless, not domain-layer): our /apps/returns
route was a plain Next.js page, which auto-308-redirects on trailing-slash mismatch (framework
default). Shopify's App Proxy treats ANY redirect from the app as "redirect the customer's
storefront browser to this path" -> re-enters proxy signing -> hits app again -> redirects again
-> infinite loop, entirely at Shopify's edge (never showed meaningfully in our server logs).

FIX (commits 33fd150 + 7f14a94):
1. Converted app/apps/returns/page.tsx -> app/apps/returns/[[...slug]]/page.tsx (catch-all, matches
   the original plan's Task 5 spec I'd deviated from).
2. Added `skipTrailingSlashRedirect: true` to next.config.mjs — REQUIRED even with the catch-all,
   since Next's trailing-slash redirect is a framework-level normalization independent of route
   matching. Verified locally first (both slash forms -> 200, zero redirect) before deploying.

VERIFIED LIVE on https://iblazevape.co.uk/apps/returns (real signed Shopify request):
"✅ Multi-tenant proxy working, Leejay — Shop: 6jjpzt-jz.myshopify.com · Customer: sheenahall123@gmail.com"

FULL CHAIN CONFIRMED END TO END: Shopify signs (shop+customer) -> our route verifies signature ->
resolves tenant -> resolves customer via merchant's own admin token -> renders. Zero manual steps,
zero account.iblazevape.co.uk dependency on this path. This is the real multi-tenant, any-store-
compatible customer entry point, proven on production with live Shopify traffic.

## MULTI-TENANCY FOUNDATION: SUBSTANTIALLY COMPLETE.
Remaining work (separate sub-projects, not blockers):
1. Build the FULL branded portal UI on /apps/returns (currently a verification stub — proves the
   chain, doesn't yet render orders/returns). Should reuse DashboardClient, feed it orders fetched
   server-side via shopifyAdmin(shop,...) + resolved loggedInCustomerId (NOT the account.iblazevape
   session/get-orders path, which stays iBlaze-legacy-only).
2. Settings page in /app (merchant branding/return-window/custom-domain controls) — fully unblocked,
   was deferred while chasing the proxy bug.
3. Remove /api/admin/tenant-status diagnostic route after go-live.
4. Second real merchant/store to prove cross-tenant isolation (currently only iBlaze tested).

## GUEST CHECKOUT SUPPORT (2026-07-11, commit 6666b67):
User correctly flagged: forcing a login redirect for non-logged-in customers breaks GUEST CHECKOUT
customers entirely (no Shopify account exists to log into). Fixed:
- Not-logged-in state now shows BOTH options: "Log in" link (real /account/login redirect, kept from
  the previous fix) AND a guest order-lookup form.
- Guest lookup requires THREE factors: order number + email + POSTCODE (user explicitly requested
  postcode as a second factor beyond email, after raising "couldn't someone who knows order+email
  impersonate a customer" — valid concern; postcode hardens it meaningfully while refunds still
  resolve to original payment method regardless).
- Route lives at app/apps/returns/guest-lookup/route.ts (NOT /api/*) — critical: the browser is on
  the STOREFRONT domain via the proxied page, so a client fetch to a relative path re-enters
  Shopify's App Proxy and gets freshly signed there. The route verifies that signature and takes
  `shop` from it (never trusts a client-submitted shop field). Rate-limited 8 attempts/15min per
  shop+IP via Redis (redis.incr + expire).
- Verified locally: route precedence correct (specific route.ts wins over the [[...slug]] catch-all
  page for its exact path), main page still 200, guest-lookup 401 unsigned as expected. tsc clean,
  8 tests pass.
