import { NextRequest, NextResponse } from "next/server";
import { getTenant } from "@/lib/tenant";
import { shopifyAdmin } from "@/lib/shopify";
import { redis } from "@/lib/redis";

export const dynamic = "force-dynamic";

const RATE_LIMIT_MAX_ATTEMPTS = 8;
const RATE_LIMIT_WINDOW_SECONDS = 15 * 60;

function normalizePostcode(v: string): string {
  return v.trim().toUpperCase().replace(/\s+/g, "");
}

/**
 * Guest order lookup — for customers who checked out WITHOUT a Shopify
 * account (guest checkout has no `logged_in_customer_id`, so the App Proxy
 * signed-customer path can't identify them). Verifies order number + email +
 * shipping postcode (three factors) against the tenant's own Shopify data via
 * the merchant's admin token. No Shopify account or login required. The
 * refund/return still resolves against the original order's payment method,
 * and postcode is added as a second factor beyond email to make guessing
 * meaningfully harder (the standard hardening for this guest-lookup pattern).
 * Rate-limited per shop+IP to prevent brute-forcing order numbers.
 */
export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const shop = typeof body?.shop === "string" ? body.shop : "";
  const orderNumber = typeof body?.orderNumber === "string" ? body.orderNumber.trim() : "";
  const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
  const postcode = typeof body?.postcode === "string" ? body.postcode : "";

  if (!shop || !orderNumber || !email || !postcode) {
    return NextResponse.json(
      { error: "shop, orderNumber, email and postcode are required" },
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
  const normalizedPostcode = normalizePostcode(postcode);

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
    const emailMatches = order?.email && order.email.toLowerCase() === email;
    const postcodeMatches =
      order?.shippingAddress?.zip && normalizePostcode(order.shippingAddress.zip) === normalizedPostcode;

    if (!emailMatches || !postcodeMatches) {
      return NextResponse.json(
        { error: "No order found matching that order number, email and postcode." },
        { status: 404 }
      );
    }

    // Successful match — reset the rate-limit counter for this shop+IP.
    await redis.del(rateLimitKey);

    return NextResponse.json({
      ok: true,
      order: {
        id: order.id,
        name: order.name,
        createdAt: order.createdAt,
        fulfillmentStatus: order.displayFulfillmentStatus,
        financialStatus: order.displayFinancialStatus,
      },
    });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
