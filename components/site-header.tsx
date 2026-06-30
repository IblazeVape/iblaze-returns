"use client"

import { Search, Home, PanelLeft, Package, Menu, type LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import { Separator } from "@/components/ui/separator"
import { useSidebar } from "@/components/ui/sidebar"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { UserAccountMenuItems, UserAccountMenuLabel, userAccountMenuPanelClass } from "@/components/user-account-menu"

interface SiteHeaderProps {
  title?: React.ReactNode
  titleIcon?: { icon: LucideIcon; className?: string }
  search?: string
  onSearch?: (val: string) => void
  showSearch?: boolean
  firstName?: string
  email?: string
  orderStatusUrl?: string
}

function SidebarToggleControls() {
  const { isMobile, toggleSidebar, setOpenMobile } = useSidebar()

  return (
    <>
      <button
        type="button"
        className="size-7 flex items-center justify-center rounded-md hover:bg-accent hover:text-accent-foreground transition-colors -ml-1"
        onClick={() => isMobile ? setOpenMobile(true) : toggleSidebar()}
      >
        <PanelLeft className="size-4" />
        <span className="sr-only">Toggle Sidebar</span>
      </button>
      <Separator orientation="vertical" className="mx-2 data-[orientation=vertical]:h-4" />
    </>
  )
}

export function SiteHeader({
  title = "My Orders",
  titleIcon,
  search,
  onSearch,
  showSearch = true,
  firstName,
  email,
  orderStatusUrl,
}: SiteHeaderProps) {
  const initial = firstName?.[0]?.toUpperCase() || "?"
  const user = { name: firstName || "Customer", email: email || "" }

  return (
    <header className="flex h-12 shrink-0 items-center gap-2 border-b bg-white dark:bg-background z-40 relative">
      <div
        className="flex w-full items-center gap-1 lg:gap-2"
        style={{
          paddingLeft:  "1rem",
          paddingRight: "max(1rem, env(safe-area-inset-right))",
        }}
      >
        <SidebarToggleControls />
        <h1 className="text-base font-medium flex items-center gap-1.5 min-w-0">
          {titleIcon && (
            <titleIcon.icon className={cn("size-4 shrink-0 text-foreground", titleIcon.className)} aria-hidden />
          )}
          <span className="truncate">{title}</span>
        </h1>

        {showSearch && (
          <div className="ml-4 flex-1 max-w-sm">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                placeholder="Search orders..."
                value={search || ""}
                onChange={(e) => onSearch?.(e.target.value)}
                className="pl-8 h-8 text-sm"
              />
            </div>
          </div>
        )}

        <div className="ml-auto flex items-center gap-2 min-[1025px]:gap-4">

          {/* ── Desktop: all links inline ── */}
          {orderStatusUrl && (
            <a
              href={orderStatusUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="hidden min-[1025px]:flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <Package className="size-4" />
              Order Status
            </a>
          )}
          <a
            href="https://iblazevape.co.uk"
            target="_blank"
            rel="noopener noreferrer"
            className="hidden min-[1025px]:flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <Home className="size-4" />
            Store
          </a>
          <Separator orientation="vertical" className="hidden min-[1025px]:block data-[orientation=vertical]:h-4" />

          {/* ── Mobile: menu dropdown when 2+ links (order selected = Status + Store) ── */}
          {orderStatusUrl ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="min-[1025px]:hidden size-7 flex items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
                  aria-label="Menu"
                >
                  <Menu className="size-4" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="min-w-[10rem]">
                <DropdownMenuItem asChild>
                  <a href="https://iblazevape.co.uk" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2">
                    <Home className="size-4" />
                    Store
                  </a>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <a href={orderStatusUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2">
                    <Package className="size-4" />
                    Order Status
                  </a>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            /* Mobile: single Store link when no Status */
            <a
              href="https://iblazevape.co.uk"
              target="_blank"
              rel="noopener noreferrer"
              className="min-[1025px]:hidden flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <Home className="size-4" />
              <span className="text-xs font-medium">Store</span>
            </a>
          )}
          <Separator orientation="vertical" className="data-[orientation=vertical]:h-4" />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Avatar className="h-8 w-8 cursor-pointer hover:ring-2 hover:ring-[#E5403B]/40 hover:ring-offset-1 transition-all">
                <AvatarFallback className="bg-[#E5403B] text-white text-sm font-semibold">
                  {initial}
                </AvatarFallback>
              </Avatar>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className={cn(userAccountMenuPanelClass, "w-52")}>
              <UserAccountMenuLabel user={user} variant="header" />
              <DropdownMenuSeparator />
              <UserAccountMenuItems />
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  )
}
