"use client"

import * as React from "react"
import { useEffect, useState, useMemo, useCallback, useRef, Suspense } from "react"
import { useSearchParams } from "next/navigation"
import { toast } from "sonner"
import {
  ArrowLeft, ArrowRight, CheckCircle2, Package, RotateCcw,
  Minus, Plus, Info, Lock, Loader2, Wand2, SlidersHorizontal,
  XCircle, Truck, ChevronRight,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Textarea } from "@/components/ui/textarea"
import { Separator } from "@/components/ui/separator"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { AppSidebar } from "@/components/app-sidebar"
import { SiteHeader } from "@/components/site-header"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { SidebarLayoutProvider, useSidebarLayout } from "@/components/sidebar-layout-provider"
import { cn } from "@/lib/utils"

// ─── Types ────────────────────────────────────────────────────────────────────
interface LineItem {
  id: string; title: string; quantity: number; eligibleQuantity: number
  refundedQuantity: number; activeReturnQuantity: number
  unitPrice?: number | null; returnStatus: string; returnReason?: string
  lineDeliveredAt?: string | null; productHandle?: string | null
  image?: { url: string } | null; variant?: { title: string } | null
}
interface Order {
  id: string; name: string; createdAt: string; cancelledAt?: string | null
  displayFulfillmentStatus: string
  totalPriceSet: { shopMoney: { amount: string; currencyCode: string } }
  totalRefundedSet?: { shopMoney: { amount: string } } | null
  processedItems: LineItem[]
  orderStatus: string; totalUnits: number
  deliveredCount: number; dispatchedCount: number; confirmedCount: number; notDispatchedCount: number
  earliestDelivery?: string | null; latestDelivery?: string | null
}
interface OrdersData { firstName: string; email: string; orders: Order[] }
interface SelectedItem { lineItemId: string; quantity: number; reason: string; description: string }

const RETURN_REASONS = [
  { value: "CHANGED_MIND",     label: "Changed my mind" },
  { value: "WRONG_ITEM",       label: "Wrong item received" },
  { value: "FAULTY",           label: "Faulty / not working" },
  { value: "DAMAGED",          label: "Damaged in transit" },
  { value: "NOT_AS_DESCRIBED", label: "Not as described" },
  { value: "OTHER",            label: "Other" },
]

const ORDER_STATUS_FILTERS = ["Delivered", "Partially delivered", "On its way", "Partially dispatched", "Confirmed"]

const STEPS = [
  { id: 1, label: "Order" },
  { id: 2, label: "Items" },
  { id: 3, label: "Reasons" },
  { id: 4, label: "Review" },
]

const PAGE_SIZE = 12

// ─── Helpers ──────────────────────────────────────────────────────────────────
function fmt(d: string) {
  return new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })
}

// ─── Step Indicator ───────────────────────────────────────────────────────────
function StepIndicator({ step }: { step: number }) {
  return (
    <div className="flex items-center gap-1 w-full">
      {STEPS.map((s, i) => {
        const done    = step > s.id
        const current = step === s.id
        return (
          <React.Fragment key={s.id}>
            <div className={cn(
              "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-all select-none shrink-0",
              done    ? "bg-foreground text-background"
              : current ? "bg-foreground/10 text-foreground border border-foreground/20"
              : "text-muted-foreground"
            )}>
              {done
                ? <CheckCircle2 className="size-3 shrink-0" />
                : <span className={cn("size-3.5 rounded-full border flex items-center justify-center text-[9px] font-bold shrink-0",
                    current ? "border-foreground" : "border-muted-foreground/40"
                  )}>{s.id}</span>
              }
              <span className="whitespace-nowrap">{s.label}</span>
            </div>
            {i < STEPS.length - 1 && (
              <div className={cn("h-px flex-1 min-w-[1rem] transition-colors", done ? "bg-foreground/30" : "bg-border")} />
            )}
          </React.Fragment>
        )
      })}
    </div>
  )
}

// ─── Product Image ─────────────────────────────────────────────────────────────
function productUrl(item: LineItem) {
  return item.productHandle
    ? `https://iblazevape.co.uk/products/${item.productHandle}`
    : "https://iblazevape.co.uk"
}

function ProductImg({ item, size = "md", clickable = false }: { item: LineItem; size?: "sm" | "md"; clickable?: boolean }) {
  const cls = size === "md" ? "size-10" : "size-8"
  const inner = (
    <div className={cn(cls, "rounded-md overflow-hidden bg-white border border-border shrink-0", clickable && "cursor-pointer hover:opacity-90 transition-opacity")}>
      {item.image?.url
        ? <img src={item.image.url} alt={item.title} className="w-full h-full object-cover" />
        : <div className="flex h-full w-full items-center justify-center bg-muted"><Package className="size-3.5 text-muted-foreground" /></div>
      }
    </div>
  )
  if (clickable) {
    return <a href={productUrl(item)} target="_blank" rel="noopener noreferrer" className="shrink-0">{inner}</a>
  }
  return inner
}

// ─── Card status glow ─────────────────────────────────────────────────────────
function cardGlowClass(order: Order): string {
  if (order.cancelledAt) return "hover:border-red-300 hover:shadow-[0_0_0_3px_rgba(239,68,68,0.1),0_2px_10px_rgba(239,68,68,0.08)]"
  switch (order.orderStatus) {
    case "Delivered":            return "hover:border-green-300 hover:shadow-[0_0_0_3px_rgba(34,197,94,0.1),0_2px_10px_rgba(34,197,94,0.08)]"
    case "Partially delivered":  return "hover:border-amber-300 hover:shadow-[0_0_0_3px_rgba(245,158,11,0.1),0_2px_10px_rgba(245,158,11,0.08)]"
    case "On its way":
    case "Partially dispatched": return "hover:border-blue-300 hover:shadow-[0_0_0_3px_rgba(59,130,246,0.1),0_2px_10px_rgba(59,130,246,0.08)]"
    case "Confirmed":            return "hover:border-zinc-400 hover:shadow-[0_0_0_3px_rgba(161,161,170,0.15),0_2px_10px_rgba(161,161,170,0.1)]"
    default:                     return "hover:border-zinc-300 hover:shadow-sm"
  }
}

// ─── Card status label ────────────────────────────────────────────────────────
function CardStatusLabel({ order }: { order: Order }) {
  const { orderStatus, cancelledAt, deliveredCount, dispatchedCount, confirmedCount, notDispatchedCount } = order
  const deliveryDate = order.latestDelivery || order.earliestDelivery
  const fmtDate = (d: string) => new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })

  if (cancelledAt) return (
    <span className="text-[10px] font-medium text-red-600 shrink-0 inline-flex items-center gap-1">
      <XCircle className="size-3 shrink-0" />Cancelled {fmtDate(cancelledAt)}
    </span>
  )

  const notYetShipped = confirmedCount + notDispatchedCount
  const hasMixedFulfillment = [deliveredCount, dispatchedCount, notYetShipped].filter(n => n > 0).length > 1
  if (hasMixedFulfillment) {
    const parts = [
      deliveredCount > 0 && <span key="d" className="inline-flex items-center gap-0.5 text-green-600"><CheckCircle2 className="size-3 shrink-0" />{deliveredCount} delivered</span>,
      dispatchedCount > 0 && <span key="s" className="inline-flex items-center gap-0.5 text-slate-600"><Truck className="size-3 shrink-0" />{dispatchedCount} on its way</span>,
      notYetShipped > 0 && <span key="p" className="inline-flex items-center gap-0.5 text-muted-foreground"><Info className="size-3 shrink-0" />{notYetShipped} not yet shipped</span>,
    ].filter(Boolean)
    return (
      <span className="text-[10px] font-medium shrink-0 flex items-center gap-0.5">
        {parts.map((el, i) => <React.Fragment key={i}>{i > 0 && <span className="text-muted-foreground"> · </span>}{el}</React.Fragment>)}
      </span>
    )
  }

  const label = orderStatus === "Delivered" && deliveryDate ? `Delivered ${fmtDate(deliveryDate)}`
    : orderStatus === "On its way" || orderStatus === "Partially dispatched" ? "On its way"
    : orderStatus

  const cls = orderStatus === "Delivered" ? "text-green-600"
    : orderStatus === "On its way" || orderStatus === "Partially dispatched" ? "text-blue-600"
    : orderStatus === "Cancelled" ? "text-red-600"
    : "text-muted-foreground"

  const Icon = orderStatus === "Delivered" ? CheckCircle2
    : orderStatus === "On its way" || orderStatus === "Partially dispatched" ? Truck
    : Info

  return (
    <span className={cn("text-[10px] font-medium shrink-0 inline-flex items-center gap-1", cls)}>
      <Icon className="size-3 shrink-0" />{label}
    </span>
  )
}

// ─── Order Grid Card — matches main portal OrderCard exactly ─────────────────
function OrderGridCard({ order, onClick }: { order: Order; onClick: () => void }) {
  const allUniqueImages = order.processedItems
    .map(i => i.image?.url)
    .filter((u, i, a): u is string => !!u && a.indexOf(u) === i)
  const uniqueImages = allUniqueImages.slice(0, 3)
  const extra = allUniqueImages.length - uniqueImages.length
  const total = parseFloat(order.totalPriceSet.shopMoney.amount)
  const cancelled = !!order.cancelledAt

  return (
    <button
      onClick={cancelled ? undefined : onClick}
      className={cn(
        "group w-full h-full text-left bg-card border rounded-xl transition-[border-color,box-shadow] duration-150 focus:outline-none focus-visible:ring-0 flex flex-col overflow-hidden",
        cancelled ? "border-border opacity-60 cursor-not-allowed" : cn("border-border", cardGlowClass(order))
      )}
    >
      {/* Info section */}
      <div className="flex-1 px-4 pt-4 pb-3 flex flex-col gap-1.5">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className={cn("font-semibold text-sm truncate", !cancelled && "group-hover:underline")}>{order.name}</p>
          </div>
          <p className="font-semibold text-sm shrink-0">£{total.toFixed(2)}</p>
        </div>
        <p className="text-xs text-muted-foreground">Ordered {fmt(order.createdAt)} &bull; {order.totalUnits} item{order.totalUnits !== 1 ? "s" : ""}</p>
      </div>
      {/* Images footer */}
      <div className="px-4 py-2.5 border-t border-border bg-muted/60 flex items-center gap-1.5">
        <div className="flex items-center flex-1 min-w-0">
          <div className="flex -space-x-2">
            {uniqueImages.length > 0 ? uniqueImages.map((url, i) => (
              <div key={i} className="w-8 h-8 rounded-md border-2 border-muted bg-card overflow-hidden shadow-sm shrink-0">
                <img src={url} alt="" className="w-full h-full object-cover" />
              </div>
            )) : (
              <div className="w-8 h-8 rounded-md border-2 border-muted bg-card overflow-hidden shadow-sm shrink-0 flex items-center justify-center bg-muted text-muted-foreground">
                <Package className="size-3" />
              </div>
            )}
          </div>
          {extra > 0 && <span className="text-[10px] font-medium text-muted-foreground ml-1.5">+{extra}</span>}
        </div>
        <CardStatusLabel order={order} />
      </div>
    </button>
  )
}

// ─── Step 1: Order Selection ──────────────────────────────────────────────────
function StepOrders({
  orders, firstName, statusFilter, onStatusFilter, onSelect,
}: {
  orders: Order[]; firstName: string; statusFilter: string[]
  onStatusFilter: (f: string[]) => void; onSelect: (o: Order) => void
}) {
  const [visible, setVisible] = useState(PAGE_SIZE)
  const loaderRef = useRef<HTMLDivElement>(null)

  const filtered = useMemo(() => orders.filter(o => statusFilter.length === 0 || statusFilter.includes(o.orderStatus)), [orders, statusFilter])

  // Infinite scroll observer
  useEffect(() => {
    const el = loaderRef.current
    if (!el) return
    const obs = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting) setVisible(v => v + PAGE_SIZE)
    }, { rootMargin: "200px" })
    obs.observe(el)
    return () => obs.disconnect()
  }, [])

  const shown = filtered.slice(0, visible)
  const hasMore = visible < filtered.length

  return (
    <div className="flex flex-col gap-4 h-full">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-shrink-0">
        <div>
          <h2 className="text-lg font-semibold">{firstName ? `Hi, ${firstName} 👋` : "Your orders"}</h2>
          <p className="text-xs text-muted-foreground mt-0.5">{filtered.length} of {orders.length} orders shown</p>
        </div>
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs">
              <SlidersHorizontal className="size-3.5" />Status
              {statusFilter.length > 0 && <span className="size-4 rounded-full bg-foreground text-background text-[10px] font-bold flex items-center justify-center">{statusFilter.length}</span>}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-52 p-2 bg-white" align="end">
            <div className="flex flex-col gap-0.5">
              {ORDER_STATUS_FILTERS.map(s => (
                <label key={s} className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-muted cursor-pointer text-xs">
                  <Checkbox checked={statusFilter.includes(s)} onCheckedChange={c => onStatusFilter(c ? [...statusFilter, s] : statusFilter.filter(x => x !== s))} />
                  {s}
                </label>
              ))}
              {statusFilter.length > 0 && <button onClick={() => onStatusFilter([])} className="text-xs text-muted-foreground px-2 py-1 text-left hover:bg-muted rounded-md mt-1">Clear</button>}
            </div>
          </PopoverContent>
        </Popover>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
        {shown.map(order => (
          <OrderGridCard key={order.id} order={order} onClick={() => onSelect(order)} />
        ))}
        {filtered.length === 0 && (
          <div className="col-span-full py-16 text-center text-sm text-muted-foreground">No orders match the selected filter.</div>
        )}
      </div>

      {/* Infinite scroll sentinel */}
      <div ref={loaderRef} className="py-2 flex justify-center">
        {hasMore && <Loader2 className="size-5 text-muted-foreground animate-spin" />}
      </div>
    </div>
  )
}

// ─── Ineligible reason helpers ────────────────────────────────────────────────
function ineligibleReason(status: string, returnReason?: string, lineDeliveredAt?: string | null): { text: string; detail?: string } {
  const fmtDate = (d: string) => new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })

  switch (status) {
    case "Return in progress":  return { text: "Return in progress", detail: "A return for this item is already being processed by our team." }
    case "Return requested":    return { text: "Return already requested", detail: "A return request for this item is awaiting review." }
    case "Return completed":
    case "Returned":            return { text: "Already returned", detail: "This item has already been returned." }
    case "Refunded":
    case "Refund pending":      return { text: "Already refunded", detail: "This item has already been refunded." }
    case "Passed the return window": {
      const dateText = lineDeliveredAt ? `Delivered ${fmtDate(lineDeliveredAt)}. ` : ""
      return { text: "Return window expired", detail: `${dateText}The 30-day return window for this item has closed.` }
    }
    case "On its way":          return { text: "Not yet delivered", detail: "Items can only be returned once they've been delivered to you." }
    case "Not yet dispatched":  return { text: "Not yet dispatched", detail: "This item hasn't left our warehouse yet — the return window opens on delivery." }
    case "Confirmed":           return { text: "Order not yet dispatched", detail: "Your order has been confirmed but not yet dispatched. Returns open once delivered." }
    case "Return declined":     return { text: "Return declined", detail: returnReason || "Your return request for this item was declined by our team." }
    case "Final sale":          return { text: "Final sale", detail: "This is a final sale item and is not eligible for return." }
    case "Return cancelled":    return { text: "Return cancelled", detail: "The return for this item was cancelled." }
    case "Cancelled":           return { text: "Order cancelled", detail: "This order was cancelled — no return is applicable." }
    default:                    return { text: "Not eligible", detail: returnReason || "This item is not currently eligible for return." }
  }
}

// Status icon colour (bare text colour only — no background circle)
function ineligibleIconClass(status: string): string {
  switch (status) {
    case "Return in progress":
    case "Return requested":  return "text-blue-500"
    case "Return completed":
    case "Returned":
    case "Refunded":
    case "Refund pending":    return "text-green-600"
    case "Return declined":
    case "Return cancelled":  return "text-red-500"
    case "On its way":        return "text-blue-400"
    case "Passed the return window":
    case "Final sale":
    default:                  return "text-zinc-400"
  }
}

function IneligibleExplainer({ order, avgPrice }: { order: Order; avgPrice: number }) {
  const ineligibleItems = order.processedItems.filter(i => !(i.returnStatus === "Eligible" && i.eligibleQuantity > 0))

  const groups = ineligibleItems.reduce<Record<string, LineItem[]>>((acc, item) => {
    const key = item.returnStatus
    if (!acc[key]) acc[key] = []
    acc[key].push(item)
    return acc
  }, {})

  return (
    <div className="flex flex-col gap-5 w-full">
      <div>
        <h2 className="text-lg font-semibold">No items available to return</h2>
        <p className="text-sm text-muted-foreground mt-1">Here's why the items in {order.name} can't be returned right now.</p>
      </div>

      <div className="flex flex-col gap-3">
        {Object.entries(groups).map(([status, items]) => {
          const { text, detail } = ineligibleReason(status, items[0]?.returnReason, items[0]?.lineDeliveredAt)
          const iconCls = ineligibleIconClass(status)
          const totalQty = items.reduce((s, i) => s + i.quantity, 0)

          return (
            <div key={status} className="rounded-xl border border-border bg-white overflow-hidden">
              {/* Group header */}
              <div className="px-4 py-3 border-b border-border bg-muted/30 flex items-start gap-2.5">
                <Info className={cn("size-4 shrink-0 mt-0.5", iconCls)} />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold">{text}</p>
                  {detail && <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{detail}</p>}
                </div>
                <span className="text-xs text-muted-foreground shrink-0 font-medium tabular-nums">{totalQty} unit{totalQty !== 1 ? "s" : ""}</span>
              </div>

              {/* Items */}
              <div className="divide-y divide-border">
                {items.map(item => {
                  const price = item.unitPrice ?? avgPrice
                  return (
                    <div key={item.id} className="flex items-center gap-3 px-4 py-3">
                      <ProductImg item={item} size="sm" clickable />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{item.title}</p>
                        {item.variant?.title && item.variant.title !== "Default Title" && (
                          <p className="text-xs text-muted-foreground">{item.variant.title}</p>
                        )}
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-sm font-semibold tabular-nums">£{(price * item.quantity).toFixed(2)}</p>
                        <p className="text-xs text-muted-foreground">{item.quantity} × £{price.toFixed(2)}</p>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── Step 2: Item Selection (table) ───────────────────────────────────────────
function StepSelectItems({
  order, selected, onToggle, onQtyChange, avgPrice,
}: {
  order: Order; selected: Record<string, SelectedItem>
  onToggle: (item: LineItem) => void; onQtyChange: (id: string, qty: number) => void; avgPrice: number
}) {
  const eligibleItems = order.processedItems.filter(i => i.returnStatus === "Eligible" && i.eligibleQuantity > 0)
  const [pageSize, setPageSize] = useState("10")
  const [currentPage, setCurrentPage] = useState(1)
  const selectedCount = Object.keys(selected).length
  const isAllSelected = eligibleItems.length > 0 && eligibleItems.every(i => !!selected[i.id])

  const pageSizeNum = pageSize === "all" ? Math.max(eligibleItems.length, 1) : parseInt(pageSize)
  const totalPages = Math.ceil(eligibleItems.length / pageSizeNum) || 1
  const paginated = eligibleItems.slice((currentPage - 1) * pageSizeNum, currentPage * pageSizeNum)

  const handleSelectAll = (checked: boolean) => {
    eligibleItems.forEach(item => {
      const has = !!selected[item.id]
      if (checked && !has) onToggle(item)
      if (!checked && has) onToggle(item)
    })
  }

  if (eligibleItems.length === 0) {
    return <IneligibleExplainer order={order} avgPrice={avgPrice} />
  }

  return (
    <div className="flex flex-col gap-4 w-full">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Select items to return</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            {selectedCount > 0 ? `${selectedCount} item${selectedCount !== 1 ? "s" : ""} selected` : `${eligibleItems.length} eligible item${eligibleItems.length !== 1 ? "s" : ""} in ${order.name}`}
          </p>
        </div>
        <Select value={pageSize} onValueChange={v => { setPageSize(v); setCurrentPage(1) }}>
          <SelectTrigger className="h-8 w-[100px] text-xs bg-white shrink-0"><SelectValue /></SelectTrigger>
          <SelectContent align="end">
            <SelectItem value="5">Show 5</SelectItem>
            <SelectItem value="10">Show 10</SelectItem>
            <SelectItem value="25">Show 25</SelectItem>
            <SelectItem value="all">Show All</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-xl border border-border overflow-hidden bg-white">
        <Table>
          <TableHeader className="bg-muted/30">
            <TableRow className="hover:bg-transparent">
              <TableHead className="w-8 pl-4 pr-0">
                <Checkbox checked={isAllSelected} onCheckedChange={c => handleSelectAll(!!c)} className="data-[state=checked]:bg-[#E5403B] data-[state=checked]:border-[#E5403B]" />
              </TableHead>
              <TableHead className="pl-3">Product</TableHead>
              <TableHead>Variant</TableHead>
              <TableHead className="text-center">Qty</TableHead>
              <TableHead className="text-right pr-5">Total</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginated.map((item) => {
              const isSelected = !!selected[item.id]
              const sel = selected[item.id]
              const price = item.unitPrice ?? avgPrice
              const daysLeft = item.lineDeliveredAt ? (() => {
                const dl = 30 - Math.floor((Date.now() - new Date(item.lineDeliveredAt!).getTime()) / (1000 * 60 * 60 * 24))
                return dl > 0 && dl <= 5 ? dl : null
              })() : null

              return (
                <React.Fragment key={item.id}>
                  <TableRow
                    className={cn("cursor-pointer transition-colors", isSelected && "bg-[#E5403B]/5 hover:bg-[#E5403B]/5")}
                    onClick={() => onToggle(item)}
                  >
                    <TableCell className="pl-4 pr-0 py-3" onClick={e => e.stopPropagation()}>
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => onToggle(item)}
                        className="data-[state=checked]:bg-[#E5403B] data-[state=checked]:border-[#E5403B]"
                      />
                    </TableCell>
                    <TableCell className="pl-3 py-3">
                      <div className="flex items-center gap-3">
                        <ProductImg item={item} size="md" />
                        <div className="min-w-0">
                          <p className="font-medium text-sm truncate max-w-[200px]">{item.title}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-xs text-muted-foreground">£{price.toFixed(2)} each</span>
                            {daysLeft !== null && <span className="text-[10px] font-medium text-amber-700 bg-amber-50 border border-amber-200 rounded-full px-1.5">{daysLeft}d left</span>}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="py-3 text-sm text-muted-foreground">
                      {item.variant?.title && item.variant.title !== "Default Title" ? item.variant.title : <span className="text-muted-foreground/40">—</span>}
                    </TableCell>
                    <TableCell className="py-3 text-sm text-center tabular-nums">{item.eligibleQuantity}</TableCell>
                    <TableCell className="py-3 text-sm text-right pr-5 font-semibold tabular-nums">
                      £{(price * (isSelected ? (sel?.quantity ?? item.eligibleQuantity) : item.eligibleQuantity)).toFixed(2)}
                    </TableCell>
                  </TableRow>

                  {/* Expanded qty row */}
                  {isSelected && item.eligibleQuantity > 1 && (
                    <TableRow className="bg-muted/10 hover:bg-muted/10">
                      <TableCell />
                      <TableCell colSpan={4} className="py-2 pl-3 pr-5">
                        <div className="flex items-center gap-3">
                          <span className="text-xs text-muted-foreground font-medium">Return quantity:</span>
                          <div className="flex items-center gap-1.5">
                            <button onClick={e => { e.stopPropagation(); onQtyChange(item.id, Math.max(1, (sel?.quantity ?? 1) - 1)) }} className="size-6 rounded border border-border bg-white flex items-center justify-center hover:bg-muted transition-colors">
                              <Minus className="size-3" />
                            </button>
                            <span className="w-6 text-center text-sm font-semibold tabular-nums">{sel?.quantity ?? 1}</span>
                            <button onClick={e => { e.stopPropagation(); onQtyChange(item.id, Math.min(item.eligibleQuantity, (sel?.quantity ?? 1) + 1)) }} className="size-6 rounded border border-border bg-white flex items-center justify-center hover:bg-muted transition-colors">
                              <Plus className="size-3" />
                            </button>
                          </div>
                          <span className="text-xs text-muted-foreground">of {item.eligibleQuantity} available</span>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </React.Fragment>
              )
            })}
          </TableBody>
        </Table>

        {pageSize !== "all" && eligibleItems.length > pageSizeNum && (
          <div className="px-4 py-3 border-t border-border flex items-center justify-between text-xs text-muted-foreground bg-muted/20">
            <span>Showing {Math.min((currentPage - 1) * pageSizeNum + 1, eligibleItems.length)}–{Math.min(currentPage * pageSizeNum, eligibleItems.length)} of {eligibleItems.length}</span>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}>Previous</Button>
              <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage >= totalPages}>Next</Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Step 3: Add Reasons ──────────────────────────────────────────────────────
function StepReasons({
  order, selected, onReasonChange, onDescChange, avgPrice,
}: {
  order: Order; selected: Record<string, SelectedItem>
  onReasonChange: (id: string, reason: string) => void; onDescChange: (id: string, desc: string) => void; avgPrice: number
}) {
  const selectedItems = order.processedItems.filter(i => selected[i.id])
  const [currentIdx, setCurrentIdx] = useState(0)
  const item = selectedItems[Math.min(currentIdx, selectedItems.length - 1)]
  if (!item) return null
  const sel = selected[item.id]
  const price = item.unitPrice ?? avgPrice
  const canAdvance = !!(sel?.reason && (sel.reason !== "OTHER" || (sel.description?.trim().length ?? 0) > 0))

  return (
    <div className="flex flex-col gap-6 w-full">
      <div>
        <h2 className="text-lg font-semibold">Why are you returning?</h2>
        <p className="text-xs text-muted-foreground mt-0.5">Item {currentIdx + 1} of {selectedItems.length}</p>
      </div>

      {selectedItems.length > 1 && (
        <div className="flex gap-1.5">
          {selectedItems.map((si, i) => (
            <button key={si.id} onClick={() => setCurrentIdx(i)} className={cn("h-1 flex-1 rounded-full transition-all", i === currentIdx ? "bg-[#E5403B]" : selected[si.id]?.reason ? "bg-zinc-300" : "bg-zinc-200")} />
          ))}
        </div>
      )}

      <div className="rounded-xl border border-border bg-white p-4 flex items-center gap-3">
        <ProductImg item={item} size="md" />
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm">{item.title}</p>
          {item.variant?.title && item.variant.title !== "Default Title" && <p className="text-xs text-muted-foreground">{item.variant.title}</p>}
          <p className="text-xs text-muted-foreground mt-0.5">{sel?.quantity ?? 1} × £{price.toFixed(2)}</p>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <p className="text-sm font-semibold">Return reason</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {RETURN_REASONS.map(r => (
            <button key={r.value} onClick={() => onReasonChange(item.id, r.value)} className={cn("px-3 py-3 rounded-xl border-2 text-left text-sm font-medium transition-all", sel?.reason === r.value ? "border-[#E5403B] bg-[#E5403B]/5 text-[#E5403B]" : "border-border bg-white hover:border-zinc-300")}>
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {sel?.reason && (
        <div>
          <label className="text-sm font-semibold block mb-2">
            {sel.reason === "OTHER" ? <>Notes <span className="text-destructive">*required</span></> : "Notes (optional)"}
          </label>
          <Textarea value={sel.description} onChange={e => onDescChange(item.id, e.target.value)} placeholder={sel.reason === "OTHER" ? "Please describe your reason..." : "Any additional info for our team..."} rows={3} className="bg-white resize-none" />
        </div>
      )}

      {selectedItems.length > 1 && (
        <div className="flex gap-3">
          {currentIdx > 0 && <Button variant="outline" onClick={() => setCurrentIdx(i => i - 1)} className="flex-1"><ArrowLeft className="size-4" /> Previous</Button>}
          {currentIdx < selectedItems.length - 1 && canAdvance && <Button variant="outline" onClick={() => setCurrentIdx(i => i + 1)} className="flex-1">Next <ArrowRight className="size-4" /></Button>}
        </div>
      )}
    </div>
  )
}

// ─── Step 4: Review & Submit ──────────────────────────────────────────────────
function StepReview({ order, selected, avgPrice, onSubmit, submitting }: {
  order: Order; selected: Record<string, SelectedItem>; avgPrice: number; onSubmit: () => void; submitting: boolean
}) {
  const [policyAccepted, setPolicyAccepted] = useState(false)
  const [calcLoading, setCalcLoading] = useState(false)
  const [calcTotal, setCalcTotal] = useState<number | null>(null)
  const selectedItems = order.processedItems.filter(i => selected[i.id])
  const rawOrderId = order.id.split("/").pop()
  const naiveTotal = selectedItems.reduce((s, i) => s + (i.unitPrice ?? avgPrice) * (selected[i.id]?.quantity ?? 1), 0)

  useEffect(() => {
    const controller = new AbortController()
    setCalcLoading(true); setCalcTotal(null)
    const items = selectedItems.map(i => ({ lineItemId: i.id, quantity: selected[i.id]?.quantity ?? 1, reason: selected[i.id]?.reason || "OTHER" }))
    fetch("/api/calculate-return", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ orderId: rawOrderId, items }), signal: controller.signal })
      .then(r => r.json()).then(d => { if (d?.returnTotal != null) setCalcTotal(d.returnTotal) }).catch(() => {}).finally(() => setCalcLoading(false))
    return () => controller.abort()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="flex flex-col gap-5 max-w-2xl">
      <div>
        <h2 className="text-lg font-semibold">Review your return</h2>
        <p className="text-xs text-muted-foreground mt-0.5">Check everything looks right before submitting.</p>
      </div>

      <div className="rounded-xl border border-border bg-white overflow-hidden">
        <div className="px-4 py-3 border-b border-border bg-muted/30">
          <p className="text-sm font-semibold">Items ({selectedItems.length})</p>
        </div>
        <div className="divide-y divide-border">
          {selectedItems.map(item => {
            const sel = selected[item.id]; const price = item.unitPrice ?? avgPrice
            const reason = RETURN_REASONS.find(r => r.value === sel?.reason)?.label
            return (
              <div key={item.id} className="flex items-start gap-3 p-4">
                <ProductImg item={item} size="sm" />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm">{item.title}</p>
                  {item.variant?.title && item.variant.title !== "Default Title" && <p className="text-xs text-muted-foreground">{item.variant.title}</p>}
                  <p className="text-xs text-muted-foreground mt-0.5">{sel?.quantity ?? 1} × £{price.toFixed(2)}</p>
                  {reason && <p className="text-xs text-[#E5403B] mt-0.5 font-medium">{reason}</p>}
                  {sel?.description && <p className="text-xs text-muted-foreground italic mt-0.5">"{sel.description}"</p>}
                </div>
                <p className="font-semibold text-sm tabular-nums shrink-0">£{(price * (sel?.quantity ?? 1)).toFixed(2)}</p>
              </div>
            )
          })}
        </div>
      </div>

      <div className="rounded-xl border border-border bg-white overflow-hidden">
        <div className="px-4 py-3 border-b border-border bg-muted/30"><p className="text-sm font-semibold">Estimated refund</p></div>
        <div className="p-4 flex flex-col gap-2">
          <div className="flex justify-between text-sm"><span className="text-muted-foreground">Item total</span><span>£{naiveTotal.toFixed(2)}</span></div>
          <Separator />
          <div className="flex justify-between font-semibold">
            <span>Est. refund</span>
            {calcLoading ? <span className="flex items-center gap-1.5 text-muted-foreground text-sm"><Loader2 className="size-3 animate-spin" />Calculating…</span> : <span className="text-[#E5403B]">£{(calcTotal ?? naiveTotal).toFixed(2)}</span>}
          </div>
          <p className="text-[11px] text-muted-foreground leading-relaxed"><Info className="size-3 inline mr-0.5" />Estimates exclude return shipping and applicable restocking fees. Final amount confirmed after merchant review.</p>
        </div>
      </div>

      {/* Vape-specific policy rules */}
      <div className="rounded-xl border border-amber-200 bg-amber-50 overflow-hidden">
        <div className="px-4 py-3 border-b border-amber-200 flex items-center gap-2">
          <Info className="size-4 text-amber-700 shrink-0" />
          <p className="text-sm font-semibold text-amber-900">Before you submit — important policy notes</p>
        </div>
        <div className="divide-y divide-amber-100">
          {[
            { product: "Vape kits & mods", rule: "30-day return from delivery. Items must be unused and in original packaging." },
            { product: "E-liquids & disposables", rule: "Must be completely unopened and factory-sealed. No returns on opened or used liquids." },
            { product: "Tanks & clearomisers", rule: "7-day Dead On Arrival window — faults must be reported within 7 days of delivery." },
            { product: "Batteries & chargers", rule: "60-day battery warranty, 30-day charger warranty from delivery." },
            { product: "Return postage", rule: "Tracked postage is required and at your expense. Refunds issued within 5–10 business days of receipt." },
          ].map(({ product, rule }) => (
            <div key={product} className="px-4 py-2.5 flex gap-3">
              <p className="text-xs font-semibold text-amber-800 shrink-0 w-36">{product}</p>
              <p className="text-xs text-amber-700 leading-relaxed">{rule}</p>
            </div>
          ))}
        </div>
      </div>

      <label className="flex items-start gap-3 cursor-pointer">
        <Checkbox checked={policyAccepted} onCheckedChange={c => setPolicyAccepted(!!c)} className="mt-0.5 data-[state=checked]:bg-[#E5403B] data-[state=checked]:border-[#E5403B] shrink-0" />
        <span className="text-sm">I have read the policy notes above and accept the <a href="https://iblazevape.co.uk/policies/refund-policy" target="_blank" rel="noopener noreferrer" className="text-[#E5403B] hover:underline font-medium">iBlaze returns policy</a>. I confirm the items I'm returning meet these conditions.</span>
      </label>

      {!policyAccepted && <p className="flex items-center gap-2 text-xs text-muted-foreground"><Lock className="size-3.5 shrink-0" />Accept the policy above to submit your return.</p>}

      <Button size="lg" className="w-full bg-[#E5403B] hover:bg-[#cc3935] text-white h-12 text-base font-semibold" disabled={!policyAccepted || submitting} onClick={onSubmit}>
        {submitting ? <><Loader2 className="size-5 animate-spin mr-2" />Submitting…</> : <><RotateCcw className="size-5 mr-2" />Submit return request</>}
      </Button>
    </div>
  )
}

// ─── Step 5: Success ──────────────────────────────────────────────────────────
function StepSuccess({ order, returnRef, returnedCount, returnedRefund, onStartOver }: {
  order: Order; returnRef: string | null; returnedCount: number; returnedRefund: number; onStartOver: () => void
}) {
  const rawOrderId = order.id.split("/").pop()
  const orderStatusUrl = `https://account.iblazevape.co.uk/orders/${rawOrderId}`
  return (
    <div className="flex flex-col items-center text-center gap-6 py-8 max-w-sm mx-auto">
      <div className="size-20 rounded-full bg-green-50 border-4 border-green-100 flex items-center justify-center">
        <CheckCircle2 className="size-10 text-green-500" />
      </div>
      <div>
        <h2 className="text-xl font-semibold">Return requested!</h2>
        <p className="text-sm text-muted-foreground mt-2 leading-relaxed">We've received your return. Our team reviews within 2–3 business days.</p>
      </div>
      <div className="w-full rounded-xl border border-border bg-white overflow-hidden text-left">
        <div className="divide-y divide-border">
          {returnRef && <div className="flex justify-between px-5 py-3"><span className="text-sm text-muted-foreground">Reference</span><span className="text-sm font-mono font-medium">{returnRef}</span></div>}
          <div className="flex justify-between px-5 py-3"><span className="text-sm text-muted-foreground">Items</span><span className="text-sm font-medium">{returnedCount}</span></div>
          <div className="flex justify-between px-5 py-3"><span className="text-sm text-muted-foreground">Est. refund</span><span className="text-sm font-bold text-[#E5403B]">£{returnedRefund.toFixed(2)}</span></div>
        </div>
      </div>
      <div className="w-full flex flex-col gap-2">
        <a href={orderStatusUrl} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-2 h-11 w-full rounded-lg border border-border bg-white hover:bg-muted/40 text-sm font-medium transition-colors">
          View order status
        </a>
        <Button variant="ghost" className="w-full h-11" onClick={onStartOver}>
          <RotateCcw className="size-4 mr-2" /> Return another order
        </Button>
      </div>
    </div>
  )
}

// ─── Wizard Inner ─────────────────────────────────────────────────────────────
function WizardInner() {
  const { layout } = useSidebarLayout()
  const [data, setData]           = useState<OrdersData | null>(null)
  const [loading, setLoading]     = useState(true)
  const [error, setError]         = useState<string | null>(null)
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [step, setStep]           = useState(1)
  const [order, setOrder]         = useState<Order | null>(null)
  const [selected, setSelected]   = useState<Record<string, SelectedItem>>({})
  const [submitting, setSubmitting] = useState(false)
  const [returnRef, setReturnRef] = useState<string | null>(null)
  const [returnedCount, setReturnedCount] = useState(0)
  const [returnedRefund, setReturnedRefund] = useState(0)
  const [statusFilter, setStatusFilter] = useState<string[]>([])

  const searchParams = useSearchParams()
  // useSearchParams() can return null on first mount after an OAuth redirect
  // in Next.js App Router. Read directly from window.location.search as a reliable fallback.
  const deepLinkOrderId = searchParams.get("order") ||
    (typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("order") : null)

  useEffect(() => {
    fetch("/api/get-orders")
      .then(r => r.json())
      .then(d => {
        if (d.error) { setError(d.error); return }
        setData(d)
        // Re-read from window.location in case searchParams was null at effect registration
        const orderId = new URLSearchParams(window.location.search).get("order")
        if (orderId) {
          const target = (d.orders as Order[]).find(o => o.id.split("/").pop() === orderId)
          if (target) { setOrder(target); setStep(2) }
        }
      })
      .catch(() => setError("Failed to load orders."))
      .finally(() => setLoading(false))
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Safety net: if data loaded before deepLinkOrderId resolved (hydration timing),
  // try again whenever either value changes
  useEffect(() => {
    if (!deepLinkOrderId || !data || order) return
    const target = (data.orders as Order[]).find(o => o.id.split("/").pop() === deepLinkOrderId)
    if (target) { setOrder(target); setStep(2) }
  }, [deepLinkOrderId, data, order])

  const avgPrice = useMemo(() => {
    if (!order) return 0
    const total = parseFloat(order.totalPriceSet.shopMoney.amount)
    return order.totalUnits > 0 ? total / order.totalUnits : 0
  }, [order])

  const handleSelectOrder = (o: Order) => { setOrder(o); setSelected({}); setStep(2) }

  const handleToggleItem = useCallback((item: LineItem) => {
    setSelected(prev => {
      if (prev[item.id]) { const next = { ...prev }; delete next[item.id]; return next }
      return { ...prev, [item.id]: { lineItemId: item.id, quantity: item.eligibleQuantity, reason: "", description: "" } }
    })
  }, [])

  const handleQtyChange = useCallback((id: string, qty: number) => {
    setSelected(prev => ({ ...prev, [id]: { ...prev[id], quantity: qty } }))
  }, [])

  const handleReasonChange = useCallback((id: string, reason: string) => {
    setSelected(prev => ({ ...prev, [id]: { ...prev[id], reason } }))
  }, [])

  const handleDescChange = useCallback((id: string, desc: string) => {
    setSelected(prev => ({ ...prev, [id]: { ...prev[id], description: desc } }))
  }, [])

  const allReasonsSet = useMemo(() => {
    if (!order) return false
    return order.processedItems.filter(i => selected[i.id]).every(i => {
      const sel = selected[i.id]
      return sel?.reason && (sel.reason !== "OTHER" || sel.description.trim().length > 0)
    })
  }, [selected, order])

  const selectedCount = Object.keys(selected).length
  const estimatedRefund = order ? order.processedItems.filter(i => selected[i.id]).reduce((s, i) => s + (i.unitPrice ?? avgPrice) * (selected[i.id]?.quantity ?? 1), 0) : 0

  const handleSubmit = async () => {
    if (!order) return
    const rawOrderId = order.id.split("/").pop()
    const selectedLineItemIds = Object.keys(selected)
    setSubmitting(true)
    try {
      // Pre-flight: re-fetch current eligibility to catch any race (item fulfilled/returned since wizard loaded)
      const freshData = await fetch("/api/get-orders").then(r => r.json()).catch(() => null)
      if (freshData && !freshData.error) {
        const freshOrder = (freshData.orders as Order[]).find(o => o.id === order.id)
        if (freshOrder) {
          const nowIneligible = selectedLineItemIds.filter(id => {
            const freshItem = freshOrder.processedItems.find(i => i.id === id)
            return !freshItem || freshItem.returnStatus !== "Eligible" || freshItem.eligibleQuantity < (selected[id]?.quantity ?? 1)
          })
          if (nowIneligible.length > 0) {
            toast.error("Some items are no longer eligible", {
              description: "Eligibility changed since you started. Please review your selection and try again.",
            })
            setSubmitting(false)
            setStep(2) // Send back to item selection
            return
          }
        }
      }

      const items = order.processedItems.filter(i => selected[i.id]).map(i => ({
        lineItemId: i.id, quantity: selected[i.id]?.quantity ?? 1, reason: selected[i.id]?.reason || "OTHER", description: selected[i.id]?.description || "",
      }))
      const res = await fetch("/api/submit-return", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ orderId: rawOrderId, items }) })
      const result = await res.json()
      if (result.success) {
        setReturnRef(result.returnReference || null); setReturnedCount(selectedCount); setReturnedRefund(estimatedRefund); setStep(5)
      } else {
        const code = result.code
        if (code === "ELIGIBILITY_CHANGED") {
          toast.error("Items no longer eligible", { description: "Some items changed status. Please review your selection." })
          setStep(2)
        } else if (code === "DUPLICATE_SUBMISSION") {
          toast.error("Already submitted", { description: "This return request was already received." })
        } else if (code === "THROTTLED") {
          toast.error("Too many requests", { description: "Please wait a moment and try again." })
        } else {
          toast.error("Submission failed", { description: result.error || "Something went wrong." })
        }
      }
    } catch { toast.error("Network error", { description: "Please check your connection and try again." }) }
    finally { setSubmitting(false) }
  }

  const handleStartOver = () => { setOrder(null); setSelected({}); setStep(1); setReturnRef(null) }

  const user = { name: data?.firstName || "Customer", email: data?.email || "" }

  return (
    <SidebarProvider
      open={sidebarOpen}
      onOpenChange={setSidebarOpen}
      style={{ "--sidebar-width": "18rem", "--sidebar-width-icon": "3.75rem", "--header-height": "3rem" } as React.CSSProperties}
    >
      <AppSidebar variant={layout} user={user} activeSection="/wizard" />
      <SidebarInset className="flex flex-col min-h-0 overflow-hidden">
        <SiteHeader
          title={
            step > 1 && order ? (
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-muted-foreground font-normal shrink-0">Return Wizard</span>
                <ChevronRight className="size-3.5 text-muted-foreground shrink-0" />
                <button
                  onClick={() => { if (step === 2) { setOrder(null); setSelected({}); setStep(1) } else { setStep(s => s - 1) } }}
                  className="font-medium hover:underline truncate"
                >
                  {order.name}
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-1.5"><Wand2 className="size-4 shrink-0" /><span>Return Wizard</span></div>
            )
          }
          showSearch={false} firstName={data?.firstName} email={data?.email}
        />

        {/* Full-height scrollable body */}
        <div className="flex-1 min-h-0 overflow-y-auto styled-scroll">
          <div className={cn("flex flex-col gap-4 pb-4", step === 1 ? "px-4 pt-4" : "px-6 pt-6")}>

            {loading && (
              <div className="flex flex-col items-center justify-center py-24 gap-3">
                <Loader2 className="size-8 text-[#E5403B] animate-spin" />
                <p className="text-sm text-muted-foreground">Loading your orders…</p>
              </div>
            )}

            {error && <div className="rounded-xl border border-destructive/20 bg-destructive/10 p-4 text-sm text-destructive max-w-md">{error}</div>}

            {!loading && !error && data && (
              <>
                {/* Step indicator */}
                {step <= 4 && <StepIndicator step={step} />}

                {step === 1 && <StepOrders orders={data.orders} firstName={data.firstName} statusFilter={statusFilter} onStatusFilter={setStatusFilter} onSelect={handleSelectOrder} />}
                {step === 2 && order && <StepSelectItems order={order} selected={selected} onToggle={handleToggleItem} onQtyChange={handleQtyChange} avgPrice={avgPrice} />}
                {step === 3 && order && <StepReasons order={order} selected={selected} onReasonChange={handleReasonChange} onDescChange={handleDescChange} avgPrice={avgPrice} />}
                {step === 4 && order && <StepReview order={order} selected={selected} avgPrice={avgPrice} onSubmit={handleSubmit} submitting={submitting} />}
                {step === 5 && order && <StepSuccess order={order} returnRef={returnRef} returnedCount={returnedCount} returnedRefund={returnedRefund} onStartOver={handleStartOver} />}

                {/* Footer nav for steps 2–3 */}
                {step >= 2 && step <= 3 && (
                  <div className="flex gap-3 w-full">
                    <Button variant="outline" className="flex-1 h-11" onClick={() => { if (step === 2) { setOrder(null); setSelected({}); setStep(1) } else { setStep(s => s - 1) } }}>
                      <ArrowLeft className="size-4 mr-1" /> Back
                    </Button>
                    <Button
                      className="flex-[2] h-11 bg-[#E5403B] hover:bg-[#cc3935] text-white"
                      disabled={step === 2 ? selectedCount === 0 : !allReasonsSet}
                      onClick={() => setStep(s => s + 1)}
                    >
                      Continue <ArrowRight className="size-4 ml-1" />
                    </Button>
                  </div>
                )}

                {step === 4 && (
                  <button className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1 w-fit" onClick={() => setStep(3)}>
                    <ArrowLeft className="size-3.5" /> Edit reasons
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}

export default function ReturnWizardPage() {
  return (
    <Suspense>
      <SidebarLayoutProvider>
        <WizardInner />
      </SidebarLayoutProvider>
    </Suspense>
  )
}
