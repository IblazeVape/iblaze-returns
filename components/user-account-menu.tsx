"use client"

import { useEffect, useState } from "react"
import { LogOut, Moon, Sun, UserCircle, type LucideIcon } from "lucide-react"
import { useTheme } from "next-themes"
import { THEME_TOGGLE_ENABLED } from "@/components/theme-provider"
import { SidebarLayoutSwitcher } from "@/components/sidebar-layout-switcher"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { DropdownMenuGroup, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator } from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"

/** Shared menu card styling — white in light mode; shadow only on header popover via DropdownMenuContent */
export const userAccountMenuPanelClass =
  "z-10 min-w-56 overflow-hidden rounded-lg border bg-white p-1 text-popover-foreground shadow-sm dark:bg-popover"

const menuItemClass =
  "focus:bg-accent focus:text-accent-foreground [&_svg:not([class*='text-'])]:text-muted-foreground relative flex cursor-default items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none select-none [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4"

const menuSeparatorClass = "bg-border -mx-1 my-1 h-px"

function MenuSeparator() {
  return <div role="separator" className={menuSeparatorClass} />
}

function ThemeToggleMenuItem({ inline = false }: { inline?: boolean }) {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => setMounted(true), [])

  const isDark = mounted && theme === "dark"
  const label = isDark ? "Light mode" : "Dark mode"
  const Icon = isDark ? Sun : Moon

  if (inline) {
    return (
      <button
        type="button"
        className={cn(menuItemClass, "w-full text-left hover:bg-accent hover:text-accent-foreground")}
        onClick={() => setTheme(isDark ? "light" : "dark")}
      >
        <Icon className="size-4" />
        {label}
      </button>
    )
  }

  return (
    <DropdownMenuItem onClick={() => setTheme(isDark ? "light" : "dark")}>
      <Icon className="size-4" />
      {label}
    </DropdownMenuItem>
  )
}

function MenuLink({
  href,
  icon: Icon,
  children,
  external,
  inline,
}: {
  href: string
  icon: LucideIcon
  children: React.ReactNode
  external?: boolean
  inline?: boolean
}) {
  if (inline) {
    return (
      <a
        href={href}
        target={external ? "_blank" : undefined}
        rel={external ? "noopener noreferrer" : undefined}
        className={cn(menuItemClass, "hover:bg-accent hover:text-accent-foreground")}
      >
        <Icon className="size-4" />
        {children}
      </a>
    )
  }

  return (
    <DropdownMenuItem asChild>
      <a href={href} target={external ? "_blank" : undefined} rel={external ? "noopener noreferrer" : undefined}>
        <Icon className="size-4" />
        {children}
      </a>
    </DropdownMenuItem>
  )
}

function SidebarMenuLabel({ user }: { user: { name: string; email: string } }) {
  const initial = user.name?.[0]?.toUpperCase() || "?"

  return (
    <div className="px-2 py-1.5 text-sm font-medium">
      <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm font-normal">
        <Avatar className="h-8 w-8 rounded-lg">
          <AvatarFallback className="rounded-lg bg-[#E5403B] text-white text-sm font-semibold">
            {initial}
          </AvatarFallback>
        </Avatar>
        <div className="grid flex-1 text-left text-sm leading-tight">
          <span className="truncate font-medium">{user.name || "Customer"}</span>
          <span className="text-muted-foreground truncate text-xs">{user.email}</span>
        </div>
      </div>
    </div>
  )
}

export function UserAccountMenuItems({ inline = false }: { inline?: boolean }) {
  if (inline) {
    return (
      <>
        <MenuLink href="https://account.iblazevape.co.uk/profile" icon={UserCircle} external inline>
          My Profile
        </MenuLink>
        <MenuSeparator />
        <SidebarLayoutSwitcher inline />
        <MenuSeparator />
        {THEME_TOGGLE_ENABLED && (
          <>
            <ThemeToggleMenuItem inline />
            <MenuSeparator />
          </>
        )}
        <MenuLink href="https://account.iblazevape.co.uk/logout" icon={LogOut} inline>
          Sign out
        </MenuLink>
      </>
    )
  }

  return (
    <>
      <DropdownMenuGroup>
        <MenuLink href="https://account.iblazevape.co.uk/profile" icon={UserCircle} external>
          My Profile
        </MenuLink>
      </DropdownMenuGroup>
      <DropdownMenuSeparator />
      <SidebarLayoutSwitcher />
      {THEME_TOGGLE_ENABLED && (
        <>
          <ThemeToggleMenuItem />
          <DropdownMenuSeparator />
        </>
      )}
      <MenuLink href="https://account.iblazevape.co.uk/logout" icon={LogOut}>
        Sign out
      </MenuLink>
    </>
  )
}

export function UserAccountMenuLabel({
  user,
  variant = "sidebar",
}: {
  user: { name: string; email: string }
  variant?: "sidebar" | "header"
}) {
  if (variant === "header") {
    return (
      <DropdownMenuLabel>
        <p className="font-medium">{user.name || "Customer"}</p>
        {user.email && <p className="text-xs text-muted-foreground font-normal truncate">{user.email}</p>}
      </DropdownMenuLabel>
    )
  }

  return <SidebarMenuLabel user={user} />
}

/** Original dropdown look — white card, overlays above the sidebar trigger */
export function UserAccountMenuPanel({ user }: { user: { name: string; email: string } }) {
  return (
    <div className={cn(userAccountMenuPanelClass, "w-full")}>
      <SidebarMenuLabel user={user} />
      <MenuSeparator />
      <UserAccountMenuItems inline />
    </div>
  )
}
