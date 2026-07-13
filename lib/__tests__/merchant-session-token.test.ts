import { describe, it, expect, beforeEach, afterEach } from "vitest";
import crypto from "crypto";
import { verifyMerchantSessionToken } from "@/lib/merchant-session-token";

const SECRET = "test-secret";

function signToken(claims: Record<string, unknown>): string {
  const header = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url");
  const payload = Buffer.from(JSON.stringify(claims)).toString("base64url");
  const signature = crypto.createHmac("sha256", SECRET).update(`${header}.${payload}`).digest("base64url");
  return `${header}.${payload}.${signature}`;
}

describe("verifyMerchantSessionToken", () => {
  const originalSecret = process.env.SHOPIFY_CLIENT_SECRET;
  beforeEach(() => { process.env.SHOPIFY_CLIENT_SECRET = SECRET; });
  afterEach(() => { process.env.SHOPIFY_CLIENT_SECRET = originalSecret; });

  it("accepts a validly signed, unexpired token and extracts the shop", () => {
    const exp = Math.floor(Date.now() / 1000) + 60;
    const token = signToken({ dest: "https://acme-vapes.myshopify.com", exp });
    const result = verifyMerchantSessionToken(token);
    expect(result).toEqual({ shop: "acme-vapes.myshopify.com", exp });
  });

  it("rejects an expired token", () => {
    const exp = Math.floor(Date.now() / 1000) - 60;
    const token = signToken({ dest: "https://acme-vapes.myshopify.com", exp });
    expect(verifyMerchantSessionToken(token)).toBeNull();
  });

  it("rejects a token signed with the wrong secret", () => {
    const header = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url");
    const payload = Buffer.from(JSON.stringify({ dest: "https://acme-vapes.myshopify.com", exp: Math.floor(Date.now() / 1000) + 60 })).toString("base64url");
    const badSig = crypto.createHmac("sha256", "wrong-secret").update(`${header}.${payload}`).digest("base64url");
    expect(verifyMerchantSessionToken(`${header}.${payload}.${badSig}`)).toBeNull();
  });

  it("rejects a malformed token", () => {
    expect(verifyMerchantSessionToken("not-a-jwt")).toBeNull();
    expect(verifyMerchantSessionToken("")).toBeNull();
  });

  it("rejects a token whose dest claim isn't a myshopify.com domain", () => {
    const token = signToken({ dest: "not-a-shop-domain", exp: Math.floor(Date.now() / 1000) + 60 });
    expect(verifyMerchantSessionToken(token)).toBeNull();
  });
});
