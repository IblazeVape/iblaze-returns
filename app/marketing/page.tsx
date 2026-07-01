import Link from "next/link"
import {
  Store, Palette, UserCheck, ShieldCheck, Boxes, Users, Truck, Clock,
  CheckCircle2, ArrowRight, LayoutDashboard, Menu,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  Accordion, AccordionContent, AccordionItem, AccordionTrigger,
} from "@/components/ui/accordion"
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"

const CTA_LABEL = "Start free trial"

function Monogram({ name }: { name: string }) {
  return (
    <Avatar className="size-12 border border-border">
      <AvatarFallback className="bg-muted text-foreground text-sm font-semibold">
        {name.slice(0, 2).toUpperCase()}
      </AvatarFallback>
      <span className="sr-only">{name}</span>
    </Avatar>
  )
}

const CUSTOMERS = ["Northfield Goods", "Marrow & Co", "Ardent Studio", "Lowland Supply", "Halcyon Beauty", "Fenwick & Rowe"]

const FAQS = [
  {
    q: "Do customers ever see Shopify's default returns page?",
    a: "No. Every request happens on your own domain with your branding from start to finish.",
  },
  {
    q: "How do return windows and rules work?",
    a: "Set expiry windows, exclusions, and reasons per product type from the admin panel. Changes apply instantly.",
  },
  {
    q: "How does billing work?",
    a: "Plans are billed monthly through Stripe. Upgrade, downgrade, or cancel at any time from your account.",
  },
  {
    q: "Can my team share one login?",
    a: "Yes. Team accounts and role based access are handled through Clerk, so you can invite staff without sharing passwords.",
  },
  {
    q: "Does it work with my existing Shopify theme?",
    a: "Yes. The portal lives on its own subdomain or custom domain, so it never touches your theme code.",
  },
]

const PLANS = [
  {
    name: "Starter", price: "£29", period: "/mo",
    blurb: "For a single store finding its footing.",
    features: ["1 store", "100 returns / mo", "Branded subdomain", "Email support"],
    cta: CTA_LABEL, highlighted: false,
  },
  {
    name: "Growth", price: "£79", period: "/mo",
    blurb: "For stores that want a portal that feels fully their own.",
    features: ["5 stores", "Unlimited returns", "Custom domain", "Priority support"],
    cta: CTA_LABEL, highlighted: true,
  },
  {
    name: "Scale", price: "Custom", period: "",
    blurb: "For agencies and multi-brand groups managing several storefronts.",
    features: ["Unlimited stores", "Role based team access", "Dedicated onboarding", "SLA support"],
    cta: "Talk to sales", highlighted: false,
  },
]

const TESTIMONIALS = [
  {
    quote: "Our return complaints dropped almost overnight once customers could see our own branding instead of a generic form.",
    name: "Priya Shah", role: "Ecommerce Manager", company: "Northfield Goods",
  },
  {
    quote: "Setting return windows per category took ten minutes. It used to take a spreadsheet and a Slack thread.",
    name: "Owen Marsh", role: "Operations Lead", company: "Ardent Studio",
  },
  {
    quote: "The admin panel is the first returns tool our support team has actually liked using.",
    name: "Femi Douglas", role: "Founder", company: "Halcyon Beauty",
  },
]

export default function MarketingPage() {
  return (
    <div id="marketing-root" className="min-h-[100dvh] bg-background text-foreground">

      {/* ── Nav ── */}
      <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
          <Link href="/marketing" className="flex items-center gap-2 font-semibold">
            <span className="flex size-7 items-center justify-center rounded-md bg-iblaze-red text-white text-sm font-bold">R</span>
            Reflow
          </Link>
          <nav className="hidden items-center gap-8 text-sm text-muted-foreground md:flex">
            <a href="#features" className="hover:text-foreground transition-colors">Features</a>
            <a href="#admin" className="hover:text-foreground transition-colors">Admin panel</a>
            <a href="#pricing" className="hover:text-foreground transition-colors">Pricing</a>
            <a href="#faq" className="hover:text-foreground transition-colors">FAQ</a>
          </nav>
          <div className="flex items-center gap-2">
            <Link href="/sign-in" className="hidden sm:inline-flex text-sm text-muted-foreground hover:text-foreground transition-colors px-3">
              Sign in
            </Link>
            <Button asChild size="sm" className="bg-iblaze-red hover:bg-[#cc3935] text-white">
              <Link href="/sign-up">{CTA_LABEL}</Link>
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="md:hidden size-8 flex items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
                  aria-label="Menu"
                >
                  <Menu className="size-4" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="min-w-[10rem]">
                <DropdownMenuItem asChild><a href="#features">Features</a></DropdownMenuItem>
                <DropdownMenuItem asChild><a href="#admin">Admin panel</a></DropdownMenuItem>
                <DropdownMenuItem asChild><a href="#pricing">Pricing</a></DropdownMenuItem>
                <DropdownMenuItem asChild><a href="#faq">FAQ</a></DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild><Link href="/sign-in">Sign in</Link></DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      {/* ── Hero: split screen ── */}
      <section className="mx-auto max-w-7xl px-4 pt-16 pb-20 sm:px-6 lg:pt-20">
        <div className="grid items-center gap-12 lg:grid-cols-2">
          <div>
            <h1 className="text-4xl font-semibold tracking-tight leading-none sm:text-5xl lg:text-6xl">
              Your brand&apos;s returns page, not Shopify&apos;s.
            </h1>
            <p className="mt-5 max-w-[46ch] text-base text-muted-foreground leading-relaxed">
              Give every customer a returns experience that looks like your store, built in, tracked automatically, and ready in one afternoon.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Button asChild size="lg" className="bg-iblaze-red hover:bg-[#cc3935] text-white">
                <Link href="/sign-up">{CTA_LABEL}</Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <a href="#admin">View live demo</a>
              </Button>
            </div>
          </div>

          {/* Real component preview: a scaled-down version of the branded, customer-facing portal */}
          <Card className="overflow-hidden border-border shadow-sm py-0 gap-0">
            <div className="flex items-center gap-2 border-b bg-muted/30 px-4 py-3">
              <span className="flex size-6 items-center justify-center rounded bg-foreground text-background text-[10px] font-bold">NG</span>
              <span className="text-sm font-medium">Northfield Goods Returns</span>
              <Badge variant="outline" className="ml-auto text-[10px]">returns.northfieldgoods.com</Badge>
            </div>
            <div className="divide-y">
              {[
                { name: "Waxed Canvas Tote", meta: "Colour: Olive · Qty 1", price: "£58.00" },
                { name: "Field Notebook Set", meta: "Qty 2", price: "£24.00" },
              ].map((item) => (
                <div key={item.name} className="flex items-center gap-3 px-4 py-3">
                  <div className="size-10 shrink-0 rounded-md border bg-muted" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{item.name}</p>
                    <p className="text-xs text-muted-foreground">{item.meta}</p>
                  </div>
                  <p className="text-sm font-semibold tabular-nums">{item.price}</p>
                </div>
              ))}
            </div>
            <div className="flex items-center justify-between border-t bg-muted/20 px-4 py-3">
              <div>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Estimated refund</p>
                <p className="text-base font-bold">£82.00</p>
              </div>
              <Button size="sm" className="bg-iblaze-red hover:bg-[#cc3935] text-white text-xs font-bold">
                <CheckCircle2 className="size-3.5" /> Submit return
              </Button>
            </div>
          </Card>
        </div>
      </section>

      {/* ── Logo wall (under hero, logos only) ── */}
      <section className="border-y bg-muted/20 py-10">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="flex flex-wrap items-center justify-center gap-6 sm:gap-10">
            {CUSTOMERS.map((name) => <Monogram key={name} name={name} />)}
          </div>
        </div>
      </section>

      {/* ── Features: bento grid, 2+3 rhythm ── */}
      <section id="features" className="mx-auto max-w-7xl px-4 py-24 sm:px-6">
        <h2 className="max-w-md text-3xl font-semibold tracking-tight sm:text-4xl">
          Everything a returns page needs, none of the Shopify branding.
        </h2>
        <div className="mt-10 grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="rounded-2xl bg-zinc-900 p-8 text-white md:row-span-1">
            <Palette className="size-6" />
            <h3 className="mt-4 text-lg font-semibold">Branded from domain to receipt</h3>
            <p className="mt-2 text-sm text-zinc-300 max-w-[42ch]">
              Custom domain, logo, colours, and email templates, so the portal reads as part of your store, not a bolt-on.
            </p>
          </div>
          <div className="rounded-2xl border border-border p-8">
            <Clock className="size-6 text-iblaze-red" />
            <h3 className="mt-4 text-lg font-semibold">Return rules that fit your policy</h3>
            <p className="mt-2 text-sm text-muted-foreground max-w-[42ch]">
              Configurable expiry windows, categories, and reasons, applied automatically at checkout time.
            </p>
          </div>
        </div>
        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="rounded-2xl bg-iblaze-red p-8 text-white">
            <Truck className="size-6" />
            <h3 className="mt-4 text-lg font-semibold">Native Shopify sync</h3>
            <p className="mt-2 text-sm text-white/80 max-w-[36ch]">Orders, refunds, and inventory update the moment Shopify does.</p>
          </div>
          <div className="rounded-2xl border border-border p-8">
            <Boxes className="size-6 text-iblaze-red" />
            <h3 className="mt-4 text-lg font-semibold">One login, every store</h3>
            <p className="mt-2 text-sm text-muted-foreground max-w-[36ch]">Manage several storefronts from a single multi-tenant admin panel.</p>
          </div>
          <div className="rounded-2xl border border-border p-8">
            <ShieldCheck className="size-6 text-iblaze-red" />
            <h3 className="mt-4 text-lg font-semibold">Fraud aware by default</h3>
            <p className="mt-2 text-sm text-muted-foreground max-w-[36ch]">Eligibility windows and proof-of-issue uploads catch bad-faith returns early.</p>
          </div>
        </div>
      </section>

      {/* ── Admin dashboard preview: full width product showcase, same UI as the returns portal ── */}
      <section id="admin" className="border-y bg-muted/20 py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="flex items-center gap-2">
            <LayoutDashboard className="size-5 text-iblaze-red" />
            <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">The same admin panel you already trust</h2>
          </div>
          <p className="mt-4 max-w-[60ch] text-muted-foreground">
            No separate tool to learn. Every store's returns, statuses, and refunds sit in the one dashboard your team already uses.
          </p>

          <Card className="mt-10 overflow-hidden py-0 gap-0 shadow-sm">
            <div className="flex items-center justify-between border-b bg-muted/30 px-5 py-3.5">
              <div>
                <p className="text-sm font-semibold">Order #10482</p>
                <p className="text-xs text-muted-foreground">Northfield Goods · placed 12 June 2026</p>
              </div>
              <Badge className="bg-black text-white hover:bg-black">2 items ready to return</Badge>
            </div>
            <Table>
              <TableHeader className="bg-background">
                <TableRow className="hover:bg-transparent">
                  <TableHead className="pl-5">Product</TableHead>
                  <TableHead>Variant</TableHead>
                  <TableHead className="text-center">Qty</TableHead>
                  <TableHead className="text-right pr-5">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell className="pl-5 py-3">
                    <div className="flex items-center gap-3">
                      <div className="size-10 rounded-md border bg-muted shrink-0" />
                      <div>
                        <p className="font-medium text-sm">Waxed Canvas Tote</p>
                        <p className="text-[11px] text-muted-foreground">Faulty / not working</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm">Olive</TableCell>
                  <TableCell className="text-center text-sm tabular-nums">1</TableCell>
                  <TableCell className="text-right pr-5 py-3 font-semibold text-sm tabular-nums">£58.00</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="pl-5 py-3">
                    <div className="flex items-center gap-3">
                      <div className="size-10 rounded-md border bg-muted shrink-0" />
                      <div>
                        <p className="font-medium text-sm">Field Notebook Set</p>
                        <p className="text-[11px] text-muted-foreground">Changed my mind</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">Default</TableCell>
                  <TableCell className="text-center text-sm tabular-nums">2</TableCell>
                  <TableCell className="text-right pr-5 py-3 font-semibold text-sm tabular-nums">£24.00</TableCell>
                </TableRow>
              </TableBody>
            </Table>
            <div className="flex items-center justify-between border-t px-5 py-3.5">
              <div>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Estimated refund</p>
                <p className="text-lg font-bold">£82.00</p>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" className="text-xs">Decline</Button>
                <Button size="sm" className="bg-iblaze-red hover:bg-[#cc3935] text-white text-xs font-bold">
                  <CheckCircle2 className="size-3.5" /> Approve refund
                </Button>
              </div>
            </div>
          </Card>
        </div>
      </section>

      {/* ── Integration: split layout, step diagram (2nd and last split section) ── */}
      <section className="mx-auto max-w-7xl px-4 py-24 sm:px-6">
        <div className="grid items-center gap-12 lg:grid-cols-2">
          <div>
            <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
              Connect once. Never touch Shopify settings again.
            </h2>
            <p className="mt-4 max-w-[50ch] text-muted-foreground">
              Install from the Shopify App Store, point your domain, and the portal takes over from there. Orders and refunds stay in sync in real time.
            </p>
          </div>
          <div className="space-y-6">
            {[
              { icon: Store, title: "Install from the Shopify App Store", body: "One click, no developer needed." },
              { icon: Palette, title: "Add your domain and brand", body: "Logo, colours, and copy in the admin panel." },
              { icon: UserCheck, title: "Customers see your portal, not Shopify's", body: "Live on your own domain from day one." },
            ].map((step, i) => (
              <div key={step.title} className="flex gap-4">
                <div className="flex flex-col items-center">
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-full border border-border bg-background">
                    <step.icon className="size-4 text-iblaze-red" />
                  </span>
                  {i < 2 && <span className="mt-1 h-full w-px flex-1 bg-border" />}
                </div>
                <div className="pb-6">
                  <p className="text-sm font-semibold">{step.title}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{step.body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Pricing: card grid ── */}
      <section id="pricing" className="border-y bg-muted/20 py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">Simple pricing, no per-return fees</h2>
          <p className="mt-3 text-muted-foreground">14 day free trial. Billing secured by Stripe. Cancel anytime.</p>
          <div className="mt-10 grid grid-cols-1 gap-6 md:grid-cols-3">
            {PLANS.map((plan) => (
              <Card
                key={plan.name}
                className={
                  plan.highlighted
                    ? "border-iblaze-red shadow-md py-8 gap-6"
                    : "py-8 gap-6"
                }
              >
                <div className="px-6">
                  {plan.highlighted && <Badge className="bg-iblaze-red text-white hover:bg-iblaze-red mb-3">Most popular</Badge>}
                  <p className="text-sm font-semibold">{plan.name}</p>
                  <p className="mt-2 text-3xl font-bold tabular-nums">{plan.price}<span className="text-sm font-normal text-muted-foreground">{plan.period}</span></p>
                  <p className="mt-2 text-sm text-muted-foreground">{plan.blurb}</p>
                </div>
                <div className="px-6">
                  <ul className="space-y-2.5">
                    {plan.features.map((f) => (
                      <li key={f} className="flex items-center gap-2 text-sm">
                        <CheckCircle2 className="size-4 shrink-0 text-iblaze-red" /> {f}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="px-6">
                  <Button
                    asChild
                    className={plan.highlighted ? "w-full bg-iblaze-red hover:bg-[#cc3935] text-white" : "w-full"}
                    variant={plan.highlighted ? "default" : "outline"}
                  >
                    <Link href={plan.cta === CTA_LABEL ? "/sign-up" : "/contact"}>{plan.cta}</Link>
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* ── Testimonials: vertical quote stack ── */}
      <section className="mx-auto max-w-7xl px-4 py-24 sm:px-6">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
          {TESTIMONIALS.map((t) => (
            <div key={t.name} className="flex flex-col">
              <p className="text-base leading-relaxed">&quot;{t.quote}&quot;</p>
              <div className="mt-5 flex items-center gap-3">
                <Avatar className="size-9">
                  <AvatarFallback className="bg-muted text-xs font-semibold">
                    {t.name.split(" ").map((n) => n[0]).join("")}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-sm font-medium">{t.name}</p>
                  <p className="text-xs text-muted-foreground">{t.role}, {t.company}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── FAQ: accordion ── */}
      <section id="faq" className="border-t bg-muted/20 py-24">
        <div className="mx-auto max-w-3xl px-4 sm:px-6">
          <h2 className="text-3xl font-semibold tracking-tight text-center sm:text-4xl">Frequently asked questions</h2>
          <Accordion type="single" collapsible className="mt-10">
            {FAQS.map((item, i) => (
              <AccordionItem key={item.q} value={`item-${i}`}>
                <AccordionTrigger className="text-left text-base font-medium">{item.q}</AccordionTrigger>
                <AccordionContent className="text-muted-foreground">{item.a}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="grid grid-cols-2 gap-8 sm:grid-cols-4">
            <div className="col-span-2 sm:col-span-1">
              <Link href="/marketing" className="flex items-center gap-2 font-semibold">
                <span className="flex size-7 items-center justify-center rounded-md bg-iblaze-red text-white text-sm font-bold">R</span>
                Reflow
              </Link>
              <p className="mt-3 text-sm text-muted-foreground max-w-[24ch]">
                White-label returns for growing Shopify stores.
              </p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Product</p>
              <ul className="mt-3 space-y-2 text-sm">
                <li><a href="#features" className="text-muted-foreground hover:text-foreground transition-colors">Features</a></li>
                <li><a href="#admin" className="text-muted-foreground hover:text-foreground transition-colors">Admin panel</a></li>
                <li><a href="#pricing" className="text-muted-foreground hover:text-foreground transition-colors">Pricing</a></li>
              </ul>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Company</p>
              <ul className="mt-3 space-y-2 text-sm">
                <li><Link href="/about" className="text-muted-foreground hover:text-foreground transition-colors">About</Link></li>
                <li><Link href="/contact" className="text-muted-foreground hover:text-foreground transition-colors">Contact</Link></li>
              </ul>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Legal</p>
              <ul className="mt-3 space-y-2 text-sm">
                <li><Link href="/privacy" className="text-muted-foreground hover:text-foreground transition-colors">Privacy</Link></li>
                <li><Link href="/terms" className="text-muted-foreground hover:text-foreground transition-colors">Terms</Link></li>
              </ul>
            </div>
          </div>
          <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t pt-6 text-xs text-muted-foreground sm:flex-row">
            <p>&copy; 2026 Reflow. All rights reserved.</p>
            <div className="flex items-center gap-1.5">
              <ArrowRight className="size-3.5" />
              <span>Ready when you are.</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
