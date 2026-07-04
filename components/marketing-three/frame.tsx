import Link from "next/link"
import { ArrowRight } from "lucide-react"
import { cn } from "@/lib/utils"

// ---------------------------------------------------------------------------
// Studio-style design primitives — an original reimplementation of the
// shadcn-neutral landing aesthetic (Geist headings, Kalam handwritten
// underlined eyebrows, underlined headline accents, near-black rounded
// buttons on a white canvas), adapted to the Reflow returns product.
// All copy is original to Reflow.
// ---------------------------------------------------------------------------

// Centered content column, matching the studio's max-w container.
export function Container({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <div className={cn("mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8", className)}>{children}</div>
  )
}

// Kalam handwritten, underlined eyebrow label.
export function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <p
      style={{ fontFamily: "var(--font-kalam)" }}
      className="text-base text-zinc-500 underline decoration-zinc-300 decoration-1 underline-offset-4"
    >
      {children}
    </p>
  )
}

// Underlined accent word inside a headline — same font, just underlined,
// exactly like the studio's "Essentials"/"One Place" treatment.
export function Accent({ children }: { children: React.ReactNode }) {
  return (
    <span className="underline decoration-zinc-900 decoration-2 underline-offset-[6px]">
      {children}
    </span>
  )
}

// Centered section header: eyebrow / h2 / subtitle.
export function SectionHeading({
  eyebrow,
  title,
  subtitle,
  className,
}: {
  eyebrow: string
  title: React.ReactNode
  subtitle?: React.ReactNode
  className?: string
}) {
  return (
    <div className={cn("mx-auto flex max-w-2xl flex-col items-center text-center", className)}>
      <Eyebrow>{eyebrow}</Eyebrow>
      <h2 className="mt-4 text-3xl font-semibold tracking-tight text-zinc-950 sm:text-4xl md:text-[2.5rem] md:leading-[1.1]">
        {title}
      </h2>
      {subtitle && (
        <p className="mt-4 text-base leading-relaxed text-zinc-500 md:text-[17px]">{subtitle}</p>
      )}
    </div>
  )
}

// Near-black primary button + neutral outline variant, rounded-lg like shadcn.
export function Button({
  href = "#",
  children,
  variant = "primary",
  size = "md",
  icon = false,
  className,
}: {
  href?: string
  children: React.ReactNode
  variant?: "primary" | "outline" | "ghost"
  size?: "sm" | "md" | "lg"
  icon?: boolean
  className?: string
}) {
  const base =
    "group inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-all"
  const sizes = {
    sm: "h-9 px-4 text-sm",
    md: "h-10 px-5 text-sm",
    lg: "h-11 px-6 text-[15px]",
  }[size]
  const variants = {
    primary: "bg-zinc-900 text-white hover:bg-zinc-800",
    outline: "border border-zinc-200 bg-white text-zinc-900 hover:bg-zinc-50",
    ghost: "text-zinc-600 hover:text-zinc-900",
  }[variant]
  return (
    <Link href={href} className={cn(base, sizes, variants, className)}>
      {children}
      {icon && (
        <ArrowRight className="size-4 transition-transform duration-300 group-hover:translate-x-0.5" />
      )}
    </Link>
  )
}
