import { NextRequest, NextResponse } from "next/server";
import { verifyWebhookHmac } from "@/lib/shopify-hmac";
import { redis } from "@/lib/redis";
import { formatDateKey, refundValueKey, majorUnitsToMinor, DASHBOARD_STATS_TTL_SECONDS } from "@/lib/dashboard-stats";

export const dynamic = "force-dynamic";

type RefundLineItemPayload = { subtotal?: number; total_tax?: number };

/**
 * refunds/create webhook. Feeds the Dashboard's refund-value counter. Sums
 * subtotal + total_tax across every refund_line_item, converts to minor
 * currency units (pence) before storing to avoid floating-point drift when
 * many small refunds accumulate over 30 days.
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

  let payload: { refund_line_items?: RefundLineItemPayload[] };
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }

  const lineItems = Array.isArray(payload.refund_line_items) ? payload.refund_line_items : [];
  const totalMajorUnits = lineItems.reduce((sum, item) => sum + (item.subtotal ?? 0) + (item.total_tax ?? 0), 0);
  const totalMinorUnits = majorUnitsToMinor(totalMajorUnits);

  if (totalMinorUnits > 0) {
    const key = refundValueKey(shop, formatDateKey(new Date()));
    await redis.incrby(key, totalMinorUnits);
    await redis.expire(key, DASHBOARD_STATS_TTL_SECONDS);
  }

  return NextResponse.json({ ok: true });
}
