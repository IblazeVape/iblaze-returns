"use client"

import { motion } from "framer-motion"
import { BellRing, PackageCheck, RotateCcw, UserRound, Users } from "lucide-react"
import { Slider } from "@/components/ui/slider"
import { SectionHeading } from "./frame"

const fadeUp = {
  initial: { opacity: 0, y: 24 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-80px" },
  transition: { duration: 0.45 },
}

function StatChip({ icon: Icon, value, label }: { icon: React.ElementType; value: string; label: string }) {
  return (
    <div className="flex flex-col items-start gap-2 rounded-xl border bg-background p-4 shadow-sm">
      <span className="flex size-9 items-center justify-center rounded-full border bg-muted/50">
        <Icon className="size-4" />
      </span>
      <p className="text-xl font-bold tabular-nums">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  )
}

export function FeaturesTwo() {
  return (
    <section id="features" className="scroll-mt-16 py-20">
      <SectionHeading
        eyebrow="Features"
        title="Powerful Features, Simple to Use"
        subtitle="Everything you need to manage returns, track refunds, and stay focused - without the clutter."
      />

      {/* Widget row */}
      <div className="mx-auto mt-14 grid max-w-6xl grid-cols-1 gap-5 px-4 sm:px-6 md:grid-cols-3">
        <motion.div {...fadeUp} className="rounded-2xl border bg-muted/30 p-6">
          <div className="rounded-xl border bg-background p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-sm font-medium">
                <RotateCcw className="size-4" /> Total returns
              </span>
              <span className="rounded-full border px-2.5 py-0.5 text-xs text-muted-foreground">Details</span>
            </div>
            <div className="mt-3 flex items-center gap-2">
              <p className="text-3xl font-bold tabular-nums">1.4K</p>
              <span className="rounded-md bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">-6%</span>
            </div>
          </div>
          <h3 className="mt-5 text-lg font-semibold">Returns at a glance</h3>
          <p className="mt-1.5 text-sm text-muted-foreground">
            See volumes, reasons and refund value across every store the moment you log in.
          </p>
        </motion.div>

        <motion.div {...fadeUp} transition={{ ...fadeUp.transition, delay: 0.08 }} className="rounded-2xl border bg-muted/30 p-6">
          <div className="rounded-xl border bg-background p-4 shadow-sm">
            <div className="flex items-center justify-between text-sm font-medium">
              Set return window
              <span className="rounded-full bg-zinc-900 px-2 py-0.5 text-xs text-white">30 days</span>
            </div>
            <Slider defaultValue={[30]} max={90} step={5} className="mt-4" />
            <div className="mt-2 flex justify-between text-[10px] text-muted-foreground tabular-nums">
              <span>7d</span><span>30d</span><span>60d</span><span>90d</span>
            </div>
          </div>
          <h3 className="mt-5 text-lg font-semibold">Goals &amp; rules</h3>
          <p className="mt-1.5 text-sm text-muted-foreground">
            Your policies, enforced automatically - windows, exclusions and reasons per product.
          </p>
        </motion.div>

        <motion.div {...fadeUp} transition={{ ...fadeUp.transition, delay: 0.16 }} className="rounded-2xl border bg-muted/30 p-6">
          <div className="grid grid-cols-3 gap-2">
            <StatChip icon={Users} value="2,062" label="Portal visits" />
            <StatChip icon={UserRound} value="139" label="New requests" />
            <StatChip icon={PackageCheck} value="33" label="Approved today" />
          </div>
          <h3 className="mt-5 text-lg font-semibold">Live activity</h3>
          <p className="mt-1.5 text-sm text-muted-foreground">
            Requests, approvals and refunds tick along in real time - nothing slips through.
          </p>
        </motion.div>
      </div>

      {/* Titled feature cards */}
      <div className="mx-auto mt-5 grid max-w-6xl grid-cols-1 gap-5 px-4 sm:px-6 md:grid-cols-2">
        <motion.div {...fadeUp} className="rounded-2xl border bg-muted/30 p-6">
          <div className="space-y-2">
            {[
              { name: "Jack Alfredo", amount: "£316.00", status: "Refunded" },
              { name: "Maria Gonzalez", amount: "£253.40", status: "Pending" },
              { name: "John Doe", amount: "£952.00", status: "Refunded" },
            ].map((row) => (
              <div key={row.name} className="flex items-center justify-between rounded-lg border bg-background px-4 py-2.5 text-sm shadow-sm">
                <span className="flex items-center gap-2.5">
                  <span className="flex size-7 items-center justify-center rounded-full bg-muted text-[10px] font-semibold">
                    {row.name.split(" ").map((n) => n[0]).join("")}
                  </span>
                  {row.name}
                </span>
                <span className="tabular-nums text-muted-foreground">{row.amount}</span>
                <span className="rounded-full border px-2 py-0.5 text-[10px]">{row.status}</span>
              </div>
            ))}
          </div>
          <h3 className="mt-5 text-lg font-semibold">Customer refunds</h3>
          <p className="mt-1.5 text-sm text-muted-foreground">
            Track who was refunded, how much, and what&apos;s still pending - one clear ledger for
            every store.
          </p>
        </motion.div>

        <motion.div {...fadeUp} transition={{ ...fadeUp.transition, delay: 0.08 }} className="rounded-2xl border bg-muted/30 p-6">
          <div className="space-y-2">
            {["Return #1042 approved", "Label emailed to customer", "Parcel scanned at depot"].map((note, i) => (
              <div key={note} className="flex items-center gap-3 rounded-lg border bg-background px-4 py-2.5 text-sm shadow-sm" style={{ opacity: 1 - i * 0.18 }}>
                <span className="flex size-7 items-center justify-center rounded-full bg-zinc-900 text-white">
                  <BellRing className="size-3.5" />
                </span>
                {note}
                <span className="ml-auto text-[10px] text-muted-foreground tabular-nums">{i + 1}m ago</span>
              </div>
            ))}
          </div>
          <h3 className="mt-5 text-lg font-semibold">Regular updates</h3>
          <p className="mt-1.5 text-sm text-muted-foreground">
            Real-time alerts for requests, approvals and refunds - so nothing slips through the
            cracks.
          </p>
        </motion.div>
      </div>
    </section>
  )
}
