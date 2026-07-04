"use client"

import { useEffect, useRef, useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { AnimatePresence, motion, useScroll, useMotionValueEvent } from "framer-motion"
import { ArrowUpRight, CheckCircle2, Loader2, Package2 } from "lucide-react"
import { BorderBeam } from "@/components/marketing/border-beam"
import { DarkButton } from "./frame"
import { HoverGrid } from "./hover-grid"

const WORDS = ["Returns", "Refunds", "Exchanges"]

// Toast sequence is scroll-linked (like the reference): the first toast shows
// at the top of the page and later ones replace it as you scroll the hero.
const TOASTS = [
  { text: "Welcome to your portal", spinner: true },
  { text: "Return approved", spinner: false },
  { text: "Refund issued", spinner: false },
]

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

function ScrollToast({ progress }: { progress: number }) {
  // <0.3 → first toast; 0.3–0.55 → second; >0.55 → third
  const idx = progress < 0.3 ? 0 : progress < 0.55 ? 1 : 2
  const toast = TOASTS[idx]

  return (
    <div className="pointer-events-none absolute inset-x-0 -bottom-5 z-20 flex justify-center">
      <AnimatePresence mode="wait">
        <motion.div
          key={toast.text}
          initial={{ opacity: 0, y: 14, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -10, scale: 0.96 }}
          transition={{ duration: 0.35, ease: "easeOut" }}
          className="flex items-center gap-3 rounded-full bg-zinc-900 py-2.5 pl-3 pr-4 text-sm text-white shadow-xl"
        >
          <span className="flex size-6 items-center justify-center rounded-full bg-zinc-700">
            <Package2 className="size-3.5" />
          </span>
          {toast.text}
          {toast.spinner
            ? <Loader2 className="size-4 animate-spin text-zinc-400" />
            : <CheckCircle2 className="size-4 text-emerald-400" />}
        </motion.div>
      </AnimatePresence>
    </div>
  )
}

export function HeroTwo() {
  const sectionRef = useRef<HTMLElement>(null)
  const [progress, setProgress] = useState(0)
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start start", "end start"],
  })
  useMotionValueEvent(scrollYProgress, "change", (v) => setProgress(v))

  return (
    <section ref={sectionRef} id="home" className="relative">
      {/* Interactive cell grid backdrop (lights up under the cursor) */}
      <HoverGrid />

      <div className="pointer-events-none relative z-10 flex flex-col items-center pt-24 text-center">
        {/* Intro text stays padded/centered — only the screenshot below goes edge-to-edge */}
        <div className="flex flex-col items-center px-4 sm:px-6">
          <motion.span
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="rounded-full border bg-background px-3.5 py-1 text-xs text-muted-foreground shadow-sm"
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

        {/* Portal screenshot — kept off the frame rails, same "snake border" ring +
            BorderBeam treatment as the hero on /marketing */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, delay: 0.25 }}
          className="pointer-events-auto relative z-10 mt-16 w-full max-w-5xl px-4 pb-16 sm:px-6"
        >
          <div className="relative rounded-xl p-2 ring-1 ring-inset ring-foreground/20 lg:rounded-2xl">
            <BorderBeam size={250} duration={12} delay={9} />
            <Image
              src="/assets/dashboard.png"
              alt="Reflow returns portal"
              width={2000}
              height={900}
              quality={100}
              priority
              className="rounded-md bg-background lg:rounded-xl"
            />
            <ScrollToast progress={progress} />
          </div>
        </motion.div>
      </div>
    </section>
  )
}
