"use client"

import { useEffect, useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { AnimatePresence, motion } from "framer-motion"
import { ArrowUpRight, CheckCircle2, Package2 } from "lucide-react"
import { DarkButton } from "./frame"

const WORDS = ["Returns", "Refunds", "Exchanges"]
const TOASTS = ["Welcome to your portal", "Return approved", "Refund issued"]

// Rotating word in a bordered pill, blurring between entries (Flow-style)
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

function CyclingToast() {
  const [i, setI] = useState(0)
  useEffect(() => {
    const t = setInterval(() => setI((v) => (v + 1) % TOASTS.length), 3200)
    return () => clearInterval(t)
  }, [])

  return (
    <div className="pointer-events-none absolute inset-x-0 -bottom-5 z-20 flex justify-center">
      <AnimatePresence mode="wait">
        <motion.div
          key={TOASTS[i]}
          initial={{ opacity: 0, y: 14, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -10, scale: 0.96 }}
          transition={{ duration: 0.35, ease: "easeOut" }}
          className="flex items-center gap-3 rounded-full bg-zinc-900 py-2.5 pl-3 pr-4 text-sm text-white shadow-xl"
        >
          <span className="flex size-6 items-center justify-center rounded-full bg-zinc-700">
            <Package2 className="size-3.5" />
          </span>
          {TOASTS[i]}
          <CheckCircle2 className="size-4 text-emerald-400" />
        </motion.div>
      </AnimatePresence>
    </div>
  )
}

export function HeroTwo() {
  return (
    <section id="home" className="relative overflow-hidden">
      {/* faint grid backdrop, faded at the edges */}
      <div
        aria-hidden
        className="absolute inset-0 bg-[linear-gradient(to_right,hsl(var(--border))_1px,transparent_1px),linear-gradient(to_bottom,hsl(var(--border))_1px,transparent_1px)] bg-[size:72px_72px] [mask-image:radial-gradient(ellipse_70%_60%_at_50%_30%,#000_40%,transparent_100%)] opacity-60"
      />

      <div className="relative flex flex-col items-center px-4 pt-24 text-center sm:px-6">
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
          className="mt-8"
        >
          <Link href="/demo">
            <DarkButton>
              Start returning now <ArrowUpRight className="size-4" />
            </DarkButton>
          </Link>
        </motion.div>

        {/* Portal screenshot in a framed card with a cycling status toast */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, delay: 0.25 }}
          className="relative z-10 mt-16 w-full max-w-5xl pb-16"
        >
          <div className="relative rounded-2xl border bg-muted/40 p-2 shadow-[0_24px_60px_-24px_rgba(0,0,0,0.25)]">
            <Image
              src="/assets/dashboard.png"
              alt="Reflow returns portal"
              width={2000}
              height={900}
              quality={100}
              priority
              className="rounded-xl border bg-background"
            />
            <CyclingToast />
          </div>
        </motion.div>
      </div>
    </section>
  )
}
