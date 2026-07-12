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
 * `locked`: the guest hasn't verified an order yet, so there's no nav/
 * identity to show — the sidebar is forced collapsed with no way to open
 * it, and the header's toggle + account avatar are hidden entirely (see
 * PortalShell's `locked` prop).
 */
export function GuestPortalShell({
  title = "Look up your order",
  children,
}: {
  title?: string;
  children: React.ReactNode;
}) {
  return (
    <SidebarLayoutProvider>
      <PortalShell locked headerProps={{ title, showSearch: false }}>
        <div className="flex flex-1 flex-col items-center justify-center gap-4 px-4 py-10">
          {children}
        </div>
      </PortalShell>
    </SidebarLayoutProvider>
  );
}
