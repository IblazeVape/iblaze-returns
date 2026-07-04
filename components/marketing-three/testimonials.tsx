import { Accent, Container, SectionHeading } from "./frame"

type Review = { name: string; handle: string; color: string; body: string }

const REVIEWS: Review[] = [
  {
    name: "Priya Nair",
    handle: "@priya_runs_grove",
    color: "#c7d2fe",
    body: "Set up Reflow in an afternoon and our support inbox dropped by half. Customers just start their own return now.",
  },
  {
    name: "Marcus Hale",
    handle: "@marcushale",
    color: "#bbf7d0",
    body: "The store-credit option alone paid for the plan. We keep almost 40% of what used to be straight refunds.",
  },
  {
    name: "Elena Ruiz",
    handle: "@elena.co",
    color: "#fbcfe8",
    body: "It looks exactly like the rest of our storefront. Nobody can tell it's a third-party portal — which is the point.",
  },
  {
    name: "Tom Becker",
    handle: "@tombecker",
    color: "#fde68a",
    body: "Being able to set our own return window and edit the policy text was the deal-breaker. Every other tool forced their rules on us.",
  },
  {
    name: "Aisha Khan",
    handle: "@aisha.khan",
    color: "#f4c7ab",
    body: "Shopify still approves everything, so nothing slips through — but my team no longer copies tracking numbers by hand.",
  },
  {
    name: "Daniel Osei",
    handle: "@dan_osei",
    color: "#a7f3d0",
    body: "Exchanges used to be a nightmare. Now the customer swaps a size in one click and a new order appears for us.",
  },
  {
    name: "Sofia Marchetti",
    handle: "@sofiamarchetti",
    color: "#ddd6fe",
    body: "The dashboard is genuinely clean. I can see every return, filter by reason, and act without five browser tabs.",
  },
  {
    name: "Jordan Lee",
    handle: "@jordanlee",
    color: "#bae6fd",
    body: "Recoloured the buttons to match our brand in two minutes. Small thing, but it makes the whole flow feel ours.",
  },
  {
    name: "Nadia Popova",
    handle: "@nadia.p",
    color: "#fecaca",
    body: "Return experience rating went from complaints to compliments. Customers actually thank us for how easy it is now.",
  },
]

export function TestimonialsThree() {
  return (
    <section id="reviews" className="border-t border-zinc-200 bg-zinc-50/50 py-20 md:py-28">
      <Container>
        <SectionHeading
          eyebrow="Loved by merchants"
          title={
            <>
              The <Accent>Wall of Love</Accent>
            </>
          }
          subtitle="Real words from Shopify brands that swapped email threads and spreadsheets for Reflow."
        />

        <div className="mt-14 columns-1 gap-4 sm:columns-2 lg:columns-3 [&>*]:mb-4">
          {REVIEWS.map((r) => (
            <figure
              key={r.handle}
              className="break-inside-avoid rounded-xl border border-zinc-200 bg-white p-5"
            >
              <div className="flex items-center gap-3">
                <span
                  className="flex size-9 items-center justify-center rounded-full text-xs font-semibold text-zinc-700"
                  style={{ background: r.color }}
                >
                  {r.name.split(" ").map((w) => w[0]).join("")}
                </span>
                <div>
                  <figcaption className="text-sm font-semibold text-zinc-900">{r.name}</figcaption>
                  <p className="text-xs text-zinc-400">{r.handle}</p>
                </div>
              </div>
              <blockquote className="mt-4 text-sm leading-relaxed text-zinc-600">
                “{r.body}”
              </blockquote>
            </figure>
          ))}
        </div>
      </Container>
    </section>
  )
}
