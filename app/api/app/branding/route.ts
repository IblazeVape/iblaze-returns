import { NextRequest, NextResponse } from "next/server";
import { verifyMerchantSessionToken } from "@/lib/merchant-session-token";
import { validateBrandingInput, type BrandingInput, type PolicyCategoryInput, type SidebarLinkInput } from "@/lib/branding-validation";
import { getTenant, setTenant } from "@/lib/tenant";
import { sanitizePolicyHtml } from "@/lib/sanitize-policy-html";

export const dynamic = "force-dynamic";

function isPolicyCategoryArray(value: unknown): value is PolicyCategoryInput[] {
  return Array.isArray(value) && value.every((v) => v && typeof v.title === "string" && typeof v.desc === "string");
}

function isSidebarLinkArray(value: unknown): value is SidebarLinkInput[] {
  return Array.isArray(value) && value.every((v) => v && typeof v.label === "string" && typeof v.url === "string");
}

export async function PUT(request: NextRequest) {
  const auth = request.headers.get("authorization") || "";
  const sessionToken = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  const claims = sessionToken ? verifyMerchantSessionToken(sessionToken) : null;
  if (!claims) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const shop = claims.shop;

  const body = (await request.json().catch(() => null)) as Partial<BrandingInput> | null;
  if (!body) {
    return NextResponse.json({ error: "invalid request body" }, { status: 400 });
  }

  const existing = await getTenant(shop);
  if (!existing) {
    return NextResponse.json({ error: "tenant not found" }, { status: 404 });
  }

  const input: BrandingInput = {
    name: typeof body.name === "string" ? body.name : existing.branding.name,
    logoUrl: typeof body.logoUrl === "string" ? body.logoUrl : existing.branding.logoUrl,
    accentColor: typeof body.accentColor === "string" ? body.accentColor : existing.branding.accentColor,
    storefrontUrl: typeof body.storefrontUrl === "string" ? body.storefrontUrl : existing.branding.storefrontUrl,
    supportEmail: typeof body.supportEmail === "string" ? body.supportEmail : existing.branding.supportEmail,
    returnWindowDays: typeof body.returnWindowDays === "number" ? body.returnWindowDays : existing.returnWindowDays,
    requirePolicyAcceptance:
      typeof body.requirePolicyAcceptance === "boolean" ? body.requirePolicyAcceptance : existing.branding.requirePolicyAcceptance,
    storeLinkEnabled: typeof body.storeLinkEnabled === "boolean" ? body.storeLinkEnabled : existing.branding.storeLinkEnabled,
    storeLinkLabel: typeof body.storeLinkLabel === "string" ? body.storeLinkLabel : existing.branding.storeLinkLabel,
    orderStatusLinkEnabled:
      typeof body.orderStatusLinkEnabled === "boolean" ? body.orderStatusLinkEnabled : existing.branding.orderStatusLinkEnabled,
    orderStatusLinkLabel: typeof body.orderStatusLinkLabel === "string" ? body.orderStatusLinkLabel : existing.branding.orderStatusLinkLabel,
    policyHeading: typeof body.policyHeading === "string" ? body.policyHeading : existing.branding.policyHeading,
    policySubheading: typeof body.policySubheading === "string" ? body.policySubheading : existing.branding.policySubheading,
    policyLastUpdated: typeof body.policyLastUpdated === "string" ? body.policyLastUpdated : existing.branding.policyLastUpdated,
    policyBodyMode:
      body.policyBodyMode === "categories" || body.policyBodyMode === "text" ? body.policyBodyMode : existing.branding.policyBodyMode,
    policyCategories: isPolicyCategoryArray(body.policyCategories) ? body.policyCategories : existing.branding.policyCategories,
    policyBodyText:
      typeof body.policyBodyText === "string" ? sanitizePolicyHtml(body.policyBodyText) : existing.branding.policyBodyText,
    policyFooterNoteEnabled:
      typeof body.policyFooterNoteEnabled === "boolean" ? body.policyFooterNoteEnabled : existing.branding.policyFooterNoteEnabled,
    policyFooterNote: typeof body.policyFooterNote === "string" ? body.policyFooterNote : existing.branding.policyFooterNote,
    policyAcceptedMessage:
      typeof body.policyAcceptedMessage === "string" ? body.policyAcceptedMessage : existing.branding.policyAcceptedMessage,
    policyDeclinedMessage:
      typeof body.policyDeclinedMessage === "string" ? body.policyDeclinedMessage : existing.branding.policyDeclinedMessage,
    sidebarLinks: isSidebarLinkArray(body.sidebarLinks) ? body.sidebarLinks : existing.branding.sidebarLinks,
    sidebarNote: typeof body.sidebarNote === "string" ? body.sidebarNote : existing.branding.sidebarNote,
    sidebarLayoutSwitcherEnabled:
      typeof body.sidebarLayoutSwitcherEnabled === "boolean" ? body.sidebarLayoutSwitcherEnabled : existing.branding.sidebarLayoutSwitcherEnabled,
    defaultSidebarLayout:
      body.defaultSidebarLayout === "inset" || body.defaultSidebarLayout === "sidebar"
        ? body.defaultSidebarLayout
        : existing.branding.defaultSidebarLayout,
    headerSearchEnabled:
      typeof body.headerSearchEnabled === "boolean" ? body.headerSearchEnabled : existing.branding.headerSearchEnabled,
    headerSearchPlaceholder:
      typeof body.headerSearchPlaceholder === "string" ? body.headerSearchPlaceholder : existing.branding.headerSearchPlaceholder,
    tableSearchEnabled: typeof body.tableSearchEnabled === "boolean" ? body.tableSearchEnabled : existing.branding.tableSearchEnabled,
    tableSearchPlaceholder:
      typeof body.tableSearchPlaceholder === "string" ? body.tableSearchPlaceholder : existing.branding.tableSearchPlaceholder,
    tableColumnsButtonEnabled:
      typeof body.tableColumnsButtonEnabled === "boolean" ? body.tableColumnsButtonEnabled : existing.branding.tableColumnsButtonEnabled,
    tableFilterButtonEnabled:
      typeof body.tableFilterButtonEnabled === "boolean" ? body.tableFilterButtonEnabled : existing.branding.tableFilterButtonEnabled,
    tablePageSizeEnabled:
      typeof body.tablePageSizeEnabled === "boolean" ? body.tablePageSizeEnabled : existing.branding.tablePageSizeEnabled,
    shipmentCardsEnabled:
      typeof body.shipmentCardsEnabled === "boolean" ? body.shipmentCardsEnabled : existing.branding.shipmentCardsEnabled,
    productImageLinksEnabled:
      typeof body.productImageLinksEnabled === "boolean" ? body.productImageLinksEnabled : existing.branding.productImageLinksEnabled,
    sidebarSubmenusExpandedByDefault:
      typeof body.sidebarSubmenusExpandedByDefault === "boolean"
        ? body.sidebarSubmenusExpandedByDefault
        : existing.branding.sidebarSubmenusExpandedByDefault,
    guestBackgroundStyle:
      body.guestBackgroundStyle === "none" || body.guestBackgroundStyle === "shapeGrid" || body.guestBackgroundStyle === "dotField"
        ? body.guestBackgroundStyle
        : existing.branding.guestBackgroundStyle,
  };

  const { valid, errors } = validateBrandingInput(input);
  if (!valid) {
    return NextResponse.json({ errors }, { status: 400 });
  }

  await setTenant(shop, {
    returnWindowDays: input.returnWindowDays,
    branding: {
      name: input.name,
      logoUrl: input.logoUrl,
      accentColor: input.accentColor,
      storefrontUrl: input.storefrontUrl,
      supportEmail: input.supportEmail,
      requirePolicyAcceptance: input.requirePolicyAcceptance,
      storeLinkEnabled: input.storeLinkEnabled,
      storeLinkLabel: input.storeLinkLabel,
      orderStatusLinkEnabled: input.orderStatusLinkEnabled,
      orderStatusLinkLabel: input.orderStatusLinkLabel,
      policyHeading: input.policyHeading,
      policySubheading: input.policySubheading,
      policyLastUpdated: input.policyLastUpdated,
      policyBodyMode: input.policyBodyMode,
      policyCategories: input.policyCategories,
      policyBodyText: input.policyBodyText,
      policyFooterNoteEnabled: input.policyFooterNoteEnabled,
      policyFooterNote: input.policyFooterNote,
      policyAcceptedMessage: input.policyAcceptedMessage,
      policyDeclinedMessage: input.policyDeclinedMessage,
      sidebarLinks: input.sidebarLinks,
      sidebarNote: input.sidebarNote,
      sidebarLayoutSwitcherEnabled: input.sidebarLayoutSwitcherEnabled,
      defaultSidebarLayout: input.defaultSidebarLayout,
      headerSearchEnabled: input.headerSearchEnabled,
      headerSearchPlaceholder: input.headerSearchPlaceholder,
      tableSearchEnabled: input.tableSearchEnabled,
      tableSearchPlaceholder: input.tableSearchPlaceholder,
      tableColumnsButtonEnabled: input.tableColumnsButtonEnabled,
      tableFilterButtonEnabled: input.tableFilterButtonEnabled,
      tablePageSizeEnabled: input.tablePageSizeEnabled,
      shipmentCardsEnabled: input.shipmentCardsEnabled,
      productImageLinksEnabled: input.productImageLinksEnabled,
      sidebarSubmenusExpandedByDefault: input.sidebarSubmenusExpandedByDefault,
      guestBackgroundStyle: input.guestBackgroundStyle,
    },
  });

  const saved = await getTenant(shop);
  return NextResponse.json({
    branding: saved!.branding,
    returnWindowDays: saved!.returnWindowDays,
  });
}
