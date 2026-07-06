"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { CommandMenu } from "@/components/marketing-four/command-menu"
import { ModeSwitcher } from "@/components/marketing-four/mode-switcher"
import { SiteSettings } from "@/components/marketing-four/site-settings"
import { LogoMark } from "@/components/marketing-four/logo"
import { playClick } from "@/lib/sound"
import { triggerHaptic } from "@/lib/haptics"

const NAV_ITEMS = [
  { title: "Home", href: "/marketing-four" },
  { title: "Docs", href: "/docs" },
]

function tap() {
  void playClick()
  triggerHaptic("selection")
}

// Animated two-line hamburger that morphs into an X, matching the mobile
// nav trigger pattern from shadcn-labs/startercn's MobileNav (MIT) — same
// visual language rebuilt with our own markup.
function MenuGlyph({ open }: { open: boolean }) {
  return (
    <div className="relative flex h-8 w-4 items-center justify-center">
      <div className="relative size-4">
        <span
          className={cn(
            "absolute left-0 block h-0.5 w-4 bg-foreground transition-all duration-150",
            open ? "top-[0.4rem] -rotate-45" : "top-1",
          )}
        />
        <span
          className={cn(
            "absolute left-0 block h-0.5 w-4 bg-foreground transition-all duration-150",
            open ? "top-[0.4rem] rotate-45" : "top-2.5",
          )}
        />
      </div>
    </div>
  )
}

export function MarketingFourNav() {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/90 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-6xl items-center gap-2 px-4 sm:px-6">
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <button
              type="button"
              onClick={tap}
              className="flex h-8 touch-manipulation items-center gap-2.5 lg:hidden"
            >
              <MenuGlyph open={open} />
              <span className="text-lg font-medium leading-none">Menu</span>
            </button>
          </PopoverTrigger>
          <PopoverContent
            align="start"
            side="bottom"
            sideOffset={14}
            alignOffset={-16}
            className="h-[var(--radix-popper-available-height)] w-[var(--radix-popper-available-width)] overflow-y-auto rounded-none border-none bg-background/95 p-0 shadow-none backdrop-blur"
          >
            <div className="flex flex-col gap-4 px-6 py-6">
              <p className="text-sm font-medium text-muted-foreground">Menu</p>
              <div className="flex flex-col gap-3">
                {NAV_ITEMS.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => { tap(); setOpen(false) }}
                    className="text-2xl font-medium"
                  >
                    {item.title}
                  </Link>
                ))}
              </div>
            </div>
          </PopoverContent>
        </Popover>

        <Link href="/marketing-four" className="hidden size-8 items-center justify-center lg:flex">
          <LogoMark className="size-5" />
          <span className="sr-only">Reflow</span>
        </Link>

        <nav className="ml-4 hidden items-center gap-1 lg:flex">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={tap}
              className={cn(
                "rounded-md px-3 py-1.5 text-sm transition-colors hover:bg-muted",
                pathname?.startsWith(item.href) ? "text-foreground" : "text-muted-foreground",
              )}
            >
              {item.title}
            </Link>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-2 md:flex-1 md:justify-end">
          <div className="hidden w-full flex-1 md:flex md:w-auto md:flex-none">
            <CommandMenu />
          </div>
          <ModeSwitcher />
          <SiteSettings />
        </div>
      </div>
    </header>
  )
}
