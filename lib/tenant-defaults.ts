// lib/tenant-defaults.ts
// Pure types + defaults, no Redis import — safe to import from client
// components (e.g. the Settings "Reset to defaults" button and the
// Dashboard Setup Guide) without bundling the server-only Redis client.
// lib/tenant.ts re-exports everything here for its existing server-side
// consumers, so this is the single source of truth for both sides.

export type PolicyCategory = { title: string; desc: string };
/** icon is an optional Lucide icon name (e.g. "HelpCircle") — validated
 * against the actual Lucide export list where it's used, not here.
 * children supports exactly one level of nesting (a submenu), matching
 * shadcn's SidebarMenuSub — not arbitrarily deep. */
export type SidebarLink = { label: string; url: string; icon?: string; children?: { label: string; url: string; icon?: string }[] };
export type SidebarLayout = "inset" | "sidebar";

/**
 * One customer-facing sentence per line-item return status, shown in the
 * order detail's ineligible-items list. Supports {days} (the merchant's
 * return window, from returnWindowDays) and {closedDate} (windowExpired
 * only — the formatted date the window closed) placeholder tokens,
 * replaced at render time in components/dashboard-client.tsx.
 */
export type IneligibleStatusMessages = {
  confirmed: string;
  onItsWay: string;
  outForDelivery: string;
  attemptedDelivery: string;
  windowExpired: string;
  windowExpiredNoDate: string;
  returnRequested: string;
  returnInProgress: string;
  returned: string;
  refunded: string;
  returnCancelled: string;
  cancelled: string;
  notEligible: string;
};

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
  guestBackgroundStyle: "none" | "shapeGrid" | "dotField";
  defaultOrderView: "list" | "grid";
  sidebarDefaultOpenOnDesktop: boolean;
  statusFilterEnabled: boolean;
  ineligibleMessageEnabled: boolean;
  sidebarAvatarEnabled: boolean;
  headerAvatarEnabled: boolean;
  eligibleLabel: string;
  ineligibleLabel: string;
  ineligibleStatusMessages: IneligibleStatusMessages;
  alwaysShowGuestLookup: boolean;
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
    guestBackgroundStyle: "none",
    defaultOrderView: "grid",
    sidebarDefaultOpenOnDesktop: true,
    statusFilterEnabled: true,
    ineligibleMessageEnabled: true,
    sidebarAvatarEnabled: true,
    headerAvatarEnabled: true,
    eligibleLabel: "Eligible",
    ineligibleLabel: "Ineligible",
    ineligibleStatusMessages: {
      confirmed: "We're preparing these items for shipping. Your return window starts on delivery and closes {days} days later.",
      onItsWay: "These items are on their way. Your return window starts on delivery and closes {days} days later.",
      outForDelivery: "These items are out for delivery today. Your return window starts on delivery and closes {days} days later.",
      attemptedDelivery: "A delivery attempt was made for these items. Please rebook or collect — your return window starts once delivered.",
      windowExpired: "The return window has expired for these items. It closed on {closedDate}.",
      windowExpiredNoDate: "The return window has expired for these items.",
      returnRequested: "We've received your return request.",
      returnInProgress: "Your return is in progress.",
      returned: "These items have already been returned.",
      refunded: "These items have already been refunded.",
      returnCancelled: "This return request was cancelled.",
      cancelled: "These items were cancelled.",
      notEligible: "These items aren't eligible for return.",
    },
    alwaysShowGuestLookup: false,
  } satisfies TenantBranding,
};
