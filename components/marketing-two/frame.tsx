import { cn } from "@/lib/utils"

// The Flow-style page frame: diagonal-stripe outer background with a bordered
// max-w-7xl inner canvas, and small "+"-style tick marks where section
// boundaries cross the frame border.

export function PageFrame({ children }: { children: React.ReactNode }) {
  return (
    // The margin outside the framed canvas needs its own tinted fill —
    // otherwise the diagonal stripe pattern and the border-x rails blend
    // into the same near-white background and the "edge to edge" framing
    // reads as nothing at all.
    <div className="flex flex-col bg-zinc-100 bg-[repeating-linear-gradient(45deg,hsl(var(--border))_0,hsl(var(--border))_1px,transparent_0,transparent_50%)] bg-[size:12px_12px] bg-fixed">
      <div className="mx-auto h-full w-full max-w-[84rem] px-4 sm:px-6 lg:px-8">
        <div className="bg-background h-full w-full max-w-7xl border-x border-zinc-300 mx-auto shadow-[0_0_60px_-15px_rgba(0,0,0,0.15)]">
          {children}
        </div>
      </div>
    </div>
  )
}

// A horizontal section divider with end "ticks" that cross the frame border
export function SectionDivider() {
  return (
    <div className="relative">
      <div className="border-t" />
      <span aria-hidden className="absolute -left-2 top-0 h-px w-4 -translate-y-px bg-foreground/60" />
      <span aria-hidden className="absolute -left-px -top-2 h-4 w-px bg-foreground/60" />
      <span aria-hidden className="absolute -right-2 top-0 h-px w-4 -translate-y-px bg-foreground/60" />
      <span aria-hidden className="absolute -right-px -top-2 h-4 w-px bg-foreground/60" />
    </div>
  )
}

export function SectionHeading({
  eyebrow,
  title,
  subtitle,
  className,
}: {
  eyebrow: string
  title: string
  subtitle?: React.ReactNode
  className?: string
}) {
  return (
    <div className={cn("mx-auto flex max-w-2xl flex-col items-center px-4 text-center", className)}>
      <p className="text-muted-foreground text-xs font-medium uppercase tracking-widest">{eyebrow}</p>
      <h2 className="mt-3 text-3xl font-bold tracking-tight md:text-4xl">{title}</h2>
      {subtitle && <p className="text-muted-foreground mt-4 text-base md:text-lg">{subtitle}</p>}
    </div>
  )
}

// Animated primary button: a ring wrapper clips an oversized, slowly rotating
// conic-gradient layer behind the label, producing a continuously sweeping
// sheen around/inside the dark button (the Flow-style "animated button").
export function DarkButton({
  children,
  className,
  ...props
}: React.ComponentProps<"button">) {
  return (
    <span className={cn("relative isolate inline-flex w-fit overflow-hidden rounded-[10px] ring-2 ring-zinc-900/60", className?.includes("w-full") && "w-full")}>
      <span
        aria-hidden
        className="absolute -inset-[120px] -z-10 animate-[spin_4s_linear_infinite] bg-[conic-gradient(from_90deg,#18181b_0%,#18181b_50%,#3f3f46_60%,#71717a_65%,#3f3f46_70%,#18181b_80%)]"
      />
      <button
        className={cn(
          "inline-flex h-10 items-center justify-center gap-2 rounded-[10px] px-6 text-sm font-medium text-white transition-transform active:scale-[0.98]",
          className,
        )}
        {...props}
      >
        {children}
      </button>
    </span>
  )
}
