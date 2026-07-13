"use client";

import { SidebarLayoutProvider } from "@/components/sidebar-layout-provider";
import { PortalShell } from "@/components/portal-shell";

/**
 * Wraps the guest lookup form (and the unsigned/not-set-up Notice screens)
 * in the SAME shell component DashboardClient itself renders through
 * (PortalShell) — not a lookalike copy — so the guest lookup screen is
 * unmistakably the same portal, not a separate page that happens to precede
 * it.
 *
 * The guest hasn't verified an order yet, so there's no identity to show
 * in the header (`hideIdentity`) — but the sidebar itself opens/collapses
 * normally, same as everywhere else in the portal: merchants will be able
 * to add their own menu items there via a future settings page, so it
 * shouldn't be locked shut here.
 */
export function GuestPortalShell({
  title = "Find your order",
  children,
}: {
  title?: string;
  children: React.ReactNode;
}) {
  return (
    <SidebarLayoutProvider>
      <PortalShell hideIdentity accentColor="#E5403B" headerProps={{ title, showSearch: false }}>
        <div className="flex flex-1 flex-col items-center justify-center gap-4 px-4 py-10">
          {children}
        </div>
      </PortalShell>
    </SidebarLayoutProvider>
  );
}
