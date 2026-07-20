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
    expect(t?.branding.name).toBe("");
    expect(t?.branding.logoUrl).toBe("");
    expect(t?.branding.accentColor).toBe("#000000");
    expect(t?.branding.requirePolicyAcceptance).toBe(true);
    expect(t?.branding.storeLinkEnabled).toBe(true);
    expect(t?.branding.storeLinkLabel).toBe("Store");
    expect(t?.branding.policyHeading).toBe("iBlaze Returns Policy");
    expect(t?.branding.policyBodyMode).toBe("categories");
    expect(t?.branding.policyCategories.length).toBe(4);
    expect(t?.branding.sidebarLinks).toEqual([]);
    expect(t?.branding.sidebarLayoutSwitcherEnabled).toBe(true);
    expect(t?.branding.defaultSidebarLayout).toBe("inset");
    expect(t?.branding.orderStatusLinkEnabled).toBe(true);
    expect(t?.branding.orderStatusLinkLabel).toBe("Order Status");
    expect(t?.branding.policyLastUpdated).toBe("");
    expect(t?.branding.policyAcceptedMessage).toBe("Policy accepted");
    expect(t?.branding.policyDeclinedMessage).toBe("Policy declined");
    expect(t?.branding.headerSearchEnabled).toBe(true);
    expect(t?.branding.headerSearchPlaceholder).toBe("Search orders...");
    expect(t?.branding.tableSearchEnabled).toBe(true);
    expect(t?.branding.tableColumnsButtonEnabled).toBe(true);
    expect(t?.branding.tableFilterButtonEnabled).toBe(true);
    expect(t?.branding.tablePageSizeEnabled).toBe(true);
    expect(t?.branding.shipmentCardsEnabled).toBe(true);
    expect(t?.branding.productImageLinksEnabled).toBe(true);
    expect(t?.branding.sidebarSubmenusExpandedByDefault).toBe(true);
    expect(t?.branding.guestBackgroundStyle).toBe("none");
    expect(t?.branding.guestLookupLayout).toBe("split");
    expect(t?.branding.guestLookupHeadline).toBe("Return your order with ease");
    expect(t?.branding.policyFooterNoteEnabled).toBe(true);
    expect(t?.branding.returnLifecycleStyles.notReturnable.label).toBe("Not returnable");
    expect(t?.branding.returnLifecycleStyles.returnDeclined.icon).toBe("CircleX");
    expect(t?.branding.refundStatusLabels.notRefunded).toBe("");
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
        requirePolicyAcceptance: false,
        storeLinkEnabled: false,
        storeLinkLabel: "Back to store",
        orderStatusLinkEnabled: false,
        orderStatusLinkLabel: "Track order",
        policyHeading: "Acme Returns Policy",
        policySubheading: "Please review before returning items.",
        policyLastUpdated: "14 July 2026",
        policyBodyMode: "text",
        policyCategories: [{ title: "Vapes", desc: "30-day refund." }],
        policyBodyText: "Free-form policy text instead of categories.",
        policyFooterNoteEnabled: false,
        policyFooterNote: "Postage at your expense.",
        policyAcceptedMessage: "Thanks, policy accepted!",
        policyDeclinedMessage: "No worries, policy declined.",
        sidebarLinks: [{ label: "FAQ", url: "https://acme-vapes.com/faq", icon: "HelpCircle", children: [{ label: "Sub", url: "https://acme-vapes.com/sub" }] }],
        sidebarNote: "**Note:** processing may take 48h.",
        sidebarLayoutSwitcherEnabled: false,
        defaultSidebarLayout: "sidebar",
        headerSearchEnabled: false,
        headerSearchPlaceholder: "Find an order...",
        tableSearchEnabled: false,
        tableSearchPlaceholder: "Find a product...",
        tableColumnsButtonEnabled: false,
        tableFilterButtonEnabled: false,
        tablePageSizeEnabled: false,
        shipmentCardsEnabled: false,
        productImageLinksEnabled: false,
        sidebarSubmenusExpandedByDefault: false,
        guestBackgroundStyle: "dotField",
        guestLookupLayout: "classic",
        guestLookupHeadline: "Find your return",
        guestLookupSubtext: "Enter your details below.",
        guestLookupHeroUrl: "https://cdn.shopify.com/hero.png",
        guestLookupBrandDisplay: "text",
        guestLookupLogoUrl: "",
        defaultOrderView: "list",
        sidebarDefaultOpenOnDesktop: false,
        statusFilterEnabled: false,
        ineligibleMessageEnabled: false,
        sidebarAvatarEnabled: false,
        headerAvatarEnabled: false,
        eligibleLabel: "Ready to return",
        ineligibleLabel: "Not eligible",
        returnLifecycleStyles: {
          notReturnable:    { label: "Window closed",      heading: "Window expired",           icon: "Lock",         color: "#4F46E5" },
          returnRequested:  { label: "Requested",          heading: "Return requested",         icon: "Eye",          color: "" },
          returnInProgress: { label: "In progress",        heading: "In progress",              icon: "RotateCcw",    color: "" },
          returnDeclined:   { label: "Declined",           heading: "Declined",                 icon: "CircleX",      color: "" },
          returnCanceled:   { label: "Canceled",           heading: "Canceled",                 icon: "XCircle",      color: "" },
          returnCompleted:  { label: "Returned",           heading: "Returned",                 icon: "CheckCircle2", color: "" },
        },
        returnLifecycleMessages: {
          shippingConfirmed:         "Preparing for shipping.",
          shippingOnItsWay:          "On its way.",
          shippingOutForDelivery:    "Out for delivery.",
          shippingAttemptedDelivery: "Delivery attempted.",
          outsideWindow:              "Window expired on {closedDate}.",
          outsideWindowNoDate:        "Window expired.",
          finalSale:                  "Final sale item.",
          otherNotReturnable:         "Not eligible.",
          returnRequested:            "Return requested.",
          returnInProgress:           "Return in progress.",
          returnCanceled:             "Return canceled.",
          returnCompleted:            "Already returned.",
        },
        refundStatusLabels: {
          notRefunded: "",
          partiallyRefunded: "Partly refunded",
          refunded: "Already refunded.",
        },
        alwaysShowGuestLookup: true,
      },
    });
    const t = await getTenant("d.myshopify.com");
    expect(t?.returnWindowDays).toBe(14);
    expect(t?.branding.name).toBe("Acme Vapes");
    expect(t?.branding.supportEmail).toBe("help@acme-vapes.com");
    expect(t?.branding.requirePolicyAcceptance).toBe(false);
    expect(t?.branding.storeLinkEnabled).toBe(false);
    expect(t?.branding.storeLinkLabel).toBe("Back to store");
    expect(t?.branding.policyBodyMode).toBe("text");
    expect(t?.branding.policyBodyText).toBe("Free-form policy text instead of categories.");
    expect(t?.branding.policyCategories).toEqual([{ title: "Vapes", desc: "30-day refund." }]);
    expect(t?.branding.sidebarLinks).toEqual([
      { label: "FAQ", url: "https://acme-vapes.com/faq", icon: "HelpCircle", children: [{ label: "Sub", url: "https://acme-vapes.com/sub" }] },
    ]);
    expect(t?.branding.sidebarLayoutSwitcherEnabled).toBe(false);
    expect(t?.branding.defaultSidebarLayout).toBe("sidebar");
    expect(t?.branding.orderStatusLinkEnabled).toBe(false);
    expect(t?.branding.orderStatusLinkLabel).toBe("Track order");
    expect(t?.branding.policyLastUpdated).toBe("14 July 2026");
    expect(t?.branding.policyAcceptedMessage).toBe("Thanks, policy accepted!");
    expect(t?.branding.sidebarLinks[0].icon).toBe("HelpCircle");
    expect(t?.branding.sidebarLinks[0].children).toEqual([{ label: "Sub", url: "https://acme-vapes.com/sub" }]);
    expect(t?.branding.headerSearchEnabled).toBe(false);
    expect(t?.branding.tableColumnsButtonEnabled).toBe(false);
    expect(t?.branding.shipmentCardsEnabled).toBe(false);
    expect(t?.branding.productImageLinksEnabled).toBe(false);
    expect(t?.branding.sidebarSubmenusExpandedByDefault).toBe(false);
    expect(t?.branding.guestBackgroundStyle).toBe("dotField");
    expect(t?.branding.policyFooterNoteEnabled).toBe(false);
    expect(t?.branding.returnLifecycleMessages.returnCompleted).toBe("Already returned.");
    expect(t?.branding.alwaysShowGuestLookup).toBe(true);
    expect(t?.branding.returnLifecycleStyles.notReturnable).toEqual({ label: "Window closed", heading: "Window expired", icon: "Lock", color: "#4F46E5" });
    expect(t?.branding.refundStatusLabels.partiallyRefunded).toBe("Partly refunded");
    expect(t?.branding.refundStatusLabels.refunded).toBe("Already refunded.");
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
  });
});
