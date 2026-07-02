import type { Metadata } from "next"
import { PageFrame, SectionDivider } from "@/components/marketing-two/frame"
import { NavTwo } from "@/components/marketing-two/nav"
import { HeroTwo } from "@/components/marketing-two/hero"
import { LogoMarqueeTwo } from "@/components/marketing-two/logo-marquee"
import { FeaturesTwo } from "@/components/marketing-two/features"
import { BenefitsTwo } from "@/components/marketing-two/benefits"
import { TestimonialsTwo } from "@/components/marketing-two/testimonials"
import { PricingTwo } from "@/components/marketing-two/pricing"
import { FaqTwo } from "@/components/marketing-two/faq"
import { CtaTwo } from "@/components/marketing-two/cta"
import { FooterTwo } from "@/components/marketing-two/footer"

// Flow-style landing page (light theme, framed canvas) — an original
// reimplementation of the layout at shadcn-nextjs-flow-landing-page.vercel.app,
// adapted to the Reflow returns product.
export const metadata: Metadata = {
  title: "Reflow — Returns for Shopify stores",
  description: "Handle every return in one clean branded portal.",
}

export default function MarketingTwoPage() {
  return (
    <div id="marketing-two-root" className="min-h-[100dvh] scroll-smooth bg-background text-foreground antialiased">
      <PageFrame>
        <NavTwo />
        <HeroTwo />
        <SectionDivider />
        <LogoMarqueeTwo />
        <SectionDivider />
        <FeaturesTwo />
        <BenefitsTwo />
        <TestimonialsTwo />
        <PricingTwo />
        <FaqTwo />
        <CtaTwo />
        <FooterTwo />
      </PageFrame>
    </div>
  )
}
