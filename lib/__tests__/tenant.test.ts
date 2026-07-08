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
});
