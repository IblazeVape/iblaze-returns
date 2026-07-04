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
    <section id="faq" className="scroll-mt-16 border-t pt-14">
      <SectionHeading
        eyebrow="FAQ"
        title="Frequently asked questions"
        subtitle="Here are some quick answers to help you understand how Reflow powers your returns."
      />

      {/* Table-style grid: accordion and preview share one border, touching edge-to-edge.
          Only a top border here — the next section's own border-t is the sole
          divider, so we don't stack two borders at the boundary. */}
      <div className="mt-10 border-t">
        <div className="grid grid-cols-1 divide-y border-x lg:grid-cols-2 lg:divide-x lg:divide-y-0">
          <div>
            <Accordion type="single" collapsible defaultValue="item-0">
              {FAQS.map((item, i) => (
                <AccordionItem key={item.q} value={`item-${i}`}>
                  <AccordionTrigger className="px-5 text-left text-base font-semibold lg:px-8">{item.q}</AccordionTrigger>
                  <AccordionContent className="px-5 text-muted-foreground lg:px-8">{item.a}</AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>

          <div className="hidden items-center justify-center bg-muted/20 p-8 lg:flex">
            <Image
              src="/assets/dashboard.png"
              alt="Reflow returns portal"
              width={1100}
              height={500}
              className="rounded-lg border bg-background"
            />
          </div>
        </div>
      </div>
    </section>
  )
}
