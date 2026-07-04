"use client"

import { CheckCircle2, RefreshCw } from "lucide-react"
import { Accent, PillButton } from "./frame"

const AVATARS = ["#f4c7ab", "#c7d2fe", "#bbf7d0", "#fbcfe8", "#fde68a"]
const LOGOS = ["Northline", "Vantage", "Grove & Co", "Paletto", "Merridian"]

export function HeroThree() {
  return (
    <div className="relative overflow-hidden px-2 pb-16 pt-20 text-center sm:px-6 md:pt-28">
      {/* trusted-by avatars */}
      <div className="mx-auto flex w-fit items-center gap-3">
        <div className="flex -space-x-2">
          {AVATARS.map((c, i) => (
            <span
              key={i}
              className="size-8 rounded-full border-2 border-[#fafafa]"
              style={{ background: c }}
            />
          ))}
        </div>
        <div className="text-left text-sm leading-tight text-zinc-500">
          <span className="font-semibold text-zinc-900">1,600+</span> Shopify stores
          <br />
          resolving returns with Reflow
        </div>
      </div>

      <h1 className="mx-auto mt-10 max-w-4xl text-4xl font-semibold tracking-tight text-zinc-900 sm:text-5xl md:text-[4.25rem] md:leading-[1.05]">
        Turn Returns Into <Accent>Repeat</Accent> Revenue
      </h1>

      <p className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-zinc-500 md:text-lg">
        Reflow gives your Shopify customers a <span className="font-medium text-zinc-800">branded self-serve portal</span>{" "}
        for returns, refunds, and exchanges — while your team tracks every request from one clean dashboard.
      </p>

      <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
        <PillButton href="#pricing">Start free trial</PillButton>
        <PillButton href="#workflow" variant="outline">
          See how it works
        </PillButton>
      </div>

      <div className="mt-6 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-zinc-500">
        <span className="inline-flex items-center gap-1.5">
          <CheckCircle2 className="size-3.5 text-zinc-400" /> No card required
        </span>
        <span className="inline-flex items-center gap-1.5">
          <CheckCircle2 className="size-3.5 text-zinc-400" /> Live in 10 minutes
        </span>
        <span className="inline-flex items-center gap-1.5">
          <CheckCircle2 className="size-3.5 text-zinc-400" /> Cancel anytime
        </span>
      </div>

      {/* product preview card */}
      <div className="mx-auto mt-16 max-w-4xl">
        <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-[0_30px_80px_-30px_rgba(0,0,0,0.25)]">
          <div className="flex items-center gap-2 border-b border-zinc-100 px-4 py-3">
            <span className="size-3 rounded-full bg-zinc-200" />
            <span className="size-3 rounded-full bg-zinc-200" />
            <span className="size-3 rounded-full bg-zinc-200" />
            <span className="ml-3 text-xs text-zinc-400">app.reflow.com/returns</span>
          </div>
          <div className="grid gap-px bg-zinc-100 md:grid-cols-[1.4fr_1fr]">
            <div className="bg-white p-6 text-left">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-zinc-900">Recent returns</p>
                <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-600">
                  Live
                </span>
              </div>
              <div className="mt-4 space-y-3">
                {[
                  { id: "#1042", name: "Ava Bennett", status: "Approved", tone: "emerald" },
                  { id: "#1041", name: "Liam Carter", status: "In transit", tone: "amber" },
                  { id: "#1039", name: "Noah Reed", status: "Refunded", tone: "zinc" },
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
                    <span
                      className={
                        "rounded-full px-2 py-0.5 text-[11px] font-medium " +
                        (r.tone === "emerald"
                          ? "bg-emerald-50 text-emerald-600"
                          : r.tone === "amber"
                            ? "bg-amber-50 text-amber-600"
                            : "bg-zinc-100 text-zinc-500")
                      }
                    >
                      {r.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
            <div className="flex flex-col justify-between bg-zinc-900 p-6 text-left text-white">
              <div>
                <RefreshCw className="size-5 text-zinc-400" />
                <p className="mt-4 text-3xl font-semibold">38%</p>
                <p className="text-sm text-zinc-400">of refunds kept as store credit</p>
              </div>
              <div className="mt-6 border-t border-white/10 pt-4">
                <p className="text-2xl font-semibold">4.9/5</p>
                <p className="text-sm text-zinc-400">customer return experience</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* trusted-by logo row */}
      <div className="mt-14">
        <p className="text-xs uppercase tracking-widest text-zinc-400">Trusted by modern Shopify brands</p>
        <div className="mt-5 flex flex-wrap items-center justify-center gap-x-10 gap-y-4 opacity-70">
          {LOGOS.map((l) => (
            <span key={l} className="text-lg font-semibold tracking-tight text-zinc-400">
              {l}
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}
