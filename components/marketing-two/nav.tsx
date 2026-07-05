"use client"

import { useEffect, useState } from "react"
import { createPortal } from "react-dom"
import Link from "next/link"
import { AnimatePresence, motion } from "framer-motion"
import {
  ArrowUpRight, CalendarClock, ChevronDown, ChevronRight, MessageSquareText,
  MoonStar, Package2, Palette, SlidersHorizontal, SunMedium, X,
} from "lucide-react"
import { DarkButton } from "./frame"
import { useMarketingTwoTheme } from "./theme-provider"

const LINKS = [
  { title: "Features", href: "#features" },
  { title: "Benefits", href: "#benefits" },
  { title: "Testimonials", href: "#testimonials" },
  { title: "Pricing", href: "#pricing" },
  { title: "Docs", href: "/docs" },
]

// Features mega-menu — same four things FeaturesTwo/BenefitsTwo describe
// (return window, sidebar items, branding, policy + buttons), grouped so the
// dropdown has real content instead of repeating the single "Features" link.
const FEATURE_GROUPS = [
  {
    heading: "Configure your portal",
    items: [
      { icon: CalendarClock, title: "Return window", body: "Set 1-90 days to match your policy." },
      { icon: SlidersHorizontal, title: "Sidebar menu", body: "Show, hide or relink any item." },
    ],
  },
  {
    heading: "Make it yours",
    items: [
      { icon: Palette, title: "Brand colours", body: "Carries through to buttons and avatars." },
      { icon: MessageSquareText, title: "Policy checkbox", body: "Toggle it on/off, edit the wording." },
    ],
  },
]

function FeaturesMegaMenu({ onNavigate }: { onNavigate: () => void }) {
  return (
    <div className="grid grid-cols-2 gap-6 p-5">
      {FEATURE_GROUPS.map((group) => (
        <div key={group.heading}>
          <p className="px-2 text-xs font-medium text-muted-foreground">{group.heading}</p>
          <div className="mt-1.5 space-y-0.5">
            {group.items.map((item) => (
              <a
                key={item.title}
                href="#features"
                onClick={onNavigate}
                className="flex items-start gap-3 rounded-lg p-2 transition-colors hover:bg-muted"
              >
                <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-md border bg-background">
                  <item.icon className="size-4" />
                </span>
                <span>
                  <span className="block text-sm font-medium">{item.title}</span>
                  <span className="block text-xs text-muted-foreground">{item.body}</span>
                </span>
              </a>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

export function NavTwo() {
  const [open, setOpen] = useState(false)
  const [featuresOpen, setFeaturesOpen] = useState(false)
  const [mobileFeaturesOpen, setMobileFeaturesOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  const { dark, toggle } = useMarketingTwoTheme()

  useEffect(() => setMounted(true), [])

  return (
    <header className="sticky top-0 z-50 border-b bg-background/90 backdrop-blur-md">
      <div className="flex h-16 items-center justify-between px-4 sm:px-6">
        <Link href="/marketing-two" className="flex items-center gap-2">
          <span className="flex size-8 items-center justify-center rounded-full bg-zinc-900 text-white">
            <Package2 className="size-4" />
          </span>
          <span className="text-lg font-semibold tracking-tight">Reflow</span>
        </Link>

        <nav className="hidden items-center gap-7 text-sm text-muted-foreground md:flex">
          {LINKS.map((l) =>
            l.title === "Features"
              ? (
                  <div key={l.title} className="relative" onMouseEnter={() => setFeaturesOpen(true)} onMouseLeave={() => setFeaturesOpen(false)}>
                    <button
                      type="button"
                      aria-expanded={featuresOpen}
                      onClick={() => setFeaturesOpen((o) => !o)}
                      className="flex items-center gap-1 transition-colors hover:text-foreground"
                    >
                      {l.title}
                      <ChevronDown className={`size-3.5 transition-transform ${featuresOpen ? "rotate-180" : ""}`} />
                    </button>
                    <AnimatePresence>
                      {featuresOpen && (
                        <motion.div
                          initial={{ opacity: 0, y: -6 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -6 }}
                          transition={{ duration: 0.15 }}
                          className="absolute left-1/2 top-full z-50 mt-3 w-[420px] -translate-x-1/2 rounded-xl border bg-popover text-popover-foreground shadow-xl"
                        >
                          <FeaturesMegaMenu onNavigate={() => setFeaturesOpen(false)} />
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                )
              : (
                  <a key={l.title} href={l.href} className="transition-colors hover:text-foreground">
                    {l.title}
                  </a>
                ),
          )}
        </nav>

        {/* All three controls share the same ring-2 spacer (transparent on the
            plain buttons) so they occupy an identical 44px box as DarkButton's
            visible ring — otherwise DarkButton's ring made it look larger. */}
        <div className="hidden items-center gap-3 md:flex">
          <button
            type="button"
            aria-label="Toggle theme"
            onClick={toggle}
            className="flex size-10 items-center justify-center rounded-lg border bg-muted/40 text-muted-foreground ring-2 ring-transparent transition-colors hover:bg-muted hover:text-foreground"
          >
            {dark ? <SunMedium className="size-4" /> : <MoonStar className="size-4" />}
          </button>
          <Link
            href="/auth/sign-in"
            className="inline-flex h-10 items-center rounded-lg border bg-muted/40 px-4 text-sm font-medium ring-2 ring-transparent transition-colors hover:bg-muted"
          >
            Login
          </Link>
          <Link href="/demo">
            <DarkButton>Try demo</DarkButton>
          </Link>
        </div>

        <button
          type="button"
          aria-label="Toggle Menu"
          aria-expanded={open}
          onClick={() => setOpen(true)}
          className="flex size-9 items-center justify-center rounded-md border transition-colors hover:bg-muted md:hidden"
        >
          <ChevronDown className="size-5" />
        </button>
      </div>

      {/* Full-screen slide-in mobile panel, closed with an explicit X (matches
          a dedicated mobile nav pattern rather than a below-header dropdown).
          Portalled to document.body — the header's backdrop-blur (backdrop-filter)
          makes Chromium treat header as the containing block for any
          position:fixed descendant, which collapsed this panel down to the
          header's own 64px height instead of the full viewport. Portalling
          outside the header sidesteps that entirely. */}
      {mounted && createPortal(
        <AnimatePresence>
          {open && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 flex flex-col bg-background md:hidden"
          >
            <div className="flex h-16 shrink-0 items-center justify-between border-b px-4">
              <Link href="/marketing-two" className="flex items-center gap-2" onClick={() => setOpen(false)}>
                <span className="flex size-8 items-center justify-center rounded-full bg-zinc-900 text-white">
                  <Package2 className="size-4" />
                </span>
                <span className="text-lg font-semibold tracking-tight">Reflow</span>
              </Link>
              <button
                type="button"
                aria-label="Close menu"
                onClick={() => setOpen(false)}
                className="flex size-9 items-center justify-center rounded-md border transition-colors hover:bg-muted"
              >
                <X className="size-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-2 py-2">
              <nav className="flex flex-col divide-y">
                {LINKS.map((l) =>
                  l.title === "Features"
                    ? (
                        <div key={l.title}>
                          <button
                            type="button"
                            aria-expanded={mobileFeaturesOpen}
                            onClick={() => setMobileFeaturesOpen((o) => !o)}
                            className="flex w-full items-center justify-between px-3 py-4 text-base font-medium"
                          >
                            {l.title}
                            <ChevronRight className={`size-4 text-muted-foreground transition-transform ${mobileFeaturesOpen ? "rotate-90" : ""}`} />
                          </button>
                          <AnimatePresence>
                            {mobileFeaturesOpen && (
                              <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: "auto" }}
                                exit={{ opacity: 0, height: 0 }}
                                transition={{ duration: 0.2 }}
                                className="overflow-hidden"
                              >
                                <FeaturesMegaMenu onNavigate={() => setOpen(false)} />
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      )
                    : (
                        <a
                          key={l.title}
                          href={l.href}
                          onClick={() => setOpen(false)}
                          className="px-3 py-4 text-base font-medium"
                        >
                          {l.title}
                        </a>
                      ),
                )}
              </nav>
            </div>

            <div className="flex shrink-0 items-center gap-2 border-t p-4">
              <button
                type="button"
                aria-label="Toggle theme"
                onClick={toggle}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border text-muted-foreground ring-2 ring-transparent transition-colors hover:bg-muted hover:text-foreground"
              >
                {dark ? <SunMedium className="size-4" /> : <MoonStar className="size-4" />}
              </button>
              <Link href="/auth/sign-in" className="inline-flex h-10 flex-1 items-center justify-center rounded-lg border text-sm font-medium" onClick={() => setOpen(false)}>
                Login
              </Link>
              <Link href="/demo" className="flex-1" onClick={() => setOpen(false)}>
                <DarkButton className="w-full">
                  Try demo <ArrowUpRight className="size-4" />
                </DarkButton>
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
