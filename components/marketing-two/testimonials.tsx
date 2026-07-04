"use client"

import Link from "next/link"
import { ArrowUpRight, Star, StarHalf } from "lucide-react"
import { DarkButton, SectionHeading } from "./frame"

// Original testimonial copy; <mark>-style highlights mimic the reference's
// highlighted-phrase treatment.
const QUOTES = [
  {
    name: "Emily Watson", handle: "@emilywatson", stars: 4.5,
    body: <>Finally, a portal that shows <Hl>everything that matters - requests, refunds, and reasons</Hl> in one clean view. It helps us resolve returns much faster.</>,
  },
  {
    name: "Alex Rivera", handle: "@alexrivera", stars: 5,
    body: <>The interface is incredibly intuitive and the tools are practical. We&apos;ve <Hl>cut our resolution time almost in half</Hl> since switching. Adoption across the team was effortless.</>,
  },
  {
    name: "Marcus Johnson", handle: "@marcusjohnson", stars: 4,
    body: <>The Shopify sync streamlined my daily workflow significantly. I can approve requests, issue refunds, and update customers <Hl>without ever leaving the platform</Hl>.</>,
  },
  {
    name: "Priya Shah", handle: "@priyashah", stars: 5,
    body: <>Our support inbox went quiet almost overnight. Customers <Hl>help themselves on our own domain</Hl> and only the edge cases ever reach the team now.</>,
  },
  {
    name: "Dana Okafor", handle: "@danaokafor", stars: 4.5,
    body: <>Setting return windows per product took ten minutes. It used to take <Hl>a spreadsheet and a Slack thread</Hl> every single season.</>,
  },
  {
    name: "Marcus Webb", handle: "@marcuswebb", stars: 5,
    body: <>We run six brands from one login. The multi-store view means <Hl>every return across the portfolio</Hl> lives in a single queue.</>,
  },
]

function Hl({ children }: { children: React.ReactNode }) {
  return <span className="bg-muted rounded-sm px-1">{children}</span>
}

function Stars({ n }: { n: number }) {
  const full = Math.floor(n)
  return (
    <span className="ml-auto flex items-center gap-0.5 text-orange-500">
      {Array.from({ length: full }, (_, i) => <Star key={i} className="size-4 fill-current" />)}
      {n % 1 !== 0 && <StarHalf className="size-4 fill-current" />}
    </span>
  )
}

function QuoteCard({ q }: { q: (typeof QUOTES)[number] }) {
  return (
    <div className="flex w-[360px] shrink-0 flex-col justify-between rounded-xl border bg-background p-6 shadow-sm">
      <p className="text-sm leading-relaxed text-muted-foreground">{q.body}</p>
      <div className="mt-5 flex items-center gap-3">
        <span className="flex size-10 items-center justify-center rounded-full bg-muted text-xs font-semibold">
          {q.name.split(" ").map((w) => w[0]).join("")}
        </span>
        <div>
          <p className="text-sm font-semibold">{q.name}</p>
          <p className="text-xs text-muted-foreground">{q.handle}</p>
        </div>
        <Stars n={q.stars} />
      </div>
    </div>
  )
}

export function TestimonialsTwo() {
  return (
    <section id="testimonials" className="scroll-mt-16 border-t pt-20">
      <SectionHeading
        eyebrow="Testimonials"
        title="Trusted by Stores That Return Smarter"
        subtitle="Real stories from merchants who simplified their returns process and kept more customers with Reflow."
      />

      <div className="relative mt-14 overflow-hidden [mask-image:linear-gradient(to_right,transparent,#000_8%,#000_92%,transparent)]">
        <div
          className="flex w-max animate-marquee gap-5 pr-5 hover:[animation-play-state:paused]"
          style={{ "--duration": "48s", "--gap": "1.25rem" } as React.CSSProperties}
        >
          {[...QUOTES, ...QUOTES].map((q, i) => <QuoteCard key={i} q={q} />)}
        </div>
      </div>

      <div className="mt-12 flex items-center justify-center gap-6">
        <div className="text-center">
          <p className="flex items-center gap-1 text-xl font-bold">
            4.5 <Star className="size-5 fill-orange-500 text-orange-500" />
          </p>
          <p className="text-xs text-muted-foreground">Stars out of 5</p>
        </div>
        <Link href="/demo">
          <DarkButton>
            View all testimonials <ArrowUpRight className="size-4" />
          </DarkButton>
        </Link>
      </div>
    </section>
  )
}
