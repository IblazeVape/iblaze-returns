import { getShopifyToken } from "@/lib/redis";

export async function shopifyAdmin(query: string, variables = {}) {
  const shop = process.env.SHOPIFY_STORE_URL!;
  const token = await getShopifyToken();

  if (!token) {
    throw new Error("No Shopify access token found. Please reinstall the app.");
  }

  const res = await fetch(`https://${shop}/admin/api/2024-04/graphql.json`, {
    method: "POST",
    headers: {
      "X-Shopify-Access-Token": token,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query, variables }),
  });

  const result = await res.json();
  if (result.errors) throw new Error(result.errors[0].message);
  return result.data;
}
