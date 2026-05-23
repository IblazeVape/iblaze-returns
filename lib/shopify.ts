export async function shopifyAdminRequest<T = unknown>(
  query: string,
  variables: Record<string, unknown> = {}
): Promise<T> {
  const shop = process.env.SHOPIFY_STORE_URL!;
  const accessToken = process.env.SHOPIFY_ACCESS_TOKEN!;

  if (!accessToken) throw new Error("Missing SHOPIFY_ACCESS_TOKEN in environment.");

  const response = await fetch(`https://${shop}/admin/api/2026-04/graphql.json`, {
    method: "POST",
    headers: {
      "X-Shopify-Access-Token": accessToken,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query, variables }),
  });

  const result = await response.json();
  if (result.errors) {
    console.error("Shopify GraphQL Errors:", result.errors);
    throw new Error(result.errors[0].message);
  }
  return result.data as T;
}

export async function getShopId(): Promise<string> {
  const data = await shopifyAdminRequest<{ shop: { id: string } }>(
    `query { shop { id } }`
  );
  return data.shop.id.split("/").pop()!;
}

export async function getClientCredentialToken(): Promise<string> {
  const shop = process.env.SHOPIFY_STORE_URL!;
  const tokenRes = await fetch(`https://${shop}/admin/oauth/access_token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: process.env.SHOPIFY_CLIENT_ID,
      client_secret: process.env.SHOPIFY_CLIENT_SECRET,
      grant_type: "client_credentials",
    }),
  });
  const { access_token } = await tokenRes.json();
  return access_token;
}
