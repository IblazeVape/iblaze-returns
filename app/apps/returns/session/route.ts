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
 */
export async function GET(request: NextRequest) {
  const to = new URL("/apps/returns", request.url);

  const secret = process.env.SHOPIFY_CLIENT_SECRET;
  const signedOk = !!secret && verifyAppProxySignature(request.nextUrl.searchParams, secret);
  if (!signedOk) return NextResponse.redirect(to);

  const { shop, loggedInCustomerId } = parseProxyRequest(request.nextUrl.searchParams);
  if (!shop || !loggedInCustomerId) return NextResponse.redirect(to);

  const tenant = await getTenant(shop);
  if (!tenant?.accessToken) return NextResponse.redirect(to);

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
    return NextResponse.redirect(to);
  }
  if (!email) return NextResponse.redirect(to);

  const cookie = buildAppsReturnsSession(shop, email); // orderScope "" = full order history
  const response = NextResponse.redirect(to);
  response.cookies.set(cookie.name, cookie.value, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: cookie.maxAge,
  });
  return response;
}
