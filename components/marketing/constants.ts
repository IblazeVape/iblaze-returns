import {
  BarChart3Icon, BookOpenIcon, ClockIcon, LayoutDashboardIcon, LineChartIcon,
  NewspaperIcon, PaletteIcon, FolderOpenIcon, WandSparklesIcon,
} from "lucide-react"

// Mirrors linkify/src/utils/constants/nav-links.ts — same shape, returns content
export const NAV_LINKS = [
  {
    title: "Features",
    href: "/marketing#features",
    menu: [
      {
        title: "Branded Portal",
        tagline: "Your own domain, logo, and colours.",
        href: "/marketing#features",
        icon: PaletteIcon,
      },
      {
        title: "Return Windows",
        tagline: "Set expiry rules per product type.",
        href: "/marketing#features",
        icon: ClockIcon,
      },
      {
        title: "Advanced Analytics",
        tagline: "Gain insights into your return rates.",
        href: "/marketing#features",
        icon: LineChartIcon,
      },
      {
        title: "Admin Dashboard",
        tagline: "Manage every store from one panel.",
        href: "/demo",
        icon: LayoutDashboardIcon,
      },
    ],
  },
  {
    title: "Pricing",
    href: "/marketing#pricing",
  },
  {
    title: "Enterprise",
    href: "/marketing#pricing",
  },
  {
    title: "Resources",
    href: "/marketing#features",
    menu: [
      {
        title: "Live Demo",
        tagline: "Try the returns portal with dummy data.",
        href: "/demo",
        icon: NewspaperIcon,
      },
      {
        title: "Docs",
        tagline: "Publish help docs your customers can read.",
        href: "/docs",
        icon: BookOpenIcon,
      },
    ],
  },
  {
    title: "Changelog",
    href: "/marketing",
  },
]

export const PROCESS = [
  {
    title: "Connect Your Store",
    description: "Install from the Shopify App Store and sync your orders in one click.",
    icon: FolderOpenIcon,
  },
  {
    title: "Brand and Customize",
    description: "Add your domain, logo, colours, and return rules from the admin panel.",
    icon: WandSparklesIcon,
  },
  {
    title: "Analyze and Optimize",
    description: "Gain insights into return performance and optimize for happier customers.",
    icon: BarChart3Icon,
  },
] as const

// Mirrors linkify PLANS shape (monthly/yearly numbers, tooltips, btn config)
export const PLANS = [
  {
    name: "Free",
    info: "For most individuals",
    price: { monthly: 0, yearly: 0 },
    features: [
      { text: "Branded returns page" },
      { text: "Up to 50 returns", limit: "50 returns" },
      { text: "Customizable branding" },
      { text: "Track returns", tooltip: "50 returns/month" },
      { text: "Community support", tooltip: "Get answers to your questions on discord" },
      { text: "Smart eligibility rules", tooltip: "30-day window included" },
    ],
    btn: { text: "Start for free", href: "/auth/sign-up?plan=free", variant: "default" },
  },
  {
    name: "Pro",
    info: "For small businesses",
    price: { monthly: 29, yearly: Math.round(29 * 12 * (1 - 0.12)) },
    features: [
      { text: "Branded returns page" },
      { text: "Up to 500 returns", limit: "500 returns" },
      { text: "Custom domain" },
      { text: "Track returns", tooltip: "500 returns/month" },
      { text: "Export return data", tooltip: "Up to 1K returns" },
      { text: "Priority support", tooltip: "Get 24/7 chat support" },
      { text: "Configurable return windows", tooltip: "Per-product expiry rules" },
    ],
    btn: { text: "Get started", href: "/auth/sign-up?plan=pro", variant: "purple" },
  },
  {
    name: "Business",
    info: "For large organizations",
    price: { monthly: 99, yearly: Math.round(99 * 12 * (1 - 0.12)) },
    features: [
      { text: "Branded returns page" },
      { text: "Unlimited returns" },
      { text: "Multiple stores" },
      { text: "Track returns", tooltip: "Unlimited returns" },
      { text: "Export return data", tooltip: "Unlimited returns" },
      { text: "Dedicated manager", tooltip: "Get priority support from our team" },
      { text: "Role based team access", tooltip: "Invite your whole support team" },
    ],
    btn: { text: "Contact team", href: "/auth/sign-up?plan=business", variant: "default" },
  },
]

export const REVIEWS = [
  {
    name: "Michael Smith",
    username: "@michaelsmith",
    rating: 5,
    review: "This tool is a lifesaver! Managing returns across our stores has never been easier. A must-have for any Shopify merchant.",
  },
  {
    name: "Emily Johnson",
    username: "@emilyjohnson",
    rating: 4,
    review: "Very useful app! It has streamlined our whole returns workflow. A few minor bugs, but overall a great experience.",
  },
  {
    name: "Daniel Williams",
    username: "@danielwilliams",
    rating: 5,
    review: "We've been using this daily for months. Customers finally see our brand instead of a generic Shopify form. Highly recommend it!",
  },
  {
    name: "Sophia Brown",
    username: "@sophiabrown",
    rating: 4,
    review: "This app is fantastic! It offers everything we need to manage returns efficiently.",
  },
  {
    name: "James Taylor",
    username: "@jamestaylor",
    rating: 5,
    review: "Absolutely love this app! It's intuitive and feature-rich. Has significantly improved how we handle every return.",
  },
  {
    name: "Olivia Martinez",
    username: "@oliviamartinez",
    rating: 4,
    review: "Great app with a lot of potential. It has already saved our support team a lot of time. Looking forward to future updates.",
  },
  {
    name: "William Garcia",
    username: "@williamgarcia",
    rating: 5,
    review: "This app is a game-changer for returns management. It's easy to use, extremely powerful and highly recommended!",
  },
  {
    name: "Mia Rodriguez",
    username: "@miarodriguez",
    rating: 4,
    review: "I've tried several returns tools, but this one stands out. It's simple, effective.",
  },
  {
    name: "Henry Lee",
    username: "@henrylee",
    rating: 5,
    review: "This app has transformed our workflow. Managing and tracking returns is now a breeze. I can't imagine working without it.",
  },
] as const
