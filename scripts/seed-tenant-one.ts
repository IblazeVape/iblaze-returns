/**
 * One-time migration: seed iBlaze as tenant #1.
 *
 * Copies the existing single-store Shopify token into a per-shop tenant record
 * (`tenant:{shop}`), so the multi-tenant data layer works for iBlaze and the
 * existing `/` portal keeps functioning.
 *
 * Run once against PRODUCTION Redis with the prod env loaded, e.g.:
 *   vercel env pull .env.production.local --environment=production
 *   npx tsx --env-file=.env.production.local scripts/seed-tenant-one.ts
 *
 * Self-contained (does not import the app's `@/` modules) so it runs cleanly
 * under tsx without alias resolution. The written hash shape matches
 * lib/tenant.ts exactly (accessToken, scopes, installedAt, plan,
 * returnWindowDays, branding-as-JSON-string).
 */
import { Redis } from "@upstash/redis";

async function main() {
  const redis = Redis.fromEnv();

  const shop = process.env.SHOPIFY_STORE_URL;
  if (!shop) throw new Error("SHOPIFY_STORE_URL is not set");

  const legacy =
    (await redis.get<string>("shopify_access_token")) ||
    process.env.SHOPIFY_ACCESS_TOKEN;
  if (!legacy) {
    throw new Error(
      "No token found (neither Redis `shopify_access_token` nor SHOPIFY_ACCESS_TOKEN env)"
    );
  }

  await redis.hset(`tenant:${shop}`, {
    accessToken: legacy,
    scopes: "read_orders,write_returns,read_customers,read_fulfillments",
    installedAt: new Date().toISOString(),
    plan: "free",
    returnWindowDays: 30,
    branding: JSON.stringify({ name: "", logoUrl: "", accentColor: "#000000" }),
  });

  console.log(`✅ seeded tenant #1: ${shop}`);
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error("❌ seed failed:", e);
    process.exit(1);
  });
