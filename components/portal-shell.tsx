"use client"

import * as React from "react"
import { useSidebarLayout } from "@/components/sidebar-layout-provider"
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/app-sidebar"
import { SiteHeader } from "@/components/site-header"
import { setCachedAccentColor } from "@/lib/accent-color-cache"
import { cn } from "@/lib/utils"

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
  branding,
  sidebarAvatarEnabled = true,
  headerAvatarEnabled = true,
  sidebarDefaultOpenOnDesktop = true,
  /** When false, AppSidebar is omitted and the main column uses the full width. */
  showSidebar = true,
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
   * locked shut). Takes precedence over headerAvatarEnabled — pre-auth
   * state always hides identity regardless of the merchant's setting. */
  hideIdentity?: boolean
  /** Sets the --brand CSS variable every accent-colored element in the
   * portal reads from — the ONE place a tenant's color enters the render
   * tree. See Task 7 of the settings-page plan for the full list of call
   * sites this variable replaced. */
  accentColor: string
  /** Tenant identity forwarded to AppSidebar's brand header (logo, name,
   * storefront link) plus its custom nav links/note. Optional — the legacy
   * `/` portal doesn't pass it yet, so AppSidebar falls back to the iBlaze
   * defaults. */
  branding?: {
    name: string
    logoUrl: string
    storefrontUrl: string
    sidebarLinks?: { label: string; url: string; icon?: string; children?: { label: string; url: string; icon?: string }[] }[]
    sidebarNote?: string
    sidebarSubmenusExpandedByDefault?: boolean
  }
  /** Hides the customer avatar in the sidebar footer (NavUser). */
  sidebarAvatarEnabled?: boolean
  /** Hides the customer avatar/account menu in the top header. Overridden to false whenever hideIdentity is true. */
  headerAvatarEnabled?: boolean
  /** Whether the sidebar starts open or collapsed on desktop. */
  sidebarDefaultOpenOnDesktop?: boolean
  showSidebar?: boolean
  headerProps: React.ComponentProps<typeof SiteHeader>
  children?: React.ReactNode
}) {
  const { layout } = useSidebarLayout()

  // Also set --brand on the <html> element itself. The inline style below
  // on SidebarProvider only covers PortalShell's own DOM subtree, so CSS
  // custom properties don't reach content Radix UI's Dialog/Drawer portal
  // straight to document.body (a sibling of PortalShell's subtree, not a
  // descendant). document.documentElement is a true ancestor of both
  // PortalShell's subtree AND anything portaled to document.body, so
  // setting it there makes var(--brand) resolve to the tenant's real color
  // everywhere. The inline style on SidebarProvider still wins for elements
  // inside PortalShell itself (inline styles have higher specificity than
  // the inherited value from an ancestor), so it's kept for that fast path.
  React.useEffect(() => {
    if (!accentColor) return
    document.documentElement.style.setProperty("--brand", accentColor)
    setCachedAccentColor(accentColor)
    // Do not remove --brand on unmount — GuestPortalShell → DashboardClient
    // remounts the shell and clearing here flashes the default spinner colour.
  }, [accentColor])

  return (
    <SidebarProvider
      defaultOpen={sidebarDefaultOpenOnDesktop}
      style={
        {
          "--sidebar-width": "18rem",
          "--sidebar-width-icon": "3.75rem",
          "--header-height": "3rem",
          "--brand": accentColor,
        } as React.CSSProperties
      }
    >
      {showSidebar ? (
        <AppSidebar
          variant={layout}
          user={user}
          onNavigate={onNavigate}
          activeSection={activeSection}
          branding={branding}
          avatarEnabled={sidebarAvatarEnabled}
        />
      ) : null}
      <SidebarInset
        className={cn(
          "min-w-0",
          // Without a sidebar peer, inset margin/rounding still look intentional
          // as a full-bleed card on desktop when the merchant uses inset layout.
          !showSidebar && layout === "inset" && "min-[1025px]:m-2 min-[1025px]:rounded-xl min-[1025px]:shadow-xs dark:min-[1025px]:border dark:min-[1025px]:border-white/10",
        )}
      >
        <SiteHeader
          {...headerProps}
          showSidebarToggle={showSidebar ? (headerProps.showSidebarToggle ?? true) : false}
          showAccountMenu={hideIdentity ? false : headerAvatarEnabled}
        />
        {children}
      </SidebarInset>
    </SidebarProvider>
  )
}
