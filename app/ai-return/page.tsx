"use client"

import * as React from "react"
import { useEffect, useRef, useState, Suspense } from "react"
import { Bot, Package, CheckCircle2, Loader2, RotateCcw, ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { AppSidebar } from "@/components/app-sidebar"
import { SiteHeader } from "@/components/site-header"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { SidebarLayoutProvider, useSidebarLayout } from "@/components/sidebar-layout-provider"
import { cn } from "@/lib/utils"

// ─── Types ────────────────────────────────────────────────────────────────────
interface LineItem {
  id: string; title: string; quantity: number; eligibleQuantity: number
  returnStatus: string; unitPrice?: number | null
  image?: { url: string } | null; variant?: { title: string } | null
  productHandle?: string | null
}
interface Order {
  id: string; name: string; createdAt: string; cancelledAt?: string | null
  totalPriceSet: { shopMoney: { amount: string; currencyCode: string } }
  processedItems: LineItem[]
  totalUnits: number; orderStatus: string
}
interface OrdersData { firstName: string; email: string; orders: Order[] }

const RETURN_REASONS = [
  { value: "CHANGED_MIND",     label: "Changed my mind" },
  { value: "WRONG_ITEM",       label: "Wrong item received" },
  { value: "FAULTY",           label: "Faulty / not working" },
  { value: "DAMAGED",          label: "Damaged in transit" },
  { value: "NOT_AS_DESCRIBED", label: "Not as described" },
  { value: "OTHER",            label: "Other" },
]

type Step = "loading" | "error" | "order" | "items" | "reason" | "review" | "success"

interface Message {
  id: string
  from: "bot" | "user"
  content: React.ReactNode
}

function fmt(d: string) {
  return new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })
}

// ─── Bot bubble ───────────────────────────────────────────────────────────────
function BotBubble({ children, animate = true }: { children: React.ReactNode; animate?: boolean }) {
  return (
    <div className={cn("flex items-start gap-2.5", animate && "animate-in fade-in slide-in-from-bottom-2 duration-300")}>
      <div className="size-8 rounded-full bg-[#E5403B] flex items-center justify-center shrink-0 mt-0.5">
        <Bot className="size-4 text-white" />
      </div>
      <div className="max-w-[80%] rounded-2xl rounded-tl-sm bg-white border border-border px-4 py-3 text-sm shadow-xs">
        {children}
      </div>
    </div>
  )
}

// ─── User bubble ──────────────────────────────────────────────────────────────
function UserBubble({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex justify-end animate-in fade-in slide-in-from-bottom-2 duration-300">
      <div className="max-w-[80%] rounded-2xl rounded-tr-sm bg-[#E5403B] text-white px-4 py-3 text-sm">
        {children}
      </div>
    </div>
  )
}

// ─── Order picker ─────────────────────────────────────────────────────────────
function OrderPicker({ orders, onSelect }: { orders: Order[]; onSelect: (o: Order) => void }) {
  const eligible = orders.filter(o => !o.cancelledAt)
  return (
    <div className="flex flex-col gap-2 mt-2 animate-in fade-in slide-in-from-bottom-2 duration-300">
      {eligible.map(order => {
        const total = parseFloat(order.totalPriceSet.shopMoney.amount)
        return (
          <button
            key={order.id}
            onClick={() => onSelect(order)}
            className="flex items-center justify-between w-full rounded-xl border border-border bg-white hover:border-[#E5403B] hover:shadow-sm transition-all px-4 py-3 text-left group"
          >
            <div>
              <p className="font-semibold text-sm group-hover:text-[#E5403B] transition-colors">{order.name}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{fmt(order.createdAt)} · {order.totalUnits} item{order.totalUnits !== 1 ? "s" : ""}</p>
            </div>
            <p className="font-semibold text-sm shrink-0 ml-4">£{total.toFixed(2)}</p>
          </button>
        )
      })}
    </div>
  )
}

// ─── Item picker ──────────────────────────────────────────────────────────────
function ItemPicker({ order, selected, onToggle }: {
  order: Order
  selected: Set<string>
  onToggle: (id: string) => void
}) {
  const eligible = order.processedItems.filter(i => i.returnStatus === "Eligible" && i.eligibleQuantity > 0)

  if (eligible.length === 0) {
    return (
      <div className="mt-2 rounded-xl border border-border bg-white px-4 py-3 text-sm text-muted-foreground animate-in fade-in duration-300">
        No items in this order are currently eligible for return.
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-2 mt-2 animate-in fade-in slide-in-from-bottom-2 duration-300">
      {eligible.map(item => {
        const isSelected = selected.has(item.id)
        return (
          <button
            key={item.id}
            onClick={() => onToggle(item.id)}
            className={cn(
              "flex items-center gap-3 w-full rounded-xl border px-4 py-3 text-left transition-all",
              isSelected
                ? "border-[#E5403B] bg-[#E5403B]/5"
                : "border-border bg-white hover:border-[#E5403B]/50"
            )}
          >
            <div className={cn(
              "size-4 rounded border-2 shrink-0 flex items-center justify-center transition-colors",
              isSelected ? "border-[#E5403B] bg-[#E5403B]" : "border-muted-foreground/40"
            )}>
              {isSelected && <CheckCircle2 className="size-3 text-white" />}
            </div>
            {item.image?.url
              ? <img src={item.image.url} alt={item.title} className="size-9 rounded-md object-cover border border-border shrink-0" />
              : <div className="size-9 rounded-md bg-muted border border-border shrink-0 flex items-center justify-center"><Package className="size-4 text-muted-foreground" /></div>
            }
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{item.title}</p>
              {item.variant?.title && item.variant.title !== "Default Title" && (
                <p className="text-xs text-muted-foreground">{item.variant.title}</p>
              )}
            </div>
            <p className="text-xs text-muted-foreground shrink-0">{item.eligibleQuantity} eligible</p>
          </button>
        )
      })}
    </div>
  )
}

// ─── Reason picker ────────────────────────────────────────────────────────────
function ReasonPicker({ selected, onSelect }: { selected: string; onSelect: (r: string) => void }) {
  return (
    <div className="grid grid-cols-2 gap-2 mt-2 animate-in fade-in slide-in-from-bottom-2 duration-300">
      {RETURN_REASONS.map(r => (
        <button
          key={r.value}
          onClick={() => onSelect(r.value)}
          className={cn(
            "rounded-xl border-2 px-3 py-3 text-sm font-medium text-left transition-all",
            selected === r.value
              ? "border-[#E5403B] bg-[#E5403B]/5 text-[#E5403B]"
              : "border-border bg-white hover:border-[#E5403B]/50"
          )}
        >
          {r.label}
        </button>
      ))}
    </div>
  )
}

// ─── Review card ──────────────────────────────────────────────────────────────
function ReviewCard({ order, itemIds, reason, submitting, onSubmit }: {
  order: Order; itemIds: string[]; reason: string; submitting: boolean; onSubmit: () => void
}) {
  const items = order.processedItems.filter(i => itemIds.includes(i.id))
  const reasonLabel = RETURN_REASONS.find(r => r.value === reason)?.label || reason
  const total = items.reduce((s, i) => s + (i.unitPrice ?? 0) * i.eligibleQuantity, 0)

  return (
    <div className="mt-2 rounded-xl border border-border bg-white overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-300">
      <div className="px-4 py-3 border-b border-border bg-muted/30">
        <p className="text-sm font-semibold">{order.name} · {items.length} item{items.length !== 1 ? "s" : ""}</p>
        <p className="text-xs text-muted-foreground mt-0.5">Reason: {reasonLabel}</p>
      </div>
      <div className="divide-y divide-border">
        {items.map(item => (
          <div key={item.id} className="flex items-center gap-3 px-4 py-3">
            {item.image?.url
              ? <img src={item.image.url} alt={item.title} className="size-8 rounded-md object-cover border border-border shrink-0" />
              : <div className="size-8 rounded-md bg-muted border border-border shrink-0 flex items-center justify-center"><Package className="size-3.5 text-muted-foreground" /></div>
            }
            <p className="text-sm flex-1 truncate">{item.title}</p>
            {item.unitPrice && <p className="text-sm font-medium shrink-0">£{(item.unitPrice * item.eligibleQuantity).toFixed(2)}</p>}
          </div>
        ))}
      </div>
      {total > 0 && (
        <div className="px-4 py-3 border-t border-border bg-muted/20 flex justify-between text-sm font-semibold">
          <span>Est. refund</span>
          <span className="text-[#E5403B]">£{total.toFixed(2)}</span>
        </div>
      )}
      <div className="px-4 py-3 border-t border-border">
        <Button
          className="w-full bg-[#E5403B] hover:bg-[#cc3935] text-white"
          disabled={submitting}
          onClick={onSubmit}
        >
          {submitting ? <><Loader2 className="size-4 animate-spin mr-2" />Submitting…</> : <><RotateCcw className="size-4 mr-2" />Submit return request</>}
        </Button>
      </div>
    </div>
  )
}

// ─── Main inner component ─────────────────────────────────────────────────────
function AIReturnInner() {
  const { layout } = useSidebarLayout()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [data, setData] = useState<OrdersData | null>(null)
  const [step, setStep] = useState<Step>("loading")
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set())
  const [selectedReason, setSelectedReason] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [returnRef, setReturnRef] = useState<string | null>(null)

  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetch("/api/get-orders")
      .then(async r => {
        const d = await r.json()
        if (!r.ok || d.error != null) { setErrorMsg(d.error || "Failed to load orders."); setStep("error"); return }
        setData(d)
        setStep("order")
      })
      .catch(() => { setErrorMsg("Failed to load orders."); setStep("error") })
  }, [])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [step, selectedOrder, selectedItems.size, selectedReason])

  const toggleItem = (id: string) => {
    setSelectedItems(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const handleOrderSelect = (order: Order) => {
    setSelectedOrder(order)
    setSelectedItems(new Set())
    setSelectedReason("")
    setStep("items")
  }

  const handleItemsConfirm = () => {
    if (selectedItems.size === 0) return
    setStep("reason")
  }

  const handleReasonSelect = (r: string) => {
    setSelectedReason(r)
    setStep("review")
  }

  const handleSubmit = async () => {
    if (!selectedOrder) return
    setSubmitting(true)
    try {
      const rawOrderId = selectedOrder.id.split("/").pop()
      const items = Array.from(selectedItems).map(id => {
        const item = selectedOrder.processedItems.find(i => i.id === id)!
        return { lineItemId: id, quantity: item.eligibleQuantity, reason: selectedReason, description: "" }
      })
      const res = await fetch("/api/submit-return", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId: rawOrderId, items }),
      })
      const result = await res.json()
      if (result.success) {
        setReturnRef(result.returnReference || null)
        setStep("success")
      } else {
        setErrorMsg(result.error || "Submission failed. Please try again.")
      }
    } catch {
      setErrorMsg("Network error. Please try again.")
    } finally {
      setSubmitting(false)
    }
  }

  const handleStartOver = () => {
    setSelectedOrder(null)
    setSelectedItems(new Set())
    setSelectedReason("")
    setReturnRef(null)
    setErrorMsg(null)
    setStep("order")
  }

  const firstName = data?.firstName || "there"
  const eligibleItemsInOrder = selectedOrder
    ? selectedOrder.processedItems.filter(i => i.returnStatus === "Eligible" && i.eligibleQuantity > 0)
    : []

  return (
    <SidebarProvider
      open={sidebarOpen}
      onOpenChange={setSidebarOpen}
      style={{ "--sidebar-width": "18rem", "--sidebar-width-icon": "3.75rem", "--header-height": "3rem" } as React.CSSProperties}
    >
      <AppSidebar variant={layout} user={{ name: data?.firstName || "Customer", email: data?.email || "" }} activeSection="/ai-return" />
      <SidebarInset className="flex flex-col min-h-0 overflow-hidden">
        <SiteHeader
          title={<div className="flex items-center gap-1.5"><Bot className="size-4 shrink-0" /><span>AI Return</span></div>}
          showSearch={false}
          firstName={data?.firstName}
          email={data?.email}
        />

        {/* Chat area */}
        <div className="flex-1 min-h-0 overflow-y-auto styled-scroll">
          <div className="max-w-2xl mx-auto px-4 py-6 flex flex-col gap-4">

            {/* Loading */}
            {step === "loading" && (
              <div className="flex items-center justify-center py-24">
                <Loader2 className="size-7 text-[#E5403B] animate-spin" />
              </div>
            )}

            {/* Error */}
            {step === "error" && (
              <BotBubble>
                <p className="text-destructive">{errorMsg || "Something went wrong. Please refresh and try again."}</p>
              </BotBubble>
            )}

            {/* Step: order selection */}
            {(step === "order" || step === "items" || step === "reason" || step === "review" || step === "success") && (
              <BotBubble animate={false}>
                <p>Hi, <span className="font-semibold">{firstName}</span>! Which order would you like to return from?</p>
              </BotBubble>
            )}
            {step === "order" && data && (
              <OrderPicker orders={data.orders} onSelect={handleOrderSelect} />
            )}

            {/* Step: items */}
            {selectedOrder && (step === "items" || step === "reason" || step === "review" || step === "success") && (
              <>
                <UserBubble>{selectedOrder.name} — {fmt(selectedOrder.createdAt)}</UserBubble>
                <BotBubble>
                  <p>Which items from <span className="font-semibold">{selectedOrder.name}</span> would you like to return?</p>
                </BotBubble>
                {step === "items" && (
                  <>
                    <ItemPicker order={selectedOrder} selected={selectedItems} onToggle={toggleItem} />
                    {eligibleItemsInOrder.length > 0 && (
                      <div className="flex justify-end animate-in fade-in duration-300">
                        <Button
                          className="bg-[#E5403B] hover:bg-[#cc3935] text-white"
                          disabled={selectedItems.size === 0}
                          onClick={handleItemsConfirm}
                        >
                          Continue with {selectedItems.size} item{selectedItems.size !== 1 ? "s" : ""}
                        </Button>
                      </div>
                    )}
                  </>
                )}
              </>
            )}

            {/* Step: reason */}
            {selectedItems.size > 0 && (step === "reason" || step === "review" || step === "success") && (
              <>
                <UserBubble>
                  {Array.from(selectedItems).map(id => selectedOrder?.processedItems.find(i => i.id === id)?.title).filter(Boolean).join(", ")}
                </UserBubble>
                <BotBubble>
                  <p>Why are you returning {selectedItems.size === 1 ? "this item" : "these items"}?</p>
                </BotBubble>
                {step === "reason" && (
                  <ReasonPicker selected={selectedReason} onSelect={handleReasonSelect} />
                )}
              </>
            )}

            {/* Step: review */}
            {selectedReason && (step === "review" || step === "success") && (
              <>
                <UserBubble>{RETURN_REASONS.find(r => r.value === selectedReason)?.label}</UserBubble>
                <BotBubble>
                  <p>Here's your return summary. Everything look right?</p>
                </BotBubble>
                {step === "review" && selectedOrder && (
                  <ReviewCard
                    order={selectedOrder}
                    itemIds={Array.from(selectedItems)}
                    reason={selectedReason}
                    submitting={submitting}
                    onSubmit={handleSubmit}
                  />
                )}
                {errorMsg && step === "review" && (
                  <BotBubble>
                    <p className="text-destructive">{errorMsg}</p>
                  </BotBubble>
                )}
              </>
            )}

            {/* Step: success */}
            {step === "success" && (
              <>
                <UserBubble>Submit return request</UserBubble>
                <BotBubble>
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="size-4 text-green-500 shrink-0" />
                      <p className="font-semibold">Return submitted!</p>
                    </div>
                    <p className="text-muted-foreground text-xs leading-relaxed">We've received your request and our team will review it within 2–3 business days.</p>
                    {returnRef && <p className="text-xs font-mono bg-muted rounded px-2 py-1 w-fit">Ref: {returnRef}</p>}
                  </div>
                </BotBubble>
                <div className="flex justify-center animate-in fade-in duration-500">
                  <Button variant="outline" onClick={handleStartOver} className="gap-2">
                    <ArrowLeft className="size-4" /> Return another order
                  </Button>
                </div>
              </>
            )}

            <div ref={bottomRef} />
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}

export default function AIReturnPage() {
  return (
    <Suspense>
      <SidebarLayoutProvider>
        <AIReturnInner />
      </SidebarLayoutProvider>
    </Suspense>
  )
}
