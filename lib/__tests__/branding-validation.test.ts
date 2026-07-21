import { describe, it, expect } from "vitest";
import { validateBrandingInput, type BrandingInput } from "@/lib/branding-validation";

const VALID: BrandingInput = {
  name: "Acme Vapes",
  logoUrl: "https://cdn.shopify.com/acme-logo.png",
  accentColor: "#4F46E5",
  storefrontUrl: "https://acme-vapes.com",
  supportEmail: "help@acme-vapes.com",
  returnWindowDays: 30,
  requirePolicyAcceptance: true,
  storeLinkEnabled: true,
  storeLinkLabel: "Store",
  orderStatusLinkEnabled: true,
  orderStatusLinkLabel: "Order Status",
  policyHeading: "Acme Returns Policy",
  policySubheading: "Review our policy before selecting items to return.",
  policyLastUpdated: "14 July 2026",
  policyBodyMode: "categories",
  policyCategories: [{ title: "Vapes", desc: "30-day refund period." }],
  policyBodyText: "",
  policyFooterNoteEnabled: true,
  policyFooterNote: "Return postage is at your expense.",
  policyAcceptedMessage: "Policy accepted",
  policyDeclinedMessage: "Policy declined",
  sidebarLinks: [{ label: "FAQ", url: "https://acme-vapes.com/faq" }],
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
  guestLookupSnakeBorder: true,
  guestLookupSideStyle: "image",
  guestLookupGradientFrom: "#0f172a",
  guestLookupGradientTo: "#334155",
  defaultOrderView: "grid",
  sidebarDefaultOpenOnDesktop: true,
  statusFilterEnabled: true,
  ineligibleMessageEnabled: true,
  sidebarAvatarEnabled: true,
  headerAvatarEnabled: true,
  eligibleLabel: "Eligible",
  ineligibleLabel: "Ineligible",
  returnLifecycleStyles: {
    notReturnable:    { label: "Not returnable",     heading: "Not returnable",                     icon: "Lock",         color: "" },
    returnRequested:  { label: "Return requested",   heading: "We've received your return request", icon: "Eye",          color: "" },
    returnInProgress: { label: "Return in progress", heading: "Your return is in progress",          icon: "RotateCcw",    color: "" },
    returnDeclined:   { label: "Return declined",    heading: "Your return request was declined",    icon: "CircleX",      color: "" },
    returnCanceled:   { label: "Return canceled",    heading: "This return was canceled",             icon: "XCircle",      color: "" },
    returnCompleted:  { label: "Return completed",   heading: "This return is complete",              icon: "CheckCircle2", color: "" },
  },
  returnLifecycleMessages: {
    shippingConfirmed:         "We're preparing these items for shipping.",
    shippingOnItsWay:          "These items are on their way.",
    shippingOutForDelivery:    "These items are out for delivery today.",
    shippingAttemptedDelivery: "A delivery attempt was made for these items.",
    outsideWindow:              "The return window has expired for these items. It closed on {closedDate}.",
    outsideWindowNoDate:        "The return window has expired for these items.",
    finalSale:                  "This item is marked as final sale and cannot be returned.",
    otherNotReturnable:         "These items aren't eligible for return.",
    returnRequested:            "We've received your return request.",
    returnInProgress:           "Your return is in progress.",
    returnCanceled:             "This return request was canceled.",
    returnCompleted:            "These items have already been returned.",
  },
  refundStatusLabels: {
    notRefunded: "",
    partiallyRefunded: "Partially refunded",
    refunded: "Refunded",
  },
  alwaysShowGuestLookup: false,
};

describe("validateBrandingInput", () => {
  it("accepts a fully valid input", () => {
    const result = validateBrandingInput(VALID);
    expect(result.valid).toBe(true);
    expect(result.errors).toEqual({});
  });

  it("accepts empty optional fields (logoUrl, storefrontUrl, supportEmail)", () => {
    const result = validateBrandingInput({
      ...VALID,
      logoUrl: "",
      storefrontUrl: "",
      supportEmail: "",
    });
    expect(result.valid).toBe(true);
  });

  it("rejects an invalid support email when non-empty", () => {
    const result = validateBrandingInput({ ...VALID, supportEmail: "not-an-email" });
    expect(result.valid).toBe(false);
    expect(result.errors.supportEmail).toBeDefined();
  });

  it("rejects an invalid accent color", () => {
    const result = validateBrandingInput({ ...VALID, accentColor: "red" });
    expect(result.valid).toBe(false);
    expect(result.errors.accentColor).toBeDefined();
  });

  it("rejects a return window outside 1-365", () => {
    expect(validateBrandingInput({ ...VALID, returnWindowDays: 0 }).valid).toBe(false);
    expect(validateBrandingInput({ ...VALID, returnWindowDays: 366 }).valid).toBe(false);
    expect(validateBrandingInput({ ...VALID, returnWindowDays: 365 }).valid).toBe(true);
    expect(validateBrandingInput({ ...VALID, returnWindowDays: 1 }).valid).toBe(true);
  });

  it("accepts an empty policyCategories and sidebarLinks list", () => {
    const result = validateBrandingInput({ ...VALID, policyCategories: [], sidebarLinks: [] });
    expect(result.valid).toBe(true);
  });

  it("rejects a policy category missing a title", () => {
    const result = validateBrandingInput({ ...VALID, policyCategories: [{ title: "", desc: "Some text." }] });
    expect(result.valid).toBe(false);
    expect(result.errors.policyCategories).toBeDefined();
  });

  it("rejects more than 12 policy categories", () => {
    const categories = Array.from({ length: 13 }, (_, i) => ({ title: `Cat ${i}`, desc: "desc" }));
    const result = validateBrandingInput({ ...VALID, policyCategories: categories });
    expect(result.valid).toBe(false);
    expect(result.errors.policyCategories).toBeDefined();
  });

  it("rejects a sidebar link with an invalid URL", () => {
    const result = validateBrandingInput({ ...VALID, sidebarLinks: [{ label: "FAQ", url: "not a url" }] });
    expect(result.valid).toBe(false);
    expect(result.errors.sidebarLinks).toBeDefined();
  });

  it("rejects a sidebar link missing a label", () => {
    const result = validateBrandingInput({ ...VALID, sidebarLinks: [{ label: "", url: "https://acme-vapes.com" }] });
    expect(result.valid).toBe(false);
    expect(result.errors.sidebarLinks).toBeDefined();
  });

  it("accepts up to 100 sidebar links", () => {
    const links = Array.from({ length: 100 }, (_, i) => ({ label: `Link ${i}`, url: "https://acme-vapes.com" }));
    const result = validateBrandingInput({ ...VALID, sidebarLinks: links });
    expect(result.valid).toBe(true);
  });

  it("rejects more than 100 sidebar links", () => {
    const links = Array.from({ length: 101 }, (_, i) => ({ label: `Link ${i}`, url: "https://acme-vapes.com" }));
    const result = validateBrandingInput({ ...VALID, sidebarLinks: links });
    expect(result.valid).toBe(false);
    expect(result.errors.sidebarLinks).toBeDefined();
  });

  it("accepts a sidebar link with a valid submenu", () => {
    const result = validateBrandingInput({
      ...VALID,
      sidebarLinks: [{ label: "Help", url: "https://acme-vapes.com/help", children: [{ label: "FAQ", url: "https://acme-vapes.com/faq" }] }],
    });
    expect(result.valid).toBe(true);
  });

  it("rejects a sidebar submenu link with an invalid URL", () => {
    const result = validateBrandingInput({
      ...VALID,
      sidebarLinks: [{ label: "Help", url: "https://acme-vapes.com/help", children: [{ label: "FAQ", url: "not a url" }] }],
    });
    expect(result.valid).toBe(false);
    expect(result.errors.sidebarLinks).toBeDefined();
  });

  it("rejects a storeLinkLabel over 30 characters", () => {
    const result = validateBrandingInput({ ...VALID, storeLinkLabel: "x".repeat(31) });
    expect(result.valid).toBe(false);
    expect(result.errors.storeLinkLabel).toBeDefined();
  });

  it("accepts policyBodyMode text with a long policyBodyText, ignoring policyCategories", () => {
    const result = validateBrandingInput({ ...VALID, policyBodyMode: "text", policyBodyText: "Free-form policy text.", policyCategories: [] });
    expect(result.valid).toBe(true);
  });

  it("rejects policyBodyText over 20000 characters", () => {
    const result = validateBrandingInput({ ...VALID, policyBodyText: "x".repeat(20001) });
    expect(result.valid).toBe(false);
    expect(result.errors.policyBodyText).toBeDefined();
  });

  it("rejects an orderStatusLinkLabel over 30 characters", () => {
    const result = validateBrandingInput({ ...VALID, orderStatusLinkLabel: "x".repeat(31) });
    expect(result.valid).toBe(false);
    expect(result.errors.orderStatusLinkLabel).toBeDefined();
  });

  it("rejects a policyLastUpdated over 50 characters", () => {
    const result = validateBrandingInput({ ...VALID, policyLastUpdated: "x".repeat(51) });
    expect(result.valid).toBe(false);
    expect(result.errors.policyLastUpdated).toBeDefined();
  });

  it("rejects toast messages over 100 characters", () => {
    expect(validateBrandingInput({ ...VALID, policyAcceptedMessage: "x".repeat(101) }).valid).toBe(false);
    expect(validateBrandingInput({ ...VALID, policyDeclinedMessage: "x".repeat(101) }).valid).toBe(false);
  });

  it("rejects search placeholders over 100 characters", () => {
    expect(validateBrandingInput({ ...VALID, headerSearchPlaceholder: "x".repeat(101) }).valid).toBe(false);
    expect(validateBrandingInput({ ...VALID, tableSearchPlaceholder: "x".repeat(101) }).valid).toBe(false);
  });

  it("rejects an empty ineligible status message", () => {
    const result = validateBrandingInput({
      ...VALID,
      returnLifecycleMessages: { ...VALID.returnLifecycleMessages, returnCompleted: "" },
    });
    expect(result.valid).toBe(false);
    expect(result.errors.returnLifecycleMessages).toBeDefined();
  });

  it("rejects an ineligible status message over 300 characters", () => {
    const result = validateBrandingInput({
      ...VALID,
      returnLifecycleMessages: { ...VALID.returnLifecycleMessages, returnCompleted: "x".repeat(301) },
    });
    expect(result.valid).toBe(false);
    expect(result.errors.returnLifecycleMessages).toBeDefined();
  });

  it("rejects a status style with an empty label or heading", () => {
    const withEmptyLabel = validateBrandingInput({
      ...VALID,
      returnLifecycleStyles: { ...VALID.returnLifecycleStyles, returnCompleted: { ...VALID.returnLifecycleStyles.returnCompleted, label: "" } },
    });
    expect(withEmptyLabel.valid).toBe(false);
    expect(withEmptyLabel.errors.returnLifecycleStyles).toBeDefined();

    const withEmptyHeading = validateBrandingInput({
      ...VALID,
      returnLifecycleStyles: { ...VALID.returnLifecycleStyles, returnCompleted: { ...VALID.returnLifecycleStyles.returnCompleted, heading: "" } },
    });
    expect(withEmptyHeading.valid).toBe(false);
    expect(withEmptyHeading.errors.returnLifecycleStyles).toBeDefined();
  });

  it("rejects a status style color that isn't a valid hex", () => {
    const result = validateBrandingInput({
      ...VALID,
      returnLifecycleStyles: { ...VALID.returnLifecycleStyles, returnCompleted: { ...VALID.returnLifecycleStyles.returnCompleted, color: "red" } },
    });
    expect(result.valid).toBe(false);
    expect(result.errors.returnLifecycleStyles).toBeDefined();
  });

  it("accepts a status style with a blank color (theme default)", () => {
    const result = validateBrandingInput({
      ...VALID,
      returnLifecycleStyles: { ...VALID.returnLifecycleStyles, returnCompleted: { ...VALID.returnLifecycleStyles.returnCompleted, color: "" } },
    });
    expect(result.valid).toBe(true);
  });

  it("accepts a status style with a valid hex color", () => {
    const result = validateBrandingInput({
      ...VALID,
      returnLifecycleStyles: { ...VALID.returnLifecycleStyles, returnCompleted: { ...VALID.returnLifecycleStyles.returnCompleted, color: "#4F46E5" } },
    });
    expect(result.valid).toBe(true);
  });

  it("rejects empty refund status labels", () => {
    const result = validateBrandingInput({
      ...VALID,
      refundStatusLabels: { ...VALID.refundStatusLabels, refunded: "" },
    });
    expect(result.valid).toBe(false);
    expect(result.errors.refundStatusLabels).toBeDefined();
  });
});
