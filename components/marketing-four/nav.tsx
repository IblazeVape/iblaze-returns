"use client"

import Link from "next/link"

import { BrandContextMenu } from "@/components/marketing-four/brand-context-menu"
import { CommandMenu } from "@/components/marketing-four/command-menu"
import { LogoMark } from "@/components/marketing-four/logo"
import { MainNav } from "@/components/marketing-four/main-nav"
import { MobileNav } from "@/components/marketing-four/mobile-nav"
import { ModeSwitcher } from "@/components/marketing-four/mode-switcher"
import { SiteSettings } from "@/components/marketing-four/site-settings"
import { ROUTES } from "@/constants/routes"
import { source } from "@/lib/source"

// Ported from shadcn-labs/startercn's SiteHeader (MIT — see NOTICE.md):
// no border, no backdrop blur — matches their real header treatment
// exactly (the previous version of this file had both, which was drift
// from a hand-adaptation rather than a real port). GitHub-stars and
// Sponsor nav items are not ported (no equivalent in this product).
const navItems = [{ href: ROUTES.DOCS, label: "Docs" }]

export function MarketingFourNav() {
  return (
    <header className="sticky top-0 z-50 w-full bg-background">
      <div className="mx-auto flex h-14 max-w-6xl items-center gap-2 px-4 sm:px-6">
        <MobileNav items={navItems} tree={source.pageTree} className="flex lg:hidden" />
        <BrandContextMenu>
          <Link href={ROUTES.HOME} className="hidden size-8 items-center justify-center lg:flex">
            <LogoMark className="size-5" />
            <span className="sr-only">Reflow</span>
          </Link>
        </BrandContextMenu>
        <MainNav items={navItems} className="hidden lg:flex" />
        <div className="ml-auto flex items-center gap-2 md:flex-1 md:justify-end">
          <div className="hidden w-full flex-1 md:flex md:w-auto md:flex-none">
            <CommandMenu navItems={navItems} tree={source.pageTree} />
          </div>
          <ModeSwitcher />
          <SiteSettings />
        </div>
      </div>
    </header>
  )
}
