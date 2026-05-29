"use client"

import * as React from "react"
import { ShoppingBag, FileText, Newspaper, MessageCircle, RotateCcw, ExternalLink } from "lucide-react"
import { NavMain } from "@/components/nav-main"
import { NavSecondary } from "@/components/nav-secondary"
import { NavUser } from "@/components/nav-user"
import {
  Sidebar, SidebarContent, SidebarFooter,
  SidebarHeader, SidebarMenu, SidebarMenuButton, SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar"
import { useMediaQuery } from "@/hooks/use-media-query"

const navMain = [
  { title: "My Orders", url: "#orders", icon: ShoppingBag },
  { title: "Returns", url: "#returns", icon: RotateCcw },
]

const navSecondary = [
  { title: "News & Updates", url: "https://iblazevape.co.uk/blogs/news", icon: Newspaper },
  { title: "Returns Policy", url: "https://iblazevape.co.uk/policies/refund-policy", icon: FileText },
  { title: "Speak to Support", url: "mailto:info@iblazevape.co.uk", icon: MessageCircle },
  { title: "Back to Store", url: "https://iblazevape.co.uk", icon: ExternalLink },
]

interface AppSidebarProps extends React.ComponentProps<typeof Sidebar> {
  user?: { name: string; email: string }
  onNavigate?: (section: string) => void
  activeSection?: string
}

export function AppSidebar({ user, onNavigate, activeSection, ...props }: AppSidebarProps) {
  const { state } = useSidebar()
  const isLandscape = useMediaQuery("(orientation: landscape)")

  // In landscape + collapsed: hide logo and avatar, show only nav icons
  const hideChrome = isLandscape && state === "collapsed"

  return (
    <Sidebar collapsible="icon" {...props}>
      {!hideChrome && (
        <SidebarHeader>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton asChild className="data-[slot=sidebar-menu-button]:!p-1.5">
                <a href="https://iblazevape.co.uk" target="_blank">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src="https://cdn.shopify.com/s/files/1/0941/5383/4761/files/IblazeLogo.png?v=14858"
                    className="size-8 object-contain"
                    alt="iBlaze Vape"
                  />
                  <span className="text-base font-semibold">iBlaze Returns</span>
                </a>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarHeader>
      )}
      <SidebarContent>
        <NavMain items={navMain} onNavigate={onNavigate} activeSection={activeSection} />
        <NavSecondary items={navSecondary} className="mt-auto" />
      </SidebarContent>
      {!hideChrome && (
        <SidebarFooter>
          <NavUser user={user || { name: "Customer", email: "" }} />
        </SidebarFooter>
      )}
    </Sidebar>
  )
}
