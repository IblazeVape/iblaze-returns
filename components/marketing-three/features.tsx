import { Check, Palette, SlidersHorizontal } from "lucide-react"
import { Accent, Container, SectionHeading } from "./frame"

export function FeaturesThree() {
  return (
    <section id="features" className="border-t border-zinc-200 bg-zinc-50/50 py-20 md:py-28">
      <Container>
        <SectionHeading
          eyebrow="Make it yours"
          title={
            <>
              Your Portal, <Accent>Your Rules</Accent>
            </>
          }
          subtitle="Shopify still approves or declines every return — Reflow just gives your customers a branded, self-serve place to start one. Everything else bends to your policy."
        />

        <div className="mx-auto mt-14 grid max-w-5xl grid-cols-1 gap-4 md:grid-cols-6">
          {/* Return window */}
          <FeatureCard
            className="md:col-span-3"
            title="Set your return window"
            body="1 day or 90 — pick the exact number that matches your own returns policy."
          >
            <ReturnWindowViz />
          </FeatureCard>

          {/* Match your brand */}
          <FeatureCard
            className="md:col-span-3"
            title="Match your brand"
            body="Your colours carry through to the customer avatar and every accent in the portal."
          >
            <BrandColourViz />
          </FeatureCard>

          {/* Buttons */}
          <FeatureCard
            className="md:col-span-2"
            title="Buttons that match your brand"
            body="Recolour the Submit, Accept and Review buttons to fit your storefront."
          >
            <ButtonsViz />
          </FeatureCard>

          {/* Policy words */}
          <FeatureCard
            className="md:col-span-2"
            title="Your policy, your words"
            body="Turn the returns policy checkbox on or off, and edit exactly what it says."
          >
            <PolicyViz />
          </FeatureCard>

          {/* Sidebar */}
          <FeatureCard
            className="md:col-span-2"
            title="Your sidebar, your way"
            body="Show, add or hide menu items and point them at any link you want."
          >
            <SidebarViz />
          </FeatureCard>
        </div>
      </Container>
    </section>
  )
}

function FeatureCard({
  title,
  body,
  children,
  className = "",
}: {
  title: string
  body: string
  children?: React.ReactNode
  className?: string
}) {
  return (
    <div
      className={
        "flex flex-col overflow-hidden rounded-xl border border-zinc-200 bg-white transition-colors hover:border-zinc-300 " +
        className
      }
    >
      {children && (
        <div className="flex min-h-[150px] items-center justify-center border-b border-zinc-100 bg-zinc-50/60 p-6">
          {children}
        </div>
      )}
      <div className="p-6">
        <h3 className="text-base font-semibold tracking-tight text-zinc-900">{title}</h3>
        <p className="mt-2 text-sm leading-relaxed text-zinc-500">{body}</p>
      </div>
    </div>
  )
}

/* --- lightweight mock visuals --- */

function ReturnWindowViz() {
  return (
    <div className="w-full max-w-[240px]">
      <div className="flex items-center justify-between text-xs text-zinc-400">
        <span>Return window</span>
        <span className="font-semibold text-zinc-900">30 days</span>
      </div>
      <div className="mt-2 h-2 rounded-full bg-zinc-200">
        <div className="h-2 w-1/3 rounded-full bg-zinc-900" />
      </div>
      <div className="mt-1.5 flex justify-between text-[10px] text-zinc-400">
        <span>1</span>
        <span>90</span>
      </div>
    </div>
  )
}

function BrandColourViz() {
  const swatches = ["#0ea5e9", "#8b5cf6", "#10b981", "#f43f5e", "#111827"]
  return (
    <div className="flex flex-col items-center gap-3">
      <span
        className="flex size-12 items-center justify-center rounded-full text-sm font-semibold text-white"
        style={{ background: "#8b5cf6" }}
      >
        AB
      </span>
      <div className="flex gap-2">
        {swatches.map((c) => (
          <span
            key={c}
            className="size-5 rounded-full ring-2 ring-white"
            style={{ background: c, outline: c === "#8b5cf6" ? "2px solid #111827" : "none", outlineOffset: "2px" }}
          />
        ))}
      </div>
    </div>
  )
}

function ButtonsViz() {
  return (
    <div className="flex flex-col gap-2">
      <span className="rounded-md bg-zinc-900 px-4 py-1.5 text-center text-xs font-medium text-white">
        Submit
      </span>
      <span className="rounded-md bg-emerald-600 px-4 py-1.5 text-center text-xs font-medium text-white">
        Accept
      </span>
      <span className="rounded-md border border-zinc-300 px-4 py-1.5 text-center text-xs font-medium text-zinc-700">
        Review
      </span>
    </div>
  )
}

function PolicyViz() {
  return (
    <div className="w-full max-w-[200px] rounded-lg border border-zinc-200 bg-white p-3">
      <div className="flex items-start gap-2">
        <span className="mt-0.5 flex size-4 items-center justify-center rounded bg-zinc-900 text-white">
          <Check className="size-3" />
        </span>
        <p className="text-[11px] leading-snug text-zinc-500">
          I agree to the <span className="text-zinc-900 underline">returns policy</span>
        </p>
      </div>
      <div className="mt-2 flex items-center gap-1.5 text-[10px] text-zinc-400">
        <SlidersHorizontal className="size-3" /> Editable
      </div>
    </div>
  )
}

function SidebarViz() {
  return (
    <div className="w-full max-w-[180px] space-y-1.5">
      {["Returns", "Orders", "Help center", "Contact us"].map((item, i) => (
        <div
          key={item}
          className={
            "flex items-center gap-2 rounded-md px-2.5 py-1.5 text-[11px] " +
            (i === 0 ? "bg-zinc-900 text-white" : "text-zinc-500")
          }
        >
          <Palette className="size-3 opacity-60" /> {item}
        </div>
      ))}
    </div>
  )
}
