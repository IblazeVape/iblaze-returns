"use client"

import { useState } from "react"
import Link from "next/link"
import {
  ChevronDown,
  Code,
  Menu,
  Package2,
  Search,
  Sun,
  X,
} from "lucide-react"
import { Button, Container } from "./frame"

const LINKS = [
  { title: "Features", href: "#features" },
  { title: "How it works", href: "#workflow" },
  { title: "Pricing", href: "#pricing" },
  { title: "Reviews", href: "#reviews" },
  { title: "FAQ", href: "#faq" },
]

export function AnnouncementBar() {
  const [show, setShow] = useState(true)
  if (!show) return null
  return (
    <div className="relative bg-zinc-950 text-white">
      <Container className="flex items-center justify-center gap-2 py-2 text-center text-[13px]">
        <span className="hidden rounded-full bg-white/10 px-2 py-0.5 text-[11px] font-semibold sm:inline">
          New
        </span>
        <span className="text-zinc-300">
          Instant store credit &amp; one-click exchanges are now live for every plan.
        </span>
        <Link href="#features" className="hidden font-medium underline underline-offset-2 sm:inline">
          See what&apos;s new →
        </Link>
        <button
          onClick={() => setShow(false)}
          className="absolute right-4 text-zinc-400 hover:text-white"
          aria-label="Dismiss"
        >
          <X className="size-4" />
        </button>
      </Container>
    </div>
  )
}

export function NavThree() {
  const [open, setOpen] = useState(false)

  return (
    <header className="sticky top-0 z-50 border-b border-zinc-200 bg-white/80 backdrop-blur-md">
      <Container className="flex h-16 items-center justify-between">
        <div className="flex items-center gap-8">
          <Link href="/marketing-three" className="flex items-center gap-2">
            <span className="flex size-8 items-center justify-center rounded-lg bg-zinc-900 text-white">
              <Package2 className="size-4" />
            </span>
            <span className="text-[17px] font-semibold tracking-tight text-zinc-900">
              Reflow
            </span>
          </Link>

          <nav className="hidden items-center gap-6 text-sm text-zinc-600 lg:flex">
            {LINKS.map((l) => (
              <a key={l.title} href={l.href} className="transition-colors hover:text-zinc-900">
                {l.title}
              </a>
            ))}
            <button className="flex items-center gap-1 transition-colors hover:text-zinc-900">
              Resources <ChevronDown className="size-3.5" />
            </button>
          </nav>
        </div>

        <div className="flex items-center gap-1">
          <div className="hidden items-center gap-1 md:flex">
            <IconButton label="Search">
              <Search className="size-4" />
            </IconButton>
            <IconButton label="Theme">
              <Sun className="size-4" />
            </IconButton>
            <IconButton label="GitHub">
              <Code className="size-4" />
            </IconButton>
            <span className="mx-2 h-5 w-px bg-zinc-200" />
          </div>

          <Button href="/portal" variant="ghost" size="sm" className="hidden sm:inline-flex">
            Sign in
          </Button>
          <Button href="#pricing" size="sm" className="hidden sm:inline-flex">
            Get started
          </Button>

          <button
            onClick={() => setOpen((v) => !v)}
            className="flex size-9 items-center justify-center rounded-lg border border-zinc-200 text-zinc-700 lg:hidden"
            aria-label="Toggle menu"
          >
            {open ? <X className="size-4" /> : <Menu className="size-4" />}
          </button>
        </div>
      </Container>

      {open && (
        <div className="border-t border-zinc-200 bg-white px-4 py-4 lg:hidden">
          <nav className="flex flex-col gap-3 text-sm text-zinc-700">
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
            <div className="mt-2 flex gap-2">
              <Button href="/portal" variant="outline" size="sm" className="flex-1">
                Sign in
              </Button>
              <Button href="#pricing" size="sm" className="flex-1">
                Get started
              </Button>
            </div>
          </nav>
        </div>
      )}
    </header>
  )
}

function IconButton({ children, label }: { children: React.ReactNode; label: string }) {
  return (
    <button
      aria-label={label}
      className="flex size-9 items-center justify-center rounded-lg text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-900"
    >
      {children}
    </button>
  )
}
