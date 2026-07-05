import { Container } from "./frame"

export interface FeaturedThreeProps {
  label?: string
  outlets?: { name: string }[]
}

const DEFAULT_OUTLETS = [
  { name: "Shopify Plus" },
  { name: "Retail Dive" },
  { name: "Modern Retail" },
  { name: "Practical Ecommerce" },
  { name: "TechCrunch" },
]

export function FeaturedThree({
  label = "Featured in",
  outlets = DEFAULT_OUTLETS,
}: FeaturedThreeProps) {
  return (
    <section className="border-t border-zinc-200 py-14">
      <Container>
        <p className="text-center text-xs uppercase tracking-widest text-zinc-400">{label}</p>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-x-10 gap-y-4">
          {outlets.map((o, i) => (
            <span key={o.name + i} className="text-lg font-semibold tracking-tight text-zinc-300">
              {o.name}
            </span>
          ))}
        </div>
      </Container>
    </section>
  )
}
