import { NextRequest, NextResponse } from "next/server";
import { redis } from "@/lib/redis";
import { getTenant, setTenant } from "@/lib/tenant";

// One-time migration endpoint: seed iBlaze as tenant #1 from the Vercel runtime,
// where the Upstash (KV_REST_API_*) creds are injected — they can't be pulled
// locally. Protected by ADMIN_SECRET. Idempotent. Remove after go-live.
export async function GET(request: NextRequest) {
  const secret = request.nextUrl.searchParams.get("secret");
  if (!secret || secret !== process.env.ADMIN_SECRET) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const shop = process.env.SHOPIFY_STORE_URL;
  if (!shop) {
    return NextResponse.json({ error: "SHOPIFY_STORE_URL not set" }, { status: 500 });
  }

  const existing = await getTenant(shop);
  if (existing?.accessToken) {
    return NextResponse.json({ ok: true, alreadySeeded: true, shop });
  }

  const token =
    (await redis.get<string>("shopify_access_token")) ||
    process.env.SHOPIFY_ACCESS_TOKEN;
  if (!token) {
    return NextResponse.json(
      { error: "no legacy token found (redis shopify_access_token / SHOPIFY_ACCESS_TOKEN)" },
      { status: 500 }
    );
  }

  await setTenant(shop, {
    accessToken: token,
    scopes: "read_orders,write_returns,read_customers,read_fulfillments",
    installedAt: new Date().toISOString(),
  });

  const seeded = await getTenant(shop);
  return NextResponse.json({
    ok: true,
    seeded: true,
    shop,
    hasToken: !!seeded?.accessToken,
    plan: seeded?.plan,
    returnWindowDays: seeded?.returnWindowDays,
  });
}
