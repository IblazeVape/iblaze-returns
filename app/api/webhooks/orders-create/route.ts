import { NextRequest, NextResponse } from "next/server";
import { verifyWebhookHmac } from "@/lib/shopify-hmac";
import { redis } from "@/lib/redis";
import { formatDateKey, ordersKey, DASHBOARD_STATS_TTL_SECONDS } from "@/lib/dashboard-stats";

export const dynamic = "force-dynamic";

/**
 * orders/create webhook. Feeds the Dashboard's return-rate denominator
 * (return rate = returns ÷ total orders over the last 30 days). Follows the
 * same HMAC-verification pattern as app/api/webhooks/app-uninstalled/route.ts.
 */
export async function POST(request: NextRequest) {
  const rawBody = await request.text();
  const secret = process.env.SHOPIFY_CLIENT_SECRET!;
  const hmac = request.headers.get("x-shopify-hmac-sha256");

  if (!verifyWebhookHmac(rawBody, hmac, secret)) {
    return NextResponse.json({ error: "invalid hmac" }, { status: 401 });
  }

  const shop = request.headers.get("x-shopify-shop-domain") || "";
  if (!shop) return NextResponse.json({ error: "no shop" }, { status: 400 });

  const key = ordersKey(shop, formatDateKey(new Date()));
  await redis.incr(key);
  await redis.expire(key, DASHBOARD_STATS_TTL_SECONDS);

  return NextResponse.json({ ok: true });
}
