"use client"

import { useState } from "react"
import Link from "next/link"
import {
  ChevronDown,
  Github,
  Menu,
  Package2,
  Search,
  Sun,
  X,
} from "lucide-react"
import { Button, Container } from "./frame"

export interface NavLinkItem {
  title: string
  href: string
}

const DEFAULT_LINKS: NavLinkItem[] = [
  { title: "Features", href: "#features" },
  { title: "How it works", href: "#workflow" },
  { title: "Pricing", href: "#pricing" },
  { title: "Reviews", href: "#reviews" },
  { title: "FAQ", href: "#faq" },
]

export interface AnnouncementBarProps {
  badge?: string
  message?: string
  linkLabel?: string
  linkHref?: string
}

export function AnnouncementBar({
  badge = "New",
  message = "Instant store credit & one-click exchanges are now live for every plan.",
  linkLabel = "See what's new →",
  linkHref = "#features",
}: AnnouncementBarProps) {
  const [show, setShow] = useState(true)
  if (!show) return null
  return (
    <div className="relative bg-zinc-950 text-white">
      <Container className="flex items-center justify-center gap-2 py-2 text-center text-[13px]">
        {badge && (
          <span className="hidden rounded-full bg-white/10 px-2 py-0.5 text-[11px] font-semibold sm:inline">
            {badge}
          </span>
        )}
        <span className="text-zinc-300">{message}</span>
        {linkLabel && (
          <Link href={linkHref} className="hidden font-medium underline underline-offset-2 sm:inline">
            {linkLabel}
          </Link>
        )}
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

export interface NavThreeProps {
  brand?: string
  brandHref?: string
  links?: NavLinkItem[]
  showResources?: boolean
  showIcons?: boolean
  signInLabel?: string
  signInHref?: string
  ctaLabel?: string
  ctaHref?: string
}

export function NavThree({
  brand = "Reflow",
  brandHref = "/marketing-three",
  links = DEFAULT_LINKS,
  showResources = true,
  showIcons = true,
  signInLabel = "Sign in",
  signInHref = "/portal",
  ctaLabel = "Get started",
  ctaHref = "#pricing",
}: NavThreeProps) {
  const [open, setOpen] = useState(false)

  return (
    <header className="sticky top-0 z-50 border-b border-zinc-200 bg-white/80 backdrop-blur-md">
      <Container className="flex h-16 items-center justify-between">
        <div className="flex items-center gap-8">
          <Link href={brandHref} className="flex items-center gap-2">
            <span className="flex size-8 items-center justify-center rounded-lg bg-zinc-900 text-white">
              <Package2 className="size-4" />
            </span>
            <span className="text-[17px] font-semibold tracking-tight text-zinc-900">
              {brand}
            </span>
          </Link>

          <nav className="hidden items-center gap-6 text-sm text-zinc-600 lg:flex">
            {links.map((l) => (
              <a key={l.title + l.href} href={l.href} className="transition-colors hover:text-zinc-900">
                {l.title}
              </a>
            ))}
            {showResources && (
              <button className="flex items-center gap-1 transition-colors hover:text-zinc-900">
                Resources <ChevronDown className="size-3.5" />
              </button>
            )}
          </nav>
        </div>

        <div className="flex items-center gap-1">
          {showIcons && (
            <div className="hidden items-center gap-1 md:flex">
              <IconButton label="Search">
                <Search className="size-4" />
              </IconButton>
              <IconButton label="Theme">
                <Sun className="size-4" />
              </IconButton>
              <IconButton label="GitHub">
                <Github className="size-4" />
              </IconButton>
              <span className="mx-2 h-5 w-px bg-zinc-200" />
            </div>
          )}

          {signInLabel && (
            <Button href={signInHref} variant="ghost" size="sm" className="hidden sm:inline-flex">
              {signInLabel}
            </Button>
          )}
          {ctaLabel && (
            <Button href={ctaHref} size="sm" className="hidden sm:inline-flex">
              {ctaLabel}
            </Button>
          )}

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
            {links.map((l) => (
              <a
                key={l.title + l.href}
                href={l.href}
                onClick={() => setOpen(false)}
                className="py-1 transition-colors hover:text-zinc-900"
              >
                {l.title}
              </a>
            ))}
            <div className="mt-2 flex gap-2">
              {signInLabel && (
                <Button href={signInHref} variant="outline" size="sm" className="flex-1">
                  {signInLabel}
                </Button>
              )}
              {ctaLabel && (
                <Button href={ctaHref} size="sm" className="flex-1">
                  {ctaLabel}
                </Button>
              )}
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
