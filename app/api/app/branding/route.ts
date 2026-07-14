import { NextRequest, NextResponse } from "next/server";
import { verifyMerchantSessionToken } from "@/lib/merchant-session-token";
import { validateBrandingInput, type BrandingInput, type PolicyCategoryInput, type SidebarLinkInput } from "@/lib/branding-validation";
import { getTenant, setTenant } from "@/lib/tenant";

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
    policyUrl: typeof body.policyUrl === "string" ? body.policyUrl : existing.branding.policyUrl,
    policyText: typeof body.policyText === "string" ? body.policyText : existing.branding.policyText,
    returnWindowDays: typeof body.returnWindowDays === "number" ? body.returnWindowDays : existing.returnWindowDays,
    requirePolicyAcceptance:
      typeof body.requirePolicyAcceptance === "boolean" ? body.requirePolicyAcceptance : existing.branding.requirePolicyAcceptance,
    storeLinkEnabled: typeof body.storeLinkEnabled === "boolean" ? body.storeLinkEnabled : existing.branding.storeLinkEnabled,
    storeLinkLabel: typeof body.storeLinkLabel === "string" ? body.storeLinkLabel : existing.branding.storeLinkLabel,
    policyHeading: typeof body.policyHeading === "string" ? body.policyHeading : existing.branding.policyHeading,
    policySubheading: typeof body.policySubheading === "string" ? body.policySubheading : existing.branding.policySubheading,
    policyCategories: isPolicyCategoryArray(body.policyCategories) ? body.policyCategories : existing.branding.policyCategories,
    policyFooterNote: typeof body.policyFooterNote === "string" ? body.policyFooterNote : existing.branding.policyFooterNote,
    sidebarLinks: isSidebarLinkArray(body.sidebarLinks) ? body.sidebarLinks : existing.branding.sidebarLinks,
    sidebarNote: typeof body.sidebarNote === "string" ? body.sidebarNote : existing.branding.sidebarNote,
    sidebarLayoutSwitcherEnabled:
      typeof body.sidebarLayoutSwitcherEnabled === "boolean" ? body.sidebarLayoutSwitcherEnabled : existing.branding.sidebarLayoutSwitcherEnabled,
    defaultSidebarLayout:
      body.defaultSidebarLayout === "inset" || body.defaultSidebarLayout === "sidebar"
        ? body.defaultSidebarLayout
        : existing.branding.defaultSidebarLayout,
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
      policyUrl: input.policyUrl,
      policyText: input.policyText,
      requirePolicyAcceptance: input.requirePolicyAcceptance,
      storeLinkEnabled: input.storeLinkEnabled,
      storeLinkLabel: input.storeLinkLabel,
      policyHeading: input.policyHeading,
      policySubheading: input.policySubheading,
      policyCategories: input.policyCategories,
      policyFooterNote: input.policyFooterNote,
      sidebarLinks: input.sidebarLinks,
      sidebarNote: input.sidebarNote,
      sidebarLayoutSwitcherEnabled: input.sidebarLayoutSwitcherEnabled,
      defaultSidebarLayout: input.defaultSidebarLayout,
    },
  });

  const saved = await getTenant(shop);
  return NextResponse.json({
    branding: saved!.branding,
    returnWindowDays: saved!.returnWindowDays,
  });
}
