"use client"

import { useEffect, useState } from "react"
import { createPortal } from "react-dom"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { AnimatePresence, motion } from "framer-motion"
import { ArrowUpRight, MoonStar, Package2, SunMedium, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { useMarketingTwoTheme } from "@/components/marketing-two/theme-provider"

const NAV_ITEMS = [
  { title: "Docs", href: "/docs" },
]

export function MarketingFourNav() {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  const { dark, toggle } = useMarketingTwoTheme()

  useEffect(() => setMounted(true), [])

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/90 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-6xl items-center gap-2 px-4 sm:px-6">
        <Link href="/marketing-four" className="flex items-center gap-2">
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
              className={cn(
                "rounded-md px-3 py-1.5 text-sm transition-colors hover:bg-muted",
                pathname?.startsWith(item.href) ? "text-foreground" : "text-muted-foreground",
              )}
            >
              {item.title}
            </Link>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <button
            type="button"
            aria-label="Toggle theme"
            onClick={toggle}
            className="hidden size-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground lg:flex"
          >
            {dark ? <SunMedium className="size-4" /> : <MoonStar className="size-4" />}
          </button>
          <Link
            href="/auth/sign-in"
            className="hidden h-8 items-center rounded-md border px-3 text-sm font-medium transition-colors hover:bg-muted lg:flex"
          >
            Login
          </Link>
          <Link
            href="/demo"
            className="hidden h-8 items-center gap-1.5 rounded-md bg-zinc-900 px-3 text-sm font-medium text-white transition-colors hover:bg-zinc-800 lg:flex"
          >
            Try demo <ArrowUpRight className="size-3.5" />
          </Link>

          <button
            type="button"
            aria-label="Toggle Menu"
            onClick={() => setOpen(true)}
            className="flex size-8 items-center justify-center rounded-md border lg:hidden"
          >
            <span className="flex flex-col gap-1">
              <span className="h-px w-4 bg-foreground" />
              <span className="h-px w-4 bg-foreground" />
            </span>
          </button>
        </div>
      </div>

      {/* Portalled to document.body — the header's backdrop-blur-md
          (backdrop-filter) makes Chromium treat the header as the containing
          block for any position:fixed descendant, collapsing this panel down
          to the header's own height instead of the full viewport. Same fix
          as components/marketing-two/nav.tsx. */}
      {mounted && createPortal(
        <AnimatePresence>
          {open && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="fixed inset-0 z-50 flex flex-col bg-background lg:hidden"
            >
              <div className="flex h-14 items-center justify-between border-b px-4">
                <span className="text-base font-semibold">Reflow</span>
                <button
                  type="button"
                  aria-label="Close menu"
                  onClick={() => setOpen(false)}
                  className="flex size-8 items-center justify-center rounded-md border"
                >
                  <X className="size-4" />
                </button>
              </div>
              <nav className="flex flex-col divide-y">
                {NAV_ITEMS.map((item) => (
                  <Link key={item.href} href={item.href} onClick={() => setOpen(false)} className="px-4 py-4 text-base font-medium">
                    {item.title}
                  </Link>
                ))}
              </nav>
              <div className="mt-auto flex items-center gap-2 border-t p-4">
                <Link href="/auth/sign-in" onClick={() => setOpen(false)} className="flex h-10 flex-1 items-center justify-center rounded-md border text-sm font-medium">
                  Login
                </Link>
                <Link href="/demo" onClick={() => setOpen(false)} className="flex h-10 flex-1 items-center justify-center gap-1.5 rounded-md bg-zinc-900 text-sm font-medium text-white">
                  Try demo <ArrowUpRight className="size-4" />
                </Link>
              </div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body,
      )}
    </header>
  )
}
