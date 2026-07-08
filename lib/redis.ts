import { Redis } from "@upstash/redis";

// Production uses Vercel's Upstash integration vars (KV_REST_API_*); local/other
// setups may use the native UPSTASH_REDIS_REST_* names. Support both so the
// tenant store actually connects in prod (fromEnv() only checks UPSTASH_*).
export const redis = new Redis({
  url: process.env.KV_REST_API_URL ?? process.env.UPSTASH_REDIS_REST_URL ?? "",
  token: process.env.KV_REST_API_TOKEN ?? process.env.UPSTASH_REDIS_REST_TOKEN ?? "",
});

// Legacy single-tenant shims — delegate to tenant #1 (iBlaze) during transition.
// Falls back to the legacy global key until tenant #1 is seeded (see Task 6),
// so the live `/` portal doesn't break mid-project.
import { getTenantToken, setTenant } from "@/lib/tenant";

export async function getShopifyToken(): Promise<string | null> {
  const shop = process.env.SHOPIFY_STORE_URL;
  const legacy = await redis.get<string>("shopify_access_token");
  if (!shop) return legacy;
  return (await getTenantToken(shop)) ?? legacy;
}

export async function setShopifyToken(token: string): Promise<void> {
  const shop = process.env.SHOPIFY_STORE_URL;
  if (!shop) {
    await redis.set("shopify_access_token", token);
    return;
  }
  await setTenant(shop, { accessToken: token });
}
