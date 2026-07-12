import { resolveTenant } from "@/lib/resolve-tenant";
import { parseCookies } from "@/lib/auth";
import { validateAppsReturnsSession, APPS_RETURNS_COOKIE_NAME } from "@/lib/apps-returns-session";

const APPS_RETURNS_SESSION_HEADER = "x-apps-returns-session";

// Returns the shop for a request, trying in order:
//  1. A signed App Proxy request (the initial page load through Shopify).
//  2. The x-apps-returns-session HEADER — DashboardClient's own fetches
//     (e.g. /api/get-orders) carry no proxy signature, so identity travels
//     via this header instead of a cookie: Shopify's App Proxy strips
//     Set-Cookie on the way back to the browser (confirmed live), so the
//     session token is returned in a JSON body and attached to fetches
//     client-side (lib/apps-returns-client-session.ts) rather than relying
//     on the browser's cookie jar.
//  3. The apps_returns_session COOKIE, kept as a fallback in case Set-Cookie
//     does survive in some environment/browser.
//  4. The legacy iBlaze store (tenant #1), so the existing / portal keeps working.
export async function getRequestShop(
  request: Request
): Promise<{ shop: string; loggedInCustomerId: string | null } | null> {
  const resolved = await resolveTenant(request);
  if (resolved) return { shop: resolved.tenant.shop, loggedInCustomerId: resolved.loggedInCustomerId };

  const headerSession = validateAppsReturnsSession(request.headers.get(APPS_RETURNS_SESSION_HEADER));
  if (headerSession.valid && headerSession.shop) {
    return { shop: headerSession.shop, loggedInCustomerId: null };
  }

  const cookieHeader = request.headers.get("cookie");
  const cookieSession = validateAppsReturnsSession(parseCookies(cookieHeader)[APPS_RETURNS_COOKIE_NAME]);
  if (cookieSession.valid && cookieSession.shop) {
    return { shop: cookieSession.shop, loggedInCustomerId: null };
  }

  const legacy = process.env.SHOPIFY_STORE_URL;
  if (legacy) return { shop: legacy, loggedInCustomerId: null };
  return null;
}
