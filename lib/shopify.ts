let cachedToken: { token: string; expiresAt: number } | null = null;

export async function getAdminToken(): Promise<string> {
  // Return cached token if still valid (with 5min buffer)
  if (cachedToken && Date.now() < cachedToken.expiresAt - 300000) {
    return cachedToken.token;
  }

  const shop = process.env.SHOPIFY_STORE_URL!;
  const clientId = process.env.SHOPIFY_CLIENT_ID!;
  const clientSecret = process.env.SHOPIFY_CLIENT_SECRET!;

  const res = await fetch(`https://${shop}/admin/oauth/access_token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "client_credentials",
      client_id: clientId,
      client_secret: clientSecret,
    }),
  });

  const data = await res.json();
  if (!data.access_token) {
    throw new Error("Failed to get Shopify admin token: " + JSON.stringify(data));
  }

  cachedToken = {
    token: data.access_token,
    expiresAt: Date.now() + (data.expires_in || 86400) * 1000,
  };

  return cachedToken.token;
}

export async function shopifyAdmin(query: string, variables = {}) {
  const shop = process.env.SHOPIFY_STORE_URL!;
  const token = await getAdminToken();

  const res = await fetch(`https://${shop}/admin/api/2026-04/graphql.json`, {
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
