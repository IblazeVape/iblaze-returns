"use client"

import { useRef, useState, useEffect } from "react"
import Link from "next/link"
import { motion } from "framer-motion"
import { ArrowUpRight, ChartLine, Layers, MailCheck, PieChart } from "lucide-react"
import { cn } from "@/lib/utils"
import { DarkButton, SectionHeading } from "./frame"

const BLOCKS = [
  {
    icon: PieChart,
    title: "Unified Returns Overview",
    body: "Monitor requests, approvals and refunds in real time so you stay on top of every order. The latest picture is always one glance away.",
    panel: (
      <div className="w-full max-w-sm rounded-xl border bg-background p-5 shadow-sm">
        <p className="text-sm font-semibold">Returns metrics</p>
        <div className="mt-3 grid grid-cols-2 gap-2">
          {[["Open requests", "48"], ["Approved", "312"], ["Refunded", "£11,548"], ["Avg. turnaround", "1.8d"]].map(([k, v]) => (
            <div key={k} className="rounded-lg border px-3 py-2">
              <p className="text-[10px] text-muted-foreground">{k}</p>
              <p className="text-sm font-bold tabular-nums">{v}</p>
            </div>
          ))}
        </div>
        <div className="mt-3 flex items-center justify-between rounded-lg border px-3 py-2">
          <span className="text-xs text-muted-foreground">Plan completed</span>
          <span className="text-sm font-bold tabular-nums">56%</span>
        </div>
      </div>
    ),
  },
  {
    icon: MailCheck,
    title: "Automated Follow-Ups",
    body: "Approval emails, shipping labels and refund confirmations send themselves, so your team can focus on customers instead of admin.",
    panel: (
      <div className="w-full max-w-sm space-y-2">
        {["Return approved — email sent", "Label generated — RM7742…", "Refund confirmation queued"].map((s, i) => (
          <div key={s} className="flex items-center gap-3 rounded-lg border bg-background px-4 py-3 text-sm shadow-sm">
            <span className="flex size-6 items-center justify-center rounded-full bg-zinc-900 text-[10px] text-white tabular-nums">{i + 1}</span>
            {s}
          </div>
        ))}
      </div>
    ),
  },
  {
    icon: Layers,
    title: "Clean & Simple Workflow",
    body: "Requests move through clear stages - requested, approved, in transit, refunded - so you always know exactly where things stand.",
    panel: (
      <div className="w-full max-w-sm rounded-xl border bg-background p-5 shadow-sm">
        {["Requested", "Approved", "In transit", "Refunded"].map((stage, i) => (
          <div key={stage} className="flex items-center gap-3 py-2">
            <span className={cn("size-2.5 rounded-full", i < 2 ? "bg-zinc-900" : "bg-muted-foreground/30")} />
            <span className={cn("text-sm", i < 2 ? "font-medium" : "text-muted-foreground")}>{stage}</span>
            {i === 1 && <span className="ml-auto rounded-full bg-zinc-900 px-2 py-0.5 text-[10px] text-white">current</span>}
          </div>
        ))}
      </div>
    ),
  },
  {
    icon: ChartLine,
    title: "Instant Return Insights",
    body: "Understand why items come back with clear reports on reasons, products and rates - and make confident decisions about your catalogue.",
    panel: (
      <div className="w-full max-w-sm rounded-xl border bg-background p-5 shadow-sm">
        <p className="text-sm font-semibold">Top return reasons</p>
        {[["Wrong size", 62], ["Changed mind", 38], ["Faulty", 21]].map(([k, v]) => (
          <div key={k as string} className="mt-3">
            <div className="flex justify-between text-xs">
              <span>{k}</span>
              <span className="text-muted-foreground tabular-nums">{v}%</span>
            </div>
            <div className="mt-1 h-1.5 rounded-full bg-muted">
              <div className="h-full rounded-full bg-zinc-900" style={{ width: `${v}%` }} />
            </div>
          </div>
        ))}
      </div>
    ),
  },
]

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
    <section id="benefits" className="scroll-mt-16 border-t pt-20">
      <SectionHeading
        eyebrow="Benefits"
        title="How Reflow Helps You"
        subtitle="It's built to simplify your returns process and keep everything easy to manage."
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
      <div className="mt-16 border-y">
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
