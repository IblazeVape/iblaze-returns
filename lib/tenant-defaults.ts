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

/** The 7-value return lifecycle status for a non-Eligible line item — maps
 * directly onto Shopify's own Return.status values (REQUESTED, OPEN,
 * DECLINED, CANCELED, CLOSED), plus two statuses for items that never
 * reached the Return object at all: "awaitingDelivery" (still coming —
 * nothing wrong, just hasn't arrived) and "returnWindowClosed"
 * (permanently done — outside the window, final sale, or any other
 * ineligibility reason Shopify reports). Split from a single "notReturnable"
 * status because that one status made a capability claim ("can't be
 * returned") that was true of every row in the ineligible table, so it
 * couldn't distinguish anything in the filter dropdown — unlike these two,
 * which make different process claims (still pending vs. permanently
 * closed). */
export type ReturnLifecycleStatus =
  | "awaitingDelivery"
  | "returnWindowClosed"
  | "returnRequested"
  | "returnInProgress"
  | "returnDeclined"
  | "returnCanceled"
  | "returnCompleted";

export const RETURN_LIFECYCLE_STATUSES: ReturnLifecycleStatus[] = [
  "awaitingDelivery", "returnWindowClosed", "returnRequested",
  "returnInProgress", "returnDeclined", "returnCanceled", "returnCompleted",
];

/** Why a "returnWindowClosed" item can't be returned — maps onto a subset
 * of Shopify's NonReturnableReason enum (RETURN_WINDOW_EXPIRED, FINAL_SALE,
 * OTHER). UNFULFILLED is excluded here because that case now maps to the
 * "awaitingDelivery" status instead of a reason under this one; RETURNED is
 * excluded because that case maps directly to returnCompleted. */
export type ReturnClosedReason = "outsideWindow" | "finalSale" | "other";

export const RETURN_CLOSED_REASONS: ReturnClosedReason[] = [
  "outsideWindow", "finalSale", "other",
];

/** Independent refund fact — can coexist with ANY return lifecycle status,
 * including a line item refunded directly with no return ever created. */
export type RefundStatus = "notRefunded" | "partiallyRefunded" | "refunded";

/** Filter/badge label, mobile accordion heading, icon, and color for one
 * return lifecycle status. `color` is a hex value or "" (empty = the
 * portal's default theme-aware text color). */
export type ReturnLifecycleStyle = { label: string; heading: string; icon: string; color: string };
export type ReturnLifecycleStyles = Record<ReturnLifecycleStatus, ReturnLifecycleStyle>;

/**
 * Customer-facing sentences. shipping* fields apply when status is
 * "awaitingDelivery" — the sentence still needs to say which shipping
 * stage it's at. outsideWindow/finalSale/otherNotReturnable apply when
 * status is "returnWindowClosed", dispatched on the item's closedReason.
 * returnDeclined has no field here — it uses the real Shopify decline
 * reason text, resolved dynamically in components/dashboard-client.tsx.
 * Supports {days} (merchant's return window) and {closedDate}
 * (outsideWindow only) placeholder tokens.
 */
export type ReturnLifecycleMessages = {
  shippingConfirmed: string;
  shippingOnItsWay: string;
  shippingOutForDelivery: string;
  shippingAttemptedDelivery: string;
  outsideWindow: string;
  outsideWindowNoDate: string;
  finalSale: string;
  otherNotReturnable: string;
  returnRequested: string;
  returnInProgress: string;
  returnCanceled: string;
  returnCompleted: string;
};

/** No icon/color/heading — refund is always shown as a small supporting
 * fact next to the lifecycle status, never as its own badge.
 * notRefunded's label is deliberately blank in the defaults below: a line
 * item that hasn't been refunded shows no refund fact at all. */
export type RefundStatusLabels = Record<RefundStatus, string>;

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
  /** Guest order-lookup card layout: simple form vs image + form split. */
  guestLookupLayout: "classic" | "split";
  /** Left-panel headline on the guest order-lookup card (split layout). */
  guestLookupHeadline: string;
  /** Left-panel supporting line under the headline (split layout). */
  guestLookupSubtext: string;
  /** Optional hero image URL. Empty = built-in returns package image. */
  guestLookupHeroUrl: string;
  /** How the brand mark appears on the guest lookup hero panel. */
  guestLookupBrandDisplay: "logo" | "text" | "none";
  /** Optional panel logo override. Empty = fall back to logoUrl. */
  guestLookupLogoUrl: string;
  /** Black veil over the hero image (0–100). Higher = darker / easier text. */
  guestLookupOverlayOpacity: number;
  /** Backdrop blur on the hero image in pixels (0–24). */
  guestLookupOverlayBlur: number;
  defaultOrderView: "list" | "grid";
  sidebarDefaultOpenOnDesktop: boolean;
  statusFilterEnabled: boolean;
  ineligibleMessageEnabled: boolean;
  sidebarAvatarEnabled: boolean;
  headerAvatarEnabled: boolean;
  eligibleLabel: string;
  ineligibleLabel: string;
  returnLifecycleStyles: ReturnLifecycleStyles;
  returnLifecycleMessages: ReturnLifecycleMessages;
  refundStatusLabels: RefundStatusLabels;
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
    guestLookupLayout: "split",
    guestLookupHeadline: "Return your order with ease",
    guestLookupSubtext: "Look up your order in seconds — no account needed.",
    guestLookupHeroUrl: "",
    guestLookupBrandDisplay: "logo",
    guestLookupLogoUrl: "",
    guestLookupOverlayOpacity: 40,
    guestLookupOverlayBlur: 0,
    defaultOrderView: "grid",
    sidebarDefaultOpenOnDesktop: true,
    statusFilterEnabled: true,
    ineligibleMessageEnabled: true,
    sidebarAvatarEnabled: true,
    headerAvatarEnabled: true,
    eligibleLabel: "Eligible",
    ineligibleLabel: "Ineligible",
    returnLifecycleStyles: {
      awaitingDelivery:   { label: "Awaiting delivery",    heading: "Awaiting delivery",                     icon: "Truck",        color: "" },
      returnWindowClosed: { label: "Return window closed", heading: "Return window closed",                  icon: "Lock",         color: "" },
      returnRequested:    { label: "Return requested",     heading: "We've received your return request",   icon: "Eye",          color: "" },
      returnInProgress:   { label: "Return in progress",   heading: "Your return is in progress",            icon: "RotateCcw",    color: "" },
      returnDeclined:     { label: "Return declined",      heading: "Your return request was declined",      icon: "CircleX",      color: "" },
      returnCanceled:     { label: "Return canceled",      heading: "This return was canceled",              icon: "XCircle",      color: "" },
      returnCompleted:    { label: "Return completed",     heading: "This return is complete",               icon: "CheckCircle2", color: "" },
    },
    returnLifecycleMessages: {
      shippingConfirmed:         "We're preparing these items for shipping. Your return window starts on delivery and closes {days} days later.",
      shippingOnItsWay:          "These items are on their way. Your return window starts on delivery and closes {days} days later.",
      shippingOutForDelivery:    "These items are out for delivery today. Your return window starts on delivery and closes {days} days later.",
      shippingAttemptedDelivery: "A delivery attempt was made for these items. You'll be able to request a return once they've been delivered.",
      outsideWindow:             "The return window has expired for these items. It closed on {closedDate}.",
      outsideWindowNoDate:       "The return window has expired for these items.",
      finalSale:                 "This item is marked as final sale and cannot be returned.",
      otherNotReturnable:        "These items aren't eligible for return.",
      returnRequested:           "We've received your return request.",
      returnInProgress:          "Your return is in progress.",
      returnCanceled:            "This return request was canceled.",
      returnCompleted:           "These items have already been returned.",
    },
    refundStatusLabels: {
      notRefunded: "",
      partiallyRefunded: "Partially refunded",
      refunded: "Refunded",
    },
    alwaysShowGuestLookup: false,
  } satisfies TenantBranding,
};
