"use client"

import { useRef, useState, useEffect } from "react"
import Link from "next/link"
import { motion } from "framer-motion"
import { CalendarClock, CheckCircle2, Palette, RefreshCcw, SlidersHorizontal, XCircle } from "lucide-react"
import { cn } from "@/lib/utils"
import { Slider } from "@/components/ui/slider"
import { Switch } from "@/components/ui/switch"
import { DarkButton, SectionHeading } from "./frame"

const BLOCKS = [
  {
    icon: RefreshCcw,
    title: "Replaces Shopify's native returns",
    body: "Shopify still approves or declines every request behind the scenes - Reflow just gives your customers a branded, self-serve portal to start one, instead of Shopify's default flow.",
    panel: (
      <div className="w-full max-w-sm space-y-3">
        <div className="rounded-lg border bg-background px-4 py-3 text-sm shadow-sm">
          <p className="font-medium">Return #1042 requested</p>
          <p className="mt-1 text-xs text-muted-foreground">Submitted by your customer in Reflow</p>
        </div>
        <div className="flex items-center gap-3 rounded-lg border bg-background px-4 py-3 text-sm shadow-sm">
          <CheckCircle2 className="size-4 shrink-0 text-emerald-600" />
          <span>Approved in Shopify admin</span>
        </div>
        <div className="flex items-center gap-3 rounded-lg border bg-background px-4 py-3 text-sm text-muted-foreground shadow-sm">
          <XCircle className="size-4 shrink-0" />
          <span>Or declined - your call, as always</span>
        </div>
      </div>
    ),
  },
  {
    icon: CalendarClock,
    title: "Set your own return window",
    body: "From 1 day to 90, you decide the exact return window - Reflow applies it automatically to every order in the portal.",
    panel: (
      <div className="w-full max-w-sm rounded-xl border bg-background p-5 shadow-sm">
        <ReturnWindowDemo />
      </div>
    ),
  },
  {
    icon: Palette,
    title: "Fully on-brand",
    body: "Your own domain, your own colours, and an avatar that matches your storefront - customers won't know it isn't built in-house.",
    panel: (
      <div className="w-full max-w-sm space-y-3">
        <div className="rounded-lg border bg-background p-4 shadow-sm">
          <p className="text-xs text-muted-foreground">Your domain</p>
          <p className="mt-1 font-medium">returns.yourstore.com</p>
        </div>
        <div className="flex items-center gap-2 rounded-lg border bg-background p-4 shadow-sm">
          {["#18181b", "#7c3aed", "#e11d48", "#059669", "#2563eb"].map((c) => (
            <span key={c} className="size-7 rounded-full" style={{ backgroundColor: c }} />
          ))}
        </div>
      </div>
    ),
  },
  {
    icon: SlidersHorizontal,
    title: "Total control over the details",
    body: "Toggle sidebar menu items on or off, edit the returns policy checkbox text, and recolour the Submit, Accept and Review buttons.",
    panel: (
      <div className="w-full max-w-sm space-y-2">
        {["News & Updates", "Returns Policy", "Speak to Support"].map((label, i) => (
          <div key={label} className="flex items-center justify-between rounded-lg border bg-background px-4 py-2.5 text-sm shadow-sm">
            {label}
            <Switch defaultChecked={i !== 2} />
          </div>
        ))}
      </div>
    ),
  },
]

function ReturnWindowDemo() {
  const [days, setDays] = useState(30)
  return (
    <>
      <div className="flex items-center justify-between text-sm font-medium">
        Return window
        <span className="rounded-full bg-zinc-900 px-2 py-0.5 text-xs text-white tabular-nums">{days} days</span>
      </div>
      <Slider value={[days]} onValueChange={([v]) => setDays(v)} max={90} min={1} step={1} className="mt-4" />
      <div className="mt-2 flex justify-between text-[10px] text-muted-foreground tabular-nums">
        <span>1d</span><span>30d</span><span>60d</span><span>90d</span>
      </div>
    </>
  )
}

export function BenefitsTwo() {
  const [active, setActive] = useState(0)
  const refs = useRef<(HTMLDivElement | null)[]>([])

  useEffect(() => {
    const observers = refs.current.map((el, i) => {
      if (!el) return null
      const obs = new IntersectionObserver(
        ([entry]) => { if (entry.isIntersecting) setActive(i) },
        { rootMargin: "-40% 0px -40% 0px" },
      )
      obs.observe(el)
      return obs
    })
    return () => observers.forEach((o) => o?.disconnect())
  }, [])

  return (
    <section id="benefits" className="scroll-mt-16 border-t pt-14">
      <SectionHeading
        eyebrow="Benefits"
        title="How Reflow Helps You"
        subtitle="A branded, self-serve returns portal that's fully yours to configure - approvals stay right where they already are, in Shopify."
      />
      <div className="mt-8 flex items-center justify-center gap-3">
        <Link href="/demo">
          <DarkButton>Start returning now</DarkButton>
        </Link>
        <a href="#features" className="inline-flex h-10 items-center rounded-lg border bg-muted/40 px-4 text-sm font-medium transition-colors hover:bg-muted">
          Learn more
        </a>
      </div>

      {/* Table-style grid: text column and panel column share one border, no gap */}
      <div className="mt-10 border-t">
        <div className="grid grid-cols-1 divide-y border-x lg:grid-cols-2 lg:divide-x lg:divide-y-0">
          {/* Scroll-linked text blocks */}
          <div className="px-5 lg:px-8">
            {BLOCKS.map((b, i) => (
              <div
                key={b.title}
                ref={(el) => { refs.current[i] = el }}
                className={cn(
                  "flex min-h-[55vh] flex-col justify-center transition-opacity duration-500 lg:min-h-[70vh]",
                  active === i ? "opacity-100" : "opacity-25",
                )}
              >
                <h3 className="flex items-center gap-3 text-2xl font-semibold md:text-3xl">
                  <b.icon className="size-6 shrink-0" />
                  {b.title}
                </h3>
                <p className="mt-4 max-w-md text-muted-foreground">{b.body}</p>

                {/* Mobile: panel inline under each block */}
                <div className="mt-8 flex justify-center lg:hidden">
                  <PanelFrame>{b.panel}</PanelFrame>
                </div>
              </div>
            ))}
          </div>

          {/* Sticky swapping panel (desktop) */}
          <div className="hidden bg-muted/20 lg:block">
            <div className="sticky top-24 flex h-[70vh] items-center justify-center">
              <motion.div
                key={active}
                initial={{ opacity: 0, y: 16, filter: "blur(6px)" }}
                animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                transition={{ duration: 0.4 }}
                className="flex w-full justify-center"
              >
                <PanelFrame>{BLOCKS[active].panel}</PanelFrame>
              </motion.div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

// Panel wrapper with the diamond corner ticks from the reference layout
function PanelFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex w-full max-w-xl items-center justify-center border bg-background px-8 py-14">
      {["left-4 top-4", "right-4 top-4", "left-4 bottom-4", "right-4 bottom-4"].map((pos) => (
        <span key={pos} aria-hidden className={cn("absolute size-1.5 rotate-45 bg-foreground/70", pos)} />
      ))}
      {children}
    </div>
  )
}
