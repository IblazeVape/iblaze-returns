import { Container } from "./frame"

export interface StatItem {
  value: string
  label: string
}

const DEFAULT_STATS: StatItem[] = [
  { value: "1,600+", label: "Shopify stores" },
  { value: "2.4M", label: "returns handled" },
  { value: "38%", label: "kept as store credit" },
  { value: "4.9/5", label: "return experience" },
  { value: "10 min", label: "average setup" },
]

export interface StatsThreeProps {
  eyebrow?: string
  title?: string
  stats?: StatItem[]
}

export function StatsThree({
  eyebrow = "Reflow impact",
  title = "Numbers Our Merchants Care About",
  stats = DEFAULT_STATS,
}: StatsThreeProps) {
  return (
    <section className="border-t border-zinc-200 bg-zinc-950 py-16 text-white md:py-20">
      <Container>
        <p
          style={{ fontFamily: "var(--font-kalam)" }}
          className="text-center text-base text-zinc-400 underline decoration-zinc-700 decoration-1 underline-offset-4"
        >
          {eyebrow}
        </p>
        <h2 className="mx-auto mt-4 max-w-xl text-center text-3xl font-semibold tracking-tight sm:text-4xl">
          {title}
        </h2>

        <div className="mt-12 grid grid-cols-2 gap-y-10 sm:grid-cols-3 lg:grid-cols-5">
          {stats.map((s, i) => (
            <div
              key={s.label + i}
              className={
                "px-4 text-center " +
                (i < stats.length - 1 ? "lg:border-r lg:border-white/10" : "")
              }
            >
              <p className="text-3xl font-semibold tracking-tight md:text-4xl">{s.value}</p>
              <p className="mt-1 text-sm text-zinc-400">{s.label}</p>
            </div>
          ))}
        </div>
      </Container>
    </section>
  )
}
