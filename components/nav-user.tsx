"use client"

import { useEffect, useRef, useState } from "react"
import { ChevronsUpDown } from "lucide-react"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { SidebarMenu, SidebarMenuButton, SidebarMenuItem } from "@/components/ui/sidebar"
import { UserAccountMenuPanel } from "@/components/user-account-menu"

export function NavUser({ user }: { user: { name: string; email: string } }) {
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLLIElement>(null)
  const initial = user.name?.[0]?.toUpperCase() || "?"

  useEffect(() => {
    if (!open) return

    const onPointerDown = (event: PointerEvent) => {
      if (containerRef.current?.contains(event.target as Node)) return
      setOpen(false)
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false)
    }

    document.addEventListener("pointerdown", onPointerDown)
    document.addEventListener("keydown", onKeyDown)
    return () => {
      document.removeEventListener("pointerdown", onPointerDown)
      document.removeEventListener("keydown", onKeyDown)
    }
  }, [open])

  return (
    <SidebarMenu>
      <Collapsible open={open} onOpenChange={setOpen}>
        <SidebarMenuItem ref={containerRef}>
          <CollapsibleTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground group-data-[collapsible=icon]:!size-8 group-data-[collapsible=icon]:!p-0 group-data-[collapsible=icon]:mx-auto"
            >
              <Avatar className="h-8 w-8 rounded-lg shrink-0 group-data-[collapsible=icon]:h-7 group-data-[collapsible=icon]:w-7">
                <AvatarFallback className="rounded-lg bg-[#E5403B] text-white text-sm font-semibold">
                  {initial}
                </AvatarFallback>
              </Avatar>
              <div className="grid flex-1 text-left text-sm leading-tight group-data-[collapsible=icon]:hidden">
                <span className="truncate font-medium">{user.name || "Customer"}</span>
                <span className="text-muted-foreground truncate text-xs">{user.email}</span>
              </div>
              <ChevronsUpDown className="ml-auto size-4 group-data-[collapsible=icon]:hidden" />
            </SidebarMenuButton>
          </CollapsibleTrigger>
          <CollapsibleContent className="absolute bottom-full left-0 z-20 w-full pb-3 outline-none data-[state=closed]:hidden">
            <UserAccountMenuPanel user={user} />
          </CollapsibleContent>
        </SidebarMenuItem>
      </Collapsible>
    </SidebarMenu>
  )
}
