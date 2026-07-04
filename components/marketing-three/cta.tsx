import { Accent, PillButton } from "./frame"

export function CtaThree() {
  return (
    <div className="relative">
      <div aria-hidden className="border-t border-dashed border-zinc-300" />
      <div className="px-2 py-20 sm:px-6 md:py-28">
        <div className="mx-auto max-w-4xl overflow-hidden rounded-3xl bg-zinc-900 px-6 py-16 text-center text-white sm:px-12">
          <p
            style={{ fontFamily: "var(--font-accent)" }}
            className="text-lg italic text-zinc-400 underline decoration-zinc-600 decoration-1 underline-offset-4"
          >
            Ready when you are
          </p>
          <h2 className="mx-auto mt-4 max-w-2xl text-3xl font-semibold tracking-tight sm:text-4xl md:text-5xl md:leading-[1.1]">
            Make Returns Your <Accent>Best</Accent> Customer Experience
          </h2>
          <p className="mx-auto mt-5 max-w-xl text-base text-zinc-400 md:text-lg">
            Join 1,600+ Shopify brands turning returns from a cost center into loyal, repeat customers.
          </p>
          <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <PillButton
              href="/portal"
              variant="outline"
              className="border-transparent bg-white text-zinc-900 hover:bg-zinc-100"
            >
              Start free trial
            </PillButton>
            <PillButton
              href="#pricing"
              variant="outline"
              className="border-zinc-700 bg-transparent text-white hover:bg-white/10"
            >
              View pricing
            </PillButton>
          </div>
        </div>
      </div>
    </div>
  )
}
