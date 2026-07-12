"use client"

import * as React from "react"
import { ShoppingBag, Search, FileText, Newspaper, MessageCircle, ExternalLink } from "lucide-react"
import { cn } from "@/lib/utils"
import { NavMain } from "@/components/nav-main"
import { NavSecondary } from "@/components/nav-secondary"
import { NavUser } from "@/components/nav-user"
import { SidebarLayoutSwitcher } from "@/components/sidebar-layout-switcher"
import { userAccountMenuPanelClass } from "@/components/user-account-menu"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { isGuestOrderContext, lookupAnotherOrder, getAppsReturnsIdentityKind } from "@/lib/apps-returns-portal-mode"
import {
  Sidebar, SidebarContent, SidebarFooter,
  SidebarHeader, SidebarMenu, SidebarMenuButton, SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar"

const navSecondary = [
  { title: "News & Updates", url: "https://iblazevape.co.uk/blogs/news", icon: Newspaper },
  { title: "Returns Policy", url: "https://iblazevape.co.uk/policies/refund-policy", icon: FileText },
  { title: "Speak to Support", url: "mailto:info@iblazevape.co.uk", icon: MessageCircle },
  { title: "Back to Store", url: "https://iblazevape.co.uk", icon: ExternalLink },
]

// Guest hasn't verified an order yet — no return/support links relevant to
// an order they haven't found, just a way back to the store.
const navSecondaryGuestPending = [
  { title: "Back to Store", url: "https://iblazevape.co.uk", icon: ExternalLink },
]

interface AppSidebarProps extends React.ComponentProps<typeof Sidebar> {
  user?: { name: string; email: string }
  onNavigate?: (section: string) => void
  activeSection?: string
}

function SidebarBrandHeader() {
  const { state } = useSidebar()
  const isCollapsed = state === "collapsed"

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
              href="https://iblazevape.co.uk"
              target="_blank"
              className="flex items-center group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:overflow-hidden"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="https://cdn.shopify.com/s/files/1/0941/5383/4761/files/IblazeLogo.png?v=14858"
                className="size-8 shrink-0 object-contain object-center brand-logo-img"
                alt="iBlaze Vape"
              />
              <span className="text-base font-semibold group-data-[collapsible=icon]:hidden">iBlaze Returns</span>
            </a>
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>
    </SidebarHeader>
  )
}

const LOOKUP_ANOTHER_ORDER_URL = "#lookup-another-order"

export function AppSidebar({ user, onNavigate, activeSection, ...props }: AppSidebarProps) {
  // Guest hasn't verified an order yet (still on the lookup form) — nothing
  // to navigate to or sign out of, and no identity to show in the footer.
  const isGuestPending = getAppsReturnsIdentityKind() === "guest-or-login" && !isGuestOrderContext()
  // Guests verified exactly one order — there's no list to browse back to,
  // so "My Orders" is replaced with an action that takes them back to the
  // lookup form instead.
  const navMain = isGuestPending
    ? []
    : isGuestOrderContext()
      ? [{ title: "Look up another order", url: LOOKUP_ANOTHER_ORDER_URL, icon: Search }]
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
      <SidebarBrandHeader />
      <SidebarContent>
        <div className="flex min-h-0 flex-1 w-full flex-col group-data-[collapsible=icon]:items-center">
          {navMain.length > 0 && <NavMain items={navMain} onNavigate={handleNavigate} activeSection={activeSection} />}
          {/* Pinned to the bottom only when there's a main nav above it to
              separate from — otherwise (guest lookup, before an order is
              verified) it sits right under the header instead of leaving a
              blank gap at the top of the sidebar. */}
          <NavSecondary
            items={isGuestPending ? navSecondaryGuestPending : navSecondary}
            className={navMain.length > 0 ? "mt-auto" : undefined}
          />
        </div>
      </SidebarContent>
      <SidebarFooter className="overflow-visible group-data-[collapsible=icon]:pb-3">
        {isGuestPending ? (
          // No identity to show yet, so no name/email/profile/sign-out —
          // just the sidebar-layout (Inset/Sidebar) setting, behind the
          // same avatar-styled trigger the real account menu uses.
          <SidebarMenu>
            <SidebarMenuItem className="flex justify-center">
              <Popover>
                <PopoverTrigger asChild>
                  <SidebarMenuButton
                    tooltip="Sidebar layout"
                    className="group-data-[collapsible=icon]:size-8! group-data-[collapsible=icon]:p-0! group-data-[collapsible=icon]:mx-auto"
                  >
                    <Avatar className="h-8 w-8 rounded-lg shrink-0 group-data-[collapsible=icon]:h-7 group-data-[collapsible=icon]:w-7">
                      <AvatarFallback className="rounded-lg bg-[#E5403B] text-white text-sm font-semibold">
                        ?
                      </AvatarFallback>
                    </Avatar>
                  </SidebarMenuButton>
                </PopoverTrigger>
                <PopoverContent side="right" align="end" className={cn(userAccountMenuPanelClass, "w-52 p-1")}>
                  <SidebarLayoutSwitcher inline />
                </PopoverContent>
              </Popover>
            </SidebarMenuItem>
          </SidebarMenu>
        ) : (
          <div className="w-full group-data-[collapsible=icon]:flex group-data-[collapsible=icon]:justify-center">
            <NavUser user={user || { name: "Customer", email: "" }} />
          </div>
        )}
      </SidebarFooter>
    </Sidebar>
  )
}
