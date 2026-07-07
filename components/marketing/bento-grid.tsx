import { buttonVariants } from "@/components/marketing/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { cn } from "@/lib/utils"
import { ArrowRightIcon, CalendarIcon, PaletteIcon, SearchIcon, ShoppingBagIcon } from "lucide-react"
import Link from "next/link"
import { ReactNode } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/marketing/card"
import { Input } from "@/components/marketing/ui/input"
import { Label } from "@/components/marketing/ui/label"
import { ShopifyConnect } from "@/components/marketing/shopify-connect"

// Port of linkify/src/components/ui/bento-grid.tsx — same layout and widget
// style, with cards that describe what Reflow actually does: store owners run
// a branded returns portal for their Shopify customers, with their own rules.
export const CARDS = [
  {
    Icon: PaletteIcon,
    name: "Match your brand",
    description: "Add your logo and colours from the admin dashboard — the portal looks like your store, not ours.",
    href: "#",
    cta: "Learn more",
    className: "col-span-3 lg:col-span-1",
    background: (
      <Card className="absolute top-8 left-8 origin-top rounded-none rounded-tl-md transition-all duration-300 ease-out mask-[linear-gradient(to_top,transparent_40%,#000_85%)] group-hover:scale-105 border border-border border-r-0">
        <CardHeader>
          <CardTitle>
            Portal designer
          </CardTitle>
          <CardDescription>
            Your logo, your colours, your domain.
          </CardDescription>
        </CardHeader>
        <CardContent className="-mt-4 space-y-3">
          <div>
            <Label>
              Brand colour
            </Label>
            <div className="flex items-center gap-2 mt-2">
              <span className="h-6 w-6 rounded-full bg-violet-500 ring-2 ring-foreground/40" />
              <span className="h-6 w-6 rounded-full bg-rose-500" />
              <span className="h-6 w-6 rounded-full bg-emerald-500" />
              <span className="h-6 w-6 rounded-full bg-amber-500" />
              <span className="h-6 w-6 rounded-full bg-sky-500" />
            </div>
          </div>
          <div>
            <Label>
              Your domain
            </Label>
            <Input
              type="text"
              placeholder="returns.yourstore.com"
              className="w-full mt-2 focus-visible:ring-0 focus-visible:ring-transparent"
            />
          </div>
        </CardContent>
      </Card>
    ),
  },
  {
    Icon: SearchIcon,
    name: "Customers find their order fast",
    description: "Shoppers search their own orders right from the portal navigation and start a return in seconds.",
    href: "#",
    cta: "Learn more",
    className: "col-span-3 lg:col-span-2",
    background: (
      <div className="absolute right-6 top-8 w-[80%] origin-top translate-x-0 rounded-lg border border-border bg-background transition-all duration-300 ease-out mask-[linear-gradient(to_top,transparent_40%,#000_75%)] group-hover:-translate-x-10 p-2 sm:right-10 sm:w-[70%]">
        <Input placeholder="Search your orders..." />
        <div className="mt-1 cursor-pointer text-sm">
          <div className="flex items-center justify-between px-4 py-2 hover:bg-muted rounded-md">
            <span className="truncate">Order #1027 · Starter Kit</span>
            <span className="text-muted-foreground shrink-0 pl-3 text-xs">Delivered 12 Jun</span>
          </div>
          <div className="flex items-center justify-between px-4 py-2 hover:bg-muted rounded-md">
            <span className="truncate">Order #1025 · Pod Bundle</span>
            <span className="text-muted-foreground shrink-0 pl-3 text-xs">Delivered 5 Jun</span>
          </div>
          <div className="flex items-center justify-between px-4 py-2 hover:bg-muted rounded-md">
            <span className="truncate">Order #1019 · Coil 4-Pack</span>
            <span className="text-muted-foreground shrink-0 pl-3 text-xs">Delivered 28 May</span>
          </div>
          <div className="flex items-center justify-between px-4 py-2 hover:bg-muted rounded-md">
            <span className="truncate">Order #1012 · Travel Case</span>
            <span className="text-muted-foreground shrink-0 pl-3 text-xs">Delivered 14 May</span>
          </div>
        </div>
      </div>
    ),
  },
  {
    Icon: ShoppingBagIcon,
    name: "Built for Shopify",
    description: "Connect your Shopify store in one click — orders, customers, and refunds stay in sync.",
    href: "#",
    cta: "Learn more",
    className: "col-span-3 lg:col-span-2 max-w-full overflow-hidden",
    // Fixed pixel width (600px) made this unreadably cropped on mobile —
    // hidden below lg instead of trying to scale a ref-measured AnimatedBeam
    // layout down proportionally.
    background: (
      <ShopifyConnect className="absolute right-2 top-4 hidden h-[300px] w-[600px] border-none transition-all duration-300 ease-out mask-[linear-gradient(to_top,transparent_40%,#000_75%)] group-hover:scale-105 lg:block" />
    ),
  },
  {
    Icon: CalendarIcon,
    name: "Your rules, enforced",
    description: "Set your own return window rules in the admin dashboard — the portal applies them automatically.",
    className: "col-span-3 lg:col-span-1",
    href: "#",
    cta: "Learn more",
    background: (
      <Calendar
        mode="single"
        selected={new Date(2026, 5, 26, 0, 0, 0)}
        className="absolute right-0 top-8 origin-top scale-90 rounded-md border border-border transition-all duration-300 ease-out mask-[linear-gradient(to_top,transparent_40%,#000_85%)] group-hover:scale-100 sm:scale-100"
      />
    ),
  },
]

const BentoGrid = ({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) => {
  return (
    <div
      className={cn(
        "grid w-full auto-rows-104 grid-cols-3 gap-5 sm:gap-6",
        className,
      )}
    >
      {children}
    </div>
  );
};

const BentoCard = ({
  name,
  className,
  background,
  Icon,
  description,
  href,
  cta,
}: {
  name: string;
  className: string;
  background: ReactNode;
  Icon: any;
  description: string;
  href: string;
  cta: string;
}) => (
  <div
    key={name}
    className={cn(
      "group relative col-span-3 flex flex-col justify-between border border-border/60 overflow-hidden rounded-xl",
      "bg-black [box-shadow:0_-20px_80px_-20px_#ffffff1f_inset]",
      className,
    )}
  >
    <div>{background}</div>
    {/* Scrim so the title/description stay legible regardless of how far the
        decorative background mockup extends — was overlapping the text
        directly before, especially on mobile where there's less room. */}
    <div className="pointer-events-none absolute inset-x-0 bottom-0 z-5 h-3/4 bg-linear-to-t from-black via-black/85 to-transparent" />
    <div className="pointer-events-none relative z-10 flex flex-col gap-1.5 p-7 transition-all duration-300 group-hover:-translate-y-10">
      <Icon className="h-12 w-12 origin-left text-neutral-700 transition-all duration-300 ease-in-out group-hover:scale-75" />
      <h3 className="text-xl font-semibold text-neutral-300">
        {name}
      </h3>
      <p className="max-w-lg text-neutral-400">{description}</p>
    </div>

    <div
      className={cn(
        "absolute bottom-0 flex w-full translate-y-10 flex-row items-center p-4 opacity-0 transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100",
      )}
    >
      <Link href={href} className={buttonVariants({ size: "sm", variant: "ghost", className: "cursor-pointer" })}>
        {cta}
        <ArrowRightIcon className="ml-2 h-4 w-4" />
      </Link>
    </div>
    <div className="pointer-events-none absolute inset-0 transition-all duration-300 group-hover:bg-black/3 dark:group-hover:bg-neutral-800/10" />
  </div>
);

export { BentoCard, BentoGrid };
