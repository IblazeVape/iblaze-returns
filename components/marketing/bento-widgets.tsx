"use client"

import { useRef } from "react"
import { Package, Store, User } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Command } from "@/components/ui/command"
import { Calendar } from "@/components/ui/calendar"
import { AnimatedBeam } from "@/components/marketing/animated-beam"
import { cn } from "@/lib/utils"

export function BrandDomainWidget() {
  return (
    <Card className="light absolute left-10 top-10 origin-top overflow-hidden rounded-none rounded-tl-md border border-r-0 border-border transition-all duration-300 ease-out [mask-image:linear-gradient(to_top,transparent_0%,#000_100%)] group-hover:scale-105">
      <CardHeader>
        <CardTitle>Add your domain</CardTitle>
        <CardDescription>Point your own subdomain at your returns portal.</CardDescription>
      </CardHeader>
      <CardContent className="-mt-4">
        <Label>Custom domain</Label>
        <Input type="text" placeholder="returns.yourstore.com" className="w-full focus-visible:ring-0 focus-visible:ring-transparent" readOnly />
      </CardContent>
    </Card>
  )
}

export function OrderSearchWidget() {
  return (
    <Command className="light absolute right-10 top-10 w-[70%] origin-top-right translate-x-0 border border-border p-2 transition-all duration-300 ease-out [mask-image:linear-gradient(to_top,transparent_40%,#000_100%)] group-hover:-translate-x-10">
      <Input placeholder="Search orders..." readOnly className="mb-1" />
      <div className="cursor-pointer">
        {["#10482 · Northfield Goods", "#10479 · Ardent Studio", "#10471 · Halcyon Beauty", "#10465 · Lowland Supply", "#10458 · Marrow & Co", "#10442 · Fenwick & Rowe"].map((row) => (
          <div key={row} className="rounded-md px-4 py-2 hover:bg-muted">{row}</div>
        ))}
      </div>
    </Command>
  )
}

function Node({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <div className={cn("z-10 flex size-12 items-center justify-center rounded-full border-2 bg-white p-3 shadow-[0_0_20px_-12px_rgba(0,0,0,0.8)]", className)}>
      {children}
    </div>
  )
}

export function ShopifySyncWidget() {
  const containerRef = useRef<HTMLDivElement>(null)
  const storeRef = useRef<HTMLDivElement>(null)
  const reflowRef = useRef<HTMLDivElement>(null)
  const customerRef = useRef<HTMLDivElement>(null)

  return (
    <div
      ref={containerRef}
      className="light absolute right-2 top-4 h-[300px] w-[600px] overflow-hidden rounded-lg border-none pl-28 transition-all duration-300 ease-out [mask-image:linear-gradient(to_top,transparent_10%,#000_100%)] group-hover:scale-105 md:pl-0"
    >
      <div className="flex h-full w-full flex-row items-center justify-between gap-10 p-10">
        <div ref={storeRef} className="flex flex-col justify-center">
          <Node><Store className="size-5 text-black" /></Node>
        </div>
        <div ref={reflowRef} className="flex flex-col justify-center">
          <Node className="size-16 bg-violet-600 text-white"><Package className="size-6" /></Node>
        </div>
        <div ref={customerRef} className="flex flex-col justify-center">
          <Node><User className="size-5 text-black" /></Node>
        </div>
      </div>
      <AnimatedBeam containerRef={containerRef} fromRef={storeRef} toRef={reflowRef} />
      <AnimatedBeam containerRef={containerRef} fromRef={reflowRef} toRef={customerRef} />
    </div>
  )
}

export function ReturnWindowWidget() {
  return (
    <Calendar
      mode="single"
      selected={new Date(2026, 5, 26)}
      className="light absolute right-0 top-10 origin-top rounded-md border border-border transition-all duration-300 ease-out [mask-image:linear-gradient(to_top,transparent_40%,#000_100%)] group-hover:scale-105"
    />
  )
}
