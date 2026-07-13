import crypto from "crypto";

/**
 * Verifies a Shopify App Bridge session token (the merchant-side equivalent
 * of the customer-account session token verified in
 * app/api/order-eligible/route.ts — same JWT shape, but signed with the
 * app's own SHOPIFY_CLIENT_SECRET, not CUSTOMER_API_CLIENT_SECRET.
 */
type MerchantSessionClaims = { dest?: string; exp?: number };

export function verifyMerchantSessionToken(token: string): { shop: string; exp: number } | null {
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [header, payload, signature] = parts;

  const secret = process.env.SHOPIFY_CLIENT_SECRET;
  if (!secret) return null;

  const expected = crypto.createHmac("sha256", secret).update(`${header}.${payload}`).digest("base64url");
  const sigBuf = Buffer.from(signature);
  const expectedBuf = Buffer.from(expected);
  if (sigBuf.length !== expectedBuf.length || !crypto.timingSafeEqual(sigBuf, expectedBuf)) return null;

  let claims: MerchantSessionClaims;
  try {
    claims = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
  } catch {
    return null;
  }

  if (!claims.exp || Math.floor(Date.now() / 1000) > claims.exp) return null;

  const shop = claims.dest?.match(/^https:\/\/([a-z0-9-]+\.myshopify\.com)$/i)?.[1];
  if (!shop) return null;

  return { shop, exp: claims.exp };
}
