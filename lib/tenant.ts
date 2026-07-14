// lib/tenant.ts
import { redis } from "@/lib/redis";

export type PolicyCategory = { title: string; desc: string };
/** icon is an optional Lucide icon name (e.g. "HelpCircle") — validated
 * against the actual Lucide export list where it's used, not here.
 * children supports exactly one level of nesting (a submenu), matching
 * shadcn's SidebarMenuSub — not arbitrarily deep. */
export type SidebarLink = { label: string; url: string; icon?: string; children?: { label: string; url: string; icon?: string }[] };
export type SidebarLayout = "inset" | "sidebar";

export type TenantBranding = {
  name: string;
  logoUrl: string;
  accentColor: string;
  storefrontUrl: string;
  supportEmail: string;
  requirePolicyAcceptance: boolean;
  storeLinkEnabled: boolean;
  storeLinkLabel: string;
  orderStatusLinkEnabled: boolean;
  orderStatusLinkLabel: string;
  policyHeading: string;
  policySubheading: string;
  policyLastUpdated: string;
  /** "categories" shows policyCategories as cards; "text" shows policyBodyText
   * as a single free-form block instead — some merchants don't want a
   * structured list. */
  policyBodyMode: "categories" | "text";
  policyCategories: PolicyCategory[];
  policyBodyText: string;
  policyFooterNoteEnabled: boolean;
  policyFooterNote: string;
  policyAcceptedMessage: string;
  policyDeclinedMessage: string;
  sidebarLinks: SidebarLink[];
  sidebarNote: string;
  sidebarLayoutSwitcherEnabled: boolean;
  defaultSidebarLayout: SidebarLayout;
  headerSearchEnabled: boolean;
  headerSearchPlaceholder: string;
  tableSearchEnabled: boolean;
  tableSearchPlaceholder: string;
  tableColumnsButtonEnabled: boolean;
  tableFilterButtonEnabled: boolean;
  tablePageSizeEnabled: boolean;
  shipmentCardsEnabled: boolean;
  productImageLinksEnabled: boolean;
  sidebarSubmenusExpandedByDefault: boolean;
};

export type Tenant = {
  shop: string;
  accessToken: string;
  installedAt: string;
  scopes: string;
  plan: string;
  returnWindowDays: number;
  branding: TenantBranding;
};

export const DEFAULT_TENANT_FIELDS = {
  plan: "free",
  returnWindowDays: 30,
  branding: {
    name: "",
    logoUrl: "",
    accentColor: "#000000",
    storefrontUrl: "",
    supportEmail: "",
    requirePolicyAcceptance: true,
    storeLinkEnabled: true,
    storeLinkLabel: "Store",
    orderStatusLinkEnabled: true,
    orderStatusLinkLabel: "Order Status",
    policyHeading: "iBlaze Returns Policy",
    policySubheading: "Review our returns policy before selecting items to return.",
    policyLastUpdated: "",
    policyBodyMode: "categories",
    policyCategories: [
      { title: "Vape Kits & Mods", desc: "30-day refund period. 30-day warranty from delivery." },
      { title: "Batteries & Chargers", desc: "60-day battery warranty. 30-day charger warranty." },
      { title: "E-Liquids & Disposables", desc: "Must remain sealed and unopened. No returns on opened liquids." },
      { title: "Tanks & Clearomisers", desc: "7-day Dead On Arrival window — report faults within 7 days." },
    ],
    policyBodyText: "",
    policyFooterNoteEnabled: true,
    policyFooterNote: "Return postage is at your expense. Tracked service required. Refunds within 5–10 business days.",
    policyAcceptedMessage: "Policy accepted",
    policyDeclinedMessage: "Policy declined",
    sidebarLinks: [],
    sidebarNote: "",
    sidebarLayoutSwitcherEnabled: true,
    defaultSidebarLayout: "inset",
    headerSearchEnabled: true,
    headerSearchPlaceholder: "Search orders...",
    tableSearchEnabled: true,
    tableSearchPlaceholder: "Search product or variant...",
    tableColumnsButtonEnabled: true,
    tableFilterButtonEnabled: true,
    tablePageSizeEnabled: true,
    shipmentCardsEnabled: true,
    productImageLinksEnabled: true,
    sidebarSubmenusExpandedByDefault: true,
  } satisfies TenantBranding,
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
    branding: {
      ...DEFAULT_TENANT_FIELDS.branding,
      ...(typeof r.branding === "string"
        ? JSON.parse(r.branding)
        : (r.branding as Partial<Tenant["branding"]> | undefined) ?? {}),
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
      ...DEFAULT_TENANT_FIELDS.branding,
      ...(existing?.branding ?? {}),
      ...(patch.branding ?? {}),
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
