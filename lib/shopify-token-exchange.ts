/**
 * Exchanges a short-lived App Bridge session token for a real (offline)
 * Shopify Admin access token — the modern embedded-app replacement for the
 * OAuth authorization-code redirect. See
 * https://shopify.dev/docs/apps/build/authentication-authorization/access-tokens/token-exchange
 */
export async function exchangeSessionTokenForAccessToken(
  shop: string,
  sessionToken: string
): Promise<{ accessToken: string; scope: string }> {
  const clientId = process.env.SHOPIFY_CLIENT_ID;
  const clientSecret = process.env.SHOPIFY_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error("Missing SHOPIFY_CLIENT_ID/SHOPIFY_CLIENT_SECRET");
  }

  const res = await fetch(`https://${shop}/admin/oauth/access_token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: "urn:ietf:params:oauth:grant-type:token-exchange",
      subject_token: sessionToken,
      subject_token_type: "urn:ietf:params:oauth:token-type:id_token",
      requested_token_type: "urn:ietf:params:oauth:token-type:offline_access_token",
    }),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`Token exchange failed (${res.status}): ${detail}`);
  }

  const data = await res.json();
  if (!data.access_token) {
    throw new Error("Token exchange response missing access_token");
  }

  return { accessToken: data.access_token, scope: data.scope ?? "" };
}
