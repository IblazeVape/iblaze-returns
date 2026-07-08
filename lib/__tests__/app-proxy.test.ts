import { describe, it, expect } from "vitest";
import crypto from "crypto";
import { verifyAppProxySignature, parseProxyRequest } from "@/lib/app-proxy";

const SECRET = "test_secret";

function sign(params: Record<string, string>): URLSearchParams {
  const sorted = Object.keys(params).sort().map((k) => `${k}=${params[k]}`).join("");
  const signature = crypto.createHmac("sha256", SECRET).update(sorted).digest("hex");
  return new URLSearchParams({ ...params, signature });
}

describe("app proxy signature", () => {
  it("accepts a correctly signed request", () => {
    const q = sign({ shop: "a.myshopify.com", logged_in_customer_id: "42", path_prefix: "/apps/returns" });
    expect(verifyAppProxySignature(q, SECRET)).toBe(true);
  });

  it("rejects a tampered request", () => {
    const q = sign({ shop: "a.myshopify.com", logged_in_customer_id: "42" });
    q.set("shop", "evil.myshopify.com");
    expect(verifyAppProxySignature(q, SECRET)).toBe(false);
  });

  it("rejects a request with no signature", () => {
    expect(verifyAppProxySignature(new URLSearchParams({ shop: "a.myshopify.com" }), SECRET)).toBe(false);
  });

  it("parses shop + customer id", () => {
    const q = sign({ shop: "a.myshopify.com", logged_in_customer_id: "42" });
    expect(parseProxyRequest(q)).toEqual({ shop: "a.myshopify.com", loggedInCustomerId: "42" });
  });

  it("returns null customer when logged out", () => {
    const q = sign({ shop: "a.myshopify.com", logged_in_customer_id: "" });
    expect(parseProxyRequest(q).loggedInCustomerId).toBeNull();
  });
});
