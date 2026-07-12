"use client";

import { SidebarLayoutProvider, useSidebarLayout } from "@/components/sidebar-layout-provider";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { SiteHeader } from "@/components/site-header";

/**
 * Wraps the guest lookup form (and the unsigned/not-set-up Notice screens)
 * in the same sidebar + header shell DashboardClient itself uses — mirrors
 * DashboardClientInner's own `portalContent` structure (dashboard-client.tsx)
 * — so the guest lookup screen reads as the same portal, not a separate
 * bare page that happens to precede it.
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
      <GuestPortalShellInner title={title}>{children}</GuestPortalShellInner>
    </SidebarLayoutProvider>
  );
}

function GuestPortalShellInner({ title, children }: { title: string; children: React.ReactNode }) {
  const { layout } = useSidebarLayout();

  return (
    <SidebarProvider
      defaultOpen={true}
      style={
        {
          "--sidebar-width": "18rem",
          "--sidebar-width-icon": "3.75rem",
          "--header-height": "3rem",
        } as React.CSSProperties
      }
    >
      {/* No onNavigate/activeSection: nothing to navigate to before an order
          is verified — AppSidebar already hides "My Orders" in this state
          (see isGuestOrderContext / identity-kind checks in app-sidebar.tsx). */}
      <AppSidebar variant={layout} />
      <SidebarInset className="min-w-0">
        <SiteHeader title={title} showSearch={false} />
        <div className="flex flex-1 flex-col items-center justify-center gap-4 px-4 py-10">
          {children}
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
