"use client";

import { useEffect } from "react";
import { SidebarLayoutProvider, useSidebarLayout } from "@/components/sidebar-layout-provider";
import { PortalShell } from "@/components/portal-shell";
import { ShapeGrid } from "@/components/shape-grid";
import DotField from "@/components/dot-field";
import type { InitialBranding } from "@/components/apps-returns/client-portal-gate";

/**
 * Wraps the guest lookup form (and the unsigned/not-set-up Notice screens)
 * in the SAME shell component DashboardClient itself renders through
 * (PortalShell) — not a lookalike copy — so the guest lookup screen is
 * unmistakably the same portal, not a separate page that happens to precede
 * it.
 *
 * The guest hasn't verified an order yet, so there's no identity to show
 * in the header (`hideIdentity`) — but the sidebar itself opens/collapses
 * normally, same as everywhere else in the portal, and reflects the same
 * merchant-configured sidebar links/note/layout settings DashboardClient
 * applies once a customer is signed in.
 */
export function GuestPortalShell({
  title = "Find your order",
  branding,
  children,
}: {
  title?: string;
  branding: InitialBranding;
  children: React.ReactNode;
}) {
  return (
    <SidebarLayoutProvider>
      <GuestPortalShellInner title={title} branding={branding}>
        {children}
      </GuestPortalShellInner>
    </SidebarLayoutProvider>
  );
}

function GuestPortalShellInner({
  title,
  branding,
  children,
}: {
  title: string;
  branding: InitialBranding;
  children: React.ReactNode;
}) {
  const { applyMerchantDefault } = useSidebarLayout();

  // Branding is server-rendered (passed as a prop, no client fetch), so this
  // can apply immediately on mount rather than waiting on an async fetch
  // like DashboardClient's equivalent effect does.
  useEffect(() => {
    applyMerchantDefault(
      branding.defaultSidebarLayout,
      branding.sidebarEnabled && branding.sidebarLayoutSwitcherEnabled,
    );
  }, [
    applyMerchantDefault,
    branding.defaultSidebarLayout,
    branding.sidebarEnabled,
    branding.sidebarLayoutSwitcherEnabled,
  ]);

  const showSidebar = branding.sidebarEnabled && branding.lookupSidebarEnabled;

  return (
    <PortalShell
      hideIdentity
      accentColor={branding.accentColor}
      showSidebar={showSidebar}
      sidebarDefaultOpenOnDesktop={branding.sidebarDefaultOpenOnDesktop}
      branding={{
        name: branding.name,
        logoUrl: branding.logoUrl,
        storefrontUrl: branding.storefrontUrl,
        sidebarLinks: branding.sidebarLinks,
        sidebarNote: branding.sidebarNote,
        sidebarSubmenusExpandedByDefault: branding.sidebarSubmenusExpandedByDefault,
      }}
      headerProps={{
        title,
        showSearch: false,
        storefrontUrl: branding.storefrontUrl || undefined,
        storeLinkEnabled: branding.storeLinkEnabled,
        storeLinkLabel: branding.storeLinkLabel,
      }}
    >
      <div className="relative flex flex-1 flex-col items-center justify-center gap-4 px-4 py-10 overflow-hidden">
        {branding.guestBackgroundStyle === "shapeGrid" && (
          <ShapeGrid className="absolute inset-0 w-full h-full pointer-events-none" />
        )}
        {branding.guestBackgroundStyle === "dotField" && (
          <DotField className="absolute inset-0 w-full h-full pointer-events-none" />
        )}
        <div className="relative z-10 flex flex-col items-center gap-4 w-full">
          {children}
        </div>
      </div>
    </PortalShell>
  );
}
