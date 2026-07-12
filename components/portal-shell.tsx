"use client"

import * as React from "react"
import { useSidebarLayout } from "@/components/sidebar-layout-provider"
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/app-sidebar"
import { SiteHeader } from "@/components/site-header"

/**
 * The one shell — sidebar + header — every screen of the portal renders
 * inside, whether that's DashboardClient's real order list/detail views or
 * the pre-auth guest lookup form. Must be used inside a SidebarLayoutProvider
 * (for the sidebar-layout preference) — DashboardClient's own top-level
 * export provides one; GuestPortalShell provides its own.
 */
export function PortalShell({
  user,
  onNavigate,
  activeSection,
  locked = false,
  headerProps,
  children,
}: {
  user?: { name: string; email: string }
  onNavigate?: (section: string) => void
  activeSection?: string
  /** Locks the sidebar collapsed and removes any way to open it — used for
   * the guest lookup screen, which has no nav/identity to show in it. */
  locked?: boolean
  headerProps: React.ComponentProps<typeof SiteHeader>
  children?: React.ReactNode
}) {
  const { layout } = useSidebarLayout()

  return (
    <SidebarProvider
      {...(locked ? { open: false, onOpenChange: () => {} } : { defaultOpen: true })}
      style={
        {
          "--sidebar-width": "18rem",
          "--sidebar-width-icon": "3.75rem",
          "--header-height": "3rem",
        } as React.CSSProperties
      }
    >
      <AppSidebar variant={layout} user={user} onNavigate={onNavigate} activeSection={activeSection} />
      <SidebarInset className="min-w-0">
        <SiteHeader {...(locked ? { showSidebarToggle: false, showAccountMenu: false } : {})} {...headerProps} />
        {children}
      </SidebarInset>
    </SidebarProvider>
  )
}
