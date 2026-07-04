"use client"

import Link from "next/link"
import { ArrowRight, Github, Instagram, Package2, Twitter, Youtube } from "lucide-react"
import { toast } from "sonner"

const COMPANY = [
  { label: "Testimonials", href: "#testimonials" },
  { label: "Features", href: "#features" },
  { label: "Benefits", href: "#benefits" },
  { label: "Pricing", href: "#pricing" },
  { label: "Live Demo", href: "/demo" },
]

const HELP = [
  { label: "Customer Support", href: "/docs" },
  { label: "Delivery Details", href: "/docs" },
  { label: "Terms & Conditions", href: "/terms" },
  { label: "Privacy Policy", href: "/privacy" },
]

export function FooterTwo() {
  return (
    <footer className="border-t">
      <div className="grid grid-cols-1 gap-10 px-5 py-14 md:grid-cols-[1.2fr_1fr_1fr_1.3fr] lg:px-0">
        <div>
          <Link href="/marketing-two" className="flex items-center gap-2">
            <span className="flex size-8 items-center justify-center rounded-full bg-zinc-900 text-white">
              <Package2 className="size-4" />
            </span>
            <span className="text-lg font-semibold tracking-tight">Reflow</span>
          </Link>
          <p className="mt-4 max-w-[30ch] text-sm text-muted-foreground">
            Reflow helps you centralize your returns, refunds, and customer data -
            all in one simple, real-time portal built for growing stores.
          </p>
          <div className="mt-6 flex items-center gap-4 border-t pt-5 text-muted-foreground">
            <Github className="size-4 transition-colors hover:text-foreground" />
            <Instagram className="size-4 transition-colors hover:text-foreground" />
            <Twitter className="size-4 transition-colors hover:text-foreground" />
            <Youtube className="size-4 transition-colors hover:text-foreground" />
          </div>
        </div>

        <div>
          <h3 className="font-semibold">Company</h3>
          <ul className="mt-4 space-y-2.5 text-sm text-muted-foreground">
            {COMPANY.map((l) => (
              <li key={l.label}>
                <a href={l.href} className="transition-colors hover:text-foreground">{l.label}</a>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h3 className="font-semibold">Help</h3>
          <ul className="mt-4 space-y-2.5 text-sm text-muted-foreground">
            {HELP.map((l) => (
              <li key={l.label}>
                <Link href={l.href} className="transition-colors hover:text-foreground">{l.label}</Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h3 className="font-semibold">Subscribe to newsletter</h3>
          <form
            onSubmit={(e) => {
              e.preventDefault()
              toast.success("Subscribed!", { description: "Thanks for joining the newsletter." })
            }}
            className="mt-4 flex items-center gap-2"
          >
            <input
              type="email"
              required
              placeholder="Your email..."
              className="h-10 w-full rounded-lg border bg-background px-3 text-sm outline-none placeholder:text-muted-foreground focus:border-foreground/40"
            />
            <button
              type="submit"
              aria-label="Subscribe"
              className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-zinc-900 text-white shadow-[0_0_0_1px_rgba(0,0,0,0.9),inset_0_1px_0_rgba(255,255,255,0.15)] transition-colors hover:bg-zinc-800"
            >
              <ArrowRight className="size-4" />
            </button>
          </form>
          <p className="mt-6 text-xs text-muted-foreground">
            Built for Shopify. Powered by Clerk &amp; Stripe.
          </p>
        </div>
      </div>

      <div className="border-t px-4 py-6 text-center text-sm text-muted-foreground">
        &copy;{new Date().getFullYear()} <span className="font-semibold text-foreground">Reflow</span> All
        rights reserved | Built to empower Shopify merchants worldwide.
      </div>
    </footer>
  )
}
