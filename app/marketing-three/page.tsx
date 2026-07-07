import type { Metadata } from "next"
import { Geist, Kalam } from "next/font/google"
import { cn } from "@/lib/utils"
import { AnnouncementBar, NavThree } from "@/components/marketing-three/nav"
import { HeroThree } from "@/components/marketing-three/hero"
import { FeaturesThree } from "@/components/marketing-three/features"
import { WorkflowThree } from "@/components/marketing-three/workflow"
import { StatsThree } from "@/components/marketing-three/stats"
import { TestimonialsThree } from "@/components/marketing-three/testimonials"
import { PricingThree } from "@/components/marketing-three/pricing"
import { FaqThree } from "@/components/marketing-three/faq"
import { FeaturedThree } from "@/components/marketing-three/featured"
import { FooterThree } from "@/components/marketing-three/footer"

// Studio-style landing page — an original reimplementation of the shadcn-neutral
// landing aesthetic (Geist headings, Kalam handwritten eyebrows, underlined
// accents, near-black rounded buttons on a white canvas), adapted to the Reflow
// returns product. All copy is original to Reflow.

const geist = Geist({ subsets: ["latin"], variable: "--font-geist-sans" })
const kalam = Kalam({ weight: "400", subsets: ["latin"], variable: "--font-kalam" })

export const metadata: Metadata = {
  title: "Reflow — Turn returns into repeat revenue",
  description:
    "A branded self-serve returns portal for Shopify stores. Set your own rules, match your brand, and handle returns, refunds, and exchanges from one clean dashboard.",
}

export default function MarketingThreePage() {
  return (
    <div
      id="marketing-three-root"
      className={cn(
        "min-h-dvh scroll-smooth bg-white text-zinc-950 antialiased",
        geist.variable,
        kalam.variable,
      )}
      style={{ fontFamily: "var(--font-geist-sans)" }}
    >
      <AnnouncementBar />
      <NavThree />
      <HeroThree />
      <FeaturesThree />
      <WorkflowThree />
      <StatsThree />
      <TestimonialsThree />
      <PricingThree />
      <FaqThree />
      <FeaturedThree />
      <FooterThree />
    </div>
  )
}
