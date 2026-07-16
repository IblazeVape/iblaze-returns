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

---

# Merchant Settings Page — Progress Ledger

Plan: docs/superpowers/plans/2026-07-13-merchant-settings-page.md
Branch: main (continuing this session's established direct-to-main workflow — no feature branch/worktree, matches every prior commit this session)
Mode: subagent-driven-development, fresh implementer + reviewer per task

## Tasks
(starting now)
- Task 1: extend tenant branding fields — complete (commits 5b99cfd, fd65910 fix; review clean, 6 vitest tests, tsc clean). BASE for Task 2 = fd65910.
- Task 2: branding validation helpers — complete (commit 93fb792; review clean, 7 vitest tests, tsc clean). BASE for Task 3 = 93fb792.
- Task 3: GET /api/branding — complete (commit a7eee57; review clean, tsc+build clean). MINOR (deferred to final review): route has no try/catch around getTenant() unlike get-orders/route.ts's pattern — a Redis error would surface as a CORS-less unhandled exception instead of a graceful fallback JSON; plan-mandated as written (brief's own reference code lacks it). BASE for Task 4 = a7eee57.
- Task 4: PUT /api/app/branding — complete (commits c593d26, 895848e fix; review clean, tsc+build clean). MINOR (deferred): 3 redundant getTenant() calls per request, not worth fixing (would require touching setTenant internals shared by other callers). BASE for Task 5 = 895848e.
- Task 5: logo upload via Vercel Blob — complete (commit bbf5408; review clean, tsc+build clean). BASE for Task 6 = bbf5408.
- Task 6: settings form UI with live preview — complete (commits 8286b81, 60d3993 fix; review clean, tsc+build clean). MINOR (deferred): logo file input lacks its own accessible label (shares htmlFor="logo-url" with the URL text field) — a11y nit, not fixed. BASE for Task 7 = 60d3993.
- Task 7: --brand CSS variable refactor — complete (commit 30392e2; review clean, tsc+build clean). Two intentional placeholder accentColor="#E5403B" values left at PortalShell's call sites (dashboard-client.tsx, guest-portal-shell.tsx) for Task 8/9 to replace with real per-tenant values — expected, not a defect. MINOR (deferred, out of task scope): a light-pink CountBadge background is a separate hardcoded color untouched by --brand theming. BASE for Task 8 = 30392e2.
- Task 8: thread branding into DashboardClient/AppSidebar/SiteHeader — complete (commit f0e894a; review clean, tsc clean). MINOR (accepted, plan-mandated): brief flash from #000000 default to real accent color while /api/branding resolves on first paint for logged-in customers — inherent to the async-fetch pattern the brief specifies, not a defect. BASE for Task 9 = f0e894a.
- Task 9: server-resolved branding for App Proxy guest entry — complete (commit 2d23c10; review clean, tsc+build clean). BASE for Task 10 = 2d23c10.
- Task 10: per-tenant return window in eligibility calculations — complete (commits a77d82e, f2b487f fix; review clean, tsc+build clean). Fix resolved hardcoded "30 days" copy strings in getIneligibleGroupMessage/buildNarrativeParagraph/home-tab banner that were left un-interpolated after the initial threading. BASE for Task 11 = f2b487f.
- Task 11: policy URL/text and support email in portal UI — complete (commit 6a747d7; review clean, tsc clean). MINOR (deferred): "Contact Support" quick-action button still hardcodes mailto:info@iblazevape.co.uk instead of branding.supportEmail — out of this task's declared scope, worth a follow-up. Also minor: OrderDetail gained a supportEmail? prop (module-level component, no closure access) — reasonable, disclosed. BASE for Task 12 = 6a747d7.
- Task 12: My Profile -> relative /account for every tenant — complete (commit 77beaee; review clean, tsc+build clean). Confirmed dead file components/layout/header.tsx has a sibling stale link but is unimported anywhere (not a live issue). BASE for Task 13 = 77beaee.
- Task 13: whole-branch verification — complete. Full suite 27/27 tests, tsc clean, build clean (self-run). Final whole-branch review (opus) found one HIGH regression: --brand CSS var only set on PortalShell's DOM subtree, not inherited by Radix Dialog/Drawer portaled to document.body -> Hygiene Policy modal's required "I Accept" button rendered invisible (white-on-white) for every tenant. FIXED (commit 4cbb942): PortalShell now also sets --brand on document.documentElement via useEffect (true ancestor of both its own subtree and anything portaled to body), cleanup on unmount. Re-verified by the same reviewer: resolved, no new blocking issues (noted a latent single-shell-instance assumption behind the cleanup, non-issue for this app's actual usage).
- One LOW finding deferred (not fixed, flagged to user): HygienePolicy modal (dashboard-client.tsx ~2817) is fully iBlaze-hardcoded ("iBlaze Returns Policy" title, "30-day" body copy) shown to every tenant regardless of their configured brand name/window — same class of gap as the already-deferred "Contact Support" mailto and stale dead-file "My Profile" link.

## MERCHANT SETTINGS PAGE: COMPLETE (2026-07-13)
All 12 implementation tasks + final whole-branch review + 1 HIGH-severity fix, done on main (commits f44b3e9..4cbb942, 17 commits total). 27/27 tests, tsc clean, build clean. Deferred (not blocking, follow-up candidates): HygienePolicy modal branding, Contact Support hardcoded email, GET /api/branding missing try/catch, settings-form logo-file a11y label, redundant getTenant() calls in PUT /api/app/branding.

---

# Embedded Merchant Settings Page — Progress Ledger

Plan: docs/superpowers/plans/2026-07-13-embedded-settings-page.md
Branch: main (continuing established direct-to-main workflow)
Mode: subagent-driven-development, fresh implementer + reviewer per task

## Tasks
(starting now)
- Task 1: merchant session token verification — complete (commit 57d546f; review clean, 5 vitest tests). BASE for Task 2 = 57d546f.
- Task 2: Shopify token-exchange client — complete (commit 56ec98e; review clean, 3 vitest tests). BASE for Task 3 = 56ec98e.
- Task 3: POST /api/app/token-exchange — complete (commit 673b2cb; review clean, tsc+build clean). BASE for Task 4 = 673b2cb.
- Task 4: switch branding/logo-upload routes to bearer auth — complete (commit 3cef198; review clean, tsc clean). BASE for Task 5 = 3cef198.
- Task 5: GET /api/app/media-library — complete (commit 82f1af7; review clean, tsc+build clean). BASE for Task 6 = 82f1af7.
- Task 6: shopify.app.toml embedded + read_files scope — complete (commit 6ef66e0; review clean). Deploy (shopify app deploy) deferred to controller/final step. BASE for Task 7 = 6ef66e0.
- Task 7: CSP frame-ancestors header + App Bridge script tag — complete (commit 14f9e4e; review clean, tsc+build clean). Reviewer specifically verified the shop-param regex is anchored against header-injection and the existing customer-portal /-middleware logic is untouched. BASE for Task 8 = 14f9e4e.
- Task 8: MerchantAppGate + rewire app/app/page.tsx — complete (commit 3fdf651; review clean). Expected 9-10 tsc errors (all s-page/s-spinner/s-banner/s-paragraph "unknown JSX element", nothing else) will persist until Task 10 lands — confirmed, not a defect. settings-form.tsx confirmed zero-diff. BASE for Task 9 = 3fdf651.
- Task 9: delete old OAuth-redirect flow — complete (commit 97359e1; review clean, only known 9 s-* JSX errors remain, no new ones). Minor finding (stale console.error referencing deleted route) fixed directly by controller, commit c4e3b0e. BASE for Task 10 = c4e3b0e.
- Task 10: Polaris web component TS declarations — complete (commit 76632f6, controller-authored after the dispatched implementer's connection dropped mid-task; review clean). DEVIATION FROM BRIEF (justified, reviewed): brief's `declare namespace JSX {...}` at global scope doesn't work under this project's React 19 + @types/react@19.2.15 — IntrinsicElements moved to React.JSX.IntrinsicElements, and the file being a module (has import/export) means the augmentation needs `declare global { namespace React { namespace JSX {...} } }` to actually merge into the ambient namespace. Confirmed via node_modules/@types/react source + independent tsc run (0 errors, no new errors elsewhere). All 19 s-* elements from the brief preserved. BASE for Task 11 = 76632f6.
- Task 11: rebuild SettingsForm in Polaris + media-library picker — complete (commit ee68117; review clean, tsc+build clean, branding-preview.tsx confirmed zero-diff). KNOWN UNVERIFIED RISK (deferred to Task 12 manual check, cannot be tested in this environment): whether Polaris s-text-field/s-url-field/etc custom elements actually fire a React-compatible onChange the code assumes — needs a real embedded Shopify admin session to confirm form fields actually update state when typed into. BASE for Task 12 = ee68117.
- Task 12: whole-branch verification — complete. 35/35 tests, tsc clean, build clean (self-run). Customer portal confirmed zero-diff (only non-Settings file touched across the whole plan: a 1-line log message in submit-return/route.ts). Final whole-branch review (opus): no Critical/High findings. Auth migration verified complete (zero stale merchant-session/shopify-callback references anywhere). CSP header regex verified safe against injection. read_files scope confirmed minimal/correct. Polaris JSX fix independently re-verified as structurally correct (not a hack). No fallout found from the two subagent connection-drop interruptions (both cleanly re-dispatched from a clean, uncommitted state).
- 3 Low findings: (1) stale redirect_urls pointing at deleted route — FIXED, commit ce56fe7; (2) token-exchange re-runs on every /app load, slightly wasteful + overwrites installedAt each time — deferred, matches the plan's own explicit design choice, not a defect; (3) session-token verifier doesn't check aud/nbf claims (defense-in-depth only, signature already binds to our own client secret) — deferred, low risk.
- Untested at runtime (needs a real deploy + live embedded session, flagged explicitly): whether Polaris s-* onChange actually fires through React 19's custom-element handling; whether Shopify's managed-install scope re-approval UI actually triggers before the app loads on the read_files scope addition.

## EMBEDDED MERCHANT SETTINGS PAGE: COMPLETE (2026-07-13)
All 12 tasks + final whole-branch review + 1 Low-severity fix, done on main (commits 4cbb942..ce56fe7, 13 commits total). 35/35 tests, tsc clean, build clean, customer portal verified untouched.

---

# Returns Management Page — Progress Ledger

Plan: docs/superpowers/plans/2026-07-14-returns-management.md
Branch: main (continuing established direct-to-main workflow — no feature branch/worktree)
Mode: subagent-driven-development, fresh implementer + reviewer per task

## Tasks
(starting now)
- Task 1: returns-management query filter and response shaping logic — complete (commit a43608f; review clean, 8 vitest tests, tsc clean). BASE for Task 2 = a43608f.
- Task 2: GET /api/app/returns route — complete (commit d687187; review clean, tsc clean). BASE for Task 3 = d687187.
- Task 3: shared AppNav component + wire into Settings page — complete (commit 09c3e87; review clean, tsc clean). Required adding s-app-nav/s-link declarations to types/polaris-web-components.d.ts (justified, matches existing pattern). BASE for Task 4 = 09c3e87.
- Task 4: Returns page shell + auth bootstrap — complete (commits d38f4b7, 1fe6046 fix; review clean, tsc clean). Implementer subagent's connection dropped mid-task but had already committed cleanly (verified independently). Fixed Important finding: base64url JWT payload decode (atob() needs standard base64, JWT segments are base64url). BASE for Task 5 = 1fe6046.
- Task 5: Returns list UI (status filters, fetch, table, deep-link) — complete (commit 53c841d; review clean, tsc+build clean). Both controller-flagged corrections (DRY loadReturns extraction, camelCase rename) verified actually applied, not just claimed.

## ALL 5 TASKS COMPLETE (2026-07-15). Proceeding to final whole-branch review.

## FINAL WHOLE-BRANCH REVIEW (opus): READY TO MERGE.
No Critical/Important findings. All disclosed deviations (Task 4 connection-drop recovery, base64url JWT fix, Task 5 DRY/naming corrections, deep-link https:// vs shopify:// judgment call) verified as correctly implemented, not just claimed. 4 Minor findings, all deferred (non-blocking):
1. ReturnsList's deep-link `shop` comes from client-decoded JWT rather than the API's already-verified `claims.shop` (API returns it unused) — cosmetic, no vulnerability (merchant's own signed session).
2. `retry()` fires an unguarded loadReturns() — narrow race if user switches tabs mid-retry, self-correcting.
3. `data.orders` not defensively defaulted to [] on malformed 2xx body — not reachable given the API's actual shape.
4. Plan text said "9 tests," actual is 8 (estimate typo, coverage is complete).

## RETURNS MANAGEMENT PAGE: COMPLETE (2026-07-15)
All 5 implementation tasks + 1 fix + final whole-branch review, done on main (commits a43608f..53c841d, 6 commits). 57/57 tests (whole suite), tsc clean, build clean. Pushed to origin/main (7856beb..53c841d). Settings page confirmed untouched in behavior (AppNav added, bootstrap logic unchanged). NOT YET DONE: manual live verification in the actual embedded Shopify admin app (needs a real deploy + session — flagged explicitly in the plan's Task 5 Step 6, not yet performed).

## POST-LAUNCH FOLLOW-UP FIXES (2026-07-15, commits 0943de2, d397fbd):
User live-tested and requested: scroll fix (html:has(#returns-management-root) was missing from
globals.css's scroll-enabling rules, only #merchant-app-root was covered — fixed), cursor-based
Next/Back pagination (20/page, backStack tracks visited cursors since Shopify only supports forward
pagination), darker row hover (bg-muted/40 -> bg-muted), MorphingInfinity animated SVG loader
(fetched verbatim via `npx shadcn@latest view @loading-ui/morphing-infinity`, already-installed
`motion` dependency) swapped in for all 3 s-spinner usages (Settings gate, Returns gate, Returns
list), collapsible policy-category rows in Settings (mirrored the existing sidebar-links
expand/collapse pattern). Then redesigned the list per user's screenshots of Shopify's own native
list view: real <table> (Order/Customer/Status/Date columns, whole row clickable + keyboard
accessible) replacing the div-row list, status filter tabs replaced with an <s-select> dropdown,
new "Sort by" dropdown (Date newest/oldest, Customer A-Z/Z-A) backed by Shopify's OrderSortKeys
enum (CREATED_AT/CUSTOMER_NAME — validated against live schema via validate_graphql_codeblocks
before implementing; return_status is NOT a valid sort key, confirmed). 62/62 tests, tsc clean,
build clean, pushed to origin/main.
- Table columns richness (commit 6ddf372): added Total/Payment status/Fulfillment status/Items
  columns matching Shopify's own native order-list view (per user screenshot of their "Return
  requests" saved view), colored return-status pill, Next/Back hidden entirely (not just disabled)
  when nothing to navigate. All new GraphQL fields validated against live schema, no new scope.
- Full Shopify-chrome match (commit b65f0b2): status filter converted from <s-select> to a
  "Return requested v" chevron dropdown (Popover-based, reuses existing components/ui/popover.tsx
  Radix component rather than Polaris web components, consistent with this session's established
  finding that Polaris custom elements are unreliable beyond basic form fields), added debounced
  search box feeding Shopify's orders query string, moved Sort by + added column show/hide into a
  single columns-icon popover, added Tags + Channel columns (validated against live schema, no new
  scope). Explicitly scoped OUT per user discussion: saved-view switcher for other statuses (only
  one view exists), row checkboxes/batch button (no bulk action exists), drag-to-reorder columns +
  persisted preference (session-only state instead). 65/65 tests, tsc clean, build clean.
- Full-width + default-columns fix (commit a956029): all 6 <s-page> elements (Settings + Returns,
  every loading/error/ready state) now use inlineSize="large" — s-page defaults to "base" (a
  constrained centered width), which is why our pages looked narrower than Shopify's own native
  Orders page. Also fixed column-picker defaults to exactly match Shopify's own: Date/Customer/
  Total/Return status/Payment status/Fulfillment status/Items visible by default, Tags/Channel
  start hidden (matches user's screenshot of the native "Display options" panel). 65/65 tests,
  tsc clean, build clean.
- Public s-table rewrite (commit 9b5d1a1): user found the ACTUAL public Shopify App Home Table
  component family (s-table/s-table-header-row/-header/-body/-row/-cell/s-badge, documented at
  shopify.dev/docs/api/app-home/web-components/layout-and-structure/table + the official "Index
  table" composition pattern doc) — this supersedes the earlier assumption that Shopify's table
  chrome was private/internal-only (that was only true of the s-internal-* elements the user's
  first HTML dump showed, which ARE private; the s-table-* family is genuinely public). Rewrote
  returns-list.tsx entirely on public components: s-table's native paginate/hasPreviousPage/
  hasNextPage/loading props replace our custom pagination buttons + MorphingInfinity spinner,
  s-popover+s-choice-list replace the Radix Popover status/sort/columns UI, s-badge replaces the
  custom colored pill, clickDelegate+s-link is the documented row-click pattern. Bundle size for
  /app/returns dropped ~31kB (180kB->149kB) from removing Radix Popover + lucide-react deps from
  this file. 65/65 tests, tsc clean, build clean. Also installed shopify-ai-toolkit Claude Code
  plugin (user-scoped) per explicit user request.
- Exact column set fix (commit 5152922): per user's explicit spec matching their Shopify reference
  screenshot/video, dropped Tags/Channel entirely and added Delivery method (Order.shippingLine.title,
  validated against live schema, no new scope). Final column set: Order, Date, Customer, Total,
  Return status, Payment status, Fulfillment status, Items, Delivery method — all visible by default.
  65/65 tests, tsc clean, build clean (retried after one transient Google Fonts network failure in
  first build attempt, unrelated to code).

## RETURNS MANAGEMENT TABLE UI: iteratively refined through 6 commits this session following live
user feedback comparing against Shopify's own native order list (0943de2 pagination/scroll/hover/
loader, d397fbd table+dropdowns, 6ddf372 richer columns, a956029 full-width+defaults, 9b5d1a1 public
s-table rewrite, 5152922 final column set). Current state: public Shopify s-table family components,
9 columns exactly matching user's reference, full-width pages, native pagination/loading via s-table
props. Ready for final live verification in the actual embedded Shopify admin app.

## MAJOR RETURNS PAGE OVERHAUL (2026-07-15, commit 9e1b970, deployed iblaze-returns-55):
Addressed a large bundled feedback list against Shopify's native order-list reference:
- Removed status filter entirely — page now ALWAYS queries return_status:return_requested only
  (user explicit: "we dont need... in progress or inspection or returned or failed").
- Added 2 new scopes (read_returns for return reasons; read_assigned/merchant_managed/
  third_party_fulfillment_orders for delivery status) — user approved via AskUserQuestion.
  IMPORTANT GOTCHA: `shopify app deploy` rejected read_marketplace_returns and
  read_marketplace_fulfillment_orders as invalid scopes even though the GraphQL schema
  validator listed them as "required" — they're OR-alternatives in the validator's output,
  not real separate grantable scopes. Removed both, deploy succeeded with the others.
- Payment/Fulfillment/Delivery status now render as real <s-badge tone=...> (tone mapped
  from enum value) instead of plain text.
- New Delivery status column via Order.fulfillments(first:1){displayStatus}.
- Items cell -> button opening a per-row <s-popover>, lazy-fetches via new
  GET /api/app/returns/items?orderId=... route (Order.lineItems + Order.returns.returnLineItems
  with return reason, needs inline fragment `... on ReturnLineItem` since ReturnLineItemType
  is an interface).
- Columns picker: added native HTML5 drag-and-drop reordering (no dnd library installed,
  built with draggable/onDragStart/onDragOver/onDragEnd + array splice reorder).
- Fixed header text wrapping: wrapped <s-table> in overflow-x-auto div + variant="table"
  forced (was defaulting to responsive "auto" which could switch to list layout).
- Explicitly SKIPPED (not asked, judgment call): the "Customer request" tooltip+icon from
  Shopify's native table — redundant now that every row on this page IS a customer return
  request by definition (status filter removed down to just that one state).
63/63 tests, tsc clean, build clean, shopify app deploy succeeded (iblaze-returns-55).

## LIVE BROWSER VERIFICATION AGAINST REAL SHOPIFY UI (2026-07-15, commit 5c1dd07):
User asked to actually browse the real Shopify order list rather than guess from screenshots.
Used mcp__plugin_superpowers-chrome_chrome__use_browser (persistent Chrome, user logged in manually
since I should never handle merchant credentials myself) to navigate to the exact saved-view URL
the user provided and inspect the live DOM/computed styles directly.

KEY FINDINGS (read directly off s-internal-badge tone/icon attributes via eval, not guessed):
- Only "Return requested" (tone=warning, icon=incomplete) and "Partially fulfilled" (tone=warning,
  icon=in-progress) are colored amber. EVERYTHING else — Paid, Fulfilled, Delivered, Partially
  refunded — is tone=null (plain neutral/grey badge with a small dot icon). My earlier
  implementation had invented success/info/critical tones for these that don't exist in the real
  UI — removed all of that, now matches exactly (F0F0F0-ish grey per user's original complaint).
- Items popover: clicked "View items" live, inspected DOM — it shows ONLY the actual RETURNED
  items (not all order line items), each as a bordered card: thumbnail, product title (linked),
  SKU as a Polaris-Tag pill below title, "× N" quantity top-right, bulleted "Return reason: X"
  list, with a "Return requested" badge header above all cards. Rewrote shapeOrderItemsResponse
  to source purely from Order.returns.returnLineItems (not Order.lineItems) — this also fixes the
  "failed to load items" bug the user hit (root cause: stale query shape mismatch after an earlier
  edit).
- NEW DISCOVERY: the "Delivered" badge is ALSO clickable — opens its own popover showing
  fulfillment name (e.g. "#1017-F1"), delivery date, and carrier+tracking number as a link
  (e.g. "Royal Mail: RN00000001GB"). Verified GraphQL fields via schema validator: Fulfillment.name/
  displayStatus/deliveredAt/estimatedDeliveryAt/trackingInfo{company,number,url} — all within
  existing scopes. Built new GET /api/app/returns/delivery route + matching popover, not previously
  requested but directly observed as missing functionality during the live comparison.
- Confirmed s-table's real font-size is 13.3px ("small") — same public component we already use,
  so density should already match once deployed; no code change needed there (not reproducible to
  verify further without deploying and opening our own embedded app, which needs a live Shopify
  session inside the iframe — flagged as still-unverified).
66/66 tests, tsc clean, build clean (3 API routes: returns, returns/items, returns/delivery).

## PIVOT: DEEP-LINK INSTEAD OF CUSTOM TABLE (2026-07-15, commit f1aacbb):
User asked directly: "rather than create the table, how can we get the same table that shopify use
and data and design?" Answered honestly: Shopify's real internal table components (s-internal-*)
are private, not exposed to third-party apps — only the public s-table family is available, which
can only ever approximate (not match) Shopify's real design. Proposed the actual better alternative:
deep-link straight to Shopify's own native Orders page instead of rebuilding it. User chose this via
AskUserQuestion (Recommended option).

MAJOR SIMPLIFICATION: entire custom table/badge/items-popover/delivery-popover implementation from
the last several commits (0943de2 through 5c1dd07) was REMOVED. Replaced with:
- lib/returns-management.ts: now just shapeReturnsCountResponse() (ordersCount GraphQL query) +
  buildNativeReturnsUrl(shop) — constructs https://admin.shopify.com/store/{handle}/orders?query=
  return_status:"return_requested"&selectedColumns=... (NOT a savedViewId URL — those are per-store,
  wouldn't exist for other merchants; query+selectedColumns alone reproduce the same filtered/
  columned view without that dependency).
- app/api/app/returns/route.ts: single lightweight GET returning {count, nativeUrl}.
- Deleted app/api/app/returns/items and .../delivery routes entirely (no popovers to feed anymore).
- components/app-returns-management/returns-list.tsx renamed to returns-summary.tsx
  (ReturnsSummary) — shows "N orders need attention" + a primary "Open in Shopify Orders" button
  (s-button with href+target="_blank", confirmed s-button supports link mode via docs). No longer
  needs the `shop` prop, so returns-management-gate.tsx's JWT base64url decode (added, then fixed,
  then now entirely deleted) was removed too — one fewer thing that can break.
- shopify.app.toml scopes UNCHANGED (read_returns + fulfillment-order scopes from the earlier
  deploy stay — confirmed still genuinely used by the pre-existing customer-portal get-orders route,
  not orphaned).
/app/returns bundle: 4.29kB -> 1.69kB. 54/54 tests (down from 66 — removed table/popover-specific
tests along with the feature), tsc clean, build clean.

## AUTO-REDIRECT, SAME TAB (2026-07-15, commit d047806):
User wanted "Returns" nav to just open the native URL directly, no count/text. Clarified via
AskUserQuestion twice: (1) auto-redirect vs single button -> auto-redirect chosen; (2) surfaced a
real technical constraint before implementing blindly -- window.open() for a NEW TAB cannot be
reliably auto-triggered without a direct user click (browser popup blockers silently block it when
fired from a useEffect/async chain with no gesture in the call stack) -- offered same-tab redirect
as the reliable alternative, user chose it.
Implementation: real <a target="_top"> element, populated with the nativeUrl once fetched, then
.click()'d programmatically (App Bridge's documented pattern for breaking out of the app's iframe
to a Shopify admin page — target="_top" is required because Shopify's own admin pages set
X-Frame-Options and refuse to render inside another app's iframe, so same-iframe navigation would
just show a blank/broken embed). Also dropped the ordersCount GraphQL call entirely since the UI no
longer shows a count — GET /api/app/returns is now just an auth check + pure URL builder, zero
Shopify API calls. 52/52 tests, tsc clean, build clean. /app/returns bundle down to 1.58kB.

## RETURNS MANAGEMENT: FINAL SHAPE (as of 2026-07-15)
Sidebar "Returns" entry -> auth bootstrap -> immediate same-tab top-level redirect to Shopify's own
native Orders page, pre-filtered (return_status:"return_requested") and pre-columned (Order/Date/
Customer/Total/Return status/Payment status/Fulfillment status/Items/Delivery method/Delivery
status) via query+selectedColumns URL params. No custom table, no custom badges, no popovers —
all of that was built, then removed, across this session once the user found the private/public
Polaris component distinction and decided deep-linking to the real page was strictly better than
approximating it. NOT YET DONE: live verification in the actual embedded Shopify admin app (still
flagged from the original plan, never yet performed with a real embedded session).

## SWITCHED TO NEW-TAB (2026-07-16, commit 5904d5f):
User found the same-tab target="_top" breakout showed a visible "container" flash (our own loading
spinner page) before navigating away, and asked for a new tab instead. Implemented the standard
popup-blocker-safe pattern: window.open(url, '_blank') attempted automatically; its return value
(null/undefined when blocked, a window handle when it succeeds) is checked directly rather than
assumed — no try/catch needed since blocked opens don't throw, they just return null. On success,
our own tab shows a one-line "opened in a new tab" confirmation (no longer navigates our own page
away at all, unlike the previous target="_top" version). On block, shows a real click-to-open
<s-button href target="_blank"> as a guaranteed-reliable fallback. 52/52 tests, tsc clean, build
clean, /app/returns bundle 1.63kB.

## FINAL: RELIABLE CLICK-THROUGH, NO AUTO-OPEN ATTEMPT (2026-07-16, commit 87d7df2):
User asked Shopify Sidekick whether new-tab auto-open was possible; Sidekick independently confirmed
the exact constraint already raised in this session: window.open() only reliably succeeds as the
direct synchronous result of a real click, not from an async chain (useEffect after token-exchange
+ fetch). Rather than keep the "attempt auto-open, fall back to a button if window.open() returns
null" approach (which still LOOKED automatic but was really a coin-flip masked by a fallback), simplified
to the honest, always-reliable version: render nothing but a loading spinner until the URL is ready,
then show one real <a target="_blank">-backed <s-button> the merchant clicks themselves. This is
the ONLY combination confirmed reliable by both MDN's user-activation model and Shopify's Sidekick.
52/52 tests, tsc clean, build clean, /app/returns bundle 1.52kB (smallest yet).

## RETURNS MANAGEMENT: TRULY FINAL SHAPE (as of 2026-07-16)
Sidebar "Returns" -> auth bootstrap -> single "Open return requests" button -> click opens
Shopify's native Orders page (pre-filtered return_status:"return_requested", pre-columned) in a
new tab via a real <a target="_blank">. No auto-redirect, no auto-open attempt, no custom table.
Went through same-tab auto-redirect -> attempted-new-tab-with-fallback -> this final reliable
click-through version across 3 iterations this session, each driven by direct user feedback/
external verification (Sidekick). NOT YET DONE: live verification in the actual embedded Shopify
admin app.

---

# Merchant Dashboard — Progress Ledger

Plan: docs/superpowers/plans/2026-07-16-merchant-dashboard.md
Branch: main (established direct-to-main workflow — no feature branch/worktree)
Mode: subagent-driven-development, fresh implementer + reviewer per task

## Tasks
(starting now)
- Task 1: dashboard stats date/key helpers + aggregation logic — complete (commit 9a0bf0f; review clean, 16 vitest tests, tsc clean). BASE for Task 2 = 9a0bf0f.
- Task 2: orders/create webhook handler — complete (commit f5b1de1; review clean, tsc clean). BASE for Task 3 = f5b1de1.
- Task 3: returns/request webhook handler (returns/reasons/products) — complete (commit f9d3e37; review clean, tsc clean). Error-isolation requirement (product-resolution failure must not block returns/reasons commits or the 200 response) traced and confirmed correct by reviewer. Minor findings deferred (quantity type/guard inconsistency, dense one-liner, sequential hincrby loop). BASE for Task 4 = f9d3e37.
- Task 4: complete (commit 8795136; review clean, spec compliance approved, sum-then-convert minor-units ordering verified). BASE for Task 5 = 8795136.
- Task 5: complete (commit f23334d; review clean, pipeline API verified against real @upstash/redis .d.ts, spec/quality approved). BASE for Task 6 = f23334d.
- Task 6: complete (commit 5d94cb2; review clean, spec/quality approved. Minor nits deferred: GateState uses plain string+separate errorMessage instead of merchant-app-gate.tsx's discriminated union; list keys off reason/title not guaranteed-unique). BASE for Task 7 = 5d94cb2.
- Task 7 (verification): vitest 68/68 pass, tsc clean, production build succeeds — /api/app/dashboard and all 3 new webhook routes (/api/webhooks/orders-create, returns-request, refunds-create) present in build output, /app/returns route present (1.99 kB). Steps 4-6 (shopify app deploy, git push origin main, manual live verification) require user's own CLI session / dev store — handed back to user, not run unattended.
