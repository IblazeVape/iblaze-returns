"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { Check, Layout, MessageSquareText, Palette } from "lucide-react"
import { Slider } from "@/components/ui/slider"
import { Switch } from "@/components/ui/switch"
import { SectionHeading } from "./frame"

const fadeUp = {
  initial: { opacity: 0, y: 24 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-80px" },
  transition: { duration: 0.45 },
}

const SIDEBAR_ITEMS = [
  { label: "News & Updates", on: true },
  { label: "Returns Policy", on: true },
  { label: "Speak to Support", on: true },
  { label: "Back to Store", on: false },
]

function ReturnWindowWidget() {
  const [days, setDays] = useState(30)
  return (
    <div className="rounded-lg border bg-background p-4 shadow-xs">
      <div className="flex items-center justify-between text-sm font-medium">
        Return window
        <span className="rounded-full bg-zinc-900 px-2 py-0.5 text-xs text-white tabular-nums">{days} days</span>
      </div>
      <Slider value={[days]} onValueChange={([v]) => setDays(v)} max={90} min={1} step={1} className="mt-4" />
      <div className="mt-2 flex justify-between text-[10px] text-muted-foreground tabular-nums">
        <span>1d</span><span>30d</span><span>60d</span><span>90d</span>
      </div>
    </div>
  )
}

function SidebarToggleWidget() {
  const [items, setItems] = useState(SIDEBAR_ITEMS)
  return (
    <div className="space-y-1.5">
      {items.map((item, i) => (
        <div key={item.label} className="flex items-center justify-between rounded-lg border bg-background px-3 py-2 text-sm shadow-xs">
          <span className={item.on ? "" : "text-muted-foreground line-through"}>{item.label}</span>
          <Switch
            checked={item.on}
            onCheckedChange={(v) => setItems((cur) => cur.map((it, j) => (j === i ? { ...it, on: v } : it)))}
          />
        </div>
      ))}
    </div>
  )
}

function BrandWidget() {
  const colors = ["#18181b", "#7c3aed", "#e11d48", "#059669", "#2563eb"]
  const [active, setActive] = useState(0)
  return (
    <div className="rounded-lg border bg-background p-4 shadow-xs">
      <div className="flex items-center gap-3">
        <span
          className="flex size-9 items-center justify-center rounded-full text-xs font-semibold text-white"
          style={{ backgroundColor: colors[active] }}
        >
          D
        </span>
        <div className="text-sm">
          <p className="font-medium">Avatar colour</p>
          <p className="text-xs text-muted-foreground">Matches your storefront</p>
        </div>
      </div>
      <div className="mt-3 flex items-center gap-2">
        {colors.map((c, i) => (
          <button
            key={c}
            aria-label={`Use ${c}`}
            onClick={() => setActive(i)}
            className="size-6 rounded-full ring-2 ring-offset-2 ring-offset-background transition-transform hover:scale-110"
            style={{ backgroundColor: c, ["--tw-ring-color" as string]: i === active ? c : "transparent" }}
          />
        ))}
      </div>
    </div>
  )
}

function PolicyToggleWidget() {
  const [enabled, setEnabled] = useState(true)
  const [text, setText] = useState("I accept the returns policy")
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between rounded-lg border bg-background px-4 py-3 text-sm shadow-xs">
        <span>Require policy checkbox</span>
        <Switch checked={enabled} onCheckedChange={setEnabled} />
      </div>
      <div className={enabled ? "rounded-lg border bg-background px-4 py-3 text-sm shadow-xs" : "rounded-lg border bg-background px-4 py-3 text-sm text-muted-foreground opacity-50 shadow-xs"}>
        <label className="flex items-center gap-2">
          <input type="checkbox" defaultChecked disabled={!enabled} className="size-4 rounded border-muted-foreground/40" />
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            disabled={!enabled}
            className="w-full bg-transparent outline-hidden disabled:cursor-not-allowed"
          />
        </label>
      </div>
    </div>
  )
}

function ButtonColorWidget() {
  const colors = ["#18181b", "#7c3aed", "#e11d48", "#059669"]
  const [active, setActive] = useState(0)
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2 rounded-lg border bg-background p-4 shadow-xs">
        {["Submit", "Accept", "Review"].map((label) => (
          <span
            key={label}
            className="rounded-lg px-4 py-2 text-sm font-medium text-white shadow-xs"
            style={{ backgroundColor: colors[active] }}
          >
            {label}
          </span>
        ))}
      </div>
      <div className="flex items-center gap-2">
        {colors.map((c, i) => (
          <button
            key={c}
            aria-label={`Use ${c}`}
            onClick={() => setActive(i)}
            className="size-6 rounded-full ring-2 ring-offset-2 ring-offset-background transition-transform hover:scale-110"
            style={{ backgroundColor: c, ["--tw-ring-color" as string]: i === active ? c : "transparent" }}
          />
        ))}
      </div>
    </div>
  )
}

export function FeaturesTwo() {
  return (
    <section id="features" className="scroll-mt-16 pt-14">
      <SectionHeading
        eyebrow="Features"
        title="Your Portal, Your Rules"
        subtitle="Shopify still approves or declines every return - Reflow just gives your customers a branded, self-serve place to start one."
      />

      {/* Table-style grid: cells touch edge-to-edge, separated only by shared
          borders (no gaps, no individually rounded cards) */}
      <div className="mt-10 border-t">
        <div className="grid grid-cols-1 divide-y border-x md:grid-cols-3 md:divide-x md:divide-y-0">
          <motion.div {...fadeUp} className="bg-muted/30 p-6">
            <ReturnWindowWidget />
            <h3 className="mt-5 text-lg font-semibold">Set your return window</h3>
            <p className="mt-1.5 text-sm text-muted-foreground">
              1 day or 90 - pick the exact number that matches your own returns policy.
            </p>
          </motion.div>

          <motion.div {...fadeUp} transition={{ ...fadeUp.transition, delay: 0.08 }} className="bg-muted/30 p-6">
            <SidebarToggleWidget />
            <h3 className="mt-5 text-lg font-semibold">Your sidebar, your way</h3>
            <p className="mt-1.5 text-sm text-muted-foreground">
              Show or hide menu items and point them at any link you want.
            </p>
          </motion.div>

          <motion.div {...fadeUp} transition={{ ...fadeUp.transition, delay: 0.16 }} className="bg-muted/30 p-6">
            <BrandWidget />
            <h3 className="mt-5 text-lg font-semibold">Match your brand</h3>
            <p className="mt-1.5 text-sm text-muted-foreground">
              Your colours carry through to the customer avatar and every accent in the portal.
            </p>
          </motion.div>
        </div>

        <div className="grid grid-cols-1 divide-y border-x border-t md:grid-cols-2 md:divide-x md:divide-y-0">
          <motion.div {...fadeUp} className="bg-muted/30 p-6">
            <PolicyToggleWidget />
            <h3 className="mt-5 flex items-center gap-2 text-lg font-semibold">
              <MessageSquareText className="size-4 shrink-0" /> Your policy, your words
            </h3>
            <p className="mt-1.5 text-sm text-muted-foreground">
              Turn the returns policy checkbox on or off, and edit exactly what it says.
            </p>
          </motion.div>

          <motion.div {...fadeUp} transition={{ ...fadeUp.transition, delay: 0.08 }} className="bg-muted/30 p-6">
            <ButtonColorWidget />
            <h3 className="mt-5 flex items-center gap-2 text-lg font-semibold">
              <Palette className="size-4 shrink-0" /> Buttons that match your brand
            </h3>
            <p className="mt-1.5 text-sm text-muted-foreground">
              Recolour the Submit, Accept and Review buttons to fit your storefront.
            </p>
          </motion.div>
        </div>
      </div>
    </section>
  )
}
