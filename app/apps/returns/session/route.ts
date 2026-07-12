import { NextRequest, NextResponse } from "next/server";
import { verifyAppProxySignature, parseProxyRequest } from "@/lib/app-proxy";
import { getTenant } from "@/lib/tenant";
import { shopifyAdmin } from "@/lib/shopify";
import { buildAppsReturnsSession } from "@/lib/apps-returns-session";

export const dynamic = "force-dynamic";

/**
 * Mints the apps_returns_session cookie for a logged-in customer. Called via
 * a CLIENT-SIDE fetch from the browser (see components/apps-returns/mint-
 * session.tsx), never a server-side redirect: ANY redirect Location header
 * our server emits gets normalized to an absolute URL on OUR OWN Vercel
 * origin — confirmed live, even when manually constructing the Response with
 * a literal relative Location string. Once Shopify sees that absolute
 * foreign-host Location it sends the browser straight there, breaking out of
 * the proxy entirely. A browser-issued fetch to a relative path, by contrast,
 * naturally stays on the storefront domain and re-enters Shopify's App Proxy,
 * which signs it fresh — the same mechanism already proven working for the
 * guest-lookup route. Returns JSON, not a redirect; the client reloads on
 * success.
 */
export async function GET(request: NextRequest) {
  const secret = process.env.SHOPIFY_CLIENT_SECRET;
  const signedOk = !!secret && verifyAppProxySignature(request.nextUrl.searchParams, secret);
  if (!signedOk) return NextResponse.json({ error: "invalid proxy request" }, { status: 401 });

  const { shop, loggedInCustomerId } = parseProxyRequest(request.nextUrl.searchParams);
  if (!shop || !loggedInCustomerId) {
    return NextResponse.json({ error: "not logged in" }, { status: 400 });
  }

  const tenant = await getTenant(shop);
  if (!tenant?.accessToken) {
    return NextResponse.json({ error: "store not set up" }, { status: 404 });
  }

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
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
  if (!email) return NextResponse.json({ error: "no email on file for this account" }, { status: 404 });

  const cookie = buildAppsReturnsSession(shop, email); // orderScope "" = full order history
  const response = NextResponse.json({ ok: true });
  response.cookies.set(cookie.name, cookie.value, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: cookie.maxAge,
  });
  return response;
}
