import type { Metadata } from "next"
import Link from "next/link"
import { ArrowUpRight, BookOpen, CalendarClock, Palette, SlidersHorizontal } from "lucide-react"
import { MarketingTwoThemeProvider } from "@/components/marketing-two/theme-provider"
import { MarketingFourNav } from "@/components/marketing-four/nav"
import { SiteFooter } from "@/components/marketing-four/site-footer"

export const metadata: Metadata = {
  title: "Reflow — A returns portal for Shopify stores",
  description: "Fork a branded, self-serve returns portal for your Shopify store. Configure it, deploy it, done.",
}

const FEATURES = [
  {
    icon: CalendarClock,
    title: "Return window",
    body: "Set anywhere from 1 to 90 days from delivery.",
  },
  {
    icon: SlidersHorizontal,
    title: "Sidebar menu",
    body: "Show, hide, or relink any item in the customer sidebar.",
  },
  {
    icon: Palette,
    title: "Brand colours",
    body: "Carries through to the customer avatar and buttons.",
  },
  {
    icon: BookOpen,
    title: "Returns policy",
    body: "Toggle the policy checkbox on or off, edit the wording.",
  },
]

export default function MarketingFourPage() {
  return (
    <MarketingTwoThemeProvider className="marketing-four-root">
      <MarketingFourNav />

      <section className="mx-auto flex max-w-4xl flex-col items-center px-4 py-20 text-center sm:px-6 md:py-28">
        <h1 className="bg-gradient-to-b from-foreground to-foreground/60 bg-clip-text text-4xl font-bold tracking-tight text-transparent sm:text-5xl md:text-6xl">
          Reflow
        </h1>
        <p className="mt-4 max-w-xl text-lg text-muted-foreground sm:text-xl">
          A branded, self-serve returns portal for your Shopify store. Fork it
          for your own brand, configure it, and go live.
        </p>
        <div className="mt-6 flex items-center gap-3">
          <Link
            href="/demo"
            className="flex h-10 items-center gap-1.5 rounded-md bg-zinc-900 px-5 text-sm font-medium text-white transition-colors hover:bg-zinc-800"
          >
            Try the demo <ArrowUpRight className="size-4" />
          </Link>
          <Link
            href="/docs"
            className="flex h-10 items-center rounded-md border px-5 text-sm font-medium transition-colors hover:bg-muted"
          >
            Read the docs
          </Link>
        </div>
      </section>

      <section className="mx-auto max-w-5xl border-t px-4 py-16 sm:px-6">
        <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map((f) => (
            <div key={f.title}>
              <span className="flex size-9 items-center justify-center rounded-md border bg-muted/40">
                <f.icon className="size-4" />
              </span>
              <h3 className="mt-3 text-sm font-semibold">{f.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{f.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="border-t px-4 py-16 text-center sm:px-6">
        <h2 className="text-2xl font-bold tracking-tight">Read the docs</h2>
        <p className="mx-auto mt-2 max-w-md text-muted-foreground">
          Everything from installing Reflow to customizing it for your store.
        </p>
        <Link
          href="/docs"
          className="mt-6 inline-flex h-10 items-center gap-1.5 rounded-md bg-zinc-900 px-5 text-sm font-medium text-white transition-colors hover:bg-zinc-800"
        >
          Browse docs <ArrowUpRight className="size-4" />
        </Link>
      </section>

      <SiteFooter />
    </MarketingTwoThemeProvider>
  )
}
