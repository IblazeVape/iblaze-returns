"use client"

import { Search, UserCircle, LogOut, ExternalLink } from "lucide-react"
import { Separator } from "@/components/ui/separator"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuGroup,
  DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

interface SiteHeaderProps {
  title?: string
  search?: string
  onSearch?: (val: string) => void
  showSearch?: boolean
  firstName?: string
  email?: string
}

export function SiteHeader({
  title = "My Orders",
  search,
  onSearch,
  showSearch = true,
  firstName,
  email,
}: SiteHeaderProps) {
  const initial = firstName?.[0]?.toUpperCase() || "?"

  return (
    <header className="flex h-12 shrink-0 items-center gap-2 border-b bg-white transition-[width,height] ease-linear">
      <div
        className="flex w-full items-center gap-1 lg:gap-2"
        style={{
          paddingLeft:  "1rem",
          paddingRight: "max(1rem, env(safe-area-inset-right))",
        }}
      >
        <SidebarTrigger className="-ml-1" />
        <Separator orientation="vertical" className="mx-2 data-[orientation=vertical]:h-4" />
        <h1 className="text-base font-medium">{title}</h1>

        {showSearch && (
          <div className="ml-4 hidden sm:block flex-1 max-w-sm">
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

        <div className="ml-auto flex items-center gap-3">
          <a
            href="https://iblazevape.co.uk"
            target="_blank"
            rel="noopener noreferrer"
            className="hidden sm:flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Store <ExternalLink className="size-3.5" />
          </a>
          <Separator orientation="vertical" className="hidden sm:block data-[orientation=vertical]:h-4" />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Avatar className="h-8 w-8 cursor-pointer hover:ring-2 hover:ring-[#E5403B]/40 hover:ring-offset-1 transition-all">
                <AvatarFallback className="bg-[#E5403B] text-white text-sm font-semibold">
                  {initial}
                </AvatarFallback>
              </Avatar>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
              <DropdownMenuLabel>
                <p className="font-medium">{firstName || "Customer"}</p>
                {email && <p className="text-xs text-muted-foreground font-normal truncate">{email}</p>}
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuGroup>
                <DropdownMenuItem asChild>
                  <a href="https://account.iblazevape.co.uk/profile" target="_blank" rel="noopener noreferrer">
                    <UserCircle className="mr-2 size-4" />My Profile
                  </a>
                </DropdownMenuItem>
              </DropdownMenuGroup>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <a href="https://account.iblazevape.co.uk/logout">
                  <LogOut className="mr-2 size-4" />Sign out
                </a>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  )
}
