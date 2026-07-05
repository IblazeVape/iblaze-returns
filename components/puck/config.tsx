import type { Config, Data } from "@measured/puck"
import { cn } from "@/lib/utils"

// Design One (dark, Linkify-style) — fonts + sections
import { aeonik, inter } from "@/lib/marketing-fonts"
import NavbarOne from "@/components/marketing/navbar"
import FooterOne from "@/components/marketing/footer"
import {
  CtaOne,
  type CtaOneProps,
  FeaturesOne,
  HeroOne,
  type HeroOneProps,
  PricingOne,
  ProcessOne,
  ReviewsOne,
  type SectionIntroProps,
} from "@/components/marketing/sections"

// Design Two (light framed, Flow-style)
import { MarketingTwoBlockShell } from "@/components/marketing-two/theme-provider"
import { SectionDivider } from "@/components/marketing-two/frame"
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

// Design Three (studio-style, white)
import { geist, kalam } from "@/lib/marketing-three-fonts"
import { AnnouncementBar, NavThree } from "@/components/marketing-three/nav"
import { HeroThree, type HeroThreeProps } from "@/components/marketing-three/hero"
import { FeaturesThree } from "@/components/marketing-three/features"
import { WorkflowThree, type WorkflowThreeProps } from "@/components/marketing-three/workflow"
import { StatsThree, type StatsThreeProps } from "@/components/marketing-three/stats"
import { TestimonialsThree } from "@/components/marketing-three/testimonials"
import { PricingThree } from "@/components/marketing-three/pricing"
import { FaqThree, type FaqThreeProps } from "@/components/marketing-three/faq"
import { FeaturedThree, type FeaturedThreeProps } from "@/components/marketing-three/featured"
import { FooterThree } from "@/components/marketing-three/footer"

// ---------------------------------------------------------------------------
// Design shells: every block wraps itself in its design's theme scope, so
// blocks from different marketing sites can be mixed on one page and still
// carry their own fonts, colours, and backgrounds.
// ---------------------------------------------------------------------------

function OneShell({ children, grid = false }: { children: React.ReactNode; grid?: boolean }) {
  return (
    <div
      className={cn(
        "marketing-one-scope relative bg-background text-foreground font-default overflow-x-hidden",
        aeonik.variable,
        inter.variable,
      )}
    >
      {grid && (
        <div
          aria-hidden
          className="absolute inset-0 bg-[linear-gradient(to_right,#161616_1px,transparent_1px),linear-gradient(to_bottom,#161616_1px,transparent_1px)] bg-[size:3rem_3rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_110%)] h-full"
        />
      )}
      <div className="relative">{children}</div>
    </div>
  )
}

function ThreeShell({ children }: { children: React.ReactNode }) {
  return (
    <div
      className={cn("bg-white text-zinc-950 antialiased", geist.variable, kalam.variable)}
      style={{ fontFamily: "var(--font-geist-sans)" }}
    >
      {children}
    </div>
  )
}

const show = (label: string) => ({
  type: "radio" as const,
  label,
  options: [
    { label: "Show", value: true },
    { label: "Hide", value: false },
  ],
})

// ---------------------------------------------------------------------------
// Block config
// ---------------------------------------------------------------------------

// Empty-prop marker for fixed blocks (sections without editable fields yet).
type Fixed = Record<string, never>

type BlockProps = {
  NavbarOne: Fixed
  HeroOne: HeroOneProps
  FeaturesOne: SectionIntroProps
  ProcessOne: SectionIntroProps
  PricingOne: SectionIntroProps & { note?: string }
  ReviewsOne: SectionIntroProps
  CtaOne: CtaOneProps
  FooterOne: Fixed
  NavTwo: Fixed
  HeroTwo: Fixed
  LogoMarqueeTwo: Fixed
  FeaturesTwo: Fixed
  BenefitsTwo: Fixed
  TestimonialsTwo: Fixed
  PricingTwo: Fixed
  FaqTwo: Fixed
  CtaTwo: Fixed
  FooterTwo: Fixed
  DividerTwo: Fixed
  AnnouncementThree: Fixed
  NavThree: Fixed
  HeroThree: HeroThreeProps
  FeaturesThree: Fixed
  WorkflowThree: WorkflowThreeProps
  StatsThree: StatsThreeProps
  TestimonialsThree: Fixed
  PricingThree: Fixed
  FaqThree: FaqThreeProps
  FeaturedThree: FeaturedThreeProps
  FooterThree: Fixed
  Spacer: { size: string; background: string }
}

export const puckConfig: Config<BlockProps> = {
  categories: {
    darkSite: {
      title: "Site 1 — Dark (Linkify style)",
      components: ["NavbarOne", "HeroOne", "FeaturesOne", "ProcessOne", "PricingOne", "ReviewsOne", "CtaOne", "FooterOne"],
    },
    framedSite: {
      title: "Site 2 — Light framed (Flow style)",
      components: ["NavTwo", "HeroTwo", "LogoMarqueeTwo", "FeaturesTwo", "BenefitsTwo", "TestimonialsTwo", "PricingTwo", "FaqTwo", "CtaTwo", "FooterTwo", "DividerTwo"],
    },
    studioSite: {
      title: "Site 3 — Studio (white)",
      components: ["AnnouncementThree", "NavThree", "HeroThree", "FeaturesThree", "WorkflowThree", "StatsThree", "TestimonialsThree", "PricingThree", "FaqThree", "FeaturedThree", "FooterThree"],
    },
    utility: {
      title: "Utilities",
      components: ["Spacer"],
    },
  },

  components: {
    // ----------------------------------------------------------- Site 1 ---
    NavbarOne: {
      label: "Navbar (dark)",
      fields: {},
      render: () => (
        <OneShell>
          <NavbarOne />
        </OneShell>
      ),
    },
    HeroOne: {
      label: "Hero (dark)",
      fields: {
        badge: { type: "text", label: "Badge text" },
        headline: { type: "text", label: "Headline" },
        accent: { type: "text", label: "Gradient word" },
        subtextLine1: { type: "textarea", label: "Subtext line 1" },
        subtextLine2: { type: "textarea", label: "Subtext line 2" },
        ctaLabel: { type: "text", label: "Button label" },
        ctaHref: { type: "text", label: "Button link" },
        showDashboardImage: show("Dashboard screenshot"),
      },
      defaultProps: {
        badge: "✨ Manage returns smarter",
        headline: "Smart Returns with",
        accent: "Precision",
        subtextLine1: "Effortlessly streamline your Shopify returns with Reflow.",
        subtextLine2: "Brand, track, and manage all your returns in one place.",
        ctaLabel: "Start creating for free",
        ctaHref: "/demo",
        showDashboardImage: true,
      },
      render: (props) => (
        <OneShell grid>
          <div className="pt-20">
            <HeroOne {...props} />
          </div>
        </OneShell>
      ),
    },
    FeaturesOne: {
      label: "Features bento (dark)",
      fields: {
        badge: { type: "text", label: "Badge" },
        heading: { type: "text", label: "Heading" },
        subtext: { type: "textarea", label: "Subtext" },
      },
      defaultProps: {
        badge: "Features",
        heading: "Manage Returns Like a Pro",
        subtext:
          "Reflow gives your Shopify store its own branded returns portal — your customers help themselves, and you stay in control from one simple admin dashboard.",
      },
      render: (props) => (
        <OneShell>
          <FeaturesOne {...props} />
        </OneShell>
      ),
    },
    ProcessOne: {
      label: "Process steps (dark)",
      fields: {
        badge: { type: "text", label: "Badge" },
        heading: { type: "text", label: "Heading" },
        subtext: { type: "textarea", label: "Subtext" },
      },
      defaultProps: {
        badge: "The Process",
        heading: "Effortless returns management in 3 steps",
        subtext: "Follow these simple steps to brand, manage, and track your returns with ease.",
      },
      render: (props) => (
        <OneShell>
          <ProcessOne {...props} />
        </OneShell>
      ),
    },
    PricingOne: {
      label: "Pricing (dark)",
      fields: {
        badge: { type: "text", label: "Badge" },
        heading: { type: "text", label: "Heading" },
        subtext: { type: "textarea", label: "Subtext" },
        note: { type: "text", label: "Note under plans" },
      },
      defaultProps: {
        badge: "Simple Pricing",
        heading: "Choose a plan that works for you",
        subtext: "Get started with Reflow today and enjoy more features with our pro plans.",
        note: "No credit card required",
      },
      render: (props) => (
        <OneShell>
          <PricingOne {...props} />
        </OneShell>
      ),
    },
    ReviewsOne: {
      label: "Reviews (dark)",
      fields: {
        badge: { type: "text", label: "Badge" },
        heading: { type: "text", label: "Heading" },
        subtext: { type: "textarea", label: "Subtext" },
      },
      defaultProps: {
        badge: "Our Customers",
        heading: "What our users are saying",
        subtext: "Here's what some of our users have to say about Reflow.",
      },
      render: (props) => (
        <OneShell>
          <ReviewsOne {...props} />
        </OneShell>
      ),
    },
    CtaOne: {
      label: "CTA lamp (dark)",
      fields: {
        heading: { type: "text", label: "Heading" },
        subtext: { type: "textarea", label: "Subtext" },
        ctaLabel: { type: "text", label: "Button label" },
        ctaHref: { type: "text", label: "Button link" },
      },
      defaultProps: {
        heading: "Step into the future of returns management",
        subtext:
          "Experience the cutting-edge solution that transforms how you handle your returns. Elevate your online presence with our next-gen platform.",
        ctaLabel: "Get started for free",
        ctaHref: "/demo",
      },
      render: (props) => (
        <OneShell>
          <CtaOne {...props} />
        </OneShell>
      ),
    },
    FooterOne: {
      label: "Footer (dark)",
      fields: {},
      render: () => (
        <OneShell>
          <FooterOne />
        </OneShell>
      ),
    },

    // ----------------------------------------------------------- Site 2 ---
    NavTwo: {
      label: "Navbar (framed)",
      fields: {},
      render: () => (
        <MarketingTwoBlockShell>
          <NavTwo />
        </MarketingTwoBlockShell>
      ),
    },
    HeroTwo: {
      label: "Hero (framed)",
      fields: {},
      render: () => (
        <MarketingTwoBlockShell>
          <HeroTwo />
        </MarketingTwoBlockShell>
      ),
    },
    LogoMarqueeTwo: {
      label: "Logo marquee (framed)",
      fields: {},
      render: () => (
        <MarketingTwoBlockShell>
          <LogoMarqueeTwo />
        </MarketingTwoBlockShell>
      ),
    },
    FeaturesTwo: {
      label: "Features (framed)",
      fields: {},
      render: () => (
        <MarketingTwoBlockShell>
          <FeaturesTwo />
        </MarketingTwoBlockShell>
      ),
    },
    BenefitsTwo: {
      label: "Benefits (framed)",
      fields: {},
      render: () => (
        <MarketingTwoBlockShell>
          <BenefitsTwo />
        </MarketingTwoBlockShell>
      ),
    },
    TestimonialsTwo: {
      label: "Testimonials (framed)",
      fields: {},
      render: () => (
        <MarketingTwoBlockShell>
          <TestimonialsTwo />
        </MarketingTwoBlockShell>
      ),
    },
    PricingTwo: {
      label: "Pricing (framed)",
      fields: {},
      render: () => (
        <MarketingTwoBlockShell>
          <PricingTwo />
        </MarketingTwoBlockShell>
      ),
    },
    FaqTwo: {
      label: "FAQ (framed)",
      fields: {},
      render: () => (
        <MarketingTwoBlockShell>
          <FaqTwo />
        </MarketingTwoBlockShell>
      ),
    },
    CtaTwo: {
      label: "CTA (framed)",
      fields: {},
      render: () => (
        <MarketingTwoBlockShell>
          <CtaTwo />
        </MarketingTwoBlockShell>
      ),
    },
    FooterTwo: {
      label: "Footer (framed)",
      fields: {},
      render: () => (
        <MarketingTwoBlockShell>
          <FooterTwo />
        </MarketingTwoBlockShell>
      ),
    },
    DividerTwo: {
      label: "Section divider (framed)",
      fields: {},
      render: () => (
        <MarketingTwoBlockShell>
          <SectionDivider />
        </MarketingTwoBlockShell>
      ),
    },

    // ----------------------------------------------------------- Site 3 ---
    AnnouncementThree: {
      label: "Announcement bar (studio)",
      fields: {},
      render: () => (
        <ThreeShell>
          <AnnouncementBar />
        </ThreeShell>
      ),
    },
    NavThree: {
      label: "Navbar (studio)",
      fields: {},
      render: () => (
        <ThreeShell>
          <NavThree />
        </ThreeShell>
      ),
    },
    HeroThree: {
      label: "Hero (studio)",
      fields: {
        headline: { type: "text", label: "Headline" },
        accent: { type: "text", label: "Underlined words" },
        headlineSuffix: { type: "text", label: "Headline ending" },
        subtext: { type: "textarea", label: "Subtext" },
        trustedCount: { type: "text", label: "Trusted count" },
        trustedLine: { type: "text", label: "Trusted line" },
        primaryLabel: { type: "text", label: "Primary button" },
        primaryHref: { type: "text", label: "Primary link" },
        secondaryLabel: { type: "text", label: "Secondary button" },
        secondaryHref: { type: "text", label: "Secondary link" },
        showLogos: show("Logo row"),
        showPreview: show("Product preview"),
      },
      defaultProps: {
        headline: "Turn Returns Into",
        accent: "Repeat Revenue",
        headlineSuffix: ", On Autopilot",
        subtext:
          "Give your Shopify customers a branded, self-serve portal for returns, refunds, and exchanges — while Shopify keeps final say and your team tracks everything from one clean dashboard.",
        trustedCount: "1,600+",
        trustedLine: "Shopify Brands & Teams",
        primaryLabel: "Start free trial",
        primaryHref: "#pricing",
        secondaryLabel: "See how it works",
        secondaryHref: "#workflow",
        showLogos: true,
        showPreview: true,
      },
      render: (props) => (
        <ThreeShell>
          <HeroThree {...props} />
        </ThreeShell>
      ),
    },
    FeaturesThree: {
      label: "Features (studio)",
      fields: {},
      render: () => (
        <ThreeShell>
          <FeaturesThree />
        </ThreeShell>
      ),
    },
    WorkflowThree: {
      label: "Workflow steps (studio)",
      fields: {
        eyebrow: { type: "text", label: "Eyebrow" },
        title: { type: "text", label: "Title" },
        accent: { type: "text", label: "Underlined word" },
        subtitle: { type: "textarea", label: "Subtitle" },
        steps: {
          type: "array",
          label: "Steps",
          arrayFields: {
            n: { type: "text", label: "Number" },
            title: { type: "text", label: "Title" },
            body: { type: "textarea", label: "Body" },
          },
          defaultItemProps: { n: "01", title: "New step", body: "Describe the step." },
          getItemSummary: (item: { title?: string }) => item.title || "Step",
        },
      },
      defaultProps: {
        eyebrow: "How it works",
        title: "From Request to",
        accent: "Resolved",
        subtitle:
          "Four steps, mostly automated. Set it up once and Reflow handles the busywork from the first click to the final refund.",
      },
      render: (props) => (
        <ThreeShell>
          <WorkflowThree {...props} />
        </ThreeShell>
      ),
    },
    StatsThree: {
      label: "Stats band (studio)",
      fields: {
        eyebrow: { type: "text", label: "Eyebrow" },
        title: { type: "text", label: "Title" },
        stats: {
          type: "array",
          label: "Stats",
          arrayFields: {
            value: { type: "text", label: "Value" },
            label: { type: "text", label: "Label" },
          },
          defaultItemProps: { value: "0", label: "stat" },
          getItemSummary: (item: { value?: string; label?: string }) =>
            [item.value, item.label].filter(Boolean).join(" — ") || "Stat",
        },
      },
      defaultProps: {
        eyebrow: "Reflow impact",
        title: "Numbers Our Merchants Care About",
      },
      render: (props) => (
        <ThreeShell>
          <StatsThree {...props} />
        </ThreeShell>
      ),
    },
    TestimonialsThree: {
      label: "Testimonials (studio)",
      fields: {},
      render: () => (
        <ThreeShell>
          <TestimonialsThree />
        </ThreeShell>
      ),
    },
    PricingThree: {
      label: "Pricing (studio)",
      fields: {},
      render: () => (
        <ThreeShell>
          <PricingThree />
        </ThreeShell>
      ),
    },
    FaqThree: {
      label: "FAQ (studio)",
      fields: {
        eyebrow: { type: "text", label: "Eyebrow" },
        title: { type: "text", label: "Title" },
        accent: { type: "text", label: "Underlined word" },
        faqs: {
          type: "array",
          label: "Questions",
          arrayFields: {
            q: { type: "text", label: "Question" },
            a: { type: "textarea", label: "Answer" },
          },
          defaultItemProps: { q: "New question?", a: "Answer goes here." },
          getItemSummary: (item: { q?: string }) => item.q || "Question",
        },
      },
      defaultProps: {
        eyebrow: "Good to know",
        title: "Any",
        accent: "Questions?",
      },
      render: (props) => (
        <ThreeShell>
          <FaqThree {...props} />
        </ThreeShell>
      ),
    },
    FeaturedThree: {
      label: "Featured in (studio)",
      fields: {
        label: { type: "text", label: "Label" },
        outlets: {
          type: "array",
          label: "Outlets",
          arrayFields: { name: { type: "text", label: "Name" } },
          defaultItemProps: { name: "Publication" },
          getItemSummary: (item: { name?: string }) => item.name || "Outlet",
        },
      },
      defaultProps: { label: "Featured in" },
      render: (props) => (
        <ThreeShell>
          <FeaturedThree {...props} />
        </ThreeShell>
      ),
    },
    FooterThree: {
      label: "Footer (studio)",
      fields: {},
      render: () => (
        <ThreeShell>
          <FooterThree />
        </ThreeShell>
      ),
    },

    // --------------------------------------------------------- Utilities ---
    Spacer: {
      label: "Spacer",
      fields: {
        size: {
          type: "select",
          label: "Height",
          options: [
            { label: "Small (2rem)", value: "2rem" },
            { label: "Medium (4rem)", value: "4rem" },
            { label: "Large (8rem)", value: "8rem" },
          ],
        },
        background: {
          type: "select",
          label: "Background",
          options: [
            { label: "White", value: "#ffffff" },
            { label: "Dark", value: "#0a0a0a" },
            { label: "Transparent", value: "transparent" },
          ],
        },
      },
      defaultProps: { size: "4rem", background: "transparent" },
      render: ({ size, background }) => <div style={{ height: size, background }} aria-hidden />,
    },
  },
}

// Component type names, used by the admin API to validate saved pages.
export const puckComponentTypes = Object.keys(puckConfig.components)

// The concrete Data type for pages built from these blocks.
export type PuckPageDoc = Data<BlockProps>
