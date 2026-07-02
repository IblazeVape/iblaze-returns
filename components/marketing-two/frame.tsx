import { cn } from "@/lib/utils"

// The Flow-style page frame: diagonal-stripe outer background with a bordered
// max-w-7xl inner canvas, and small "+"-style tick marks where section
// boundaries cross the frame border.

export function PageFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col bg-[repeating-linear-gradient(45deg,color-mix(in_oklab,hsl(var(--border))_40%,transparent)_0,color-mix(in_oklab,hsl(var(--border))_40%,transparent)_1px,transparent_0,transparent_50%)] bg-[size:12px_12px] bg-fixed">
      <div className="mx-auto h-full w-full max-w-[84rem] px-4 sm:px-6 lg:px-8">
        <div className="bg-background h-full w-full max-w-7xl border-x mx-auto">
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

// Flow-style primary button: dark pill with layered ring shadow
export function DarkButton({
  children,
  className,
  ...props
}: React.ComponentProps<"button">) {
  return (
    <button
      className={cn(
        "inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-zinc-900 px-5 text-sm font-medium text-white transition-all",
        "shadow-[0_0_0_1px_rgba(0,0,0,0.9),0_0_0_3px_rgba(0,0,0,0.15),inset_0_1px_0_rgba(255,255,255,0.15)]",
        "hover:bg-zinc-800 active:scale-[0.98]",
        className,
      )}
      {...props}
    >
      {children}
    </button>
  )
}
