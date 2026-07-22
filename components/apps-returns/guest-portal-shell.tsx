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
 * Shell chrome (sidebar open state, avatar, layout, store link, etc.) uses
 * the same merchant branding fields as the main portal. `hideIdentity` still
 * suppresses the header account menu before an order is verified (there is
 * no customer identity to show yet); the sidebar footer avatar follows
 * `sidebarAvatarEnabled` like everywhere else.
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
      sidebarAvatarEnabled={branding.sidebarAvatarEnabled}
      headerAvatarEnabled={branding.headerAvatarEnabled}
      branding={{
        name: branding.name,
        logoUrl: branding.logoUrl,
        logoHeight: branding.logoHeight,
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
        orderStatusLinkEnabled: branding.orderStatusLinkEnabled,
        orderStatusLinkLabel: branding.orderStatusLinkLabel,
        searchEnabled: branding.headerSearchEnabled,
        searchPlaceholder: branding.headerSearchPlaceholder,
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
