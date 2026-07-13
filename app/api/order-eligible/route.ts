import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { shopifyAdmin } from "@/lib/shopify";
import { getAdminReturnableInfo } from "@/lib/returnEligibility";
import { redis } from "@/lib/redis";
import { getRequestShop } from "@/lib/request-shop";
import { getTenant } from "@/lib/tenant";

export const dynamic = "force-dynamic";

const CLIENT_ID = "699e9ffee4fd5d72b8126884d37584be";
const SIGNING_SECRETS = [
  process.env.SHOPIFY_CLIENT_SECRET,
  process.env.CUSTOMER_API_CLIENT_SECRET,
].filter((s): s is string => !!s);

const CACHE_TTL_SECONDS = 3600;

// Extensions run in a Web Worker with a null origin — must use wildcard, not
// the specific domain, otherwise CORS is rejected.
const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Authorization, Content-Type",
  "Access-Control-Max-Age": "86400",
  "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

type SessionClaims = { sub?: string; aud?: string; dest?: string; exp?: number };

function verifySessionToken(token: string): SessionClaims | null {
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [header, payload, signature] = parts;
  const sigBuf = Buffer.from(signature);
  const valid = SIGNING_SECRETS.some((secret) => {
    const expected = crypto.createHmac("sha256", secret).update(`${header}.${payload}`).digest("base64url");
    const b = Buffer.from(expected);
    return sigBuf.length === b.length && crypto.timingSafeEqual(sigBuf, b);
  });
  if (!valid) return null;
  let claims: SessionClaims;
  try {
    claims = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
  } catch { return null; }
  const now = Math.floor(Date.now() / 1000);
  if (claims.exp && now > claims.exp) return null;
  return claims;
}

const numericFromGid = (s: string | undefined | null) =>
  (s || "").includes("/") ? s!.split("/").pop() ?? "" : s || "";

async function getCached(orderGid: string): Promise<boolean | null> {
  try {
    const v = await redis.get<string>(`oe:${orderGid}`);
    if (v === "1") return true;
    if (v === "0") return false;
  } catch { /* ignore */ }
  return null;
}

async function setCached(orderGid: string, eligible: boolean): Promise<void> {
  try { await redis.set(`oe:${orderGid}`, eligible ? "1" : "0", { ex: CACHE_TTL_SECONDS }); } catch { /* ignore */ }
}

export async function GET(req: NextRequest) {
  try {
    const auth = req.headers.get("authorization") || "";
    const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
    const claims = token ? verifySessionToken(token) : null;
    // Fail open if no valid token — compute but don't cache (can't verify ownership)
    if (!claims) {
      console.log(`[order-eligible] unverified token`);
    }

    // This endpoint is called directly from the customer-account UI
    // extension (a fetch with only an Authorization header — no App Proxy
    // signed params, no apps-returns-session cookie/header), so
    // getRequestShop() can never resolve the real tenant here; it was
    // silently falling back to iBlaze's own legacy env var for EVERY
    // tenant, which queried the wrong shop's admin API for any other
    // installed store and made "Start a Return" never appear for them.
    // The session token's own `dest` claim (verified above) is this
    // request's actual, trustworthy shop identity — use that instead.
    const destShop = claims?.dest?.match(/([a-z0-9-]+\.myshopify\.com)/i)?.[1] ?? null;
    const ctx = destShop ? { shop: destShop } : await getRequestShop(req);
    if (!ctx) return NextResponse.json({ eligible: true, reason: "no-shop" }, { headers: CORS_HEADERS });
    const { shop } = ctx;
    const tenant = await getTenant(shop);
    const returnWindowDays = tenant?.returnWindowDays ?? 30;

    const orderParam = req.nextUrl.searchParams.get("order") || "";
    if (!orderParam) return NextResponse.json({ eligible: true, reason: "no-order", shop }, { headers: CORS_HEADERS });

    const orderGid = orderParam.includes("gid://") ? orderParam : `gid://shopify/Order/${orderParam}`;

    const cached = await getCached(orderGid);
    if (cached !== null) return NextResponse.json({ eligible: cached, source: "cache", shop }, { headers: CORS_HEADERS });

    const data = await shopifyAdmin(
      shop,
      `query OrderEligibility($id: ID!) {
        order(id: $id) {
          id
          customer { id }
          fulfillments(first: 10) {
            displayStatus deliveredAt updatedAt
            fulfillmentLineItems(first: 100) {
              edges { node { quantity lineItem { id } } }
            }
          }
        }
      }`,
      { id: orderGid }
    );

    const order = data?.order;
    if (!order) return NextResponse.json({ eligible: false, reason: "order-not-found", shop }, { headers: CORS_HEADERS });

    if (claims) {
      const sub = numericFromGid(claims.sub);
      const owner = numericFromGid(order.customer?.id);
      if (sub && owner && sub !== owner) {
        return NextResponse.json({ eligible: false, reason: "not-owner", shop }, { headers: CORS_HEADERS });
      }
    }

    const deliveredAt: Record<string, Date> = {};
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    for (const f of (order.fulfillments || []) as any[]) {
      if (f.displayStatus !== "DELIVERED") continue;
      const d = f.deliveredAt ? new Date(f.deliveredAt) : f.updatedAt ? new Date(f.updatedAt) : null;
      if (!d) continue;
      for (const e of f.fulfillmentLineItems?.edges || []) {
        const lid = e.node.lineItem?.id;
        if (!lid) continue;
        if (!deliveredAt[lid] || d > deliveredAt[lid]) deliveredAt[lid] = d;
      }
    }

    const { returnableItems } = await getAdminReturnableInfo(shop, orderGid);
    const now = Date.now();
    let eligible = false;
    for (const [lid, qty] of Object.entries(returnableItems)) {
      if (qty <= 0) continue;
      const delivered = deliveredAt[lid];
      if (!delivered) continue;
      if ((now - delivered.getTime()) / (1000 * 60 * 60 * 24) <= returnWindowDays) {
        eligible = true;
        break;
      }
    }

    if (claims) await setCached(orderGid, eligible);
    console.log(`[order-eligible] shop=${shop} order=${orderParam} eligible=${eligible} verified=${!!claims}`);
    return NextResponse.json({ eligible, shop }, { headers: CORS_HEADERS });
  } catch (err) {
    console.error("order-eligible error:", err instanceof Error ? err.message : String(err));
    return NextResponse.json({ eligible: true, reason: "error" }, { headers: CORS_HEADERS });
  }
}
