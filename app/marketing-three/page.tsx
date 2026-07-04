import type { Metadata } from "next"
import { Inter, Instrument_Serif } from "next/font/google"
import { cn } from "@/lib/utils"
import { FrameCanvas } from "@/components/marketing-three/frame"
import { NavThree } from "@/components/marketing-three/nav"
import { HeroThree } from "@/components/marketing-three/hero"
import { FeaturesThree } from "@/components/marketing-three/features"
import { WorkflowThree } from "@/components/marketing-three/workflow"
import { PricingThree } from "@/components/marketing-three/pricing"
import { FaqThree } from "@/components/marketing-three/faq"
import { CtaThree } from "@/components/marketing-three/cta"
import { FooterThree } from "@/components/marketing-three/footer"

// Studio-style landing page (light theme, dashed framed canvas, italic-serif
// accents, black pill CTAs) — an original reimplementation of the shadcnstudio.com
// aesthetic, adapted to the Reflow returns product. All copy and code original.

const sans = Inter({ subsets: ["latin"], variable: "--font-sans-three" })
const accent = Instrument_Serif({
  weight: "400",
  style: ["normal", "italic"],
  subsets: ["latin"],
  variable: "--font-accent",
})

export const metadata: Metadata = {
  title: "Reflow — Turn returns into repeat revenue",
  description:
    "A branded self-serve returns portal for Shopify stores. Handle returns, refunds, and exchanges from one clean dashboard.",
}

export default function MarketingThreePage() {
  return (
    <div
      id="marketing-three-root"
      className={cn(
        "min-h-[100dvh] scroll-smooth bg-[#fafafa] antialiased",
        sans.variable,
        accent.variable,
      )}
      style={{ fontFamily: "var(--font-sans-three)" }}
    >
      <NavThree />
      <FrameCanvas>
        <HeroThree />
        <FeaturesThree />
        <WorkflowThree />
        <PricingThree />
        <FaqThree />
      </FrameCanvas>
      <FrameCanvas>
        <CtaThree />
        <FooterThree />
      </FrameCanvas>
    </div>
  )
}
