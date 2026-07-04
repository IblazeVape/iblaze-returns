"use client"

import { useState } from "react"
import { Minus, Plus } from "lucide-react"
import { Accent, Section, SectionHeading } from "./frame"

const FAQS = [
  {
    q: "Does Reflow work with my Shopify store?",
    a: "Yes. Reflow installs directly on your Shopify store and syncs orders automatically. Most merchants are live in under ten minutes with no developer needed.",
  },
  {
    q: "Can I match the portal to my brand?",
    a: "Completely. Add your logo, brand colors, and custom domain so the return experience feels like a native part of your store.",
  },
  {
    q: "How do refunds get processed?",
    a: "Approved refunds are pushed back to the original Shopify payment. You can also offer instant store credit or an exchange to keep the revenue.",
  },
  {
    q: "Do you charge per return?",
    a: "No. Every plan is a flat monthly price with no per-return fees. The Starter plan is free for up to 20 returns a month.",
  },
  {
    q: "What about return shipping labels?",
    a: "Reflow generates carrier return labels the moment a request is approved and emails them to your customer automatically.",
  },
]

function Item({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="border-b border-zinc-200">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-4 py-5 text-left"
      >
        <span className="text-base font-medium text-zinc-900">{q}</span>
        {open ? (
          <Minus className="size-4 shrink-0 text-zinc-500" />
        ) : (
          <Plus className="size-4 shrink-0 text-zinc-500" />
        )}
      </button>
      {open && <p className="pb-5 pr-8 text-sm leading-relaxed text-zinc-500">{a}</p>}
    </div>
  )
}

export function FaqThree() {
  return (
    <Section id="faq">
      <SectionHeading
        eyebrow="Good to know"
        title={
          <>
            Questions, <Accent>Answered</Accent>
          </>
        }
      />
      <div className="mx-auto mt-12 max-w-2xl">
        {FAQS.map((f) => (
          <Item key={f.q} {...f} />
        ))}
      </div>
    </Section>
  )
}
