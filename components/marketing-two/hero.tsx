"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import { AnimatePresence, motion } from "framer-motion"
import { ArrowUpRight, MousePointerClick } from "lucide-react"
import { BorderBeam } from "@/components/marketing/border-beam"
import { DarkButton } from "./frame"
import { HoverGrid } from "./hover-grid"

const WORDS = ["Returns", "Refunds", "Exchanges"]

function RotatingWord() {
  const [i, setI] = useState(0)
  useEffect(() => {
    const t = setInterval(() => setI((v) => (v + 1) % WORDS.length), 2600)
    return () => clearInterval(t)
  }, [])

  return (
    <span className="relative inline-flex w-fit overflow-hidden rounded-md border bg-background/5 px-3 py-0.5 align-baseline backdrop-blur-md">
      <AnimatePresence mode="wait">
        <motion.span
          key={WORDS[i]}
          initial={{ opacity: 0, y: 12, filter: "blur(8px)" }}
          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          exit={{ opacity: 0, y: -12, filter: "blur(8px)" }}
          transition={{ duration: 0.4, ease: "easeInOut" }}
          className="inline-block whitespace-nowrap"
        >
          {WORDS[i]}
        </motion.span>
      </AnimatePresence>
    </span>
  )
}

// The hero embeds the actual live portal (running in demo mode) via iframe,
// rather than a static screenshot. An iframe is used deliberately: the real
// DashboardClient's sidebar layout assumes full-viewport height through
// global [data-slot="sidebar-inset"] CSS, which would fight the page's own
// layout if the component were rendered inline here. The iframe gives it a
// fully isolated document/scroll context, and it's genuinely the same app —
// clickable, with its own real load-in animation replaying each time the
// hero scrolls into view and the frame (re)mounts.
function LiveDemoFrame() {
  const wrapRef = useRef<HTMLDivElement>(null)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    const el = wrapRef.current
    if (!el) return
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setLoaded(true); obs.disconnect() } },
      { rootMargin: "200px" },
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [])

  return (
    <div ref={wrapRef} className="relative h-[520px] overflow-hidden rounded-md bg-background sm:h-[600px] lg:h-[680px] lg:rounded-xl">
      {loaded
        ? (
            <iframe
              src="/demo"
              title="Reflow returns portal — live demo"
              loading="lazy"
              className="size-full border-0"
            />
          )
        : <div className="size-full animate-pulse bg-muted/40" />}
      <div className="pointer-events-none absolute left-3 top-3 z-10 flex items-center gap-1.5 rounded-full bg-zinc-900/90 px-3 py-1.5 text-xs font-medium text-white shadow-lg backdrop-blur-xs">
        <MousePointerClick className="size-3.5" /> Live demo - try it
      </div>
    </div>
  )
}

export function HeroTwo() {
  return (
    <section id="home" className="relative">
      {/* Interactive cell grid backdrop (lights up under the cursor) */}
      <HoverGrid />

      <div className="pointer-events-none relative z-10 flex flex-col items-center pt-24 text-center">
        {/* Intro text stays padded/centered — only the frame below goes edge-to-edge */}
        <div className="flex flex-col items-center px-4 sm:px-6">
          <motion.span
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="rounded-full border bg-background px-3.5 py-1 text-xs text-muted-foreground shadow-xs"
          >
            Trusted by 5,000+ growing Shopify stores
          </motion.span>

          <motion.h1
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: 0.05 }}
            className="z-10 mt-6 text-center text-3xl font-semibold md:text-4xl lg:text-5xl lg:leading-[1.29]"
          >
            Supercharge Your Store&apos;s <RotatingWord />
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: 0.12 }}
            className="mt-5 max-w-xl text-base text-muted-foreground md:text-lg"
          >
            Handle every return in one clean branded portal - no code, no setup,
            just a self-serve experience your customers actually enjoy.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: 0.18 }}
            className="pointer-events-auto mt-8"
          >
            <Link href="/demo">
              <DarkButton>
                Start returning now <ArrowUpRight className="size-4" />
              </DarkButton>
            </Link>
          </motion.div>
        </div>

        {/* Live portal — kept off the frame rails, same "snake border" ring +
            BorderBeam treatment as the hero on /marketing */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, delay: 0.25 }}
          className="pointer-events-auto relative z-10 mt-16 w-full max-w-5xl px-4 pb-16 sm:px-6"
        >
          <div className="relative rounded-xl p-2 ring-1 ring-inset ring-foreground/20 lg:rounded-2xl">
            <BorderBeam size={250} duration={12} delay={9} />
            <LiveDemoFrame />
          </div>
        </motion.div>
      </div>
    </section>
  )
}
