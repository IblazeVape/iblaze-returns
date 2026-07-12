import { NextRequest, NextResponse } from "next/server";
import { verifyAppProxySignature, parseProxyRequest } from "@/lib/app-proxy";
import { getTenant } from "@/lib/tenant";
import { shopifyAdmin } from "@/lib/shopify";
import { buildAppsReturnsSession } from "@/lib/apps-returns-session";

export const dynamic = "force-dynamic";

/**
 * Mints a session for a logged-in customer. Called via a CLIENT-SIDE fetch
 * from the browser (see components/apps-returns/client-portal-gate.tsx),
 * never a server-side redirect — see the historical note in that file for
 * why. Returns the signed session token in the JSON body, NOT (only) via
 * Set-Cookie: confirmed live via a non-httpOnly marker cookie that
 * Set-Cookie does not survive the round trip through Shopify's App Proxy
 * (Shopify strips it — App Proxy is a content-forwarding mechanism, not a
 * session-cookie one). The client stores the returned token in localStorage
 * and attaches it to DashboardClient's own API fetches itself.
 *
 * POST, not GET: this mints a live session token into the JSON body, and a
 * GET endpoint is trivially visitable by pasting the URL into a browser
 * (Shopify signs the App Proxy request regardless of how it's reached) —
 * that rendered the token in plain, screenshottable JSON. POST doesn't stop
 * a curious customer from finding it in their own DevTools Network tab
 * (unavoidable — it's their own request), but it does stop the plain
 * "visit this link" exposure.
 */
export async function POST(request: NextRequest) {
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
  return NextResponse.json({ ok: true, session: cookie.value });
}
