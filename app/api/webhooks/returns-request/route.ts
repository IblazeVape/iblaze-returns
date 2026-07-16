import { NextRequest, NextResponse } from "next/server";
import { verifyWebhookHmac } from "@/lib/shopify-hmac";
import { shopifyAdmin } from "@/lib/shopify";
import { redis } from "@/lib/redis";
import {
  formatDateKey,
  returnsKey,
  reasonsKey,
  productsKey,
  DASHBOARD_STATS_TTL_SECONDS,
} from "@/lib/dashboard-stats";

export const dynamic = "force-dynamic";

type ReturnLineItemPayload = {
  quantity: number;
  return_reason: string;
  fulfillment_line_item?: { line_item?: { admin_graphql_api_id?: string } };
};

const LINE_ITEM_PRODUCT_QUERY = `
  query DashboardStatsLineItemProducts($ids: [ID!]!) {
    nodes(ids: $ids) {
      ... on LineItem {
        id
        product { title }
      }
    }
  }
`;

/**
 * returns/request webhook. Feeds the Dashboard's return-volume counter, the
 * top-return-reasons hash (return_reason comes inline in the payload — no
 * extra call needed), and the most-returned-products hash (product titles
 * are NOT in the payload, resolved via one batched GraphQL call per event).
 * Product resolution is a non-critical enrichment step: if it fails, the
 * returns/reasons counters still commit and the handler still returns 200 —
 * a webhook must be ack'd quickly, and Shopify will retry-storm an endpoint
 * that keeps failing.
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

  let payload: { return_line_items?: ReturnLineItemPayload[] };
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }

  const lineItems = Array.isArray(payload.return_line_items) ? payload.return_line_items : [];
  const dateKey = formatDateKey(new Date());

  const rvKey = returnsKey(shop, dateKey);
  await redis.incr(rvKey);
  await redis.expire(rvKey, DASHBOARD_STATS_TTL_SECONDS);

  if (lineItems.length > 0) {
    const rKey = reasonsKey(shop, dateKey);
    for (const item of lineItems) {
      if (item.return_reason) {
        await redis.hincrby(rKey, item.return_reason, item.quantity ?? 1);
      }
    }
    await redis.expire(rKey, DASHBOARD_STATS_TTL_SECONDS);
  }

  try {
    const lineItemIds = lineItems
      .map((item) => item.fulfillment_line_item?.line_item?.admin_graphql_api_id)
      .filter((id): id is string => Boolean(id));

    if (lineItemIds.length > 0) {
      const data = await shopifyAdmin(
        shop,
        LINE_ITEM_PRODUCT_QUERY,
        { ids: lineItemIds },
        "DashboardStatsLineItemProducts"
      );
      const nodes = (data?.nodes ?? []) as ({ id: string; product: { title: string } | null } | null)[];
      const titleByLineItemId = new Map(nodes.filter((n): n is NonNullable<typeof n> => n !== null).map((n) => [n.id, n.product?.title]));

      const pKey = productsKey(shop, dateKey);
      let wroteAny = false;
      for (const item of lineItems) {
        const lineItemId = item.fulfillment_line_item?.line_item?.admin_graphql_api_id;
        const title = lineItemId ? titleByLineItemId.get(lineItemId) : undefined;
        if (title) {
          await redis.hincrby(pKey, title, item.quantity ?? 1);
          wroteAny = true;
        }
      }
      if (wroteAny) await redis.expire(pKey, DASHBOARD_STATS_TTL_SECONDS);
    }
  } catch (err) {
    console.error(
      "dashboard-stats returns/request product resolution error:",
      err instanceof Error ? err.message : String(err)
    );
  }

  return NextResponse.json({ ok: true });
}
