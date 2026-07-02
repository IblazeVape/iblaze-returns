"use client"

import Image from "next/image"
import {
  Accordion, AccordionContent, AccordionItem, AccordionTrigger,
} from "@/components/ui/accordion"
import { SectionHeading } from "./frame"

const FAQS = [
  {
    q: "What is Reflow?",
    a: "Reflow is a returns platform for Shopify stores. It gives your customers a branded, self-serve returns portal on your own domain, and gives your team one dashboard to approve, track and refund every request.",
  },
  {
    q: "How does Reflow help my business?",
    a: "It removes the back-and-forth from returns: customers start their own requests, your rules approve the easy ones automatically, and refunds and updates flow back to Shopify in real time.",
  },
  {
    q: "Can I manage multiple stores at once?",
    a: "Yes. Connect any number of Shopify stores and manage every return from a single queue, with per-store branding and rules.",
  },
  {
    q: "Do I need technical knowledge to use it?",
    a: "No. Install from the Shopify App Store, point your domain, and set your policies from the admin panel. There's no code and nothing touches your theme.",
  },
  {
    q: "Is my data safe with Reflow?",
    a: "Your order data stays in your Shopify account. Reflow reads only what it needs to process returns, and every portal runs over HTTPS with signed sessions.",
  },
  {
    q: "Does Reflow offer a free trial?",
    a: "Yes - every plan starts with a 14-day free trial, and you can explore the live demo right now without creating an account.",
  },
]

export function FaqTwo() {
  return (
    <section id="faq" className="scroll-mt-16 border-t py-20">
      <SectionHeading
        eyebrow="FAQ"
        title="Frequently asked questions"
        subtitle="Here are some quick answers to help you understand how Reflow powers your returns."
      />

      <div className="mx-auto mt-14 grid max-w-6xl grid-cols-1 items-center gap-10 px-4 sm:px-6 lg:grid-cols-2">
        <Accordion type="single" collapsible defaultValue="item-0">
          {FAQS.map((item, i) => (
            <AccordionItem key={item.q} value={`item-${i}`}>
              <AccordionTrigger className="text-left text-base font-semibold">{item.q}</AccordionTrigger>
              <AccordionContent className="text-muted-foreground">{item.a}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>

        <div className="hidden justify-center lg:flex">
          <div className="rounded-2xl border bg-muted/40 p-2 shadow-sm">
            <Image
              src="/assets/dashboard.png"
              alt="Reflow returns portal"
              width={1100}
              height={500}
              className="rounded-xl border bg-background"
            />
          </div>
        </div>
      </div>
    </section>
  )
}
