"use client";

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { GuestLookupForm } from "@/components/apps-returns/guest-lookup-form";
import { GuestPortalShell } from "@/components/apps-returns/guest-portal-shell";
import type { InitialBranding } from "@/components/apps-returns/client-portal-gate";

/**
 * Design preview for the guest order-lookup screen — no Shopify App Proxy
 * signature required.
 *
 * Local:  http://localhost:3000/demo/guest-lookup
 * Classic: http://localhost:3000/demo/guest-lookup?layout=classic
 */
const PREVIEW_BRANDING: InitialBranding = {
  name: "iBlaze",
  logoUrl: "https://cdn.shopify.com/s/files/1/0941/5383/4761/files/IblazeLogo.png?v=14858",
  logoHeight: 32,
  accentColor: "#111111",
  storefrontUrl: "https://iblazevape.co.uk",
  storeLinkEnabled: true,
  storeLinkLabel: "Store",
  sidebarLinks: [],
  sidebarNote: "",
  sidebarLayoutSwitcherEnabled: false,
  defaultSidebarLayout: "inset",
  sidebarEnabled: true,
  lookupSidebarEnabled: true,
  sidebarDefaultOpenOnDesktop: false,
  sidebarAvatarEnabled: true,
  headerAvatarEnabled: true,
  sidebarSubmenusExpandedByDefault: false,
  orderStatusLinkEnabled: true,
  orderStatusLinkLabel: "Order Status",
  headerSearchEnabled: false,
  headerSearchPlaceholder: "Search orders...",
  guestBackgroundStyle: "shapeGrid",
  guestLookupLayout: "split",
  guestLookupLayoutMobile: "classic",
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
  toastPosition: "top-right",
  portalCustomScript: "",
  loggedInLookupRequirePostcode: false,
};

function GuestLookupDemoInner() {
  const searchParams = useSearchParams();
  const layout = searchParams.get("layout") === "classic" ? "classic" : "split";

  return (
    <GuestPortalShell branding={PREVIEW_BRANDING} title={PREVIEW_BRANDING.name}>
      <GuestLookupForm
        layout={layout}
        layoutMobile={searchParams.get("mobile") === "split" ? "split" : "classic"}
        brandName={PREVIEW_BRANDING.name}
        logoUrl={PREVIEW_BRANDING.logoUrl}
        brandDisplay="logo"
        headline={PREVIEW_BRANDING.guestLookupHeadline}
        subtext={PREVIEW_BRANDING.guestLookupSubtext}
        overlayOpacity={PREVIEW_BRANDING.guestLookupOverlayOpacity}
        overlayBlur={PREVIEW_BRANDING.guestLookupOverlayBlur}
        snakeBorder={PREVIEW_BRANDING.guestLookupSnakeBorder}
        sideStyle={PREVIEW_BRANDING.guestLookupSideStyle}
        gradientFrom={PREVIEW_BRANDING.guestLookupGradientFrom}
        gradientTo={PREVIEW_BRANDING.guestLookupGradientTo}
        loginUrl="#login-preview"
        onVerified={() => {}}
      />
      <p className="text-xs text-muted-foreground text-center max-w-sm">
        Design preview — form submit won&apos;t verify an order here. Live flow stays at{" "}
        <span className="font-medium">/apps/returns</span> on your storefront.
        {" "}Add <span className="font-medium">?layout=classic</span> to preview the original card.
      </p>
    </GuestPortalShell>
  );
}

export default function GuestLookupDemoPage() {
  return (
    <Suspense fallback={null}>
      <GuestLookupDemoInner />
    </Suspense>
  );
}
