"use client"

import { useState } from "react"
import Link from "next/link"
import { ArrowUpRight, Menu, MoonStar, Package2, X } from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { DarkButton } from "./frame"

const LINKS = [
  { title: "Features", href: "#features" },
  { title: "Benefits", href: "#benefits" },
  { title: "Testimonials", href: "#testimonials" },
  { title: "Pricing", href: "#pricing" },
  { title: "Docs", href: "/docs" },
]

export function NavTwo() {
  const [open, setOpen] = useState(false)

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
          {LINKS.map((l) => (
            <a key={l.title} href={l.href} className="transition-colors hover:text-foreground">
              {l.title}
            </a>
          ))}
        </nav>

        <div className="hidden items-center gap-3 md:flex">
          <button
            type="button"
            aria-label="Toggle theme"
            onClick={() => toast("Dark mode is coming soon")}
            className="flex size-10 items-center justify-center rounded-lg border bg-muted/40 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <MoonStar className="size-4" />
          </button>
          <Link
            href="/auth/sign-in"
            className="inline-flex h-10 items-center rounded-lg border bg-muted/40 px-4 text-sm font-medium transition-colors hover:bg-muted"
          >
            Login
          </Link>
          <Link href="/demo">
            <DarkButton>Try demo</DarkButton>
          </Link>
        </div>

        <button
          type="button"
          aria-label="Menu"
          onClick={() => setOpen((o) => !o)}
          className="flex size-9 items-center justify-center rounded-md border md:hidden"
        >
          {open ? <X className="size-5" /> : <Menu className="size-5" />}
        </button>
      </div>

      <div className={cn("border-t bg-background px-4 pb-4 md:hidden", open ? "block" : "hidden")}>
        <nav className="flex flex-col divide-y">
          {LINKS.map((l) => (
            <a key={l.title} href={l.href} onClick={() => setOpen(false)} className="py-3 text-sm text-muted-foreground">
              {l.title}
            </a>
          ))}
        </nav>
        <div className="mt-3 flex items-center gap-2">
          <Link href="/auth/sign-in" className="inline-flex h-10 flex-1 items-center justify-center rounded-lg border text-sm font-medium">
            Login
          </Link>
          <Link href="/demo" className="flex-1">
            <DarkButton className="w-full">
              Try demo <ArrowUpRight className="size-4" />
            </DarkButton>
          </Link>
        </div>
      </div>
    </header>
  )
}
