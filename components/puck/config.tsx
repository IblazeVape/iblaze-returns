import type { Config, Data } from "@measured/puck"
import { cn } from "@/lib/utils"

// Design One (dark, Linkify-style) — fonts + sections
import { aeonik, inter } from "@/lib/marketing-fonts"
import NavbarOne from "@/components/marketing/navbar"
import FooterOne from "@/components/marketing/footer"
import {
  type BentoCardText,
  CtaOne,
  type CtaOneProps,
  FeaturesOne,
  HeroOne,
  type HeroOneProps,
  PricingOne,
  ProcessOne,
  type ProcessStepText,
  type Review,
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
import {
  AnnouncementBar,
  type AnnouncementBarProps,
  NavThree,
  type NavThreeProps,
} from "@/components/marketing-three/nav"
import { HeroThree, type HeroThreeProps } from "@/components/marketing-three/hero"
import { FeaturesThree } from "@/components/marketing-three/features"
import { WorkflowThree, type WorkflowThreeProps } from "@/components/marketing-three/workflow"
import { StatsThree, type StatsThreeProps } from "@/components/marketing-three/stats"
import { TestimonialsThree } from "@/components/marketing-three/testimonials"
import { PricingThree } from "@/components/marketing-three/pricing"
import { FaqThree, type FaqThreeProps } from "@/components/marketing-three/faq"
import { FeaturedThree, type FeaturedThreeProps } from "@/components/marketing-three/featured"

// Custom standalone blocks (shadcn-style, light theme)
import { SimpleNav, type SimpleNavProps } from "@/components/puck/simple-nav"
import { SimpleFooter, type SimpleFooterProps } from "@/components/puck/simple-footer"
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
  FeaturesOne: SectionIntroProps & { cards?: BentoCardText[] }
  ProcessOne: SectionIntroProps & { steps?: ProcessStepText[] }
  PricingOne: SectionIntroProps & { note?: string }
  ReviewsOne: SectionIntroProps & { reviews?: Review[] }
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
  AnnouncementThree: AnnouncementBarProps
  NavThree: NavThreeProps
  HeroThree: HeroThreeProps
  FeaturesThree: Fixed
  WorkflowThree: WorkflowThreeProps
  StatsThree: StatsThreeProps
  TestimonialsThree: Fixed
  PricingThree: Fixed
  FaqThree: FaqThreeProps
  FeaturedThree: FeaturedThreeProps
  FooterThree: Fixed
  SimpleNav: SimpleNavProps
  SimpleFooter: SimpleFooterProps
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
    custom: {
      title: "Clean blocks (shadcn)",
      components: ["SimpleNav", "SimpleFooter"],
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
        cards: {
          type: "array",
          label: "Bento cards",
          arrayFields: {
            name: { type: "text", label: "Title" },
            description: { type: "textarea", label: "Description" },
            cta: { type: "text", label: "Link label" },
          },
          defaultItemProps: { name: "New card", description: "Describe this feature.", cta: "Learn more" },
          getItemSummary: (item: { name?: string }) => item.name || "Card",
        },
      },
      defaultProps: {
        badge: "Features",
        heading: "Manage Returns Like a Pro",
        subtext:
          "Reflow gives your Shopify store its own branded returns portal — your customers help themselves, and you stay in control from one simple admin dashboard.",
        cards: [
          {
            name: "Match your brand",
            description: "Add your logo and colours from the admin dashboard — the portal looks like your store, not ours.",
            cta: "Learn more",
          },
          {
            name: "Customers find their order fast",
            description: "Shoppers search their own orders right from the portal navigation and start a return in seconds.",
            cta: "Learn more",
          },
          {
            name: "Built for Shopify",
            description: "Connect your Shopify store in one click — orders, customers, and refunds stay in sync.",
            cta: "Learn more",
          },
          {
            name: "Your rules, enforced",
            description: "Set your own return window rules in the admin dashboard — the portal applies them automatically.",
            cta: "Learn more",
          },
        ],
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
        steps: {
          type: "array",
          label: "Steps",
          arrayFields: {
            title: { type: "text", label: "Title" },
            description: { type: "textarea", label: "Description" },
          },
          defaultItemProps: { title: "New step", description: "Describe the step." },
          getItemSummary: (item: { title?: string }) => item.title || "Step",
        },
      },
      defaultProps: {
        badge: "The Process",
        heading: "Effortless returns management in 3 steps",
        subtext: "Follow these simple steps to brand, manage, and track your returns with ease.",
        steps: [
          { title: "Connect Your Store", description: "Install from the Shopify App Store and sync your orders in one click." },
          { title: "Brand and Customize", description: "Add your domain, logo, colours, and return rules from the admin panel." },
          { title: "Analyze and Optimize", description: "Gain insights into return performance and optimize for happier customers." },
        ],
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
        reviews: {
          type: "array",
          label: "Reviews",
          arrayFields: {
            name: { type: "text", label: "Name" },
            username: { type: "text", label: "Handle" },
            rating: {
              type: "select",
              label: "Stars",
              options: [
                { label: "5", value: 5 },
                { label: "4", value: 4 },
                { label: "3", value: 3 },
              ],
            },
            review: { type: "textarea", label: "Review" },
          },
          defaultItemProps: { name: "Happy Customer", username: "@customer", rating: 5, review: "Write the review here." },
          getItemSummary: (item: { name?: string }) => item.name || "Review",
        },
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
      fields: {
        badge: { type: "text", label: "Badge" },
        message: { type: "textarea", label: "Message" },
        linkLabel: { type: "text", label: "Link label" },
        linkHref: { type: "text", label: "Link URL" },
      },
      defaultProps: {
        badge: "New",
        message: "Instant store credit & one-click exchanges are now live for every plan.",
        linkLabel: "See what's new →",
        linkHref: "#features",
      },
      render: (props) => (
        <ThreeShell>
          <AnnouncementBar {...props} />
        </ThreeShell>
      ),
    },
    NavThree: {
      label: "Navbar (studio)",
      fields: {
        brand: { type: "text", label: "Brand name" },
        brandHref: { type: "text", label: "Logo link" },
        links: {
          type: "array",
          label: "Menu links",
          arrayFields: {
            title: { type: "text", label: "Label" },
            href: { type: "text", label: "URL (e.g. /about or #pricing)" },
          },
          defaultItemProps: { title: "New link", href: "/" },
          getItemSummary: (item: { title?: string }) => item.title || "Link",
        },
        showResources: show("Resources dropdown"),
        showIcons: show("Icon buttons"),
        signInLabel: { type: "text", label: "Sign-in label" },
        signInHref: { type: "text", label: "Sign-in URL" },
        ctaLabel: { type: "text", label: "CTA label" },
        ctaHref: { type: "text", label: "CTA URL" },
      },
      defaultProps: {
        brand: "Reflow",
        brandHref: "/",
        links: [
          { title: "Features", href: "#features" },
          { title: "How it works", href: "#workflow" },
          { title: "Pricing", href: "#pricing" },
          { title: "Reviews", href: "#reviews" },
          { title: "FAQ", href: "#faq" },
        ],
        showResources: true,
        showIcons: true,
        signInLabel: "Sign in",
        signInHref: "/portal",
        ctaLabel: "Get started",
        ctaHref: "#pricing",
      },
      render: (props) => (
        <ThreeShell>
          <NavThree {...props} />
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

    // ----------------------------------------------------- Clean blocks ---
    SimpleNav: {
      label: "Navbar (clean)",
      fields: {
        logoUrl: { type: "text", label: "Logo image URL (blank = built-in mark)" },
        brand: { type: "text", label: "Brand name" },
        brandHref: { type: "text", label: "Logo link" },
        links: {
          type: "array",
          label: "Menu links",
          arrayFields: {
            title: { type: "text", label: "Label" },
            href: { type: "text", label: "URL (e.g. /about or #pricing)" },
          },
          defaultItemProps: { title: "New link", href: "/" },
          getItemSummary: (item: { title?: string }) => item.title || "Link",
        },
        signInLabel: { type: "text", label: "Sign-in label (blank hides)" },
        signInHref: { type: "text", label: "Sign-in URL" },
        signUpLabel: { type: "text", label: "Sign-up label (blank hides)" },
        signUpHref: { type: "text", label: "Sign-up URL" },
        showThemeButton: show("Theme button"),
      },
      defaultProps: {
        logoUrl: "",
        brand: "Reflow",
        brandHref: "/",
        links: [
          { title: "Home", href: "/" },
          { title: "Blog", href: "#" },
          { title: "About", href: "#" },
          { title: "Contact Us", href: "#" },
        ],
        signInLabel: "Sign In",
        signInHref: "#",
        signUpLabel: "Sign Up",
        signUpHref: "#",
        showThemeButton: true,
      },
      render: (props) => <SimpleNav {...props} />,
    },
    SimpleFooter: {
      label: "Footer (clean)",
      fields: {
        logoUrl: { type: "text", label: "Logo image URL (blank = built-in mark)" },
        brand: { type: "text", label: "Brand name" },
        brandHref: { type: "text", label: "Logo link" },
        links: {
          type: "array",
          label: "Footer links",
          arrayFields: {
            title: { type: "text", label: "Label" },
            href: { type: "text", label: "URL" },
          },
          defaultItemProps: { title: "New link", href: "/" },
          getItemSummary: (item: { title?: string }) => item.title || "Link",
        },
        socials: {
          type: "array",
          label: "Social icons",
          arrayFields: {
            platform: {
              type: "select",
              label: "Platform",
              options: [
                { label: "Twitter / X", value: "twitter" },
                { label: "Instagram", value: "instagram" },
                { label: "Facebook", value: "facebook" },
                { label: "YouTube", value: "youtube" },
                { label: "LinkedIn", value: "linkedin" },
                { label: "GitHub", value: "github" },
                { label: "Dribbble", value: "dribbble" },
              ],
            },
            href: { type: "text", label: "URL" },
          },
          defaultItemProps: { platform: "twitter", href: "#" },
          getItemSummary: (item: { platform?: string }) => item.platform || "Social",
        },
        copyright: { type: "text", label: "Copyright name (blank = brand)" },
      },
      defaultProps: {
        logoUrl: "",
        brand: "Reflow",
        brandHref: "/",
        links: [
          { title: "About", href: "/#about" },
          { title: "Contact", href: "/#contact" },
          { title: "Terms of Service", href: "/#terms" },
          { title: "Privacy Policy", href: "/#privacy" },
        ],
        socials: [
          { platform: "twitter", href: "#" },
          { platform: "instagram", href: "#" },
          { platform: "facebook", href: "#" },
        ],
        copyright: "",
      },
      render: (props) => <SimpleFooter {...props} />,
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

// ---------------------------------------------------------------------------
// Global layout controls: every block gets "Space above / Space below /
// Spacing colour" fields so section spacing can be tuned per page without
// touching code. Applied programmatically so new blocks pick them up too.
// ---------------------------------------------------------------------------

const SPACE_OPTIONS = [
  { label: "None", value: "none" },
  { label: "Small (2rem)", value: "sm" },
  { label: "Medium (4rem)", value: "md" },
  { label: "Large (6rem)", value: "lg" },
  { label: "Extra large (9rem)", value: "xl" },
]
const SPACE_REM: Record<string, string> = { none: "0", sm: "2rem", md: "4rem", lg: "6rem", xl: "9rem" }

/* eslint-disable @typescript-eslint/no-explicit-any */
for (const [name, def] of Object.entries(puckConfig.components) as [string, any][]) {
  if (name === "Spacer") continue // has its own size controls
  const innerRender = def.render
  def.fields = {
    ...def.fields,
    spaceAbove: { type: "select", label: "Space above", options: SPACE_OPTIONS },
    spaceBelow: { type: "select", label: "Space below", options: SPACE_OPTIONS },
    spaceColor: {
      type: "select",
      label: "Spacing colour",
      options: [
        { label: "Transparent", value: "transparent" },
        { label: "White", value: "#ffffff" },
        { label: "Dark", value: "#0a0a0a" },
      ],
    },
  }
  def.defaultProps = {
    spaceAbove: "none",
    spaceBelow: "none",
    spaceColor: "transparent",
    ...(def.defaultProps || {}),
  }
  // `puck` / `editMode` / `id` are editor internals injected into every
  // block's props; they contain functions, so they must never be spread
  // into client components during server rendering.
  def.render = ({ spaceAbove, spaceBelow, spaceColor, puck: _puck, editMode: _editMode, id: _id, ...props }: any) => (
    <div
      style={{
        paddingTop: SPACE_REM[spaceAbove as string] || 0,
        paddingBottom: SPACE_REM[spaceBelow as string] || 0,
        background: spaceColor === "transparent" ? undefined : (spaceColor as string),
      }}
    >
      {innerRender(props)}
    </div>
  )
}
/* eslint-enable @typescript-eslint/no-explicit-any */

// Component type names, used by the admin API to validate saved pages.
export const puckComponentTypes = Object.keys(puckConfig.components)

// The concrete Data type for pages built from these blocks.
export type PuckPageDoc = Data<BlockProps>
