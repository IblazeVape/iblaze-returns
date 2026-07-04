import Link from "next/link"
import { ArrowRight } from "lucide-react"
import { cn } from "@/lib/utils"

// ---------------------------------------------------------------------------
// Studio-style page frame — an original reimplementation of the light,
// dashed-canvas landing aesthetic (bold sans headlines with an underlined
// italic-serif accent phrase, black pill CTAs, diamond section ticks),
// adapted to the Reflow returns product. All copy and markup are original.
// ---------------------------------------------------------------------------

// Outer canvas: near-white background with faint dashed vertical rails framing
// a centered max-w column, echoing the studio's bordered layout.
export function FrameCanvas({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative bg-[#fafafa] text-zinc-900">
      <div className="relative mx-auto w-full max-w-[80rem] px-4 sm:px-6 lg:px-10">
        {/* dashed rails */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-y-0 left-4 hidden border-l border-dashed border-zinc-300 sm:left-6 sm:block lg:left-10"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-y-0 right-4 hidden border-r border-dashed border-zinc-300 sm:right-6 sm:block lg:right-10"
        />
        {children}
      </div>
    </div>
  )
}

// A section wrapper. Draws a top dashed divider with diamond ticks where the
// boundary meets the frame rails.
export function Section({
  id,
  children,
  className,
  divider = true,
}: {
  id?: string
  children: React.ReactNode
  className?: string
  divider?: boolean
}) {
  return (
    <section id={id} className={cn("relative", className)}>
      {divider && (
        <div aria-hidden className="relative">
          <div className="border-t border-dashed border-zinc-300" />
          <Diamond className="-left-[5px]" />
          <Diamond className="-right-[5px]" />
        </div>
      )}
      <div className="px-2 py-16 sm:px-6 md:py-24">{children}</div>
    </section>
  )
}

function Diamond({ className }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        "absolute top-0 size-[9px] -translate-y-1/2 rotate-45 border border-zinc-400 bg-[#fafafa]",
        className,
      )}
    />
  )
}

// Small underlined italic-serif eyebrow.
export function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <p
      style={{ fontFamily: "var(--font-accent)" }}
      className="text-lg italic tracking-wide text-zinc-500 underline decoration-zinc-300 decoration-1 underline-offset-4"
    >
      {children}
    </p>
  )
}

// Renders a headline where any text wrapped in <Accent> renders as an
// underlined italic-serif phrase.
export function Accent({ children }: { children: React.ReactNode }) {
  return (
    <span
      style={{ fontFamily: "var(--font-accent)" }}
      className="italic underline decoration-zinc-300 decoration-2 underline-offset-[6px]"
    >
      {children}
    </span>
  )
}

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
      <h2 className="mt-4 text-3xl font-semibold tracking-tight text-zinc-900 sm:text-4xl md:text-[2.75rem] md:leading-[1.1]">
        {title}
      </h2>
      {subtitle && (
        <p className="mt-4 text-base leading-relaxed text-zinc-500 md:text-lg">{subtitle}</p>
      )}
    </div>
  )
}

// Black pill CTA (primary) + outline variant, matching the studio look.
export function PillButton({
  href = "#",
  children,
  variant = "primary",
  icon = true,
  className,
}: {
  href?: string
  children: React.ReactNode
  variant?: "primary" | "outline"
  icon?: boolean
  className?: string
}) {
  const base =
    "group inline-flex items-center justify-center gap-2 rounded-full px-6 py-3 text-sm font-medium transition-all"
  const styles =
    variant === "primary"
      ? "bg-zinc-900 text-white shadow-[0_1px_0_0_rgba(255,255,255,0.15)_inset,0_8px_24px_-8px_rgba(0,0,0,0.4)] hover:bg-zinc-800"
      : "border border-zinc-300 bg-white text-zinc-900 hover:border-zinc-400 hover:bg-zinc-50"
  return (
    <Link href={href} className={cn(base, styles, className)}>
      {children}
      {icon && (
        <ArrowRight className="size-4 transition-transform duration-300 group-hover:translate-x-0.5" />
      )}
    </Link>
  )
}
