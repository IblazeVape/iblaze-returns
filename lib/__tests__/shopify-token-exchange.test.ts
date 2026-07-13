import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { exchangeSessionTokenForAccessToken } from "@/lib/shopify-token-exchange";

describe("exchangeSessionTokenForAccessToken", () => {
  const originalFetch = global.fetch;
  const originalId = process.env.SHOPIFY_CLIENT_ID;
  const originalSecret = process.env.SHOPIFY_CLIENT_SECRET;

  beforeEach(() => {
    process.env.SHOPIFY_CLIENT_ID = "test-client-id";
    process.env.SHOPIFY_CLIENT_SECRET = "test-client-secret";
  });
  afterEach(() => {
    global.fetch = originalFetch;
    process.env.SHOPIFY_CLIENT_ID = originalId;
    process.env.SHOPIFY_CLIENT_SECRET = originalSecret;
  });

  it("posts the correct token-exchange request and returns the access token", async () => {
    let capturedUrl = "";
    let capturedBody: Record<string, unknown> = {};
    global.fetch = vi.fn(async (url: string, init: RequestInit) => {
      capturedUrl = url;
      capturedBody = JSON.parse(init.body as string);
      return new Response(JSON.stringify({ access_token: "shpat_abc123", scope: "read_orders,write_returns" }), { status: 200 });
    }) as typeof fetch;

    const result = await exchangeSessionTokenForAccessToken("acme-vapes.myshopify.com", "session-token-xyz");

    expect(capturedUrl).toBe("https://acme-vapes.myshopify.com/admin/oauth/access_token");
    expect(capturedBody).toEqual({
      client_id: "test-client-id",
      client_secret: "test-client-secret",
      grant_type: "urn:ietf:params:oauth:grant-type:token-exchange",
      subject_token: "session-token-xyz",
      subject_token_type: "urn:ietf:params:oauth:token-type:id_token",
      requested_token_type: "urn:ietf:params:oauth:token-type:offline_access_token",
    });
    expect(result).toEqual({ accessToken: "shpat_abc123", scope: "read_orders,write_returns" });
  });

  it("throws when Shopify returns a non-200 response", async () => {
    global.fetch = vi.fn(async () => new Response(JSON.stringify({ error: "invalid_subject_token" }), { status: 400 })) as typeof fetch;
    await expect(exchangeSessionTokenForAccessToken("acme-vapes.myshopify.com", "bad-token")).rejects.toThrow();
  });

  it("throws when the response has no access_token", async () => {
    global.fetch = vi.fn(async () => new Response(JSON.stringify({ scope: "read_orders" }), { status: 200 })) as typeof fetch;
    await expect(exchangeSessionTokenForAccessToken("acme-vapes.myshopify.com", "token")).rejects.toThrow();
  });
});
