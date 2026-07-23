// lib/tenant.ts
import { redis } from "@/lib/redis";
import {
  DEFAULT_TENANT_FIELDS, type PolicyCategory, type SidebarLink, type SidebarLayout, type TenantBranding,
  type ReturnLifecycleStatus, type ReturnLifecycleStyle, type ReturnLifecycleStyles, type ReturnLifecycleMessages,
  type ReturnClosedReason, type RefundStatus, type RefundStatusLabels,
} from "@/lib/tenant-defaults";

export type {
  PolicyCategory, SidebarLink, SidebarLayout, TenantBranding,
  ReturnLifecycleStatus, ReturnLifecycleStyle, ReturnLifecycleStyles, ReturnLifecycleMessages,
  ReturnClosedReason, RefundStatus, RefundStatusLabels,
};
export { DEFAULT_TENANT_FIELDS };

export type Tenant = {
  shop: string;
  accessToken: string;
  installedAt: string;
  scopes: string;
  plan: string;
  returnWindowDays: number;
  branding: TenantBranding;
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
    branding: mergeBranding(
      typeof r.branding === "string"
        ? JSON.parse(r.branding)
        : (r.branding as Partial<Tenant["branding"]> | undefined) ?? {},
    ),
  };
}

/** Shallow-spreads top-level branding fields, but deep-merges
 * returnLifecycleStyles per status key. A plain shallow spread would let a
 * tenant record saved under an older ReturnLifecycleStatus shape (e.g. the
 * single "notReturnable" key, pre return-status-split) wholesale replace
 * the current default's style map — silently dropping the newer status
 * keys ("awaitingDelivery"/"returnWindowClosed") and crashing any code that
 * reads styles[newKey].label. */
function mergeBranding(stored: Partial<TenantBranding>): TenantBranding {
  return {
    ...DEFAULT_TENANT_FIELDS.branding,
    ...stored,
    returnLifecycleStyles: {
      ...DEFAULT_TENANT_FIELDS.branding.returnLifecycleStyles,
      ...(stored.returnLifecycleStyles ?? {}),
    },
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
    branding: {
      ...mergeBranding(existing?.branding ?? {}),
      ...(patch.branding ?? {}),
      returnLifecycleStyles: {
        ...DEFAULT_TENANT_FIELDS.branding.returnLifecycleStyles,
        ...(existing?.branding.returnLifecycleStyles ?? {}),
        ...(patch.branding?.returnLifecycleStyles ?? {}),
      },
    },
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
  // Return ONLY the per-shop tenant record's token. No env/legacy fallback:
  // a revoked env token would masquerade as "installed" and hand callers an
  // invalid token (false "connected", 500s on Shopify calls). A missing tenant
  // must read as "no token" so the install OAuth captures a fresh, valid one.
  const t = await getTenant(shop);
  return t?.accessToken || null;
}

export async function tenantExists(shop: string): Promise<boolean> {
  return (await getTenant(shop)) !== null;
}

export async function deleteTenant(shop: string): Promise<void> {
  await redis.del(key(shop));
}
