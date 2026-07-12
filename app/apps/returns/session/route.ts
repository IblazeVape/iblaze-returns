import { NextRequest, NextResponse } from "next/server";
import { verifyAppProxySignature, parseProxyRequest } from "@/lib/app-proxy";
import { getTenant } from "@/lib/tenant";
import { shopifyAdmin } from "@/lib/shopify";
import { buildAppsReturnsSession } from "@/lib/apps-returns-session";

export const dynamic = "force-dynamic";

/**
 * Mints the apps_returns_session cookie for a logged-in customer, then
 * redirects back to /apps/returns. Reached via a redirect FROM that page
 * (which Shopify re-signs fresh, same mechanism as every other request
 * through the proxied path). Once the cookie is set, /apps/returns renders
 * DashboardClient directly and its own fetches (get-orders etc.) resolve the
 * shop from this session — no proxy signature needed on those.
 *
 * IMPORTANT: redirects here MUST use a bare relative Location header, not an
 * absolute URL. `request.url` on our server is always our own Vercel origin
 * (Shopify fetches us server-side) — NextResponse.redirect(new URL(path,
 * request.url)) silently builds an absolute URL pointing at OUR domain, and
 * once Shopify sees an absolute Location for a different host it just sends
 * the browser straight there, breaking out of the proxy entirely (confirmed
 * live: this exact bug sent customers to iblaze-returns.vercel.app/apps/
 * returns, which then correctly rejects the now-unsigned direct hit). A
 * manually-constructed relative Location keeps the browser on the storefront
 * domain, same as the proven-working Server Component redirect() elsewhere
 * in this flow.
 */
function relativeRedirect(): NextResponse {
  return new NextResponse(null, { status: 307, headers: { Location: "/apps/returns" } });
}

export async function GET(request: NextRequest) {
  const secret = process.env.SHOPIFY_CLIENT_SECRET;
  const signedOk = !!secret && verifyAppProxySignature(request.nextUrl.searchParams, secret);
  if (!signedOk) return relativeRedirect();

  const { shop, loggedInCustomerId } = parseProxyRequest(request.nextUrl.searchParams);
  if (!shop || !loggedInCustomerId) return relativeRedirect();

  const tenant = await getTenant(shop);
  if (!tenant?.accessToken) return relativeRedirect();

  let email = "";
  try {
    const gid = `gid://shopify/Customer/${loggedInCustomerId}`;
    const data = await shopifyAdmin(
      shop,
      `query GetCustomer($id: ID!) { customer(id: $id) { email } }`,
      { id: gid },
      "AppProxySessionCustomerLookup"
    );
    email = data?.customer?.email ?? "";
  } catch {
    return relativeRedirect();
  }
  if (!email) return relativeRedirect();

  const cookie = buildAppsReturnsSession(shop, email); // orderScope "" = full order history
  const response = relativeRedirect();
  response.cookies.set(cookie.name, cookie.value, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: cookie.maxAge,
  });
  return response;
}
