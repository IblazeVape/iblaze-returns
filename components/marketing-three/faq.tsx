"use client"

import { useState } from "react"
import { Minus, Plus } from "lucide-react"
import { Accent, Container, SectionHeading } from "./frame"

export interface FaqEntry {
  q: string
  a: string
}

const DEFAULT_FAQS: FaqEntry[] = [
  {
    q: "Does Reflow work with my Shopify store?",
    a: "Yes. Reflow installs directly on your Shopify store and syncs orders automatically. Most merchants are live in under ten minutes with no developer needed.",
  },
  {
    q: "Does Reflow decide which returns are approved?",
    a: "No. Shopify still approves or declines every return. Reflow simply gives your customers a branded, self-serve place to start one and enforces the rules you set.",
  },
  {
    q: "Can I set my own return window?",
    a: "Absolutely. Pick any number of days from 1 to 90 (or more) to match your own returns policy — Reflow applies it automatically to every request.",
  },
  {
    q: "Can I match the portal to my brand?",
    a: "Completely. Your colours carry through to the customer avatar and every accent, you can recolour the Submit, Accept and Review buttons, edit the policy text, and customise the sidebar links.",
  },
  {
    q: "How do refunds get processed?",
    a: "Approved refunds are pushed back to the original Shopify payment. You can also offer instant store credit or an exchange to keep the revenue.",
  },
  {
    q: "Do you charge per return?",
    a: "No. Every plan is a flat monthly price with no per-return fees. The Starter plan is free for up to 20 returns a month.",
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
        <span className="text-[15px] font-medium text-zinc-900">{q}</span>
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

export interface FaqThreeProps {
  eyebrow?: string
  title?: string
  accent?: string
  faqs?: FaqEntry[]
}

export function FaqThree({
  eyebrow = "Good to know",
  title = "Any",
  accent = "Questions?",
  faqs = DEFAULT_FAQS,
}: FaqThreeProps) {
  return (
    <section id="faq" className="border-t border-zinc-200 py-20 md:py-28">
      <Container>
        <SectionHeading
          eyebrow={eyebrow}
          title={
            <>
              {title} {accent && <Accent>{accent}</Accent>}
            </>
          }
        />
        <div className="mx-auto mt-12 max-w-2xl">
          {faqs.map((f, i) => (
            <Item key={f.q + i} {...f} />
          ))}
        </div>
      </Container>
    </section>
  )
}
