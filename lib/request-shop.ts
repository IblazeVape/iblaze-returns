import { resolveTenant } from "@/lib/resolve-tenant";
import { parseCookies } from "@/lib/auth";
import { validateAppsReturnsSession, APPS_RETURNS_COOKIE_NAME } from "@/lib/apps-returns-session";

// Returns the shop for a request, trying in order:
//  1. A signed App Proxy request (the initial page load through Shopify).
//  2. The apps_returns_session cookie — DashboardClient's OWN fetches (e.g.
//     /api/get-orders) are plain browser requests with no proxy signature on
//     them, so the shop is identified from the session minted at the signed
//     page load instead. Works for ANY tenant, not just iBlaze.
//  3. The legacy iBlaze store (tenant #1), so the existing / portal keeps working.
export async function getRequestShop(
  request: Request
): Promise<{ shop: string; loggedInCustomerId: string | null } | null> {
  const resolved = await resolveTenant(request);
  if (resolved) return { shop: resolved.tenant.shop, loggedInCustomerId: resolved.loggedInCustomerId };

  const cookieHeader = request.headers.get("cookie");
  const appsSession = validateAppsReturnsSession(parseCookies(cookieHeader)[APPS_RETURNS_COOKIE_NAME]);
  if (appsSession.valid && appsSession.shop) {
    return { shop: appsSession.shop, loggedInCustomerId: null };
  }

  const legacy = process.env.SHOPIFY_STORE_URL;
  if (legacy) return { shop: legacy, loggedInCustomerId: null };
  return null;
}
