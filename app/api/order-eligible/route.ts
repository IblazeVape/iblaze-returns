import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { shopifyAdmin } from "@/lib/shopify";
import { getAdminReturnableInfo } from "@/lib/returnEligibility";

// Called by the customer-account UI extension to decide whether to render the
// "Start a Return" button. Eligibility is computed purely from the Admin API so
// it works regardless of whether Shopify's native self-serve returns (and the
// returnInformation Customer Account API) are enabled.
//
// Auth: the extension passes a Shopify session token (signed JWT) as a Bearer
// token. We verify it with the app's client secret and confirm the order belongs
// to the authenticated customer before returning a yes/no answer.
export const dynamic = "force-dynamic";

const SHOP = process.env.SHOPIFY_STORE_URL!;
const CLIENT_ID = "699e9ffee4fd5d72b8126884d37584be"; // matches shopify.app.toml
// Session tokens are signed with the app client secret. Accept either configured
// secret so a naming mismatch can't silently break verification.
const SIGNING_SECRETS = [
  process.env.SHOPIFY_CLIENT_SECRET,
  process.env.CUSTOMER_API_CLIENT_SECRET,
].filter((s): s is string => !!s);

// Keep in sync with lib/get-orders RETURN_WINDOW_DAYS and Shopify return policy.
const RETURN_WINDOW_DAYS = 30;

function cors(origin: string | null): Record<string, string> {
  return {
    "Access-Control-Allow-Origin": origin || "*",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Authorization, Content-Type",
    "Access-Control-Max-Age": "86400",
    "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
  };
}

export async function OPTIONS(req: NextRequest) {
  return new NextResponse(null, { status: 204, headers: cors(req.headers.get("origin")) });
}

type SessionClaims = { sub?: string; aud?: string; dest?: string; exp?: number };

/** Verify a Shopify session-token JWT (HS256, signed with the app client secret). */
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
  } catch {
    return null;
  }

  // Signature verified above with our app secret — that alone proves the token
  // was issued by Shopify for this app. Only enforce expiry here. We deliberately
  // do NOT hard-reject on aud/dest: with a custom customer-account domain the dest
  // claim won't contain the myshopify domain, and rejecting on it breaks auth.
  const now = Math.floor(Date.now() / 1000);
  if (claims.exp && now > claims.exp) return null;
  if (claims.aud && claims.aud !== CLIENT_ID) {
    console.warn(`[order-eligible] aud mismatch: got ${claims.aud}, expected ${CLIENT_ID}`);
  }
  return claims;
}

const numericFromGid = (s: string | undefined | null) =>
  (s || "").includes("/") ? s!.split("/").pop() ?? "" : s || "";

export async function GET(req: NextRequest) {
  const headers = cors(req.headers.get("origin"));
  // Fail open everywhere: a missing/invalid answer must never hide the button on
  // a genuinely returnable order. We only return eligible:false when we can prove it.
  try {
    const auth = req.headers.get("authorization") || "";
    const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";

    // TEMP DIAGNOSTIC: decode (without verifying) to see what Shopify sent.
    // Logs claim metadata only — never the signature or secrets.
    try {
      const p = token.split(".")[1];
      const decoded = p ? JSON.parse(Buffer.from(p, "base64url").toString("utf8")) : null;
      console.log("[order-eligible] diag", JSON.stringify({
        hasToken: !!token,
        secretsConfigured: SIGNING_SECRETS.length,
        aud: decoded?.aud,
        expectedAud: CLIENT_ID,
        audMatch: decoded?.aud === CLIENT_ID,
        dest: decoded?.dest,
        hasSub: !!decoded?.sub,
        order: req.nextUrl.searchParams.get("order"),
      }));
    } catch (e) {
      console.log("[order-eligible] diag decode failed:", (e as Error).message);
    }

    const claims = token ? verifySessionToken(token) : null;
    console.log("[order-eligible] verify result:", claims ? "VERIFIED" : "FAILED");
    if (!claims) {
      return NextResponse.json({ eligible: true, reason: "unauthenticated" }, { headers });
    }

    const orderParam = req.nextUrl.searchParams.get("order") || "";
    if (!orderParam) {
      return NextResponse.json({ eligible: true, reason: "no-order" }, { headers });
    }
    const orderGid = orderParam.includes("gid://")
      ? orderParam
      : `gid://shopify/Order/${orderParam}`;

    const data = await shopifyAdmin(
      `query OrderEligibility($id: ID!) {
        order(id: $id) {
          id
          customer { id }
          fulfillments(first: 10) {
            displayStatus
            deliveredAt
            updatedAt
            fulfillmentLineItems(first: 100) {
              edges { node { quantity lineItem { id } } }
            }
          }
        }
      }`,
      { id: orderGid }
    );

    const order = data?.order;
    if (!order) return NextResponse.json({ eligible: false, reason: "order-not-found" }, { headers });

    // Ownership: the session-token customer must own this order.
    const sub = numericFromGid(claims.sub);
    const owner = numericFromGid(order.customer?.id);
    if (sub && owner && sub !== owner) {
      return NextResponse.json({ eligible: false, reason: "not-owner" }, { headers });
    }

    // Latest delivery date per line item (only DELIVERED fulfillments count).
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

    // Shopify's returnable quantities already net out refunds and existing returns,
    // but are NOT window-aware — so we apply the 30-day-from-delivery rule ourselves.
    const { returnableItems } = await getAdminReturnableInfo(orderGid);

    const now = Date.now();
    let eligible = false;
    for (const [lid, qty] of Object.entries(returnableItems)) {
      if (qty <= 0) continue;
      const delivered = deliveredAt[lid];
      if (!delivered) continue; // not delivered yet → not selectable in portal
      const days = (now - delivered.getTime()) / (1000 * 60 * 60 * 24);
      if (days <= RETURN_WINDOW_DAYS) {
        eligible = true;
        break;
      }
    }

    console.log(`[order-eligible] order=${orderParam} owner-ok eligible=${eligible}`);
    return NextResponse.json({ eligible }, { headers });
  } catch (err) {
    console.error("order-eligible error:", err instanceof Error ? err.message : String(err));
    return NextResponse.json({ eligible: true, reason: "error" }, { headers });
  }
}
