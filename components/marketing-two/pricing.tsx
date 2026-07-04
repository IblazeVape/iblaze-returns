"use client"

import { useState } from "react"
import Link from "next/link"
import { Check, Circle, Flower2, Leaf, Sprout } from "lucide-react"
import { cn } from "@/lib/utils"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { DarkButton, SectionHeading } from "./frame"

const PLANS = [
  {
    icon: Sprout,
    name: "Essential Plan",
    blurb: "Perfect for solo founders and small stores",
    monthly: 29,
    cta: "Basic Access",
    trending: false,
    features: ["1 store", "Real-time return analytics", "Up to 1K returns tracked", "Basic refund insights", "Email support"],
    extras: [] as string[],
  },
  {
    icon: Flower2,
    name: "Advanced Plan",
    blurb: "Built for growing businesses.",
    monthly: 49,
    cta: "Premium Access",
    trending: true,
    features: ["Up to 5 stores", "Advanced returns & refund reports", "Up to 10K returns tracked", "Smart return insights"],
    extras: ["API & integrations", "Team collaboration tools", "Secure data infrastructure"],
  },
  {
    icon: Leaf,
    name: "Pro Plan",
    blurb: "Designed for scaling teams and brands.",
    monthly: 99,
    cta: "Elite Access",
    trending: false,
    features: ["Unlimited stores", "Advanced automation workflows", "Up to 50K returns tracked", "Predictive return insights", "Priority email & chat support"],
    extras: [] as string[],
  },
]

export function PricingTwo() {
  const [period, setPeriod] = useState<"monthly" | "yearly">("monthly")
  const price = (m: number) => (period === "monthly" ? m : Math.round(m * 12 * 0.8 / 12))

  return (
    <section id="pricing" className="scroll-mt-16 border-t pt-14">
      <SectionHeading
        eyebrow="Pricing"
        title="Pricing Details"
        subtitle={
          <>A comprehensive breakdown of our pricing plans to help you make the best choice.
            <br />Pay <span className="font-semibold text-red-500">20% off</span> on the yearly plan.</>
        }
      />

      <div className="mt-8 flex justify-center">
        <Tabs value={period} onValueChange={(v) => setPeriod(v as typeof period)}>
          <TabsList>
            <TabsTrigger value="monthly">Monthly</TabsTrigger>
            <TabsTrigger value="yearly">Yearly</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Table-style grid: plans touch edge-to-edge, separated by shared borders */}
      <div className="mt-10 border-t">
        <div className="grid grid-cols-1 items-stretch divide-y border-x md:grid-cols-3 md:divide-x md:divide-y-0">
          {PLANS.map((plan) => (
            <div
              key={plan.name}
              className={cn(plan.trending ? "bg-background" : "bg-muted/30")}
            >
              <div className="p-6">
                <div className="flex items-start justify-between">
                  <span className="flex size-11 items-center justify-center rounded-xl border bg-background shadow-sm">
                    <plan.icon className="size-5" />
                  </span>
                  {plan.trending && (
                    <span className="rounded-full bg-red-500 px-2.5 py-1 text-xs font-medium text-white">Trending</span>
                  )}
                </div>
                <h3 className="mt-4 text-xl font-bold">{plan.name}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{plan.blurb}</p>
                <p className="mt-4 text-4xl font-extrabold tabular-nums">
                  ${price(plan.monthly)}
                  <span className="text-sm font-normal text-muted-foreground"> /month</span>
                </p>
                <Link href="/demo" className="mt-5 block">
                  <DarkButton className="w-full">{plan.cta}</DarkButton>
                </Link>
              </div>
              <div className="border-t p-6">
                <ul className="space-y-3">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-center gap-2.5 text-sm">
                      <Check className="size-4 shrink-0 text-muted-foreground" /> {f}
                    </li>
                  ))}
                </ul>
              </div>
              {plan.extras.length > 0 && (
                <div className="border-t bg-muted/40 p-6">
                  <ul className="space-y-3">
                    {plan.extras.map((f) => (
                      <li key={f} className="flex items-center gap-2.5 text-sm">
                        <Circle className="size-2.5 shrink-0 fill-foreground text-foreground" /> {f}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
