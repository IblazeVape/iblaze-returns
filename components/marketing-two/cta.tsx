"use client"

import { useState } from "react"
import { Package2 } from "lucide-react"
import { toast } from "sonner"

export function CtaTwo() {
  const [email, setEmail] = useState("")

  return (
    <section id="cta" className="relative px-4 pb-14 pt-10 sm:px-6">
      {/* dotted halo behind the panel */}
      <div
        aria-hidden
        className="absolute inset-x-8 top-0 h-48 bg-[radial-gradient(circle,hsl(var(--muted-foreground))_1px,transparent_1px)] bg-[size:14px_14px] opacity-30 [mask-image:radial-gradient(ellipse_60%_100%_at_50%_0%,#000,transparent)]"
      />

      <div className="relative mx-auto max-w-6xl overflow-hidden rounded-3xl bg-zinc-900 px-6 py-16 text-center text-white">
        {/* oversized leaf-mark decorations */}
        <Package2 aria-hidden className="absolute -left-16 bottom-[-4rem] size-64 rotate-12 text-white/10" strokeWidth={1} />
        <Package2 aria-hidden className="absolute -right-16 top-[-4rem] size-64 -rotate-12 text-white/10" strokeWidth={1} />

        <h2 className="text-3xl font-bold md:text-4xl">Take Control of Your Returns Pipeline</h2>
        <p className="mx-auto mt-4 max-w-lg text-zinc-300">
          Join Reflow and get a complete overview of your requests, refunds, and
          customers - all from one powerful portal.
        </p>

        <form
          onSubmit={(e) => {
            e.preventDefault()
            toast.success("You're on the list!", { description: "We'll be in touch shortly." })
            setEmail("")
          }}
          className="mx-auto mt-10 flex max-w-md items-center gap-2 rounded-xl border border-white/20 bg-white p-1.5 shadow-2xl"
        >
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Your email address"
            className="h-10 w-full rounded-lg bg-transparent px-3 text-sm text-zinc-900 outline-none placeholder:text-zinc-400"
          />
          <button
            type="submit"
            className="h-10 shrink-0 rounded-lg bg-zinc-900 px-5 text-sm font-medium text-white shadow-[0_0_0_1px_rgba(0,0,0,0.9),inset_0_1px_0_rgba(255,255,255,0.15)] transition-colors hover:bg-zinc-800"
          >
            Get started
          </button>
        </form>
      </div>
    </section>
  )
}
