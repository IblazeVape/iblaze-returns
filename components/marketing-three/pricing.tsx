import { Check } from "lucide-react"
import { Accent, Button, Container, SectionHeading } from "./frame"

const PLANS = [
  {
    name: "Starter",
    price: "$0",
    cadence: "/mo",
    blurb: "For new stores testing the waters.",
    features: [
      "Up to 20 returns / month",
      "Branded return portal",
      "Refunds to Shopify",
      "Email notifications",
    ],
    cta: "Start free",
    featured: false,
  },
  {
    name: "Growth",
    price: "$29",
    cadence: "/mo",
    blurb: "For growing brands that want automation.",
    features: [
      "Unlimited returns",
      "Automatic return labels",
      "Store credit & exchanges",
      "Custom return window & policy",
      "Brand colours & buttons",
      "Priority support",
    ],
    cta: "Start free trial",
    featured: true,
  },
  {
    name: "Scale",
    price: "Custom",
    cadence: "",
    blurb: "For high-volume & multi-store merchants.",
    features: [
      "Everything in Growth",
      "Multiple storefronts",
      "Custom carrier integrations",
      "Dedicated success manager",
    ],
    cta: "Talk to us",
    featured: false,
  },
]

export function PricingThree() {
  return (
    <section id="pricing" className="border-t border-zinc-200 py-20 md:py-28">
      <Container>
        <SectionHeading
          eyebrow="Simple pricing"
          title={
            <>
              Priced to <Accent>Pay for Itself</Accent>
            </>
          }
          subtitle="Start free. Upgrade when returns start turning into retained revenue. No per-return fees, no surprises."
        />

        <div className="mx-auto mt-14 grid max-w-5xl grid-cols-1 items-start gap-5 md:grid-cols-3">
          {PLANS.map((p) => (
            <div
              key={p.name}
              className={
                "relative flex flex-col rounded-2xl border p-7 " +
                (p.featured
                  ? "border-zinc-900 bg-zinc-950 text-white shadow-xl"
                  : "border-zinc-200 bg-white text-zinc-900")
              }
            >
              {p.featured && (
                <span className="absolute -top-3 left-7 rounded-full bg-white px-3 py-1 text-xs font-medium text-zinc-900 ring-1 ring-zinc-200">
                  Most popular
                </span>
              )}
              <p className={"text-sm font-medium " + (p.featured ? "text-zinc-300" : "text-zinc-500")}>
                {p.name}
              </p>
              <div className="mt-3 flex items-end gap-1">
                <span className="text-4xl font-semibold tracking-tight">{p.price}</span>
                {p.cadence && <span className="pb-1 text-sm text-zinc-400">{p.cadence}</span>}
              </div>
              <p className={"mt-2 text-sm " + (p.featured ? "text-zinc-400" : "text-zinc-500")}>
                {p.blurb}
              </p>

              <ul className="mt-6 flex-1 space-y-3">
                {p.features.map((f) => (
                  <li key={f} className="flex items-start gap-2.5 text-sm">
                    <Check
                      className={
                        "mt-0.5 size-4 shrink-0 " + (p.featured ? "text-emerald-400" : "text-emerald-500")
                      }
                    />
                    <span className={p.featured ? "text-zinc-200" : "text-zinc-600"}>{f}</span>
                  </li>
                ))}
              </ul>

              <Button
                href="/portal"
                variant={p.featured ? "outline" : "primary"}
                className={
                  "mt-7 w-full " +
                  (p.featured ? "border-transparent bg-white text-zinc-900 hover:bg-zinc-100" : "")
                }
              >
                {p.cta}
              </Button>
            </div>
          ))}
        </div>

        <p className="mt-8 text-center text-sm text-zinc-400">
          All plans include a 14-day free trial. No credit card required.
        </p>
      </Container>
    </section>
  )
}
