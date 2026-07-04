import { Accent, Section, SectionHeading } from "./frame"

const STEPS = [
  {
    n: "01",
    title: "Customer starts a return",
    body: "They look up their order in your branded portal, pick the items, and choose a reason — no support ticket needed.",
  },
  {
    n: "02",
    title: "Reflow checks your rules",
    body: "Eligibility windows, final-sale items, and per-product policies are applied instantly, so only valid requests get through.",
  },
  {
    n: "03",
    title: "Approve & auto-label",
    body: "Approve in one click (or automatically). A return label is generated and emailed to the customer straight away.",
  },
  {
    n: "04",
    title: "Refund or keep the sale",
    body: "Issue a refund to the original payment, or offer instant store credit and an exchange to retain the revenue.",
  },
]

export function WorkflowThree() {
  return (
    <Section id="workflow">
      <SectionHeading
        eyebrow="How it works"
        title={
          <>
            From Request to <Accent>Resolved</Accent>
          </>
        }
        subtitle="Four steps, mostly automated. Set it up once and Reflow handles the busywork from the first click to the final refund."
      />

      <div className="mx-auto mt-14 grid max-w-5xl grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {STEPS.map((s, i) => (
          <div key={s.n} className="relative rounded-2xl border border-zinc-200 bg-white p-6">
            <span
              style={{ fontFamily: "var(--font-accent)" }}
              className="text-4xl italic text-zinc-300"
            >
              {s.n}
            </span>
            <h3 className="mt-4 text-base font-semibold tracking-tight text-zinc-900">{s.title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-zinc-500">{s.body}</p>
            {i < STEPS.length - 1 && (
              <span
                aria-hidden
                className="absolute right-4 top-8 hidden text-zinc-300 lg:block"
              >
                →
              </span>
            )}
          </div>
        ))}
      </div>
    </Section>
  )
}
