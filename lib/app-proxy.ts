// lib/app-proxy.ts
import crypto from "crypto";

export function verifyAppProxySignature(query: URLSearchParams, secret: string): boolean {
  const signature = query.get("signature");
  if (!signature) return false;
  const params: Record<string, string[]> = {};
  query.forEach((value, key) => {
    if (key === "signature") return;
    (params[key] ??= []).push(value);
  });
  const message = Object.keys(params)
    .sort()
    .map((k) => `${k}=${params[k].join(",")}`)
    .join("");
  const expected = crypto.createHmac("sha256", secret).update(message).digest("hex");
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

export function parseProxyRequest(query: URLSearchParams): {
  shop: string;
  loggedInCustomerId: string | null;
} {
  const shop = query.get("shop") ?? "";
  const cid = query.get("logged_in_customer_id");
  return { shop, loggedInCustomerId: cid && cid.length > 0 ? cid : null };
}
