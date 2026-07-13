// lib/__tests__/tenant.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";

const store = new Map<string, unknown>();
vi.mock("@/lib/redis", () => ({
  redis: {
    hgetall: vi.fn(async (k: string) => store.get(k) ?? null),
    hset: vi.fn(async (k: string, v: Record<string, unknown>) => {
      store.set(k, { ...(store.get(k) as object ?? {}), ...v });
    }),
  },
}));

import { getTenant, setTenant, getTenantToken, tenantExists } from "@/lib/tenant";

beforeEach(() => store.clear());

describe("tenant store", () => {
  it("returns null for an unknown shop", async () => {
    expect(await getTenant("nope.myshopify.com")).toBeNull();
    expect(await tenantExists("nope.myshopify.com")).toBe(false);
  });

  it("writes and reads a tenant with defaults applied", async () => {
    await setTenant("a.myshopify.com", { accessToken: "tok_a", scopes: "read_orders" });
    const t = await getTenant("a.myshopify.com");
    expect(t?.shop).toBe("a.myshopify.com");
    expect(t?.accessToken).toBe("tok_a");
    expect(t?.plan).toBe("free");
    expect(t?.returnWindowDays).toBe(30);
    expect(await getTenantToken("a.myshopify.com")).toBe("tok_a");
    expect(await tenantExists("a.myshopify.com")).toBe(true);
  });

  it("isolates tenants", async () => {
    await setTenant("a.myshopify.com", { accessToken: "tok_a" });
    await setTenant("b.myshopify.com", { accessToken: "tok_b" });
    expect(await getTenantToken("a.myshopify.com")).toBe("tok_a");
    expect(await getTenantToken("b.myshopify.com")).toBe("tok_b");
  });

  it("defaults the new branding fields to empty strings", async () => {
    await setTenant("c.myshopify.com", { accessToken: "tok_c" });
    const t = await getTenant("c.myshopify.com");
    expect(t?.branding.storefrontUrl).toBe("");
    expect(t?.branding.supportEmail).toBe("");
    expect(t?.branding.policyUrl).toBe("");
    expect(t?.branding.policyText).toBe("");
    expect(t?.branding.name).toBe("");
    expect(t?.branding.logoUrl).toBe("");
    expect(t?.branding.accentColor).toBe("#000000");
    expect(t?.branding.requirePolicyAcceptance).toBe(true);
  });

  it("round-trips a full branding update", async () => {
    await setTenant("d.myshopify.com", {
      accessToken: "tok_d",
      returnWindowDays: 14,
      branding: {
        name: "Acme Vapes",
        logoUrl: "https://cdn.shopify.com/acme-logo.png",
        accentColor: "#4F46E5",
        storefrontUrl: "https://acme-vapes.com",
        supportEmail: "help@acme-vapes.com",
        policyUrl: "https://acme-vapes.com/policies/refund-policy",
        policyText: "Unopened items only, within the return window.",
        requirePolicyAcceptance: false,
      },
    });
    const t = await getTenant("d.myshopify.com");
    expect(t?.returnWindowDays).toBe(14);
    expect(t?.branding.name).toBe("Acme Vapes");
    expect(t?.branding.supportEmail).toBe("help@acme-vapes.com");
    expect(t?.branding.policyText).toBe("Unopened items only, within the return window.");
    expect(t?.branding.requirePolicyAcceptance).toBe(false);
  });

  it("merges old branding JSON with new field defaults", async () => {
    // Simulate a tenant record written before the new branding fields existed,
    // containing only the 3 old fields as a JSON string
    const oldBrandingJson = JSON.stringify({
      name: "Old Co",
      logoUrl: "https://old.example/logo.png",
      accentColor: "#111111",
    });
    store.set("tenant:legacy.myshopify.com", {
      accessToken: "tok_legacy",
      installedAt: "2024-01-01T00:00:00Z",
      scopes: "read_orders",
      plan: "free",
      returnWindowDays: 30,
      branding: oldBrandingJson,
    });

    const t = await getTenant("legacy.myshopify.com");
    // Old fields should be preserved from the stored JSON
    expect(t?.branding.name).toBe("Old Co");
    expect(t?.branding.logoUrl).toBe("https://old.example/logo.png");
    expect(t?.branding.accentColor).toBe("#111111");
    // New fields should default to empty strings (not undefined)
    expect(t?.branding.storefrontUrl).toBe("");
    expect(t?.branding.supportEmail).toBe("");
    expect(t?.branding.policyUrl).toBe("");
    expect(t?.branding.policyText).toBe("");
  });
});
