"use client"

import { type LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import {
  SidebarGroup, SidebarGroupContent, SidebarMenu,
  SidebarMenuButton, SidebarMenuItem, useSidebar,
} from "@/components/ui/sidebar"

export function NavMain({
  items,
  onNavigate,
  activeSection,
}: {
  items: { title: string; url: string; icon?: LucideIcon }[]
  onNavigate?: (section: string) => void
  activeSection?: string
}) {
  const { isMobile, setOpenMobile } = useSidebar()
  return (
    <SidebarGroup>
      <SidebarGroupContent className="flex flex-col gap-1">
        <SidebarMenu>
          {items.map((item) => {
            const isExternal = item.url.startsWith("/") && !item.url.startsWith("/#")
            return (
              <SidebarMenuItem key={item.title}>
                <SidebarMenuButton
                  tooltip={item.title}
                  isActive={activeSection === item.url}
                  onClick={() => {
                    // The mobile sidebar is an overlay (Sheet) — navigating
                    // should close it, same as tapping any other link would.
                    // Desktop's persistent sidebar is untouched.
                    if (isMobile) setOpenMobile(false)
                    if (isExternal) {
                      window.location.href = item.url
                    } else if (onNavigate) {
                      onNavigate(item.url)
                    } else {
                      // Fallback when used outside the main portal (e.g. /wizard)
                      window.location.href = item.url.startsWith("#") ? `/${item.url}` : item.url
                    }
                  }}
                  className={cn(
                    activeSection === item.url && "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                  )}
                >
                  {item.icon && <item.icon className="size-4 shrink-0" />}
                  <span className="group-data-[collapsible=icon]:hidden">{item.title}</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            )
          })}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  )
}
