"use client"

import { type LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import {
  SidebarGroup, SidebarGroupContent, SidebarMenu,
  SidebarMenuButton, SidebarMenuItem,
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
  return (
    <SidebarGroup>
      <SidebarGroupContent className="flex flex-col gap-1">
        <SidebarMenu>
          {items.map((item) => (
            <SidebarMenuItem key={item.title}>
              <SidebarMenuButton
                tooltip={item.title}
                isActive={activeSection === item.url}
                onClick={() => onNavigate?.(item.url)}
                className={cn(
                  activeSection === item.url && "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                )}
              >
                {item.icon && <item.icon className="size-4" />}
                <span>{item.title}</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  )
}
