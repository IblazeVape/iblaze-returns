"use client"

import * as React from "react"
import { ShoppingBag, Search } from "lucide-react"
import { cn } from "@/lib/utils"
import { NavMain } from "@/components/nav-main"
import { NavUser } from "@/components/nav-user"
import { isGuestOrderContext, lookupAnotherOrder, getAppsReturnsIdentityKind } from "@/lib/apps-returns-portal-mode"
import {
  Sidebar, SidebarContent, SidebarFooter,
  SidebarHeader, SidebarMenu, SidebarMenuButton, SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar"

interface AppSidebarProps extends React.ComponentProps<typeof Sidebar> {
  user?: { name: string; email: string }
  onNavigate?: (section: string) => void
  activeSection?: string
  branding?: { name: string; logoUrl: string; storefrontUrl: string }
}

function SidebarBrandHeader({ branding }: { branding?: { name: string; logoUrl: string; storefrontUrl: string } }) {
  const { state } = useSidebar()
  const isCollapsed = state === "collapsed"
  const storeUrl = branding?.storefrontUrl || "https://iblazevape.co.uk"
  const logoUrl = branding?.logoUrl || "https://cdn.shopify.com/s/files/1/0941/5383/4761/files/IblazeLogo.png?v=14858"
  const brandName = branding?.name || "iBlaze Returns"

  return (
    <SidebarHeader
      className={cn(
        "flex min-[1025px]:pt-3.5",
        isCollapsed
          ? "flex-row items-center justify-between gap-y-4 min-[1025px]:flex-col min-[1025px]:items-center min-[1025px]:justify-start"
          : "flex-row items-center justify-between"
      )}
    >
      <SidebarMenu>
        <SidebarMenuItem>
          <SidebarMenuButton
            asChild
            className="data-[slot=sidebar-menu-button]:p-1.5! group-data-[collapsible=icon]:mx-auto group-data-[collapsible=icon]:hover:bg-transparent brand-logo-button"
          >
            <a
              href={storeUrl}
              target="_blank"
              className="flex items-center group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:overflow-hidden"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={logoUrl}
                className="size-8 shrink-0 object-contain object-center brand-logo-img"
                alt={brandName}
              />
              <span className="text-base font-semibold group-data-[collapsible=icon]:hidden">{brandName}</span>
            </a>
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>
    </SidebarHeader>
  )
}

const LOOKUP_ANOTHER_ORDER_URL = "#lookup-another-order"

/** Placeholder identity shown in the account menu before a guest has
 * verified an order or logged in — same menu (NavUser, unmodified) as a
 * real customer sees, just no name/email yet, and a generic person icon
 * instead of an initial letter. */
const GUEST_PENDING_USER = { name: "Login to see all orders", email: "" }

export function AppSidebar({ user, onNavigate, activeSection, branding, ...props }: AppSidebarProps) {
  // Guest hasn't verified an order yet (still on the lookup form) — nothing
  // to navigate to yet.
  const isGuestPending = getAppsReturnsIdentityKind() === "guest-or-login" && !isGuestOrderContext()
  // Guests verified exactly one order — there's no list to browse back to,
  // so "My Orders" is replaced with an action that takes them back to the
  // lookup form instead.
  const navMain = isGuestPending
    ? []
    : isGuestOrderContext()
      ? [{ title: "Return another order", url: LOOKUP_ANOTHER_ORDER_URL, icon: Search }]
      : [{ title: "My Orders", url: "#orders", icon: ShoppingBag }]
  const handleNavigate = (url: string) => {
    if (url === LOOKUP_ANOTHER_ORDER_URL) {
      lookupAnotherOrder()
      return
    }
    onNavigate?.(url)
  }
  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarBrandHeader branding={branding} />
      <SidebarContent>
        <div className="flex min-h-0 flex-1 w-full flex-col group-data-[collapsible=icon]:items-center">
          {navMain.length > 0 && <NavMain items={navMain} onNavigate={handleNavigate} activeSection={activeSection} />}
          {/* Nothing else here for now — the header's own "Store" link
              already covers going back to the storefront on every screen,
              so a duplicate sidebar entry was redundant. Empty until a
              merchant adds their own items via a future settings page. */}
        </div>
      </SidebarContent>
      <SidebarFooter className="overflow-visible group-data-[collapsible=icon]:pb-3">
        <div className="w-full group-data-[collapsible=icon]:flex group-data-[collapsible=icon]:justify-center">
          <NavUser
            user={isGuestPending ? GUEST_PENDING_USER : user || { name: "Customer", email: "" }}
            avatarIcon={isGuestPending}
          />
        </div>
      </SidebarFooter>
    </Sidebar>
  )
}
