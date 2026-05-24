import { Redis } from "@upstash/redis";

export const redis = Redis.fromEnv();

export async function getShopifyToken(): Promise<string | null> {
  return await redis.get<string>("shopify_access_token");
}

export async function setShopifyToken(token: string): Promise<void> {
  await redis.set("shopify_access_token", token);
}
