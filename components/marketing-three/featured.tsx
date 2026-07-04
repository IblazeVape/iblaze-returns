import { Container } from "./frame"

const OUTLETS = ["Shopify Plus", "Retail Dive", "Modern Retail", "Practical Ecommerce", "TechCrunch"]

export function FeaturedThree() {
  return (
    <section className="border-t border-zinc-200 py-14">
      <Container>
        <p className="text-center text-xs uppercase tracking-widest text-zinc-400">Featured in</p>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-x-10 gap-y-4">
          {OUTLETS.map((o) => (
            <span key={o} className="text-lg font-semibold tracking-tight text-zinc-300">
              {o}
            </span>
          ))}
        </div>
      </Container>
    </section>
  )
}
