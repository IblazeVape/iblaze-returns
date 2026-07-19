import { NextRequest, NextResponse } from "next/server";
import { verifyAppProxySignature, parseProxyRequest } from "@/lib/app-proxy";
import { getTenant } from "@/lib/tenant";
import { shopifyAdmin } from "@/lib/shopify";
import { redis } from "@/lib/redis";
import { guestOrderMatches, loggedInOrderMatches } from "@/lib/guest-order-match";
import { buildAppsReturnsSession } from "@/lib/apps-returns-session";

export const dynamic = "force-dynamic";

const RATE_LIMIT_MAX_ATTEMPTS = 8;
const RATE_LIMIT_WINDOW_SECONDS = 15 * 60;

/**
 * Order lookup — served under the App Proxy path (theirstore.com/apps/
 * returns/guest-lookup), NOT /api/*: the browser is on the storefront domain
 * (via the proxied page), so a client fetch to a relative path re-enters
 * Shopify's App Proxy, which appends its own signed query params to this
 * request too (GET or POST). We verify that signature here and take `shop`
 * (and, if present, `logged_in_customer_id`) from it — not from the request
 * body — so neither can be spoofed by the client.
 *
 * Two verification paths, both requiring order number + email:
 *  - Logged into the store (logged_in_customer_id present — only reachable
 *    when the merchant's alwaysShowGuestLookup Settings toggle is on, see
 *    app/apps/returns/[[...slug]]/page.tsx): the order must belong to that
 *    exact customer AND the email must match. No postcode needed — the
 *    login itself is the third factor a guest doesn't have.
 *  - Guest checkout (no logged_in_customer_id): email always required, plus
 *    shipping postcode too unless the merchant's guestLookupRequirePostcode
 *    Settings toggle is off.
 *
 * Rate-limited per shop+IP to prevent brute-forcing order numbers.
 */
export async function POST(request: NextRequest) {
  const secret = process.env.SHOPIFY_CLIENT_SECRET;
  const signedOk = !!secret && verifyAppProxySignature(request.nextUrl.searchParams, secret);
  if (!signedOk) {
    return NextResponse.json({ error: "invalid proxy request" }, { status: 401 });
  }
  const { shop, loggedInCustomerId } = parseProxyRequest(request.nextUrl.searchParams);
  if (!shop) return NextResponse.json({ error: "unknown store" }, { status: 400 });

  const body = await request.json().catch(() => null);
  const orderNumber = typeof body?.orderNumber === "string" ? body.orderNumber.trim() : "";
  const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
  const postcode = typeof body?.postcode === "string" ? body.postcode : "";

  if (!orderNumber || !email) {
    return NextResponse.json({ error: "orderNumber and email are required" }, { status: 400 });
  }

  const tenant = await getTenant(shop);
  if (!tenant?.accessToken) {
    return NextResponse.json({ error: "unknown store" }, { status: 404 });
  }

  const requirePostcode = !loggedInCustomerId && tenant.branding.guestLookupRequirePostcode;
  if (requirePostcode && !postcode) {
    return NextResponse.json({ error: "orderNumber, email and postcode are required" }, { status: 400 });
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
              statusPageUrl
              shippingAddress { zip }
              customer { id }
            }
          }
        }
      }`,
      { query: `name:#${normalizedOrderNumber}` },
      "GuestOrderLookup"
    );

    const order = data?.orders?.edges?.[0]?.node;

    const matched = loggedInCustomerId
      ? loggedInOrderMatches(order, email, loggedInCustomerId)
      : guestOrderMatches(order, email, postcode, requirePostcode);

    if (!matched) {
      return NextResponse.json(
        {
          error: loggedInCustomerId
            ? "No order found matching that order number and email on your account."
            : requirePostcode
              ? "No order found matching that order number, email and postcode."
              : "No order found matching that order number and email.",
        },
        { status: 404 }
      );
    }

    // Successful match — reset the rate-limit counter for this shop+IP.
    await redis.del(rateLimitKey);

    // Scope the session to ONLY this order (not the full history under this
    // email) — verifying one order isn't proof of ownership of every order
    // ever placed with that email.
    const cookie = buildAppsReturnsSession(shop, email, order.id);

    // Session token returned in the JSON body, not (only) via Set-Cookie:
    // confirmed live that Shopify's App Proxy strips Set-Cookie on the way
    // back to the browser. The client stores this in localStorage instead.
    return NextResponse.json({
      ok: true,
      session: cookie.value,
      order: {
        id: order.id,
        name: order.name,
        createdAt: order.createdAt,
        fulfillmentStatus: order.displayFulfillmentStatus,
        financialStatus: order.displayFinancialStatus,
        statusPageUrl: order.statusPageUrl ?? null,
      },
    });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
