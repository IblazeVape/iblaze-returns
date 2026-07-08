"use client"

import * as React from "react"
import { ShoppingBag, FileText, Newspaper, MessageCircle, ExternalLink } from "lucide-react"
import { cn } from "@/lib/utils"
import { NavMain } from "@/components/nav-main"
import { NavSecondary } from "@/components/nav-secondary"
import { NavUser } from "@/components/nav-user"
import {
  Sidebar, SidebarContent, SidebarFooter,
  SidebarHeader, SidebarMenu, SidebarMenuButton, SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar"

const navMain = [
  { title: "My Orders", url: "#orders", icon: ShoppingBag },
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

export function AppSidebar({ user, onNavigate, activeSection, ...props }: AppSidebarProps) {
  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarBrandHeader />
      <SidebarContent>
        <div className="flex min-h-0 flex-1 w-full flex-col group-data-[collapsible=icon]:items-center">
          <NavMain items={navMain} onNavigate={onNavigate} activeSection={activeSection} />
          <NavSecondary items={navSecondary} className="mt-auto" />
        </div>
      </SidebarContent>
      <SidebarFooter className="overflow-visible group-data-[collapsible=icon]:pb-3">
        <div className="w-full group-data-[collapsible=icon]:flex group-data-[collapsible=icon]:justify-center">
          <NavUser user={user || { name: "Customer", email: "" }} />
        </div>
      </SidebarFooter>
    </Sidebar>
  )
}
