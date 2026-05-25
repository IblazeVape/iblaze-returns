"use client"

import { Search } from "lucide-react"
import { Separator } from "@/components/ui/separator"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { Input } from "@/components/ui/input"

interface SiteHeaderProps {
  title?: string
  search?: string
  onSearch?: (val: string) => void
  showSearch?: boolean
}

export function SiteHeader({ title = "My Orders", search, onSearch, showSearch = true }: SiteHeaderProps) {
  return (
    <header className="flex h-12 shrink-0 items-center gap-2 border-b transition-[width,height] ease-linear">
      <div className="flex w-full items-center gap-1 px-4 lg:gap-2 lg:px-6">
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
      </div>
    </header>
  )
}
