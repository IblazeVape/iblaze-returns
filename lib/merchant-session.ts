import crypto from "crypto";

/**
 * Signed merchant session cookie (`merchant_session`) set after the admin
 * OAuth install completes. Lets the merchant app entry (/app) identify the
 * shop on subsequent loads without a fresh Shopify hmac. Mirrors the customer
 * portal_session scheme (HMAC-signed, keyed by PORTAL_SECRET).
 */
const COOKIE_NAME = "merchant_session";
const MAX_AGE_SECONDS = 60 * 60 * 24 * 7; // 7 days

export function buildMerchantSession(shop: string): { name: string; value: string; maxAge: number } {
  const secret = process.env.PORTAL_SECRET!;
  const expiry = Math.floor(Date.now() / 1000) + MAX_AGE_SECONDS;
  const data = `${shop}|${expiry}`;
  const sig = crypto.createHmac("sha256", secret).update(data).digest("hex");
  return { name: COOKIE_NAME, value: `${data}|${sig}`, maxAge: MAX_AGE_SECONDS };
}

export function validateMerchantSession(cookieValue: string | undefined | null): { valid: boolean; shop?: string } {
  if (!cookieValue) return { valid: false };
  const parts = cookieValue.split("|");
  if (parts.length !== 3) return { valid: false };
  const [shop, expiry, sig] = parts;
  if (Math.floor(Date.now() / 1000) > parseInt(expiry, 10)) return { valid: false };
  const secret = process.env.PORTAL_SECRET!;
  const expected = crypto.createHmac("sha256", secret).update(`${shop}|${expiry}`).digest("hex");
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return { valid: false };
  return { valid: true, shop };
}

export const MERCHANT_COOKIE_NAME = COOKIE_NAME;
