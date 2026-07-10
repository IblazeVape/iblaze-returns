import crypto from "crypto";

/**
 * Verify a Shopify request signed via query-param HMAC (app entry load, OAuth
 * callback). Shopify signs the query params (excluding `hmac`/`signature`) as
 * sorted `key=value&...` joined by `&`, hex HMAC-SHA256 keyed by the app secret.
 * (This is the OAuth/app-load format — distinct from the App Proxy `signature`
 * format in lib/app-proxy.ts, which joins WITHOUT `&`.)
 */
export function verifyQueryHmac(searchParams: URLSearchParams, secret: string): boolean {
  const hmac = searchParams.get("hmac");
  if (!hmac) return false;
  const pairs: string[] = [];
  searchParams.forEach((value, key) => {
    if (key === "hmac" || key === "signature") return;
    pairs.push(`${key}=${value}`);
  });
  pairs.sort();
  const message = pairs.join("&");
  const expected = crypto.createHmac("sha256", secret).update(message).digest("hex");
  const a = Buffer.from(hmac);
  const b = Buffer.from(expected);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

/**
 * Verify a Shopify webhook. Shopify sends `X-Shopify-Hmac-Sha256` = base64
 * HMAC-SHA256 of the RAW request body, keyed by the app secret.
 */
export function verifyWebhookHmac(rawBody: string, hmacHeader: string | null, secret: string): boolean {
  if (!hmacHeader) return false;
  const expected = crypto.createHmac("sha256", secret).update(rawBody, "utf8").digest("base64");
  const a = Buffer.from(hmacHeader);
  const b = Buffer.from(expected);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}
