"use client"

import * as React from "react"
import { useEffect, useState, useMemo } from "react"
import { toast } from "sonner"
import {
  ChevronRight, ArrowLeft, RotateCcw, CheckCircle2,
  ShoppingBag, ShieldCheck, ExternalLink, Lock, Truck, Package, Search,
  MapPin, SlidersHorizontal, CreditCard, XCircle, ChevronDown, Info,
  RefreshCw, Clock, Eye,
} from "lucide-react"

import { AppSidebar } from "@/components/app-sidebar"
import { SiteHeader } from "@/components/site-header"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Spinner } from "@/components/ui/spinner"
import { Separator } from "@/components/ui/separator"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Drawer, DrawerClose, DrawerContent, DrawerDescription, DrawerFooter, DrawerHeader, DrawerTitle, DrawerTrigger } from "@/components/ui/drawer"
import { useMediaQuery } from "@/hooks/use-media-query"
import { cn } from "@/lib/utils"

// ─── Types ────────────────────────────────────────────────────────────────────
type ReturnStatus =
  | "Eligible" | "Not yet dispatched" | "Confirmed" | "On its way"
  | "Passed the return window" | "Returned" | "Refunded"
  | "Return requested" | "Return in progress" | "Return completed"
  | "Return declined" | "Return cancelled" | "Cancelled"

interface LineItem {
  id: string
  title: string
  quantity: number
  eligibleQuantity: number
  refundedQuantity: number
  activeReturnQuantity: number
  unitPrice?: number | null
  returnStatus: ReturnStatus
  returnReason?: string
  lineDeliveredAt?: string | null
  productHandle?: string | null
  image?: { url: string } | null
  variant?: { title: string } | null
}

interface ShipmentTracking { company: string; number: string; url: string }
interface Shipment {
  id: string
  displayStatus: string
  deliveredAt: string | null
  trackingInfo: ShipmentTracking[]
  items: { id: string; quantity: number }[]
}

interface Order {
  id: string
  name: string
  createdAt: string
  cancelledAt?: string | null
  displayFulfillmentStatus: string
  totalPriceSet: { shopMoney: { amount: string; currencyCode: string } }
  totalRefundedSet?: { shopMoney: { amount: string } } | null
  processedItems: LineItem[]
  shipments: Shipment[]
  orderStatus: string
  deliveredCount: number
  dispatchedCount: number
  confirmedCount: number
  notDispatchedCount: number
  totalUnits: number
  earliestDelivery?: string | null
  latestDelivery?: string | null
}

interface OrdersData { firstName: string; email: string; orders: Order[] }

// Previous return mock data (for tracker demo)
interface PreviousReturn {
  status: "requested" | "in_review" | "refunded"
  requestedDate?: string
  reference?: string
}

const RETURN_REASONS = [
  { value: "CHANGED_MIND",     label: "Changed my mind" },
  { value: "WRONG_ITEM",       label: "Wrong item received" },
  { value: "FAULTY",           label: "Faulty / not working" },
  { value: "DAMAGED",          label: "Damaged in transit" },
  { value: "NOT_AS_DESCRIBED", label: "Not as described" },
  { value: "OTHER",            label: "Other" },
]

const STATUS_FILTERS = ["Delivered", "Partially delivered", "On its way", "Partially dispatched"]
const C = "shadow-sm py-0 gap-0"

function pUrl(handle?: string | null) {
  return handle ? `https://iblazevape.co.uk/products/${handle}` : "https://iblazevape.co.uk"
}

// ─── Order Status Badges ──────────────────────────────────────────────────────
function OrderStatusBadge({ order }: { order: Order }) {
  if (order.cancelledAt) {
    return <Badge className="bg-red-50 text-red-700 hover:bg-red-50 border border-red-200 rounded-full text-xs font-medium">Cancelled</Badge>
  }
  switch (order.orderStatus) {
    case "Delivered":
      return <Badge className="bg-green-50 text-green-700 hover:bg-green-50 border border-green-200 rounded-full text-xs font-medium inline-flex items-center gap-1"><CheckCircle2 className="size-3" />Delivered</Badge>
    case "Partially delivered":
      return <Badge className="bg-amber-50 text-amber-700 hover:bg-amber-50 border border-amber-200 rounded-full text-xs font-medium inline-flex items-center gap-1"><Truck className="size-3" />Partially delivered</Badge>
    case "On its way":
      return <Badge className="bg-blue-50 text-blue-700 hover:bg-blue-50 border border-blue-200 rounded-full text-xs font-medium inline-flex items-center gap-1"><Truck className="size-3" />On its way</Badge>
    case "Partially dispatched":
      return <Badge className="bg-blue-50 text-blue-700 hover:bg-blue-50 border border-blue-200 rounded-full text-xs font-medium inline-flex items-center gap-1"><Truck className="size-3" />Partially dispatched</Badge>
    case "Confirmed":
      return <Badge variant="secondary" className="rounded-full text-xs font-medium">Confirmed</Badge>
    default:
      return <Badge variant="secondary" className="rounded-full text-xs font-medium">{order.orderStatus}</Badge>
  }
}

// ─── Ineligible Badge ─────────────────────────────────────────────────────────
function OutlineBadge({ className, children }: { className: string; children: React.ReactNode }) {
  return (
    <span className={cn("inline-flex items-center justify-center rounded-full border px-2 py-0.5 text-[11px] font-medium whitespace-nowrap gap-1", className)}>
      {children}
    </span>
  )
}

function IneligibleBadge({ status }: { status: ReturnStatus }) {
  if (status === "Confirmed")               return <OutlineBadge className="bg-zinc-50 text-zinc-500 border-zinc-200">Confirmed</OutlineBadge>
  if (status === "On its way")              return <OutlineBadge className="bg-amber-50 text-amber-700 border-amber-200"><Truck className="size-3" />On its way</OutlineBadge>
  if (status === "Not yet dispatched")      return <OutlineBadge className="bg-zinc-50 text-zinc-500 border-zinc-200">Not dispatched</OutlineBadge>
  if (status === "Refunded")                return <OutlineBadge className="bg-zinc-100 text-zinc-600 border-zinc-300">Refunded</OutlineBadge>
  if (status === "Cancelled")               return <OutlineBadge className="bg-red-50 text-red-700 border-red-200">Cancelled</OutlineBadge>
  if (status === "Passed the return window") return <OutlineBadge className="bg-zinc-100 text-zinc-500 border-zinc-200"><XCircle className="size-3" />Window expired</OutlineBadge>
  if (status === "Return requested")        return <OutlineBadge className="bg-blue-50 text-blue-700 border-blue-200">Requested</OutlineBadge>
  if (status === "Return in progress")      return <OutlineBadge className="bg-purple-50 text-purple-700 border-purple-200">In progress</OutlineBadge>
  if (status === "Return completed" || status === "Returned") return <OutlineBadge className="bg-teal-50 text-teal-700 border-teal-200">Completed</OutlineBadge>
  if (status === "Return declined")         return <OutlineBadge className="bg-zinc-100 text-zinc-500 border-zinc-200">Declined</OutlineBadge>
  if (status === "Return cancelled")        return <OutlineBadge className="bg-orange-50 text-orange-600 border-orange-200">Cancelled</OutlineBadge>
  return <span className="text-xs text-muted-foreground">{status}</span>
}

function IneligibleBadgeWithChevron({
  status, reason, lineDeliveredAt, open, onToggle,
}: {
  status: ReturnStatus; reason?: string; lineDeliveredAt?: string | null
  open: boolean; onToggle: () => void
}) {
  const hasReason = !!(
    status === "Passed the return window" || status === "Return declined" ||
    status === "Refunded" || status === "On its way" ||
    status === "Not yet dispatched" || status === "Confirmed" || reason
  )
  return (
    <button onClick={() => hasReason && onToggle()} className={cn("inline-flex items-center gap-1.5", hasReason ? "cursor-pointer" : "cursor-default")}>
      <IneligibleBadge status={status} />
      {hasReason && <ChevronDown className={cn("size-3.5 text-muted-foreground transition-transform shrink-0", open && "rotate-180")} />}
    </button>
  )
}

function ineligibleReasonText(status: ReturnStatus, reason?: string, lineDeliveredAt?: string | null): string | null {
  if (status === "Passed the return window") {
    const base = lineDeliveredAt ? `Delivered ${lineDeliveredAt}. ` : ""
    return base + (reason || "The return window for this item has closed.")
  }
  if (status === "Return declined")    return reason || "This return was declined by our team."
  if (status === "Refunded")           return "This item has already been refunded."
  if (status === "On its way")         return "Items can only be returned once delivered."
  if (status === "Not yet dispatched") return "This item hasn't been dispatched yet."
  if (status === "Confirmed")          return "This order is confirmed but not yet dispatched."
  return reason || null
}

// ─── Return Window Countdown ──────────────────────────────────────────────────
function ReturnWindowBadge({ lineDeliveredAt }: { lineDeliveredAt?: string | null }) {
  if (!lineDeliveredAt) return null
  // Parse the delivery date (format: "27 May 2026" or similar)
  const deliveryDate = new Date(lineDeliveredAt)
  if (isNaN(deliveryDate.getTime())) return null
  const now = new Date()
  const daysSince = Math.floor((now.getTime() - deliveryDate.getTime()) / (1000 * 60 * 60 * 24))
  const daysLeft = 30 - daysSince
  if (daysLeft <= 0) return null
  const isUrgent = daysLeft <= 5
  const pct = Math.max(0, Math.min(100, (daysLeft / 30) * 100))
  return (
    <div className="flex flex-col items-end gap-1">
      <span className={cn("text-[11px] font-medium flex items-center gap-1", isUrgent ? "text-amber-700" : "text-green-600")}>
        <Clock className="size-3" />{daysLeft}d left
      </span>
      <div className={cn("w-16 h-1.5 rounded-full overflow-hidden", isUrgent ? "bg-amber-100" : "bg-muted")}>
        <div className={cn("h-full rounded-full transition-all", isUrgent ? "bg-amber-600" : "bg-green-500")} style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

// ─── Product Thumb ────────────────────────────────────────────────────────────
function ProductThumb({ item }: { item: LineItem }) {
  return (
    <a href={pUrl(item.productHandle)} target="_blank" rel="noopener noreferrer" className="shrink-0">
      <div className="size-10 rounded-md overflow-hidden bg-white border border-border hover:border-foreground transition-colors">
        {item.image?.url && <img src={item.image.url} alt={item.title} className="w-full h-full object-cover" />}
      </div>
    </a>
  )
}

// ─── Skeleton Loading ─────────────────────────────────────────────────────────
function OrderSkeleton() {
  return (
    <div className="bg-white border border-border rounded-xl overflow-hidden flex animate-pulse">
      <div className="w-1 bg-muted shrink-0" />
      <div className="p-3.5 flex-1 flex items-center gap-3">
        <div className="flex gap-2">
          <div className="size-9 rounded-lg bg-muted" />
          <div className="size-9 rounded-lg bg-muted" />
          <div className="size-9 rounded-lg bg-muted" />
        </div>
        <div className="flex-1">
          <div className="h-3.5 bg-muted rounded w-24 mb-2" />
          <div className="h-3 bg-muted rounded w-40" />
        </div>
        <div className="h-3 bg-muted rounded w-12" />
      </div>
    </div>
  )
}

// ─── Shipment Item List ───────────────────────────────────────────────────────
function ShipmentItemList({ shipment, order, className }: { shipment: Shipment; order: Order; className?: string }) {
  const shipmentItems = shipment.items.flatMap(({ id, quantity }) => {
    const li = order.processedItems.find(i => i.id === id)
    return li ? [{ ...li, shipQty: quantity }] : []
  })
  return (
    <div className={cn("divide-y divide-border", className)}>
      {shipmentItems.map((item, i) => {
        const itemPrice  = item.unitPrice ?? 0
        const hasVariant = item.variant?.title && item.variant.title !== "Default Title"
        return (
          <div key={i} className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0">
            <a href={pUrl(item.productHandle)} target="_blank" rel="noopener noreferrer" className="shrink-0">
              <div className="size-9 rounded-md overflow-hidden bg-white border border-border hover:border-foreground transition-colors">
                {item.image?.url && <img src={item.image.url} alt={item.title} className="w-full h-full object-cover" />}
              </div>
            </a>
            <div className="flex-1 min-w-0">
              <a href={pUrl(item.productHandle)} target="_blank" rel="noopener noreferrer" className="font-medium text-sm hover:underline truncate block leading-tight">{item.title}</a>
              <p className="text-xs text-muted-foreground mt-0.5">{item.shipQty}×{hasVariant ? ` ${item.variant!.title}` : ""}</p>
            </div>
            {itemPrice > 0 && <p className="text-sm font-semibold shrink-0 tabular-nums">£{(itemPrice * item.shipQty).toFixed(2)}</p>}
          </div>
        )
      })}
    </div>
  )
}

// ─── Shipment Items Modal ─────────────────────────────────────────────────────
function ShipmentItemsModal({ shipment, order, idx }: { shipment: Shipment; order: Order; idx: number }) {
  const isDesktop     = useMediaQuery("(min-width: 768px)")
  const totalUnits    = shipment.items.reduce((a, c) => a + c.quantity, 0)
  const isDelivered   = shipment.displayStatus === "DELIVERED"
  const deliveredDate = shipment.deliveredAt ? new Date(shipment.deliveredAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : null
  const title         = `Shipment ${idx + 1}`
  const subtitle      = `${isDelivered && deliveredDate ? `Delivered ${deliveredDate}` : "On its way"} · ${totalUnits} unit${totalUnits !== 1 ? "s" : ""}`

  const trigger = (
    <button className="flex items-center gap-1 text-xs font-medium text-muted-foreground bg-muted px-2 py-1 rounded-md border border-dashed shrink-0 hover:bg-zinc-100 hover:border-zinc-300 transition-colors cursor-pointer">
      <Package className="size-3.5" />{totalUnits} units
    </button>
  )

  if (isDesktop) {
    return (
      <Dialog>
        <DialogTrigger asChild>{trigger}</DialogTrigger>
        <DialogContent className="sm:max-w-[425px] gap-0 p-0 overflow-hidden">
          <DialogHeader className="px-6 pt-6 pb-4 border-b border-border">
            <DialogTitle className="flex items-center gap-2"><Truck className="size-4" /> {title}</DialogTitle>
            <DialogDescription>{subtitle}</DialogDescription>
          </DialogHeader>
          <ScrollArea className="max-h-[60vh] px-6 py-4">
            <ShipmentItemList shipment={shipment} order={order} />
          </ScrollArea>
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Drawer shouldScaleBackground={false}>
      <DrawerTrigger asChild>{trigger}</DrawerTrigger>
      <DrawerContent>
        <DrawerHeader className="text-left pb-4">
          <DrawerTitle className="flex items-center gap-2"><Truck className="size-4" /> {title}</DrawerTitle>
          <DrawerDescription>{subtitle}</DrawerDescription>
        </DrawerHeader>
        <Separator />
        <div className="overflow-y-auto max-h-[60vh]">
          <ShipmentItemList shipment={shipment} order={order} className="px-4 py-4" />
        </div>
        <DrawerFooter className="pt-2">
          <DrawerClose asChild>
            <Button variant="outline" className="w-full">Close</Button>
          </DrawerClose>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  )
}

// ─── Hygiene Policy ───────────────────────────────────────────────────────────
const POLICY_ITEMS = [
  { title: "Vape Kits & Mods",       desc: "30-day refund period. 30-day warranty from delivery." },
  { title: "Batteries & Chargers",    desc: "60-day battery warranty. 30-day charger warranty." },
  { title: "E-Liquids & Disposables", desc: "Must remain sealed and unopened. No returns on opened liquids." },
  { title: "Tanks & Clearomisers",    desc: "7-day Dead On Arrival window — report faults within 7 days." },
]

function HygienePolicyList({ className }: { className?: string }) {
  return (
    <div className={cn("divide-y divide-border", className)}>
      {POLICY_ITEMS.map(p => (
        <div key={p.title} className="py-2.5 first:pt-0">
          <p className="font-medium text-sm">{p.title}</p>
          <p className="text-xs text-muted-foreground mt-0.5">{p.desc}</p>
        </div>
      ))}
      <p className="text-xs text-muted-foreground pt-2.5">Return postage is at your expense. Tracked service required. Refunds within 5–10 business days.</p>
    </div>
  )
}

function HygienePolicy({ onAccept, onDecline, compact = false }: { onAccept: () => void; onDecline: () => void; compact?: boolean }) {
  const isDesktop = useMediaQuery("(min-width: 768px)")

  const trigger = compact
    ? <Button size="sm" variant="outline" className="h-7 px-2 text-xs shrink-0">Review &amp; Accept</Button>
    : <Button size="sm" variant="outline" className="w-full shrink-0 gap-1.5"><ShieldCheck className="size-3.5" />Review &amp; accept policy</Button>

  if (isDesktop) {
    return (
      <Dialog>
        <DialogTrigger asChild>{trigger}</DialogTrigger>
        <DialogContent className="sm:max-w-[425px] gap-0 p-0 overflow-hidden">
          <DialogHeader className="px-6 pt-6 pb-4 border-b border-border">
            <DialogTitle className="flex items-center gap-2"><ShieldCheck className="size-4 text-[#E5403B]" /> iBlaze Returns Policy</DialogTitle>
            <DialogDescription>Review our returns policy before selecting items to return.</DialogDescription>
          </DialogHeader>
          <HygienePolicyList className="px-6 pt-4" />
          <div className="flex gap-2 px-6 pb-6 pt-4">
            <DialogClose asChild>
              <Button className="flex-1 bg-[#E5403B] hover:bg-[#cc3935] text-white" onClick={() => { onAccept(); toast.success("Policy accepted") }}><CheckCircle2 className="size-4" /> I Accept</Button>
            </DialogClose>
            <DialogClose asChild>
              <Button variant="outline" className="flex-1" onClick={() => { onDecline(); toast.warning("Policy declined") }}>Decline</Button>
            </DialogClose>
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Drawer shouldScaleBackground={false}>
      <DrawerTrigger asChild>{trigger}</DrawerTrigger>
      <DrawerContent>
        <DrawerHeader className="text-left pb-4">
          <DrawerTitle className="flex items-center gap-2"><ShieldCheck className="size-4 text-[#E5403B]" /> iBlaze Returns Policy</DrawerTitle>
          <DrawerDescription>Review our returns policy before selecting items to return.</DrawerDescription>
        </DrawerHeader>
        <Separator />
        <ScrollArea className="max-h-[50vh]">
          <HygienePolicyList className="px-4 py-4" />
        </ScrollArea>
        <DrawerFooter className="pt-2">
          <div className="flex gap-2">
            <DrawerClose asChild>
              <Button className="flex-1 bg-[#E5403B] hover:bg-[#cc3935] text-white" onClick={() => { onAccept(); toast.success("Policy accepted") }}><CheckCircle2 className="size-4" /> I Accept</Button>
            </DrawerClose>
            <DrawerClose asChild>
              <Button variant="outline" className="flex-1" onClick={() => { onDecline(); toast.warning("Policy declined") }}>Decline</Button>
            </DrawerClose>
          </div>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  )
}

// ─── Return Status Tracker ────────────────────────────────────────────────────
function ReturnStatusTracker({ previousReturn }: { previousReturn?: PreviousReturn }) {
  if (!previousReturn) return null
  const steps = [
    { key: "requested",  label: "Requested",    icon: <RotateCcw className="size-2.5" />,     done: true },
    { key: "in_review",  label: "In review",    icon: <Eye className="size-2.5" />,            done: previousReturn.status === "in_review" || previousReturn.status === "refunded" },
    { key: "refunded",   label: "Refund issued", icon: <CreditCard className="size-2.5" />,   done: previousReturn.status === "refunded" },
  ]
  const activeIdx = previousReturn.status === "requested" ? 0 : previousReturn.status === "in_review" ? 1 : 2

  return (
    <div className="border-t border-border pt-3 mt-3">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-3">Previous return</p>
      <div className="flex flex-col gap-0">
        {steps.map((step, i) => {
          const isDone   = i < activeIdx
          const isActive = i === activeIdx
          const isPending = i > activeIdx
          return (
            <div key={step.key} className="flex gap-2.5 items-start">
              <div className="flex flex-col items-center shrink-0">
                <div className={cn(
                  "size-5 rounded-full flex items-center justify-center border-[1.5px] transition-colors",
                  isDone   ? "bg-green-50 border-green-500 text-green-600" :
                  isActive ? "bg-purple-50 border-purple-400 text-purple-600" :
                             "bg-background border-border text-muted-foreground"
                )}>
                  {step.icon}
                </div>
                {i < steps.length - 1 && (
                  <div className={cn("w-px flex-1 min-h-[18px]", isDone ? "bg-green-300" : "bg-border")} />
                )}
              </div>
              <div className={cn("pb-3", i === steps.length - 1 && "pb-0")}>
                <p className={cn("text-xs font-medium leading-tight",
                  isDone   ? "text-green-700" :
                  isActive ? "text-purple-700" :
                             "text-muted-foreground"
                )}>{step.label}</p>
                {isActive && previousReturn.requestedDate && (
                  <p className="text-[10px] text-muted-foreground mt-0.5">{previousReturn.requestedDate}</p>
                )}
                {isPending && i === 2 && (
                  <p className="text-[10px] text-muted-foreground mt-0.5">5–10 days after approval</p>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── Timeline Order Row ───────────────────────────────────────────────────────
function OrderRow({ order, onClick }: { order: Order; onClick: () => void }) {
  const images = order.processedItems.map(i => i.image?.url).filter(Boolean).slice(0, 3) as string[]
  const total  = parseFloat(order.totalPriceSet.shopMoney.amount)
  const isCancelled = !!order.cancelledAt

  const stripeColor = (() => {
    if (isCancelled) return "bg-border"
    switch (order.orderStatus) {
      case "Delivered": return "bg-green-500"
      case "On its way": case "Partially dispatched": return "bg-blue-400"
      default: return "bg-zinc-300"
    }
  })()

  const dateLabel = (() => {
    if (isCancelled) return `Cancelled ${new Date(order.cancelledAt!).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}`
    if (order.latestDelivery)    return `Delivered ${new Date(order.latestDelivery).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}`
    if (order.dispatchedCount > 0) return `On its way`
    return `Ordered ${new Date(order.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}`
  })()

  const eligibleCount = order.processedItems
    .filter(i => i.returnStatus === "Eligible" && i.eligibleQuantity > 0)
    .reduce((s, i) => s + i.eligibleQuantity, 0)

  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full flex items-center text-left group border border-border rounded-xl overflow-hidden bg-white hover:border-zinc-300 transition-colors",
        isCancelled && "opacity-50"
      )}
    >
      <div className={cn("w-[3px] self-stretch shrink-0", stripeColor)} />
      <div className="px-3.5 py-3 flex-1 flex items-center gap-3 min-w-0">
        {!isCancelled && images.length > 0 ? (
          <div className="flex shrink-0">
            {images.map((url, i) => (
              <div key={i} className="size-9 rounded-lg border-2 border-white bg-white overflow-hidden shadow-sm shrink-0" style={{ marginLeft: i > 0 ? "-10px" : "0" }}>
                <img src={url} alt="" className="w-full h-full object-cover" />
              </div>
            ))}
            {Array.from({ length: Math.max(0, 3 - images.length) }).map((_, i) => (
              <div key={`e-${i}`} className="size-9 rounded-lg border-2 border-white bg-zinc-100 shrink-0" style={{ marginLeft: "-10px" }} />
            ))}
          </div>
        ) : (
          <div className="flex shrink-0 gap-1">
            <div className="size-9 rounded-lg bg-zinc-100 border border-border" />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5 flex-wrap">
            <p className="font-medium text-sm group-hover:underline">{order.name}</p>
            <OrderStatusBadge order={order} />
            {eligibleCount > 0 && (
              <span className="inline-flex items-center gap-1 text-[10px] font-medium border border-dashed border-green-400 text-green-700 bg-green-50 rounded-full px-1.5 py-0.5">
                <RotateCcw className="size-2.5" />{eligibleCount} returnable
              </span>
            )}
          </div>
          <p className="text-xs text-muted-foreground">{dateLabel} · {order.totalUnits} item{order.totalUnits !== 1 ? "s" : ""}</p>
        </div>
        <div className="text-right shrink-0 flex items-center gap-2">
          <p className="font-medium text-sm tabular-nums">£{total.toFixed(2)}</p>
          <ChevronRight className="size-4 text-muted-foreground" />
        </div>
      </div>
    </button>
  )
}

// ─── Order Detail ─────────────────────────────────────────────────────────────
function OrderDetail({ order, onBack }: { order: Order; onBack: () => void }) {
  const [policyAccepted, setPolicyAccepted]   = useState(false)
  const [selectedItems, setSelectedItems]     = useState<Record<string, { selected: boolean; quantity: number; reason: string; description: string }>>({})
  const [submitting, setSubmitting]           = useState(false)
  const [submitted, setSubmitted]             = useState(false)
  const [returnRef, setReturnRef]             = useState<string | null>(null)
  const [returnedCount, setReturnedCount]     = useState(0)
  const [returnedRefund, setReturnedRefund]   = useState(0)
  const [searchQuery, setSearchQuery]         = useState("")
  const [pageSize, setPageSize]               = useState("10")
  const [currentPage, setCurrentPage]         = useState(1)
  const [ineligibleStatusFilter, setIneligibleStatusFilter] = useState<string[]>([])
  const [openReasons, setOpenReasons]         = useState<Record<string, boolean>>({})
  const [activeTab, setActiveTab]             = useState<"eligible" | "ineligible">("eligible")

  const rawOrderId     = order.id.split("/").pop()
  const orderStatusUrl = `https://account.iblazevape.co.uk/orders/${rawOrderId}`
  const total          = parseFloat(order.totalPriceSet.shopMoney.amount)
  const orderAvgPrice  = order.totalUnits > 0 ? total / order.totalUnits : 0
  const refundedAmount = order.totalRefundedSet?.shopMoney?.amount ? parseFloat(order.totalRefundedSet.shopMoney.amount) : 0

  const eligibleItems   = useMemo(() => order.processedItems.filter(i => i.returnStatus === "Eligible" && i.eligibleQuantity > 0), [order])
  const ineligibleItems = useMemo(() => order.processedItems.filter(i => !(i.returnStatus === "Eligible" && i.eligibleQuantity > 0)), [order])

  const hasEligible        = eligibleItems.length > 0 && !order.cancelledAt
  const totalEligibleUnits = eligibleItems.reduce((s, i) => s + i.eligibleQuantity, 0)
  const totalIneligible    = ineligibleItems.reduce((s, i) => s + i.quantity, 0)
  const hasBothTabs        = eligibleItems.length > 0 && ineligibleItems.length > 0

  // Return window urgency: find closest expiring eligible item
  const urgentItem = useMemo(() => {
    const eligibleWithDates = eligibleItems
      .filter(i => i.lineDeliveredAt)
      .map(i => {
        const d = new Date(i.lineDeliveredAt!)
        const daysLeft = isNaN(d.getTime()) ? 999 : 30 - Math.floor((Date.now() - d.getTime()) / (1000 * 60 * 60 * 24))
        return { item: i, daysLeft }
      })
      .filter(x => x.daysLeft > 0 && x.daysLeft <= 5)
      .sort((a, b) => a.daysLeft - b.daysLeft)
    return eligibleWithDates[0] || null
  }, [eligibleItems])

  useEffect(() => { setActiveTab(eligibleItems.length > 0 ? "eligible" : "ineligible") }, [order.id])
  useEffect(() => { setIneligibleStatusFilter([]); setOpenReasons({}) }, [order.id])

  const matchesSearch = (item: LineItem) => {
    if (!searchQuery) return true
    const q = searchQuery.toLowerCase()
    return item.title.toLowerCase().includes(q) || (item.variant?.title || "").toLowerCase().includes(q)
  }

  const filteredEligible   = useMemo(() => eligibleItems.filter(matchesSearch), [eligibleItems, searchQuery])
  const filteredIneligible = useMemo(() => ineligibleItems.filter(item => {
    if (!matchesSearch(item)) return false
    if (ineligibleStatusFilter.length > 0 && !ineligibleStatusFilter.includes(item.returnStatus)) return false
    return true
  }), [ineligibleItems, searchQuery, ineligibleStatusFilter])

  const currentData   = activeTab === "eligible" ? filteredEligible : filteredIneligible
  const size          = pageSize === "all" ? Math.max(currentData.length, 1) : parseInt(pageSize)
  const totalPages    = Math.ceil(currentData.length / size) || 1
  const paginatedData = currentData.slice((currentPage - 1) * size, currentPage * size)

  useEffect(() => { setCurrentPage(1) }, [activeTab, searchQuery, pageSize, ineligibleStatusFilter])

  const selectedCount   = Object.values(selectedItems).filter(v => v.selected).length
  const estimatedRefund = Object.entries(selectedItems).filter(([, v]) => v.selected).reduce((sum, [id, v]) => {
    const item = order.processedItems.find(i => i.id === id)
    return sum + (item ? (item.unitPrice ?? orderAvgPrice) * v.quantity : 0)
  }, 0)

  const canSubmit = selectedCount > 0 && policyAccepted && Object.entries(selectedItems)
    .filter(([, v]) => v.selected)
    .every(([, v]) => v.reason && (v.reason !== "OTHER" || v.description.trim().length > 0))

  const isAllSelected = eligibleItems.length > 0 && selectedCount === eligibleItems.length

  const handleSelectAll = (checked: boolean) => {
    if (!policyAccepted) return
    const next: typeof selectedItems = {}
    eligibleItems.forEach(item => {
      next[item.id] = checked
        ? { selected: true, quantity: item.eligibleQuantity, reason: selectedItems[item.id]?.reason || "", description: selectedItems[item.id]?.description || "" }
        : { ...selectedItems[item.id], selected: false }
    })
    setSelectedItems(prev => ({ ...prev, ...next }))
  }

  const submitReturn = async () => {
    const items = Object.entries(selectedItems)
      .filter(([, v]) => v.selected)
      .map(([lineItemId, v]) => ({ lineItemId, quantity: v.quantity, reason: v.reason, description: v.description }))
    if (!items.length) return
    setSubmitting(true)
    try {
      const res    = await fetch("/api/submit-return", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ orderId: rawOrderId, items }) })
      const result = await res.json()
      if (result.success) {
        setReturnRef(result.returnReference || null)
        setReturnedCount(selectedCount)
        setReturnedRefund(estimatedRefund)
        setSubmitted(true)
        setTimeout(() => { window.location.href = orderStatusUrl }, 5000)
      } else {
        toast.error("Submission failed", { description: result.error || "Something went wrong." })
      }
    } catch {
      toast.error("Network error", { description: "Please check your connection." })
    } finally {
      setSubmitting(false)
    }
  }

  const headerDateStr = (() => {
    if (order.cancelledAt) return `Cancelled ${new Date(order.cancelledAt).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}`
    if (order.latestDelivery) return `Delivered ${new Date(order.latestDelivery).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}`
    return `Ordered ${new Date(order.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}`
  })()

  // ── Success screen ──────────────────────────────────────────────────────────
  if (submitted) {
    return (
      <div className="max-w-sm mx-auto py-16 px-4">
        <div className="border border-border rounded-xl overflow-hidden bg-white">
          <div className="px-6 py-8 text-center border-b border-border">
            <div className="size-12 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="size-6 text-green-600" />
            </div>
            <h2 className="text-base font-semibold mb-2">Return requested</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              We've sent a confirmation to your email. Our team will review and be in touch within 2–3 business days.
            </p>
          </div>
          <div className="px-5 py-4 flex flex-col gap-3">
            {returnRef && (
              <div className="flex justify-between items-center">
                <span className="text-xs text-muted-foreground">Return reference</span>
                <span className="text-xs font-medium font-mono">{returnRef}</span>
              </div>
            )}
            <div className="flex justify-between items-center">
              <span className="text-xs text-muted-foreground">Items returned</span>
              <span className="text-xs font-medium">{returnedCount} item{returnedCount !== 1 ? "s" : ""}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs text-muted-foreground">Est. refund</span>
              <span className="text-xs font-medium text-[#E5403B]">£{returnedRefund.toFixed(2)}</span>
            </div>
          </div>
          <div className="px-5 pb-5">
            <Button variant="outline" className="w-full" onClick={onBack}>
              <ArrowLeft className="size-4" /> Back to orders
            </Button>
          </div>
        </div>
      </div>
    )
  }

  const ineligibleColSpan = 5

  // ── Main detail layout: left content + right panel ─────────────────────────
  return (
    <div className="flex flex-col lg:flex-row gap-0 h-full min-h-0">

      {/* ── LEFT: scrollable main content ── */}
      <div className="flex-1 min-w-0 overflow-y-auto" style={{ scrollbarGutter: "stable" }}>
        <div className="p-4 flex flex-col gap-4 pb-6">

          <Button variant="ghost" size="sm" onClick={onBack} className="-ml-2 text-muted-foreground hover:text-foreground w-fit">
            <ArrowLeft className="size-4" /> Back to orders
          </Button>

          {/* Order header */}
          <Card className={cn(C, "overflow-hidden")}>
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 px-5 py-4">
              <div>
                <div className="flex items-center gap-2 mb-1.5">
                  <h2 className="text-base font-semibold">{order.name}</h2>
                  <OrderStatusBadge order={order} />
                </div>
                <p className="text-xs text-muted-foreground">{headerDateStr} &bull; £{total.toFixed(2)} GBP &bull; {order.totalUnits} item{order.totalUnits !== 1 ? "s" : ""}</p>
              </div>
              <a href={orderStatusUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground hover:underline shrink-0">
                <ExternalLink className="size-3.5" /> View order status
              </a>
            </div>

            {/* Stat cells */}
            <div className="grid grid-cols-2 sm:grid-cols-4 border-t border-border">
              <div className="px-3 sm:px-5 py-3 border-r border-b sm:border-b-0 border-border">
                <p className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground flex items-center gap-1 mb-1"><CreditCard className="size-3" />Total paid</p>
                <p className="font-semibold text-base tabular-nums">£{total.toFixed(2)}</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">GBP</p>
              </div>
              <div className="px-3 sm:px-5 py-3 border-b sm:border-b-0 sm:border-r border-border">
                <p className="text-[10px] uppercase tracking-wider font-semibold text-green-600 flex items-center gap-1 mb-1"><CheckCircle2 className="size-3 text-green-600" />Eligible</p>
                <p className="font-semibold text-base text-green-600">{totalEligibleUnits}</p>
                <p className="text-[11px] text-green-500 mt-0.5">item{totalEligibleUnits !== 1 ? "s" : ""}</p>
              </div>
              <div className="px-3 sm:px-5 py-3 border-r border-border">
                <p className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground flex items-center gap-1 mb-1"><XCircle className="size-3" />Ineligible</p>
                <p className="font-semibold text-base text-muted-foreground">{totalIneligible}</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">item{totalIneligible !== 1 ? "s" : ""}</p>
              </div>
              <div className="px-3 sm:px-5 py-3 flex flex-col">
                <p className="text-[10px] uppercase tracking-wider font-semibold text-blue-600 flex items-center gap-1 mb-1"><RotateCcw className="size-3 text-blue-600" />Refunded</p>
                <p className="font-semibold text-base text-blue-600 tabular-nums">£{refundedAmount.toFixed(2)}</p>
                <p className="text-[11px] text-blue-400 mt-0.5">of £{total.toFixed(2)}</p>
                <div className="mt-auto pt-2">
                  <div className="h-1 w-full rounded-full bg-muted overflow-hidden">
                    <div className="h-full rounded-full bg-blue-400 transition-all" style={{ width: `${total > 0 ? Math.min((refundedAmount / total) * 100, 100) : 0}%` }} />
                  </div>
                </div>
              </div>
            </div>
          </Card>

          {order.cancelledAt && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-5 text-center">
              <h3 className="font-semibold text-red-800 text-base">This order was cancelled</h3>
              <p className="text-sm text-red-700 mt-1">No items were dispatched — returns are not applicable.</p>
            </div>
          )}

          {/* Shipments */}
          {!order.cancelledAt && order.shipments && order.shipments.length > 0 && (
            <div className="overflow-x-auto">
              <div className="flex gap-3 snap-x">
                {order.shipments.map((shipment, idx) => {
                  const isDelivered   = shipment.displayStatus === "DELIVERED"
                  const step = isDelivered ? 3 : 2
                  const STEPS = [
                    { label: "Confirmed",  icon: <CheckCircle2 className="size-2.5" /> },
                    { label: "Dispatched", icon: <Package className="size-2.5" /> },
                    { label: "On its way", icon: <Truck className="size-2.5" /> },
                    { label: "Delivered",  icon: <CheckCircle2 className="size-2.5" /> },
                  ]
                  const deliveredDate = shipment.deliveredAt
                    ? new Date(shipment.deliveredAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })
                    : null
                  return (
                    <div key={shipment.id} className={cn("snap-start border border-border rounded-xl bg-white overflow-hidden", order.shipments.length === 1 ? "w-full" : "w-[85vw] shrink-0 sm:flex-1 sm:w-auto sm:min-w-[240px]")}>
                      <div className="flex items-center justify-between gap-2 px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <div className={cn("p-1.5 rounded-md", isDelivered ? "bg-green-50 text-green-600" : "bg-muted text-muted-foreground")}><Truck className="size-4" /></div>
                          <div>
                            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Shipment {idx + 1}</p>
                            <p className="text-sm font-medium">{isDelivered ? "Delivered" : "On its way"}{deliveredDate && <span className="text-muted-foreground font-normal"> · {deliveredDate}</span>}</p>
                          </div>
                        </div>
                        <ShipmentItemsModal shipment={shipment} order={order} idx={idx} />
                      </div>
                      <div className="border-t border-border bg-muted/30 px-4 py-3">
                        <div className="flex items-start relative">
                          <div className="absolute top-[9px] left-[9px] right-[9px] h-[1.5px] bg-border" />
                          <div className="absolute top-[9px] left-[9px] h-[1.5px] bg-green-500 transition-all" style={{ width: `${(step / (STEPS.length - 1)) * 100}%` }} />
                          {STEPS.map((s, i) => {
                            const done   = i <= step
                            const active = i === step
                            return (
                              <div key={s.label} className="flex-1 flex flex-col items-center z-10">
                                <div className={cn("size-[18px] rounded-full flex items-center justify-center border transition-colors",
                                  done && !active ? "bg-green-50 border-green-500 text-green-600" :
                                  active          ? "bg-blue-50 border-blue-400 text-blue-600" :
                                                    "bg-background border-border text-muted-foreground"
                                )}>{s.icon}</div>
                                <span className={cn("text-[9px] mt-1 leading-tight text-center", done ? "text-green-600 font-medium" : "text-muted-foreground")}>{s.label}</span>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                      {shipment.trackingInfo.length > 0 && (
                        <div className="flex flex-col gap-1.5 border-t border-border px-4 py-3">
                          {shipment.trackingInfo.map((track, ti) => (
                            <div key={ti} className="flex items-center gap-2">
                              <MapPin className="size-3.5 text-muted-foreground shrink-0" />
                              <span className="text-xs text-muted-foreground">{track.company}:</span>
                              {track.url
                                ? <a href={track.url} target="_blank" rel="noopener noreferrer" className="text-blue-600 font-medium hover:underline inline-flex items-center gap-1 text-xs">{track.number} <ExternalLink className="size-3" /></a>
                                : <span className="font-medium text-foreground text-xs">{track.number}</span>}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Items table */}
          {!order.cancelledAt && (
            <Card className={cn(C, "overflow-hidden flex flex-col")}>
              {/* Toolbar */}
              <div className="px-4 py-3 border-b bg-muted/20 flex items-center gap-2 flex-wrap">
                {hasBothTabs ? (
                  <Select value={activeTab} onValueChange={(v) => setActiveTab(v as "eligible" | "ineligible")}>
                    <SelectTrigger className="w-[160px] h-8 bg-white text-sm shrink-0"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="eligible">Eligible ({totalEligibleUnits})</SelectItem>
                      <SelectItem value="ineligible">Ineligible ({totalIneligible})</SelectItem>
                    </SelectContent>
                  </Select>
                ) : (
                  <span className="text-sm font-semibold text-foreground shrink-0">
                    {eligibleItems.length > 0 ? `Eligible (${totalEligibleUnits})` : `Ineligible (${totalIneligible})`}
                  </span>
                )}
                <div className="relative flex-1 min-w-0">
                  <Search className="absolute left-2.5 top-2 h-4 w-4 text-muted-foreground" />
                  <Input placeholder="Search product or variant..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-9 bg-white text-sm h-8" />
                </div>
                {activeTab === "ineligible" && (
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="h-8 gap-1.5 text-sm bg-white shrink-0 px-3">
                        <SlidersHorizontal className="size-3" />Filter
                        {ineligibleStatusFilter.length > 0 && <span className="rounded-full bg-foreground text-background text-[10px] font-bold px-1.5 leading-5">{ineligibleStatusFilter.length}</span>}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-52 p-2 bg-white" align="end">
                      <div className="flex flex-col gap-0.5">
                        {Array.from(new Set(ineligibleItems.map(i => i.returnStatus))).map(status => (
                          <label key={status} className="flex items-center gap-2.5 px-2 py-1.5 rounded-md hover:bg-muted cursor-pointer text-sm">
                            <Checkbox checked={ineligibleStatusFilter.includes(status)} onCheckedChange={c => setIneligibleStatusFilter(p => c ? [...p, status] : p.filter(s => s !== status))} />
                            {status}
                          </label>
                        ))}
                        {ineligibleStatusFilter.length > 0 && (
                          <>
                            <Separator className="my-1" />
                            <button onClick={() => setIneligibleStatusFilter([])} className="text-xs text-muted-foreground hover:text-foreground px-2 py-1 text-left w-full rounded-md hover:bg-muted">Clear filters</button>
                          </>
                        )}
                      </div>
                    </PopoverContent>
                  </Popover>
                )}
                <Select value={pageSize} onValueChange={setPageSize}>
                  <SelectTrigger size="sm" className="w-[100px] bg-white text-sm shrink-0"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="5">Show 5</SelectItem>
                    <SelectItem value="10">Show 10</SelectItem>
                    <SelectItem value="25">Show 25</SelectItem>
                    <SelectItem value="all">Show All</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Desktop table */}
              <div className="hidden md:block w-full overflow-x-auto">
                <Table className="min-w-[560px]">
                  <TableHeader className="bg-background">
                    <TableRow className="hover:bg-transparent">
                      {activeTab === "eligible" && (
                        <TableHead className="w-8 pl-4 pr-0">
                          <Checkbox checked={isAllSelected} onCheckedChange={handleSelectAll} disabled={!policyAccepted || eligibleItems.length === 0} />
                        </TableHead>
                      )}
                      <TableHead className={activeTab === "eligible" ? "pl-3" : "pl-5"}>Product</TableHead>
                      <TableHead>Variant</TableHead>
                      <TableHead className="text-center">Qty</TableHead>
                      <TableHead className="text-right pr-4">Total</TableHead>
                      {activeTab === "ineligible" && <TableHead className="pr-5 text-right">Status</TableHead>}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedData.length === 0 ? (
                      <TableRow><TableCell colSpan={6} className="h-24 text-center text-muted-foreground">No items found.</TableCell></TableRow>
                    ) : paginatedData.map((item, rowIdx) => {
                      const displayQty = activeTab === "eligible" ? item.eligibleQuantity : item.quantity
                      const sel        = selectedItems[item.id]
                      const isLocked   = !policyAccepted && activeTab === "eligible"
                      const itemPrice  = item.unitPrice ?? orderAvgPrice
                      const reasonOpen = !!openReasons[item.id]
                      const reasonTxt  = ineligibleReasonText(item.returnStatus, item.returnReason, item.lineDeliveredAt)
                      const isUrgentRow = activeTab === "eligible" && item.lineDeliveredAt && (() => {
                        const d = new Date(item.lineDeliveredAt!)
                        if (isNaN(d.getTime())) return false
                        const daysLeft = 30 - Math.floor((Date.now() - d.getTime()) / (1000 * 60 * 60 * 24))
                        return daysLeft > 0 && daysLeft <= 5
                      })()

                      return (
                        <React.Fragment key={`${item.id}-${rowIdx}`}>
                          <TableRow className={cn("transition-colors", sel?.selected && "bg-muted/20", isUrgentRow && !sel?.selected && "bg-amber-50/40")}>
                            {activeTab === "eligible" && (
                              <TableCell className="pl-4 pr-0 py-3">
                                <Checkbox
                                  checked={sel?.selected || false}
                                  disabled={isLocked}
                                  onCheckedChange={c => {
                                    if (isLocked) return
                                    setSelectedItems(p => ({ ...p, [item.id]: c ? { selected: true, quantity: item.eligibleQuantity, reason: "", description: "" } : { ...p[item.id], selected: false } }))
                                  }}
                                />
                              </TableCell>
                            )}
                            <TableCell className={cn("py-3", activeTab === "eligible" ? "pl-3" : "pl-5")}>
                              <div className="flex items-center gap-3">
                                <ProductThumb item={item} />
                                <div className="min-w-0">
                                  <a href={pUrl(item.productHandle)} target="_blank" rel="noopener noreferrer" className="font-medium text-sm hover:underline truncate block max-w-[160px]">{item.title}</a>
                                  <span className="text-xs text-muted-foreground">£{itemPrice.toFixed(2)} each</span>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell className="py-3 text-sm">{item.variant?.title && item.variant.title !== "Default Title" ? item.variant.title : <span className="text-muted-foreground">—</span>}</TableCell>
                            <TableCell className="py-3 text-sm text-center tabular-nums">{displayQty}</TableCell>
                            <TableCell className="text-right pr-4 py-3">
                              <div className="flex flex-col items-end gap-1">
                                <span className="font-semibold text-sm tabular-nums">£{(itemPrice * (activeTab === "eligible" ? (sel?.quantity || item.eligibleQuantity) : displayQty)).toFixed(2)}</span>
                                {activeTab === "eligible" && <ReturnWindowBadge lineDeliveredAt={item.lineDeliveredAt} />}
                              </div>
                            </TableCell>
                            {activeTab === "ineligible" && (
                              <TableCell className="pr-5 py-3 text-right">
                                <IneligibleBadgeWithChevron
                                  status={item.returnStatus}
                                  reason={item.returnReason}
                                  lineDeliveredAt={item.lineDeliveredAt}
                                  open={reasonOpen}
                                  onToggle={() => setOpenReasons(p => ({ ...p, [item.id]: !p[item.id] }))}
                                />
                              </TableCell>
                            )}
                          </TableRow>

                          {activeTab === "ineligible" && reasonOpen && reasonTxt && (
                            <TableRow className="hover:bg-transparent">
                              <TableCell colSpan={ineligibleColSpan} className="py-0 px-0">
                                <div className="mx-5 mb-3 flex items-start gap-2 rounded-lg bg-muted/60 border border-border px-3 py-2.5">
                                  <Info className="size-3.5 text-muted-foreground shrink-0 mt-0.5" />
                                  <p className="text-xs text-muted-foreground leading-relaxed">{reasonTxt}</p>
                                </div>
                              </TableCell>
                            </TableRow>
                          )}

                          {sel?.selected && activeTab === "eligible" && (
                            <TableRow className="bg-zinc-50/60 hover:bg-zinc-50/60">
                              <TableCell colSpan={5} className="px-4 pb-3 pt-1">
                                <div className="ml-[calc(0.5rem+2.5rem+0.75rem)] grid grid-cols-2 gap-2.5">
                                  <div>
                                    <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground block mb-1">Return Qty</label>
                                    <Select value={String(sel.quantity)} onValueChange={v => setSelectedItems(p => ({ ...p, [item.id]: { ...p[item.id], quantity: parseInt(v) } }))}>
                                      <SelectTrigger className="h-8 text-sm bg-white"><SelectValue /></SelectTrigger>
                                      <SelectContent>{Array.from({ length: item.eligibleQuantity }, (_, i) => (<SelectItem key={i + 1} value={String(i + 1)}>{i + 1}</SelectItem>))}</SelectContent>
                                    </Select>
                                  </div>
                                  <div>
                                    <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground block mb-1">Reason</label>
                                    <Select value={sel.reason} onValueChange={v => setSelectedItems(p => ({ ...p, [item.id]: { ...p[item.id], reason: v } }))}>
                                      <SelectTrigger className="h-8 text-sm bg-white"><SelectValue placeholder="Select..." /></SelectTrigger>
                                      <SelectContent>{RETURN_REASONS.map(r => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}</SelectContent>
                                    </Select>
                                  </div>
                                  {sel.reason && (
                                    <div className="col-span-2">
                                      <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground block mb-1">
                                        {sel.reason === "OTHER" ? <>Notes <span className="text-destructive">*</span></> : "Notes (optional)"}
                                      </label>
                                      <Textarea value={sel.description} onChange={e => setSelectedItems(p => ({ ...p, [item.id]: { ...p[item.id], description: e.target.value } }))} placeholder={sel.reason === "OTHER" ? "Describe your reason (required)..." : "Any additional info..."} className="text-sm bg-white resize-none" rows={2} />
                                    </div>
                                  )}
                                </div>
                              </TableCell>
                            </TableRow>
                          )}
                        </React.Fragment>
                      )
                    })}
                  </TableBody>
                </Table>
              </div>

              {/* Mobile cards */}
              <div className="block md:hidden divide-y divide-border">
                {paginatedData.length === 0 ? (
                  <div className="py-10 text-center text-sm text-muted-foreground">No items found.</div>
                ) : paginatedData.map((item, rowIdx) => {
                  const displayQty = activeTab === "eligible" ? item.eligibleQuantity : item.quantity
                  const sel        = selectedItems[item.id]
                  const isLocked   = !policyAccepted && activeTab === "eligible"
                  const itemPrice  = item.unitPrice ?? orderAvgPrice
                  const hasVariant = item.variant?.title && item.variant.title !== "Default Title"
                  const reasonOpen = !!openReasons[item.id]
                  const reasonTxt  = ineligibleReasonText(item.returnStatus, item.returnReason, item.lineDeliveredAt)

                  return (
                    <div key={`${item.id}-${rowIdx}`} className={cn("transition-colors", sel?.selected && "bg-muted/20")}>
                      <div className="flex gap-3 items-center px-4 py-3">
                        {activeTab === "eligible" && (
                          <div className="shrink-0">
                            <Checkbox checked={sel?.selected || false} disabled={isLocked} onCheckedChange={c => {
                              if (isLocked) return
                              setSelectedItems(p => ({ ...p, [item.id]: c ? { selected: true, quantity: item.eligibleQuantity, reason: "", description: "" } : { ...p[item.id], selected: false } }))
                            }} />
                          </div>
                        )}
                        <ProductThumb item={item} />
                        <div className="flex-1 min-w-0">
                          <a href={pUrl(item.productHandle)} target="_blank" rel="noopener noreferrer" className="font-medium text-sm hover:underline block leading-tight">{item.title}</a>
                          {hasVariant && <p className="text-xs text-muted-foreground mt-0.5">{item.variant!.title}</p>}
                          <p className="text-xs text-muted-foreground mt-0.5">Qty {displayQty} · £{itemPrice.toFixed(2)} each</p>
                        </div>
                        <div className="shrink-0 text-right flex flex-col items-end gap-1">
                          <span className="font-semibold text-sm tabular-nums">£{(itemPrice * (activeTab === "eligible" ? (sel?.quantity || item.eligibleQuantity) : displayQty)).toFixed(2)}</span>
                          {activeTab === "eligible" && <ReturnWindowBadge lineDeliveredAt={item.lineDeliveredAt} />}
                          {activeTab === "ineligible" && (
                            <IneligibleBadgeWithChevron status={item.returnStatus} reason={item.returnReason} lineDeliveredAt={item.lineDeliveredAt} open={reasonOpen} onToggle={() => setOpenReasons(p => ({ ...p, [item.id]: !p[item.id] }))} />
                          )}
                        </div>
                      </div>
                      {activeTab === "ineligible" && reasonOpen && reasonTxt && (
                        <div className="mx-4 mb-3 flex items-start gap-2 rounded-lg bg-muted/60 border border-border px-3 py-2.5">
                          <Info className="size-3.5 text-muted-foreground shrink-0 mt-0.5" />
                          <p className="text-xs text-muted-foreground leading-relaxed">{reasonTxt}</p>
                        </div>
                      )}
                      {sel?.selected && activeTab === "eligible" && (
                        <div className="mx-4 mb-3 pt-3 border-t border-border/50 flex flex-col gap-3">
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground block mb-1">Return Qty</label>
                              <Select value={String(sel.quantity)} onValueChange={v => setSelectedItems(p => ({ ...p, [item.id]: { ...p[item.id], quantity: parseInt(v) } }))}>
                                <SelectTrigger className="h-9 text-sm bg-white"><SelectValue /></SelectTrigger>
                                <SelectContent>{Array.from({ length: item.eligibleQuantity }, (_, i) => (<SelectItem key={i + 1} value={String(i + 1)}>{i + 1}</SelectItem>))}</SelectContent>
                              </Select>
                            </div>
                            <div>
                              <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground block mb-1">Reason</label>
                              <Select value={sel.reason} onValueChange={v => setSelectedItems(p => ({ ...p, [item.id]: { ...p[item.id], reason: v } }))}>
                                <SelectTrigger className="h-9 text-sm bg-white"><SelectValue placeholder="Select..." /></SelectTrigger>
                                <SelectContent>{RETURN_REASONS.map(r => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}</SelectContent>
                              </Select>
                            </div>
                          </div>
                          {sel.reason && (
                            <div>
                              <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground block mb-1">
                                {sel.reason === "OTHER" ? <>Notes <span className="text-destructive">*</span></> : "Notes (optional)"}
                              </label>
                              <Textarea value={sel.description} onChange={e => setSelectedItems(p => ({ ...p, [item.id]: { ...p[item.id], description: e.target.value } }))} placeholder={sel.reason === "OTHER" ? "Describe your reason (required)..." : "Any additional info..."} className="text-sm bg-white resize-none" rows={2} />
                            </div>
                          )}
                 
