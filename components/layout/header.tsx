"use client"

import { Menu, UserCircle, LogOut } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import Logo from "./logo"

interface HeaderProps {
  firstName?: string
  email?: string
}

export default function Header({ firstName, email }: HeaderProps) {
  const initial = firstName?.[0]?.toUpperCase() || "?"

  return (
    <div className="sticky top-0 z-50">
      <header className="flex h-14 items-center gap-4 border-b bg-background px-4 lg:h-[60px]">
        {/* Mobile menu */}
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="outline" size="icon" className="shrink-0 lg:hidden">
              <Menu className="h-5 w-5" />
              <span className="sr-only">Toggle menu</span>
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="flex flex-col">
            <Logo className="px-0" />
          </SheetContent>
        </Sheet>

        <div className="flex-1" />

        {/* User menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Avatar className="h-9 w-9 cursor-pointer hover:ring-2 hover:ring-[#E5403B]/30 hover:ring-offset-1 transition-all">
              <AvatarFallback className="bg-[#E5403B] text-white text-sm font-semibold">
                {initial}
              </AvatarFallback>
            </Avatar>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuLabel>
              <p className="font-medium">{firstName || "Customer"}</p>
              {email && <p className="text-xs text-muted-foreground font-normal truncate">{email}</p>}
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <a href="https://account.iblazevape.co.uk/profile" target="_blank" rel="noopener noreferrer">
                <UserCircle className="mr-2 h-4 w-4" />My Profile
              </a>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <a href="https://account.iblazevape.co.uk/logout">
                <LogOut className="mr-2 h-4 w-4" />Sign out
              </a>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </header>
    </div>
  )
}
