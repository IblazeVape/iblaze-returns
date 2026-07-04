"use client"

import { useState } from "react"
import Link from "next/link"
import { Menu, Package2, Sparkles, X } from "lucide-react"
import { PillButton } from "./frame"

const LINKS = [
  { title: "Features", href: "#features" },
  { title: "Workflow", href: "#workflow" },
  { title: "Pricing", href: "#pricing" },
  { title: "FAQ", href: "#faq" },
]

export function NavThree() {
  const [open, setOpen] = useState(false)

  return (
    <header className="sticky top-0 z-50 border-b border-dashed border-zinc-300 bg-[#fafafa]/85 backdrop-blur-md">
      <div className="flex h-16 items-center justify-between px-2 sm:px-6">
        <Link href="/marketing-three" className="flex items-center gap-2">
          <span className="flex size-8 items-center justify-center rounded-lg bg-zinc-900 text-white">
            <Package2 className="size-4" />
          </span>
          <span className="text-lg font-semibold tracking-tight text-zinc-900">Reflow</span>
        </Link>

        <nav className="hidden items-center gap-8 text-sm text-zinc-500 md:flex">
          {LINKS.map((l) => (
            <a key={l.title} href={l.href} className="transition-colors hover:text-zinc-900">
              {l.title}
            </a>
          ))}
        </nav>

        <div className="hidden items-center gap-2 md:flex">
          <PillButton href="/portal" variant="outline" icon={false} className="px-5 py-2">
            Sign in
          </PillButton>
          <PillButton href="#pricing" icon={false} className="px-5 py-2">
            Get started
            <Sparkles className="size-3.5" />
          </PillButton>
        </div>

        <button
          onClick={() => setOpen((v) => !v)}
          className="flex size-9 items-center justify-center rounded-lg border border-zinc-300 text-zinc-700 md:hidden"
          aria-label="Toggle menu"
        >
          {open ? <X className="size-4" /> : <Menu className="size-4" />}
        </button>
      </div>

      {open && (
        <div className="border-t border-dashed border-zinc-300 px-4 py-4 md:hidden">
          <nav className="flex flex-col gap-3 text-sm text-zinc-600">
            {LINKS.map((l) => (
              <a
                key={l.title}
                href={l.href}
                onClick={() => setOpen(false)}
                className="py-1 transition-colors hover:text-zinc-900"
              >
                {l.title}
              </a>
            ))}
            <PillButton href="#pricing" icon={false} className="mt-2 w-full">
              Get started
            </PillButton>
          </nav>
        </div>
      )}
    </header>
  )
}
