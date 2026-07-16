import { NextRequest, NextResponse } from "next/server";
import { verifyMerchantSessionToken } from "@/lib/merchant-session-token";
import { redis } from "@/lib/redis";
import { buildNativeReturnsUrl, buildAdminProductUrl } from "@/lib/returns-management";
import {
  last30DateKeys,
  ordersKey,
  returnsKey,
  refundValueKey,
  reasonsKey,
  productsKey,
  productInfoKey,
  computeReturnRate,
  sumCounts,
  mergeHashCounts,
  topN,
  minorUnitsToMajor,
  numericIdFromGid,
} from "@/lib/dashboard-stats";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const auth = request.headers.get("authorization") || "";
  const sessionToken = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  const claims = sessionToken ? verifyMerchantSessionToken(sessionToken) : null;
  if (!claims) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const shop = claims.shop;
  const dateKeys = last30DateKeys();
  const n = dateKeys.length;

  try {
    const pipeline = redis.pipeline();
    for (const dateKey of dateKeys) pipeline.get(ordersKey(shop, dateKey));
    for (const dateKey of dateKeys) pipeline.get(returnsKey(shop, dateKey));
    for (const dateKey of dateKeys) pipeline.get(refundValueKey(shop, dateKey));
    for (const dateKey of dateKeys) pipeline.hgetall(reasonsKey(shop, dateKey));
    for (const dateKey of dateKeys) pipeline.hgetall(productsKey(shop, dateKey));
    pipeline.hgetall(productInfoKey(shop));

    const results = (await pipeline.exec()) as unknown[];
    const orderCounts = results.slice(0, n) as (number | null)[];
    const returnCounts = results.slice(n, 2 * n) as (number | null)[];
    const refundValues = results.slice(2 * n, 3 * n) as (number | null)[];
    const reasonHashes = results.slice(3 * n, 4 * n) as (Record<string, string> | null)[];
    const productHashes = results.slice(4 * n, 5 * n) as (Record<string, string> | null)[];
    const productInfo = (results[5 * n] ?? null) as Record<string, string> | null;

    const orders = sumCounts(orderCounts);
    const returns = sumCounts(returnCounts);
    const refundValueMinor = sumCounts(refundValues);
    const mergedReasons = mergeHashCounts(reasonHashes);
    const mergedProducts = mergeHashCounts(productHashes);

    const topProducts = topN(mergedProducts, 5).map(({ key: productId, count }) => {
      const info = productInfo?.[productId];
      let parsed: { title: string; image: string | null } | null = null;
      if (info) {
        try {
          parsed = JSON.parse(info);
        } catch {
          parsed = null;
        }
      }
      return {
        title: parsed?.title ?? productId,
        image: parsed?.image ?? null,
        count,
        url: buildAdminProductUrl(shop, numericIdFromGid(productId)),
      };
    });

    return NextResponse.json({
      returnRate: computeReturnRate(returns, orders),
      returnVolume: returns,
      refundValue: minorUnitsToMajor(refundValueMinor),
      topReasons: topN(mergedReasons, 5).map(({ key, count }) => ({ reason: key, count })),
      topProducts,
      nativeReturnsUrl: buildNativeReturnsUrl(shop),
    });
  } catch (err) {
    console.error("dashboard stats read error:", err instanceof Error ? err.message : String(err));
    return NextResponse.json({ error: "failed to load dashboard stats" }, { status: 500 });
  }
}
