import { NextRequest, NextResponse } from "next/server";
import { verifyWebhookHmac } from "@/lib/shopify-hmac";
import { deleteTenant } from "@/lib/tenant";

export const dynamic = "force-dynamic";

/**
 * app/uninstalled webhook. Fires when a merchant uninstalls the app. We verify
 * Shopify's webhook HMAC (base64 of the raw body, keyed by the app secret),
 * then delete that shop's tenant record so a later reinstall starts clean and
 * we don't keep a revoked token around. No manual cleanup, ever.
 */
export async function POST(request: NextRequest) {
  const rawBody = await request.text();
  const secret = process.env.SHOPIFY_CLIENT_SECRET!;
  const hmac = request.headers.get("x-shopify-hmac-sha256");

  if (!verifyWebhookHmac(rawBody, hmac, secret)) {
    return NextResponse.json({ error: "invalid hmac" }, { status: 401 });
  }

  // Prefer the signed shop-domain header; fall back to the body.
  let shop = request.headers.get("x-shopify-shop-domain") || "";
  if (!shop) {
    try {
      shop = JSON.parse(rawBody)?.domain || JSON.parse(rawBody)?.myshopify_domain || "";
    } catch {
      /* ignore */
    }
  }
  if (!shop) return NextResponse.json({ error: "no shop" }, { status: 400 });

  await deleteTenant(shop);
  return NextResponse.json({ ok: true });
}
