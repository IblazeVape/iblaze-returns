"use client"

import { useEffect, useLayoutEffect, useRef, useState } from "react"
import { createPortal } from "react-dom"
import { ChevronsUpDown, User as UserIcon } from "lucide-react"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { SidebarMenu, SidebarMenuButton, SidebarMenuItem } from "@/components/ui/sidebar"
import { UserAccountMenuPanel } from "@/components/user-account-menu"
import { useSidebarLayout } from "@/components/sidebar-layout-provider"

/**
 * Account menu in the sidebar footer. Portaled to document.body so the
 * SidebarInset (overflow:hidden, later in the DOM) can't paint over it —
 * that showed up as a dark rounded slab covering half the open menu when
 * switching Inset/Sidebar on the Find your order screen.
 */
export function NavUser({
  user,
  avatarIcon = false,
}: {
  user: { name: string; email: string }
  /** Show a generic person icon instead of an initial letter — there's no
   * real identity yet (guest hasn't verified an order or logged in). */
  avatarIcon?: boolean
}) {
  const [open, setOpen] = useState(false)
  const [coords, setCoords] = useState<{ left: number; bottom: number; width: number } | null>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const initial = user.name?.[0]?.toUpperCase() || "?"
  const { layout } = useSidebarLayout()

  // Close when the merchant/customer flips Inset ↔ Sidebar — the shell
  // reflows and an open in-sidebar menu would otherwise sit under the inset.
  useEffect(() => {
    setOpen(false)
  }, [layout])

  useLayoutEffect(() => {
    if (!open || !triggerRef.current) {
      setCoords(null)
      return
    }

    const update = () => {
      const rect = triggerRef.current?.getBoundingClientRect()
      if (!rect) return
      setCoords({
        left: rect.left,
        bottom: window.innerHeight - rect.top + 8,
        width: Math.max(rect.width, 224),
      })
    }

    update()
    window.addEventListener("resize", update)
    window.addEventListener("scroll", update, true)
    return () => {
      window.removeEventListener("resize", update)
      window.removeEventListener("scroll", update, true)
    }
  }, [open])

  useEffect(() => {
    if (!open) return

    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node
      if (triggerRef.current?.contains(target)) return
      if (panelRef.current?.contains(target)) return
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
      {/* Plain conditional mount (not Radix Collapsible's animated-height
          content) — Collapsible measures and caches a content height for its
          open/close transition, and left stale, oversized blank space below
          this panel once it got shorter (removing "Sign out" for App Proxy
          sessions). A plain mount/unmount can't get stuck at a stale size. */}
      <SidebarMenuItem className="relative">
        <SidebarMenuButton
          ref={triggerRef}
          size="lg"
          data-state={open ? "open" : "closed"}
          aria-expanded={open}
          onClick={() => setOpen((o) => !o)}
          className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground group-data-[collapsible=icon]:size-8! group-data-[collapsible=icon]:p-0! group-data-[collapsible=icon]:mx-auto"
        >
          <Avatar className="h-8 w-8 rounded-lg shrink-0 group-data-[collapsible=icon]:h-7 group-data-[collapsible=icon]:w-7">
            <AvatarFallback className="rounded-lg bg-[var(--brand)] text-white text-sm font-semibold">
              {avatarIcon ? <UserIcon className="size-4" /> : initial}
            </AvatarFallback>
          </Avatar>
          <div className="grid flex-1 text-left text-sm leading-tight group-data-[collapsible=icon]:hidden">
            <span className="truncate font-medium">{user.name || "Customer"}</span>
            {user.email && <span className="text-muted-foreground truncate text-xs">{user.email}</span>}
          </div>
          <ChevronsUpDown className="ml-auto size-4 group-data-[collapsible=icon]:hidden" />
        </SidebarMenuButton>
        {open &&
          coords &&
          createPortal(
            <div
              ref={panelRef}
              className="fixed z-[200] outline-hidden"
              style={{
                left: coords.left,
                bottom: coords.bottom,
                width: coords.width,
              }}
            >
              <UserAccountMenuPanel user={user} avatarIcon={avatarIcon} />
            </div>,
            document.body,
          )}
      </SidebarMenuItem>
    </SidebarMenu>
  )
}
