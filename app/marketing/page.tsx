import Link from "next/link"
import {
  Store, Palette, Boxes, Truck, Clock,
  CheckCircle2, ArrowRight, LayoutDashboard, Menu, Star, SparklesIcon,
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
import { AnimationContainer } from "@/components/marketing/animation-container"
import { MaxWidthWrapper } from "@/components/marketing/max-width-wrapper"
import { MagicBadge } from "@/components/marketing/magic-badge"
import { MagicCard } from "@/components/marketing/magic-card"
import { BorderBeam } from "@/components/marketing/border-beam"
import { LampContainer } from "@/components/marketing/lamp"
import { BentoGrid, BentoCard } from "@/components/marketing/bento"

const CTA_LABEL = "Start free trial"

function Monogram({ name }: { name: string }) {
  return (
    <Avatar className="size-12 border border-white/10 bg-white/5">
      <AvatarFallback className="bg-transparent text-sm font-semibold text-zinc-300">
        {name.slice(0, 2).toUpperCase()}
      </AvatarFallback>
      <span className="sr-only">{name}</span>
    </Avatar>
  )
}

const CUSTOMERS = ["Northfield Goods", "Marrow & Co", "Ardent Studio", "Lowland Supply", "Halcyon Beauty", "Fenwick & Rowe"]

const PROCESS = [
  { icon: Store, title: "Install from the Shopify App Store", description: "One click, no developer needed." },
  { icon: Palette, title: "Add your domain and brand", description: "Logo, colours, and copy in the admin panel." },
  { icon: SparklesIcon, title: "Customers see your portal, not Shopify's", description: "Live on your own domain from day one." },
]

const FAQS = [
  { q: "Do customers ever see Shopify's default returns page?", a: "No. Every request happens on your own domain with your branding from start to finish." },
  { q: "How do return windows and rules work?", a: "Set expiry windows, exclusions, and reasons per product type from the admin panel. Changes apply instantly." },
  { q: "How does billing work?", a: "Plans are billed monthly through Stripe. Upgrade, downgrade, or cancel at any time from your account." },
  { q: "Can my team share one login?", a: "Yes. Team accounts and role based access are handled through Clerk, so you can invite staff without sharing passwords." },
  { q: "Does it work with my existing Shopify theme?", a: "Yes. The portal lives on its own subdomain or custom domain, so it never touches your theme code." },
]

const PLANS = [
  { name: "Starter", price: "£29", period: "/mo", blurb: "For a single store finding its footing.", features: ["1 store", "100 returns / mo", "Branded subdomain", "Email support"], cta: CTA_LABEL, highlighted: false },
  { name: "Growth", price: "£79", period: "/mo", blurb: "For stores that want a portal that feels fully their own.", features: ["5 stores", "Unlimited returns", "Custom domain", "Priority support"], cta: CTA_LABEL, highlighted: true },
  { name: "Scale", price: "Custom", period: "", blurb: "For agencies and multi-brand groups managing several storefronts.", features: ["Unlimited stores", "Role based team access", "Dedicated onboarding", "SLA support"], cta: "Talk to sales", highlighted: false },
]

const TESTIMONIALS = [
  { quote: "Our return complaints dropped almost overnight once customers could see our own branding instead of a generic form.", name: "Priya Shah", role: "Ecommerce Manager", company: "Northfield Goods" },
  { quote: "Setting return windows per category took ten minutes. It used to take a spreadsheet and a Slack thread.", name: "Owen Marsh", role: "Operations Lead", company: "Ardent Studio" },
  { quote: "The admin panel is the first returns tool our support team has actually liked using.", name: "Femi Douglas", role: "Founder", company: "Halcyon Beauty" },
  { quote: "We connected our domain in an afternoon. It felt like our own product from day one.", name: "Dana Okafor", role: "Head of CX", company: "Lowland Supply" },
  { quote: "Support tickets about returns dropped by half once customers could track everything themselves.", name: "Marcus Webb", role: "Founder", company: "Fenwick & Rowe" },
  { quote: "Multi-tenant admin means our whole portfolio of brands runs off one login now.", name: "Ines Callaghan", role: "Operations Director", company: "Marrow & Co" },
]

function PortalPreview() {
  return (
    <Card className="light overflow-hidden bg-white py-0 gap-0 shadow-2xl">
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
  )
}

export default function MarketingPage() {
  return (
    <div id="marketing-root" className="dark min-h-[100dvh] bg-background text-foreground">

      {/* ── Nav ── */}
      <header className="sticky top-0 z-40 border-b border-white/10 bg-background/80 backdrop-blur">
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
                <button type="button" className="md:hidden size-8 flex items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors" aria-label="Menu">
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

      {/* ── Hero ── */}
      <MaxWidthWrapper>
        <div className="flex flex-col items-center justify-center bg-gradient-to-t from-background pt-16 pb-8 text-center lg:pt-24">
          <AnimationContainer className="flex w-full flex-col items-center justify-center text-center">
            <MagicBadge title="White-label returns for Shopify" />
            <h1 className="w-full py-6 text-center text-4xl font-medium leading-[1.15] tracking-tight text-balance sm:text-5xl md:text-6xl lg:text-7xl">
              Your brand&apos;s returns page,{" "}
              <span className="bg-gradient-to-r from-[#E5403B] to-rose-300 bg-clip-text text-transparent">
                not Shopify&apos;s.
              </span>
            </h1>
            <p className="mb-10 max-w-[46ch] text-lg text-muted-foreground text-balance">
              Give every customer a returns experience that looks like your store, built in, tracked automatically, and ready in one afternoon.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3">
              <Button asChild size="lg" className="bg-iblaze-red hover:bg-[#cc3935] text-white">
                <Link href="/sign-up">{CTA_LABEL}<ArrowRight className="ml-1 size-4" /></Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="border-white/15 bg-transparent hover:bg-white/5">
                <a href="#admin">View live demo</a>
              </Button>
            </div>
          </AnimationContainer>

          <AnimationContainer delay={0.2} className="relative w-full px-2 pb-10 pt-16 md:pt-20">
            <div className="marketing-gradient absolute inset-0 left-1/2 top-[10%] h-1/3 w-3/4 -translate-x-1/2 animate-image-glow blur-[6rem]" />
            <div className="relative mx-auto max-w-lg rounded-2xl p-2 ring-1 ring-inset ring-white/10 backdrop-blur-3xl">
              <BorderBeam size={250} duration={12} delay={9} />
              <PortalPreview />
            </div>
          </AnimationContainer>
        </div>
      </MaxWidthWrapper>

      {/* ── Logo wall ── */}
      <MaxWidthWrapper>
        <AnimationContainer delay={0.3}>
          <div className="border-y border-white/10 py-10">
            <p className="text-center text-sm font-medium uppercase tracking-wider text-zinc-500">Built for stores like these</p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-6 sm:gap-10">
              {CUSTOMERS.map((name) => <Monogram key={name} name={name} />)}
            </div>
          </div>
        </AnimationContainer>
      </MaxWidthWrapper>

      {/* ── Features: bento ── */}
      <MaxWidthWrapper className="py-20" >
        <AnimationContainer delay={0.1}>
          <div className="mx-auto flex max-w-xl flex-col items-center py-8 text-center">
            <MagicBadge title="Features" />
            <h2 id="features" className="mt-6 text-3xl font-medium leading-[1.1] sm:text-4xl scroll-mt-24">
              Everything a returns page needs
            </h2>
            <p className="mt-4 max-w-lg text-lg text-muted-foreground">
              None of the Shopify branding, all of the Shopify data.
            </p>
          </div>
        </AnimationContainer>
        <AnimationContainer delay={0.2}>
          <BentoGrid className="py-8">
            <BentoCard
              name="Branded from domain to receipt"
              description="Custom domain, logo, colours, and email templates, so the portal reads as part of your store."
              Icon={Palette}
              href="#pricing"
              cta="See plans"
              className="col-span-3 lg:col-span-1"
            />
            <BentoCard
              name="Return rules that fit your policy"
              description="Configurable expiry windows, categories, and reasons, applied automatically."
              Icon={Clock}
              href="#pricing"
              cta="See plans"
              className="col-span-3 lg:col-span-2"
            />
            <BentoCard
              name="Native Shopify sync"
              description="Orders, refunds, and inventory update the moment Shopify does."
              Icon={Truck}
              href="#admin"
              cta="View the panel"
              className="col-span-3 lg:col-span-2"
            />
            <BentoCard
              name="One login, every store"
              description="Manage several storefronts from a single multi-tenant admin panel."
              Icon={Boxes}
              href="#admin"
              cta="View the panel"
              className="col-span-3 lg:col-span-1"
            />
          </BentoGrid>
        </AnimationContainer>
      </MaxWidthWrapper>

      {/* ── Process ── */}
      <MaxWidthWrapper className="py-10">
        <AnimationContainer delay={0.1}>
          <div className="mx-auto flex max-w-xl flex-col items-center py-8 text-center">
            <MagicBadge title="The process" />
            <h2 className="mt-6 text-3xl font-medium leading-[1.1] sm:text-4xl">
              Connect once. Never touch Shopify settings again.
            </h2>
            <p className="mt-4 max-w-lg text-lg text-muted-foreground">
              Install, brand, and go live in one afternoon.
            </p>
          </div>
        </AnimationContainer>
        <div className="grid w-full grid-cols-1 gap-4 py-8 md:grid-cols-3 md:gap-8">
          {PROCESS.map((step, i) => (
            <AnimationContainer delay={0.15 * i} key={step.title}>
              <MagicCard className="h-full md:py-8">
                <step.icon strokeWidth={1.5} className="size-10 text-white" />
                <div className="relative mt-6 flex flex-col items-start">
                  <span className="absolute -top-6 right-0 flex size-12 items-center justify-center rounded-full border-2 border-white/15 pt-0.5 text-2xl font-medium text-white">
                    {i + 1}
                  </span>
                  <h3 className="text-base font-medium text-white">{step.title}</h3>
                  <p className="mt-2 text-sm text-muted-foreground">{step.description}</p>
                </div>
              </MagicCard>
            </AnimationContainer>
          ))}
        </div>
      </MaxWidthWrapper>

      {/* ── Admin dashboard preview ── */}
      <MaxWidthWrapper className="py-20">
        <div id="admin" className="scroll-mt-24">
          <AnimationContainer delay={0.1}>
            <div className="flex items-center gap-2">
              <LayoutDashboard className="size-5 text-iblaze-red" />
              <h2 className="text-3xl font-medium leading-[1.1] sm:text-4xl">The same admin panel you already trust</h2>
            </div>
            <p className="mt-4 max-w-[60ch] text-lg text-muted-foreground">
              No separate tool to learn. Every store&apos;s returns, statuses, and refunds sit in the one dashboard your team already uses.
            </p>
          </AnimationContainer>

          <AnimationContainer delay={0.2}>
            <div className="relative mt-10 rounded-2xl p-2 ring-1 ring-inset ring-white/10">
              <BorderBeam size={300} duration={14} delay={4} />
              <Card className="light overflow-hidden py-0 gap-0 bg-white shadow-2xl">
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
          </AnimationContainer>
        </div>
      </MaxWidthWrapper>

      {/* ── Pricing ── */}
      <MaxWidthWrapper className="py-10">
        <div id="pricing" className="scroll-mt-24">
          <AnimationContainer delay={0.1}>
            <div className="mx-auto flex max-w-xl flex-col items-center py-8 text-center">
              <MagicBadge title="Simple pricing" />
              <h2 className="mt-6 text-3xl font-medium leading-[1.1] sm:text-4xl">Choose a plan that works for you</h2>
              <p className="mt-4 max-w-lg text-lg text-muted-foreground">14 day free trial. Billing secured by Stripe. Cancel anytime.</p>
            </div>
          </AnimationContainer>
          <div className="grid grid-cols-1 gap-6 py-8 md:grid-cols-3">
            {PLANS.map((plan, i) => (
              <AnimationContainer delay={0.15 * i} key={plan.name}>
                <MagicCard className={plan.highlighted ? "h-full !border-iblaze-red/40" : "h-full"}>
                  {plan.highlighted && <Badge className="bg-iblaze-red text-white hover:bg-iblaze-red mb-3">Most popular</Badge>}
                  <p className="text-sm font-semibold text-white">{plan.name}</p>
                  <p className="mt-2 text-3xl font-bold tabular-nums text-white">{plan.price}<span className="text-sm font-normal text-muted-foreground">{plan.period}</span></p>
                  <p className="mt-2 text-sm text-muted-foreground">{plan.blurb}</p>
                  <ul className="mt-5 space-y-2.5">
                    {plan.features.map((f) => (
                      <li key={f} className="flex items-center gap-2 text-sm text-zinc-300">
                        <CheckCircle2 className="size-4 shrink-0 text-iblaze-red" /> {f}
                      </li>
                    ))}
                  </ul>
                  <Button
                    asChild
                    className={plan.highlighted ? "w-full mt-6 bg-iblaze-red hover:bg-[#cc3935] text-white" : "w-full mt-6 border-white/15 bg-transparent hover:bg-white/5"}
                    variant={plan.highlighted ? "default" : "outline"}
                  >
                    <Link href={plan.cta === CTA_LABEL ? "/sign-up" : "/contact"}>{plan.cta}</Link>
                  </Button>
                </MagicCard>
              </AnimationContainer>
            ))}
          </div>
        </div>
      </MaxWidthWrapper>

      {/* ── Testimonials ── */}
      <MaxWidthWrapper className="py-10">
        <AnimationContainer delay={0.1}>
          <div className="mx-auto flex max-w-xl flex-col items-center py-8 text-center">
            <MagicBadge title="Our customers" />
            <h2 className="mt-6 text-3xl font-medium leading-[1.1] sm:text-4xl">What our users are saying</h2>
          </div>
        </AnimationContainer>
        <div className="grid grid-cols-1 gap-4 py-8 md:grid-cols-3 md:gap-8">
          {TESTIMONIALS.map((t, i) => (
            <AnimationContainer delay={0.1 * i} key={t.name}>
              <MagicCard className="h-full">
                <p className="text-sm leading-relaxed text-zinc-300">&quot;{t.quote}&quot;</p>
                <div className="mt-5 flex items-center gap-3">
                  <Avatar className="size-9 border border-white/10 bg-white/5">
                    <AvatarFallback className="bg-transparent text-xs font-semibold text-zinc-300">
                      {t.name.split(" ").map((n) => n[0]).join("")}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-sm font-medium text-white">{t.name}</p>
                    <p className="text-xs text-muted-foreground">{t.role}, {t.company}</p>
                  </div>
                </div>
                <div className="mt-4 flex gap-0.5">
                  {Array.from({ length: 5 }, (_, s) => (
                    <Star key={s} className="size-3.5 fill-iblaze-red text-iblaze-red" />
                  ))}
                </div>
              </MagicCard>
            </AnimationContainer>
          ))}
        </div>
      </MaxWidthWrapper>

      {/* ── FAQ ── */}
      <MaxWidthWrapper className="py-10">
        <div id="faq" className="mx-auto max-w-3xl scroll-mt-24">
          <AnimationContainer delay={0.1}>
            <h2 className="text-center text-3xl font-medium leading-[1.1] sm:text-4xl">Frequently asked questions</h2>
          </AnimationContainer>
          <AnimationContainer delay={0.2}>
            <Accordion type="single" collapsible className="mt-10">
              {FAQS.map((item, i) => (
                <AccordionItem key={item.q} value={`item-${i}`} className="border-white/10">
                  <AccordionTrigger className="text-left text-base font-medium">{item.q}</AccordionTrigger>
                  <AccordionContent className="text-muted-foreground">{item.a}</AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </AnimationContainer>
        </div>
      </MaxWidthWrapper>

      {/* ── Lamp CTA ── */}
      <MaxWidthWrapper className="mt-10 max-w-[100vw] overflow-hidden">
        <AnimationContainer delay={0.1}>
          <LampContainer>
            <div className="relative flex w-full flex-col items-center justify-center text-center">
              <h2 className="mt-8 bg-gradient-to-b from-neutral-100 to-neutral-400 bg-clip-text py-4 text-4xl font-medium leading-[1.15] tracking-tight text-transparent md:text-6xl">
                Give every customer a returns page they trust
              </h2>
              <p className="mx-auto mt-6 max-w-md text-muted-foreground">
                Branded, automated, and synced with Shopify from day one.
              </p>
              <Button asChild size="lg" className="mt-6 bg-iblaze-red hover:bg-[#cc3935] text-white">
                <Link href="/sign-up">{CTA_LABEL}<ArrowRight className="ml-1 size-4" /></Link>
              </Button>
            </div>
          </LampContainer>
        </AnimationContainer>
      </MaxWidthWrapper>

      {/* ── Footer ── */}
      <footer className="border-t border-white/10 py-16">
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
          <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-white/10 pt-6 text-xs text-muted-foreground sm:flex-row">
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
