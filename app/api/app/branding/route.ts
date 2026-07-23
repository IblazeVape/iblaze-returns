import { NextRequest, NextResponse } from "next/server";
import { verifyMerchantSessionToken } from "@/lib/merchant-session-token";
import {
  validateBrandingInput,
  RETURN_LIFECYCLE_STATUSES,
  type BrandingInput,
  type PolicyCategoryInput,
  type SidebarLinkInput,
  type ReturnLifecycleMessagesInput,
  type ReturnLifecycleStylesInput,
  type RefundStatusLabelsInput,
} from "@/lib/branding-validation";
import { getTenant, setTenant } from "@/lib/tenant";
import { sanitizePolicyHtml } from "@/lib/sanitize-policy-html";

export const dynamic = "force-dynamic";

const RETURN_LIFECYCLE_MESSAGE_KEYS = [
  "shippingConfirmed", "shippingOnItsWay", "shippingOutForDelivery", "shippingAttemptedDelivery",
  "outsideWindow", "outsideWindowNoDate", "finalSale", "otherNotReturnable",
  "returnRequested", "returnInProgress", "returnCanceled", "returnCompleted",
  "returnCompletedPartialRefund", "returnCompletedNoRefund", "returnCompletedRefundUnverified",
] as const;

const REFUND_STATUS_KEYS = ["notRefunded", "partiallyRefunded", "refunded"] as const;

function isPolicyCategoryArray(value: unknown): value is PolicyCategoryInput[] {
  return Array.isArray(value) && value.every((v) => v && typeof v.title === "string" && typeof v.desc === "string");
}

function isSidebarLinkArray(value: unknown): value is SidebarLinkInput[] {
  return Array.isArray(value) && value.every((v) => v && typeof v.label === "string" && typeof v.url === "string");
}

function isReturnLifecycleMessages(value: unknown): value is ReturnLifecycleMessagesInput {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  return RETURN_LIFECYCLE_MESSAGE_KEYS.every((key) => typeof v[key] === "string");
}

function isReturnLifecycleStyles(value: unknown): value is ReturnLifecycleStylesInput {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  return RETURN_LIFECYCLE_STATUSES.every((key) => {
    const s = v[key] as Record<string, unknown> | undefined;
    return s && typeof s === "object"
      && typeof s.label === "string" && typeof s.heading === "string"
      && typeof s.icon === "string" && typeof s.color === "string";
  });
}

function isRefundStatusLabels(value: unknown): value is RefundStatusLabelsInput {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  return REFUND_STATUS_KEYS.every((key) => typeof v[key] === "string");
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
    logoHeight: typeof body.logoHeight === "number" ? body.logoHeight : existing.branding.logoHeight,
    accentColor: typeof body.accentColor === "string" ? body.accentColor : existing.branding.accentColor,
    storefrontUrl: typeof body.storefrontUrl === "string" ? body.storefrontUrl : existing.branding.storefrontUrl,
    supportEmail: typeof body.supportEmail === "string" ? body.supportEmail : existing.branding.supportEmail,
    returnWindowDays: typeof body.returnWindowDays === "number" ? body.returnWindowDays : existing.returnWindowDays,
    requirePolicyAcceptance:
      typeof body.requirePolicyAcceptance === "boolean" ? body.requirePolicyAcceptance : existing.branding.requirePolicyAcceptance,
    returnReviewEnabled:
      typeof body.returnReviewEnabled === "boolean" ? body.returnReviewEnabled : existing.branding.returnReviewEnabled,
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
    sidebarEnabled:
      typeof body.sidebarEnabled === "boolean" ? body.sidebarEnabled : existing.branding.sidebarEnabled,
    lookupSidebarEnabled:
      typeof body.lookupSidebarEnabled === "boolean" ? body.lookupSidebarEnabled : existing.branding.lookupSidebarEnabled,
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
    guestLookupLayout:
      body.guestLookupLayout === "classic" || body.guestLookupLayout === "split"
        ? body.guestLookupLayout
        : existing.branding.guestLookupLayout,
    guestLookupLayoutMobile:
      body.guestLookupLayoutMobile === "classic" || body.guestLookupLayoutMobile === "split"
        ? body.guestLookupLayoutMobile
        : existing.branding.guestLookupLayoutMobile,
    guestLookupHeadline:
      typeof body.guestLookupHeadline === "string" ? body.guestLookupHeadline : existing.branding.guestLookupHeadline,
    guestLookupSubtext:
      typeof body.guestLookupSubtext === "string" ? body.guestLookupSubtext : existing.branding.guestLookupSubtext,
    guestLookupHeroUrl:
      typeof body.guestLookupHeroUrl === "string" ? body.guestLookupHeroUrl : existing.branding.guestLookupHeroUrl,
    guestLookupBrandDisplay:
      body.guestLookupBrandDisplay === "logo" || body.guestLookupBrandDisplay === "text" || body.guestLookupBrandDisplay === "none"
        ? body.guestLookupBrandDisplay
        : existing.branding.guestLookupBrandDisplay,
    guestLookupLogoUrl:
      typeof body.guestLookupLogoUrl === "string" ? body.guestLookupLogoUrl : existing.branding.guestLookupLogoUrl,
    guestLookupOverlayOpacity:
      typeof body.guestLookupOverlayOpacity === "number" && Number.isFinite(body.guestLookupOverlayOpacity)
        ? Math.round(body.guestLookupOverlayOpacity)
        : existing.branding.guestLookupOverlayOpacity,
    guestLookupOverlayBlur:
      typeof body.guestLookupOverlayBlur === "number" && Number.isFinite(body.guestLookupOverlayBlur)
        ? Math.round(body.guestLookupOverlayBlur)
        : existing.branding.guestLookupOverlayBlur,
    guestLookupSnakeBorder:
      typeof body.guestLookupSnakeBorder === "boolean"
        ? body.guestLookupSnakeBorder
        : existing.branding.guestLookupSnakeBorder,
    guestLookupSideStyle:
      body.guestLookupSideStyle === "image" || body.guestLookupSideStyle === "gradient"
        ? body.guestLookupSideStyle
        : existing.branding.guestLookupSideStyle,
    guestLookupGradientFrom:
      typeof body.guestLookupGradientFrom === "string"
        ? body.guestLookupGradientFrom
        : existing.branding.guestLookupGradientFrom,
    guestLookupGradientTo:
      typeof body.guestLookupGradientTo === "string"
        ? body.guestLookupGradientTo
        : existing.branding.guestLookupGradientTo,
    defaultOrderView:
      body.defaultOrderView === "list" || body.defaultOrderView === "grid" ? body.defaultOrderView : existing.branding.defaultOrderView,
    sidebarDefaultOpenOnDesktop:
      typeof body.sidebarDefaultOpenOnDesktop === "boolean" ? body.sidebarDefaultOpenOnDesktop : existing.branding.sidebarDefaultOpenOnDesktop,
    statusFilterEnabled:
      typeof body.statusFilterEnabled === "boolean" ? body.statusFilterEnabled : existing.branding.statusFilterEnabled,
    ineligibleMessageEnabled:
      typeof body.ineligibleMessageEnabled === "boolean" ? body.ineligibleMessageEnabled : existing.branding.ineligibleMessageEnabled,
    sidebarAvatarEnabled:
      typeof body.sidebarAvatarEnabled === "boolean" ? body.sidebarAvatarEnabled : existing.branding.sidebarAvatarEnabled,
    headerAvatarEnabled:
      typeof body.headerAvatarEnabled === "boolean" ? body.headerAvatarEnabled : existing.branding.headerAvatarEnabled,
    eligibleLabel: typeof body.eligibleLabel === "string" ? body.eligibleLabel : existing.branding.eligibleLabel,
    ineligibleLabel: typeof body.ineligibleLabel === "string" ? body.ineligibleLabel : existing.branding.ineligibleLabel,
    returnLifecycleMessages: isReturnLifecycleMessages(body.returnLifecycleMessages)
      ? body.returnLifecycleMessages
      : existing.branding.returnLifecycleMessages,
    returnLifecycleStyles: isReturnLifecycleStyles(body.returnLifecycleStyles)
      ? body.returnLifecycleStyles
      : existing.branding.returnLifecycleStyles,
    refundStatusLabels: isRefundStatusLabels(body.refundStatusLabels)
      ? body.refundStatusLabels
      : existing.branding.refundStatusLabels,
    alwaysShowGuestLookup:
      typeof body.alwaysShowGuestLookup === "boolean" ? body.alwaysShowGuestLookup : existing.branding.alwaysShowGuestLookup,
    guestLookupEnabled:
      typeof body.guestLookupEnabled === "boolean" ? body.guestLookupEnabled : existing.branding.guestLookupEnabled,
    loggedInLookupRequirePostcode:
      typeof body.loggedInLookupRequirePostcode === "boolean"
        ? body.loggedInLookupRequirePostcode
        : existing.branding.loggedInLookupRequirePostcode,
    policyPresentation:
      body.policyPresentation === "dialog" || body.policyPresentation === "externalLink"
        ? body.policyPresentation
        : existing.branding.policyPresentation,
    policyExternalUrl:
      typeof body.policyExternalUrl === "string" ? body.policyExternalUrl : existing.branding.policyExternalUrl,
    policyReviewButtonLabel:
      typeof body.policyReviewButtonLabel === "string"
        ? body.policyReviewButtonLabel
        : existing.branding.policyReviewButtonLabel,
    toastPosition:
      body.toastPosition === "top-left" || body.toastPosition === "top-center" || body.toastPosition === "top-right"
      || body.toastPosition === "bottom-left" || body.toastPosition === "bottom-center" || body.toastPosition === "bottom-right"
        ? body.toastPosition
        : existing.branding.toastPosition,
    portalCustomScript:
      typeof body.portalCustomScript === "string" ? body.portalCustomScript : existing.branding.portalCustomScript,
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
      logoHeight: input.logoHeight,
      accentColor: input.accentColor,
      storefrontUrl: input.storefrontUrl,
      supportEmail: input.supportEmail,
      requirePolicyAcceptance: input.requirePolicyAcceptance,
      returnReviewEnabled: input.returnReviewEnabled,
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
      sidebarEnabled: input.sidebarEnabled,
      lookupSidebarEnabled: input.lookupSidebarEnabled,
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
      guestLookupLayout: input.guestLookupLayout,
      guestLookupLayoutMobile: input.guestLookupLayoutMobile,
      guestLookupHeadline: input.guestLookupHeadline,
      guestLookupSubtext: input.guestLookupSubtext,
      guestLookupHeroUrl: input.guestLookupHeroUrl,
      guestLookupBrandDisplay: input.guestLookupBrandDisplay,
      guestLookupLogoUrl: input.guestLookupLogoUrl,
      guestLookupOverlayOpacity: input.guestLookupOverlayOpacity,
      guestLookupOverlayBlur: input.guestLookupOverlayBlur,
      guestLookupSnakeBorder: input.guestLookupSnakeBorder,
      guestLookupSideStyle: input.guestLookupSideStyle,
      guestLookupGradientFrom: input.guestLookupGradientFrom,
      guestLookupGradientTo: input.guestLookupGradientTo,
      defaultOrderView: input.defaultOrderView,
      sidebarDefaultOpenOnDesktop: input.sidebarDefaultOpenOnDesktop,
      statusFilterEnabled: input.statusFilterEnabled,
      ineligibleMessageEnabled: input.ineligibleMessageEnabled,
      sidebarAvatarEnabled: input.sidebarAvatarEnabled,
      headerAvatarEnabled: input.headerAvatarEnabled,
      eligibleLabel: input.eligibleLabel,
      ineligibleLabel: input.ineligibleLabel,
      returnLifecycleMessages: input.returnLifecycleMessages,
      returnLifecycleStyles: input.returnLifecycleStyles,
      refundStatusLabels: input.refundStatusLabels,
      alwaysShowGuestLookup: input.alwaysShowGuestLookup,
      guestLookupEnabled: input.guestLookupEnabled,
      loggedInLookupRequirePostcode: input.loggedInLookupRequirePostcode,
      policyPresentation: input.policyPresentation,
      policyExternalUrl: input.policyExternalUrl,
      policyReviewButtonLabel: input.policyReviewButtonLabel,
      toastPosition: input.toastPosition,
      portalCustomScript: input.portalCustomScript,
    },
  });

  const saved = await getTenant(shop);
  return NextResponse.json({
    branding: saved!.branding,
    returnWindowDays: saved!.returnWindowDays,
  });
}
