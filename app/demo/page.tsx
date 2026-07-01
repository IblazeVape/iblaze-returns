"use client"

import { useState } from "react"
import Link from "next/link"
import { ArrowLeft, CheckCircle2, ChevronRight, Package } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"

interface DemoOrder {
  id: string
  date: string
  total: number
  items: { id: string; name: string; variant: string; qty: number; price: number }[]
}

const ORDERS: DemoOrder[] = [
  {
    id: "#10482", date: "12 June 2026", total: 82,
    items: [
      { id: "a", name: "Waxed Canvas Tote", variant: "Olive", qty: 1, price: 58 },
      { id: "b", name: "Field Notebook Set", variant: "Default", qty: 2, price: 12 },
    ],
  },
  {
    id: "#10479", date: "6 June 2026", total: 145,
    items: [
      { id: "c", name: "Leather Belt", variant: "Tan / 34in", qty: 1, price: 45 },
      { id: "d", name: "Merino Socks (3-pack)", variant: "Charcoal", qty: 2, price: 20 },
      { id: "e", name: "Travel Wallet", variant: "Default", qty: 1, price: 60 },
    ],
  },
  {
    id: "#10471", date: "28 May 2026", total: 36,
    items: [
      { id: "f", name: "Enamel Mug", variant: "Cream", qty: 2, price: 18 },
    ],
  },
]

const REASONS = ["Changed my mind", "Faulty / not working", "Wrong size", "Wrong item received", "Damaged in transit"]

export default function DemoPage() {
  const [selectedOrder, setSelectedOrder] = useState<DemoOrder | null>(null)
  const [selected, setSelected] = useState<Record<string, { checked: boolean; reason: string }>>({})
  const [submitted, setSubmitted] = useState(false)

  const selectedItems = selectedOrder?.items.filter((i) => selected[i.id]?.checked) ?? []
  const refund = selectedItems.reduce((sum, i) => sum + i.price * i.qty, 0)

  const openOrder = (order: DemoOrder) => {
    setSelectedOrder(order)
    setSelected({})
    setSubmitted(false)
  }

  return (
    <div id="marketing-root" className="dark min-h-[100dvh] bg-background text-foreground">
      <header className="sticky top-0 z-40 border-b border-white/10 bg-background/80 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4 sm:px-6">
          <Link href="/marketing" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="size-4" /> Back to site
          </Link>
          <span className="text-sm font-bold">Reflow</span>
          <Badge variant="outline" className="border-white/15 text-[10px] text-muted-foreground">Live demo · dummy data</Badge>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
        {!selectedOrder ? (
          <>
            <h1 className="text-2xl font-semibold">My Orders</h1>
            <p className="mt-1 text-sm text-muted-foreground">This is a live, click-through demo with dummy data. Pick an order to try the return flow.</p>
            <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
              {ORDERS.map((order) => (
                <button key={order.id} onClick={() => openOrder(order)} className="text-left">
                  <Card className="h-full border-white/10 bg-zinc-950 p-5 transition-colors hover:border-violet-500/40">
                    <div className="flex items-center justify-between">
                      <p className="font-semibold">{order.id}</p>
                      <ChevronRight className="size-4 text-muted-foreground" />
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">{order.date} · {order.items.length} item{order.items.length !== 1 ? "s" : ""}</p>
                    <p className="mt-3 text-lg font-bold">£{order.total.toFixed(2)}</p>
                  </Card>
                </button>
              ))}
            </div>
          </>
        ) : submitted ? (
          <div className="flex flex-col items-center py-24 text-center">
            <CheckCircle2 className="size-12 text-violet-400" />
            <h1 className="mt-6 text-2xl font-semibold">Return request submitted</h1>
            <p className="mt-2 max-w-[46ch] text-sm text-muted-foreground">
              This is exactly the confirmation your customers would see, in your own colours and on your own domain.
            </p>
            <Button className="mt-6" variant="outline" onClick={() => setSelectedOrder(null)}>
              Try another order
            </Button>
          </div>
        ) : (
          <>
            <button onClick={() => setSelectedOrder(null)} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
              <ArrowLeft className="size-4" /> All orders
            </button>
            <div className="mt-4 flex items-center gap-2">
              <Package className="size-5 text-violet-400" />
              <h1 className="text-2xl font-semibold">Order {selectedOrder.id}</h1>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">Placed {selectedOrder.date}</p>

            <Card className="light mt-8 overflow-hidden bg-white py-0 gap-0 shadow-2xl">
              <Table>
                <TableHeader className="bg-background">
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="w-8 pl-5" />
                    <TableHead>Product</TableHead>
                    <TableHead>Variant</TableHead>
                    <TableHead className="text-center">Qty</TableHead>
                    <TableHead className="text-right pr-5">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {selectedOrder.items.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="pl-5">
                        <Checkbox
                          checked={selected[item.id]?.checked ?? false}
                          onCheckedChange={(c) => setSelected((p) => ({ ...p, [item.id]: { checked: !!c, reason: p[item.id]?.reason ?? "" } }))}
                        />
                      </TableCell>
                      <TableCell className="py-3">
                        <div className="flex items-center gap-3">
                          <div className="size-10 shrink-0 rounded-md border bg-muted" />
                          <p className="font-medium text-sm">{item.name}</p>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">{item.variant}</TableCell>
                      <TableCell className="text-center text-sm tabular-nums">{item.qty}</TableCell>
                      <TableCell className="text-right pr-5 py-3 font-semibold text-sm tabular-nums">£{(item.price * item.qty).toFixed(2)}</TableCell>
                    </TableRow>
                  ))}
                  {selectedItems.map((item) => (
                    <TableRow key={`${item.id}-reason`} className="bg-muted/20 hover:bg-muted/20">
                      <TableCell />
                      <TableCell colSpan={4} className="py-3">
                        <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Reason for {item.name}</label>
                        <Select
                          value={selected[item.id]?.reason ?? ""}
                          onValueChange={(v) => setSelected((p) => ({ ...p, [item.id]: { checked: true, reason: v } }))}
                        >
                          <SelectTrigger className="h-8 w-full max-w-xs text-sm bg-white"><SelectValue placeholder="Select a reason..." /></SelectTrigger>
                          <SelectContent>
                            {REASONS.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <div className="flex items-center justify-between border-t px-5 py-3.5">
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Estimated refund</p>
                  <p className="text-lg font-bold">£{refund.toFixed(2)}</p>
                </div>
                <Button
                  size="sm"
                  disabled={selectedItems.length === 0 || selectedItems.some((i) => !selected[i.id]?.reason)}
                  className="bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:opacity-90 text-white disabled:opacity-40"
                  onClick={() => setSubmitted(true)}
                >
                  <CheckCircle2 className="size-3.5" /> Submit return
                </Button>
              </div>
            </Card>
          </>
        )}
      </main>
    </div>
  )
}
