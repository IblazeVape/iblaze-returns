import { NextRequest, NextResponse } from "next/server";
import { verifyAppProxySignature, parseProxyRequest } from "@/lib/app-proxy";
import { getTenant } from "@/lib/tenant";
import { shopifyAdmin } from "@/lib/shopify";
import { redis } from "@/lib/redis";
import { guestOrderMatches } from "@/lib/guest-order-match";
import { buildAppsReturnsSession } from "@/lib/apps-returns-session";

export const dynamic = "force-dynamic";

const RATE_LIMIT_MAX_ATTEMPTS = 8;
const RATE_LIMIT_WINDOW_SECONDS = 15 * 60;

/**
 * Guest order lookup — served under the App Proxy path (theirstore.com/apps/
 * returns/guest-lookup), NOT /api/*: the browser is on the storefront domain
 * (via the proxied page), so a client fetch to a relative path re-enters
 * Shopify's App Proxy, which appends its own signed query params to this
 * request too (GET or POST). We verify that signature here and take `shop`
 * from it — not from the request body — so shop can't be spoofed by the
 * client.
 *
 * For customers who checked out WITHOUT a Shopify account (no
 * logged_in_customer_id available at all). Verifies order number + email +
 * shipping postcode (three factors) against the tenant's own Shopify data via
 * the merchant's admin token — no account/login required. Rate-limited per
 * shop+IP to prevent brute-forcing order numbers.
 */
export async function POST(request: NextRequest) {
  const secret = process.env.SHOPIFY_CLIENT_SECRET;
  const signedOk = !!secret && verifyAppProxySignature(request.nextUrl.searchParams, secret);
  if (!signedOk) {
    return NextResponse.json({ error: "invalid proxy request" }, { status: 401 });
  }
  const { shop } = parseProxyRequest(request.nextUrl.searchParams);
  if (!shop) return NextResponse.json({ error: "unknown store" }, { status: 400 });

  const body = await request.json().catch(() => null);
  const orderNumber = typeof body?.orderNumber === "string" ? body.orderNumber.trim() : "";
  const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
  const postcode = typeof body?.postcode === "string" ? body.postcode : "";

  if (!orderNumber || !email || !postcode) {
    return NextResponse.json(
      { error: "orderNumber, email and postcode are required" },
      { status: 400 }
    );
  }

  const tenant = await getTenant(shop);
  if (!tenant?.accessToken) {
    return NextResponse.json({ error: "unknown store" }, { status: 404 });
  }

  // Rate limit: N attempts per shop+IP per window.
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const rateLimitKey = `guest-lookup-attempts:${shop}:${ip}`;
  const attempts = await redis.incr(rateLimitKey);
  if (attempts === 1) await redis.expire(rateLimitKey, RATE_LIMIT_WINDOW_SECONDS);
  if (attempts > RATE_LIMIT_MAX_ATTEMPTS) {
    return NextResponse.json(
      { error: "Too many attempts. Please try again later." },
      { status: 429 }
    );
  }

  const normalizedOrderNumber = orderNumber.replace(/^#/, "");

  try {
    const data = await shopifyAdmin(
      shop,
      `query GuestOrderLookup($query: String!) {
        orders(first: 1, query: $query) {
          edges {
            node {
              id name email createdAt displayFulfillmentStatus displayFinancialStatus
              shippingAddress { zip }
            }
          }
        }
      }`,
      { query: `name:#${normalizedOrderNumber}` },
      "GuestOrderLookup"
    );

    const order = data?.orders?.edges?.[0]?.node;

    if (!guestOrderMatches(order, email, postcode)) {
      return NextResponse.json(
        { error: "No order found matching that order number, email and postcode." },
        { status: 404 }
      );
    }

    // Successful match — reset the rate-limit counter for this shop+IP.
    await redis.del(rateLimitKey);

    // Scope the session to ONLY this order (not the full history under this
    // email) — verifying one order isn't proof of ownership of every order
    // ever placed with that email.
    const cookie = buildAppsReturnsSession(shop, email, order.id);

    const response = NextResponse.json({
      ok: true,
      order: {
        id: order.id,
        name: order.name,
        createdAt: order.createdAt,
        fulfillmentStatus: order.displayFulfillmentStatus,
        financialStatus: order.displayFinancialStatus,
      },
    });
    response.cookies.set(cookie.name, cookie.value, {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      path: "/",
      maxAge: cookie.maxAge,
    });
    // Non-httpOnly marker, same as the logged-in session route, so the client
    // can confirm Set-Cookie actually reached the browser before reloading.
    response.cookies.set("apps_returns_marker", "1", {
      httpOnly: false,
      secure: true,
      sameSite: "lax",
      path: "/",
      maxAge: cookie.maxAge,
    });
    return response;
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
