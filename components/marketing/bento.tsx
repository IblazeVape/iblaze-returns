import { ArrowRightIcon, type LucideIcon } from "lucide-react"
import Link from "next/link"
import { cn } from "@/lib/utils"

export function BentoGrid({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("grid w-full auto-rows-[22rem] grid-cols-3 gap-4", className)}>{children}</div>
}

export function BentoCard({
  name,
  description,
  Icon,
  className,
  href,
  cta,
  background,
}: {
  name: string
  description: string
  Icon: LucideIcon
  className: string
  href: string
  cta: string
  background?: React.ReactNode
}) {
  return (
    <div
      className={cn(
        "group relative col-span-3 flex flex-col justify-between overflow-hidden rounded-xl border border-white/10 bg-zinc-950 [box-shadow:0_-20px_80px_-20px_#ffffff1f_inset]",
        className,
      )}
    >
      <div>{background}</div>
      <div className="pointer-events-none z-10 flex flex-col gap-1 p-6 transition-all duration-300 group-hover:-translate-y-4">
        <Icon className="mb-2 size-9 origin-left text-violet-400 transition-all duration-300 ease-in-out group-hover:scale-75" strokeWidth={1.5} />
        <h3 className="text-lg font-semibold text-neutral-100">{name}</h3>
        <p className="max-w-[32ch] text-sm text-neutral-400">{description}</p>
      </div>
      <div className="absolute bottom-0 flex w-full translate-y-8 flex-row items-center p-6 opacity-0 transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100">
        <Link href={href} className="inline-flex items-center gap-1 text-sm font-medium text-white">
          {cta}
          <ArrowRightIcon className="size-3.5" />
        </Link>
      </div>
    </div>
  )
}
