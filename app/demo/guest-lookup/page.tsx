"use client";

import { GuestLookupForm } from "@/components/apps-returns/guest-lookup-form";
import { GuestPortalShell } from "@/components/apps-returns/guest-portal-shell";
import type { InitialBranding } from "@/components/apps-returns/client-portal-gate";

/**
 * Design preview for the guest order-lookup screen — no Shopify App Proxy
 * signature required. Use this to iterate on layout before deploying to
 * https://iblazevape.co.uk/apps/returns
 *
 * Local:  http://localhost:3000/demo/guest-lookup
 * Preview deploy: https://<preview>.vercel.app/demo/guest-lookup
 */
const PREVIEW_BRANDING: InitialBranding = {
  name: "iBlaze",
  logoUrl: "https://cdn.shopify.com/s/files/1/0941/5383/4761/files/IblazeLogo.png?v=14858",
  accentColor: "#111111",
  storefrontUrl: "https://iblazevape.co.uk",
  storeLinkEnabled: true,
  storeLinkLabel: "Store",
  sidebarLinks: [],
  sidebarNote: "",
  sidebarLayoutSwitcherEnabled: false,
  defaultSidebarLayout: "inset",
  sidebarSubmenusExpandedByDefault: false,
  guestBackgroundStyle: "shapeGrid",
};

export default function GuestLookupDemoPage() {
  return (
    <GuestPortalShell branding={PREVIEW_BRANDING}>
      <GuestLookupForm
        brandName={PREVIEW_BRANDING.name}
        logoUrl={PREVIEW_BRANDING.logoUrl}
        loginUrl="#login-preview"
        onVerified={() => {
          // Preview only — submission hits the real App Proxy route and will
          // fail here without a signed Shopify request. UI is what matters.
        }}
      />
      <p className="text-xs text-muted-foreground text-center max-w-sm">
        Design preview — form submit won&apos;t verify an order here. Live flow stays at{" "}
        <span className="font-medium">/apps/returns</span> on your storefront.
      </p>
    </GuestPortalShell>
  );
}
