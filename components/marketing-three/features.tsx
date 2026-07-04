import {
  Boxes,
  CreditCard,
  LayoutDashboard,
  Palette,
  ShieldCheck,
  Truck,
} from "lucide-react"
import { Accent, Section, SectionHeading } from "./frame"

const FEATURES = [
  {
    icon: Palette,
    title: "Branded return portal",
    body: "Your logo, colors, and domain. Customers start a return without ever emailing support — and it looks like part of your store.",
    span: "md:col-span-2",
  },
  {
    icon: Truck,
    title: "Automatic labels",
    body: "Generate carrier return labels the moment a request is approved.",
    span: "",
  },
  {
    icon: CreditCard,
    title: "Refunds & store credit",
    body: "Push refunds back to Shopify or offer instant store credit to keep the sale.",
    span: "",
  },
  {
    icon: LayoutDashboard,
    title: "One clean dashboard",
    body: "Approve, reject, and track every request in one place. Filter by status, reason, or order.",
    span: "md:col-span-2",
  },
  {
    icon: ShieldCheck,
    title: "Policy rules engine",
    body: "Set eligibility windows, final-sale items, and per-product rules — enforced automatically.",
    span: "md:col-span-2",
  },
  {
    icon: Boxes,
    title: "Exchanges built in",
    body: "Let customers swap size or color in a click, with new orders created for you.",
    span: "",
  },
]

export function FeaturesThree() {
  return (
    <Section id="features">
      <SectionHeading
        eyebrow="Everything you need"
        title={
          <>
            All Your Returns, <Accent>One Place</Accent>
          </>
        }
        subtitle="Reflow replaces the email threads and spreadsheets with a single self-serve system your customers and your team both actually enjoy using."
      />

      <div className="mx-auto mt-14 grid max-w-5xl grid-cols-1 gap-4 md:grid-cols-3">
        {FEATURES.map((f) => (
          <div
            key={f.title}
            className={
              "group rounded-2xl border border-zinc-200 bg-white p-6 transition-colors hover:border-zinc-300 " +
              f.span
            }
          >
            <span className="flex size-10 items-center justify-center rounded-xl bg-zinc-900 text-white">
              <f.icon className="size-5" />
            </span>
            <h3 className="mt-5 text-lg font-semibold tracking-tight text-zinc-900">{f.title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-zinc-500">{f.body}</p>
          </div>
        ))}
      </div>
    </Section>
  )
}
