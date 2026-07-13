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
  hideIdentity = false,
  accentColor,
  headerProps,
  children,
}: {
  user?: { name: string; email: string }
  onNavigate?: (section: string) => void
  activeSection?: string
  /** No account avatar — used for the guest lookup screen, which has no
   * identity to represent before an order is verified. The sidebar itself
   * still opens/collapses normally (merchants will be able to add their
   * own menu items there via a future settings page, so it shouldn't be
   * locked shut). */
  hideIdentity?: boolean
  /** Sets the --brand CSS variable every accent-colored element in the
   * portal reads from — the ONE place a tenant's color enters the render
   * tree. See Task 7 of the settings-page plan for the full list of call
   * sites this variable replaced. */
  accentColor: string
  headerProps: React.ComponentProps<typeof SiteHeader>
  children?: React.ReactNode
}) {
  const { layout } = useSidebarLayout()

  return (
    <SidebarProvider
      defaultOpen={true}
      style={
        {
          "--sidebar-width": "18rem",
          "--sidebar-width-icon": "3.75rem",
          "--header-height": "3rem",
          "--brand": accentColor,
        } as React.CSSProperties
      }
    >
      <AppSidebar variant={layout} user={user} onNavigate={onNavigate} activeSection={activeSection} />
      <SidebarInset className="min-w-0">
        <SiteHeader {...(hideIdentity ? { showAccountMenu: false } : {})} {...headerProps} />
        {children}
      </SidebarInset>
    </SidebarProvider>
  )
}
