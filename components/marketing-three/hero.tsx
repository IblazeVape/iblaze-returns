"use client"

import { Accent, Button, Container } from "./frame"

const AVATARS = ["#f4c7ab", "#c7d2fe", "#bbf7d0", "#fbcfe8", "#fde68a"]
const LOGOS = ["Northline", "Vantage", "Grove & Co", "Paletto", "Merridian"]

export function HeroThree() {
  return (
    <section className="relative overflow-hidden">
      {/* soft top grid backdrop */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,#f4f4f5_1px,transparent_1px),linear-gradient(to_bottom,#f4f4f5_1px,transparent_1px)] bg-size-[56px_56px] mask-[radial-gradient(ellipse_70%_55%_at_50%_0%,#000_60%,transparent_100%)]"
      />
      <Container className="relative pb-16 pt-16 text-center md:pt-24">
        {/* trusted-by avatars */}
        <div className="mx-auto flex w-fit items-center gap-3">
          <div className="flex -space-x-2">
            {AVATARS.map((c, i) => (
              <span
                key={i}
                className="size-8 rounded-full border-2 border-white shadow-xs"
                style={{ background: c }}
              />
            ))}
          </div>
          <div className="text-left text-sm leading-tight text-zinc-500">
            Trusted by <span className="font-semibold text-zinc-900">1,600+</span>
            <br />
            Shopify Brands &amp; Teams
          </div>
        </div>

        <h1 className="mx-auto mt-10 max-w-4xl text-[2.5rem] font-bold leading-[1.1] tracking-tight text-zinc-950 sm:text-6xl md:text-[4rem] md:leading-[1.05]">
          Turn Returns Into <Accent>Repeat Revenue</Accent>, On Autopilot
        </h1>

        <p className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-zinc-500 md:text-lg">
          Give your Shopify customers a branded, self-serve portal for returns, refunds, and
          exchanges — while Shopify keeps final say and your team tracks everything from one clean
          dashboard.
        </p>

        {/* trusted-by logo row */}
        <div className="mt-10 flex flex-wrap items-center justify-center gap-x-8 gap-y-3">
          <span className="text-sm text-zinc-400">Trusted by</span>
          {LOGOS.map((l) => (
            <span key={l} className="text-lg font-semibold tracking-tight text-zinc-300">
              {l}
            </span>
          ))}
        </div>

        <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Button href="#pricing" size="lg" icon>
            Start free trial
          </Button>
          <Button href="#workflow" variant="outline" size="lg" icon>
            See how it works
          </Button>
        </div>
      </Container>

      {/* product preview */}
      <Container className="relative pb-20">
        <ProductPreview />
      </Container>
    </section>
  )
}

function ProductPreview() {
  return (
    <div className="mx-auto max-w-5xl overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-[0_40px_100px_-30px_rgba(0,0,0,0.25)]">
      <div className="flex items-center gap-2 border-b border-zinc-100 px-4 py-3">
        <span className="size-3 rounded-full bg-zinc-200" />
        <span className="size-3 rounded-full bg-zinc-200" />
        <span className="size-3 rounded-full bg-zinc-200" />
        <span className="ml-3 rounded-md bg-zinc-50 px-3 py-1 text-xs text-zinc-400">
          app.reflow.com/returns
        </span>
      </div>
      <div className="grid gap-px bg-zinc-100 md:grid-cols-[1.5fr_1fr]">
        <div className="bg-white p-6 text-left">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-zinc-900">Recent returns</p>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-600">
              <span className="size-1.5 rounded-full bg-emerald-500" /> Live
            </span>
          </div>
          <div className="mt-4 space-y-2.5">
            {[
              { id: "#1042", name: "Ava Bennett", status: "Approved", tone: "emerald" },
              { id: "#1041", name: "Liam Carter", status: "In transit", tone: "amber" },
              { id: "#1039", name: "Noah Reed", status: "Refunded", tone: "zinc" },
              { id: "#1038", name: "Mia Foster", status: "Store credit", tone: "violet" },
            ].map((r) => (
              <div
                key={r.id}
                className="flex items-center justify-between rounded-lg border border-zinc-100 bg-zinc-50/60 px-3 py-2.5"
              >
                <div className="flex items-center gap-3">
                  <span className="flex size-8 items-center justify-center rounded-full bg-white text-xs font-medium text-zinc-500 ring-1 ring-zinc-200">
                    {r.name.split(" ").map((w) => w[0]).join("")}
                  </span>
                  <div className="text-left">
                    <p className="text-xs font-medium text-zinc-800">{r.name}</p>
                    <p className="text-[11px] text-zinc-400">Order {r.id}</p>
                  </div>
                </div>
                <StatusPill tone={r.tone}>{r.status}</StatusPill>
              </div>
            ))}
          </div>
        </div>
        <div className="flex flex-col justify-between bg-zinc-950 p-6 text-left text-white">
          <div>
            <p className="text-xs uppercase tracking-widest text-zinc-500">This month</p>
            <p className="mt-4 text-3xl font-semibold">38%</p>
            <p className="text-sm text-zinc-400">of refunds kept as store credit</p>
          </div>
          <div className="mt-6 space-y-4 border-t border-white/10 pt-5">
            <div>
              <p className="text-2xl font-semibold">4.9/5</p>
              <p className="text-sm text-zinc-400">return experience rating</p>
            </div>
            <div>
              <p className="text-2xl font-semibold">2.4h</p>
              <p className="text-sm text-zinc-400">avg. time to resolution</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function StatusPill({ tone, children }: { tone: string; children: React.ReactNode }) {
  const map: Record<string, string> = {
    emerald: "bg-emerald-50 text-emerald-600",
    amber: "bg-amber-50 text-amber-600",
    violet: "bg-violet-50 text-violet-600",
    zinc: "bg-zinc-100 text-zinc-500",
  }
  return (
    <span className={"rounded-full px-2 py-0.5 text-[11px] font-medium " + (map[tone] || map.zinc)}>
      {children}
    </span>
  )
}
