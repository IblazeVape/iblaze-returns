"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { ArrowUpRight, MoonStar, Package2, Settings, SunMedium } from "lucide-react"
import { cn } from "@/lib/utils"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { useMarketingTwoTheme } from "@/components/marketing-two/theme-provider"
import { CommandMenu } from "@/components/marketing-four/command-menu"
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
// nav trigger pattern from shadcn-labs/startercn's MobileNav — same visual
// language (two bars rotating into a cross) rebuilt with our own markup.
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
  const { dark, toggle } = useMarketingTwoTheme()

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
            <div className="flex flex-col gap-8 px-6 py-6">
              <div className="flex flex-col gap-4">
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
              <div className="mt-auto flex items-center gap-2">
                <button
                  type="button"
                  aria-label="Toggle theme"
                  onClick={() => { tap(); toggle() }}
                  className="flex size-10 items-center justify-center rounded-md border text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                >
                  {dark ? <SunMedium className="size-4" /> : <MoonStar className="size-4" />}
                </button>
                <Link
                  href="/auth/sign-in"
                  onClick={() => { tap(); setOpen(false) }}
                  className="flex h-10 flex-1 items-center justify-center rounded-md border text-sm font-medium"
                >
                  Login
                </Link>
                <Link href="/demo" onClick={() => { tap(); setOpen(false) }} className="flex-1">
                  <span className="flex h-10 items-center justify-center gap-1.5 rounded-md bg-zinc-900 text-sm font-medium text-white">
                    Try demo <ArrowUpRight className="size-4" />
                  </span>
                </Link>
              </div>
            </div>
          </PopoverContent>
        </Popover>

        <Link href="/marketing-four" className="hidden items-center gap-2 lg:flex">
          <span className="flex size-7 items-center justify-center rounded-full bg-zinc-900 text-white">
            <Package2 className="size-3.5" />
          </span>
          <span className="text-base font-semibold tracking-tight">Reflow</span>
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

        {/* Mobile-only: theme toggle sits directly in the header bar next to
            the Menu trigger, matching the reference icon-row layout, instead
            of being tucked away inside the popover only. */}
        <button
          type="button"
          aria-label="Toggle theme"
          onClick={() => { tap(); toggle() }}
          className="ml-auto flex size-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground lg:hidden"
        >
          {dark ? <SunMedium className="size-4" /> : <MoonStar className="size-4" />}
        </button>

        <div className="hidden items-center gap-2 lg:ml-auto lg:flex">
          <CommandMenu />
          <button
            type="button"
            aria-label="Toggle theme"
            onClick={() => { tap(); toggle() }}
            className="hidden size-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground lg:flex"
          >
            {dark ? <SunMedium className="size-4" /> : <MoonStar className="size-4" />}
          </button>
          <Link
            href="/auth/sign-in"
            onClick={tap}
            aria-label="Account settings"
            className="hidden size-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground lg:flex"
          >
            <Settings className="size-4" />
          </Link>
          <Link
            href="/auth/sign-in"
            onClick={tap}
            className="hidden h-8 items-center rounded-md border px-3 text-sm font-medium transition-colors hover:bg-muted lg:flex"
          >
            Login
          </Link>
          <Link
            href="/demo"
            onClick={tap}
            className="hidden h-8 items-center gap-1.5 rounded-md bg-zinc-900 px-3 text-sm font-medium text-white transition-colors hover:bg-zinc-800 lg:flex"
          >
            Try demo <ArrowUpRight className="size-3.5" />
          </Link>
        </div>
      </div>
    </header>
  )
}
