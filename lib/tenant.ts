// lib/tenant.ts
import { redis } from "@/lib/redis";

export type Tenant = {
  shop: string;
  accessToken: string;
  installedAt: string;
  scopes: string;
  plan: string;
  returnWindowDays: number;
  branding: { name: string; logoUrl: string; accentColor: string };
};

export const DEFAULT_TENANT_FIELDS = {
  plan: "free",
  returnWindowDays: 30,
  branding: { name: "", logoUrl: "", accentColor: "#000000" },
};

const key = (shop: string) => `tenant:${shop}`;

export async function getTenant(shop: string): Promise<Tenant | null> {
  const raw = await redis.hgetall(key(shop));
  if (!raw || Object.keys(raw).length === 0) return null;
  const r = raw as Record<string, unknown>;
  return {
    shop,
    accessToken: String(r.accessToken ?? ""),
    installedAt: String(r.installedAt ?? ""),
    scopes: String(r.scopes ?? ""),
    plan: String(r.plan ?? DEFAULT_TENANT_FIELDS.plan),
    returnWindowDays: Number(r.returnWindowDays ?? DEFAULT_TENANT_FIELDS.returnWindowDays),
    branding:
      typeof r.branding === "string"
        ? JSON.parse(r.branding)
        : (r.branding as Tenant["branding"]) ?? DEFAULT_TENANT_FIELDS.branding,
  };
}

export async function setTenant(
  shop: string,
  patch: Partial<Tenant> & { accessToken?: string }
): Promise<void> {
  const existing = await getTenant(shop);
  const next = {
    ...DEFAULT_TENANT_FIELDS,
    ...(existing ?? {}),
    ...patch,
    shop,
  };
  await redis.hset(key(shop), {
    accessToken: next.accessToken ?? "",
    installedAt: next.installedAt ?? new Date().toISOString(),
    scopes: next.scopes ?? "",
    plan: next.plan,
    returnWindowDays: next.returnWindowDays,
    branding: JSON.stringify(next.branding),
  });
}

export async function getTenantToken(shop: string): Promise<string | null> {
  const t = await getTenant(shop);
  if (t?.accessToken) return t.accessToken;
  // Tenant #1 (iBlaze) transition fallback: until the tenant record is formally
  // seeded, use the legacy global token / env token for the original store, so
  // merging the multi-tenant refactor can never break the live `/` portal.
  if (shop && shop === process.env.SHOPIFY_STORE_URL) {
    return (
      (await redis.get<string>("shopify_access_token")) ||
      process.env.SHOPIFY_ACCESS_TOKEN ||
      null
    );
  }
  return null;
}

export async function tenantExists(shop: string): Promise<boolean> {
  return (await getTenant(shop)) !== null;
}
