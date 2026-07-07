"use client"

import * as React from "react"
import { useEffect, useState, useMemo } from "react"
import { toast } from "sonner"
import {
  ChevronRight, LayoutGrid, List, ArrowLeft, RotateCcw, CheckCircle2,
  ShoppingBag, ShieldCheck, ExternalLink, Lock, Truck, Package, Search,
  MapPin, SlidersHorizontal, CreditCard, XCircle, Info, RefreshCw, Clock,
} from "lucide-react"

import { AppSidebar } from "@/components/app-sidebar"
import { SiteHeader } from "@/components/site-header"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { SidebarLayoutProvider, useSidebarLayout } from "@/components/sidebar-layout-provider"
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
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card"
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Drawer, DrawerClose, DrawerContent, DrawerDescription, DrawerFooter, DrawerHeader, DrawerTitle, DrawerTrigger } from "@/components/ui/drawer"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { useMediaQuery } from "@/hooks/use-media-query"
import { cn } from "@/lib/utils"

// ─── Types ────────────────────────────────────────────────────────────────────
type ReturnStatus =
  | "Eligible" | "Confirmed" | "On its way" | "Out for delivery" | "Attempted delivery"
  | "Passed the return window" | "Returned" | "Refunded"
  | "Return requested" | "Return in progress"
  | "Return declined" | "Return cancelled" | "Cancelled"

interface LineItem {
  id: string; title: string; quantity: number; eligibleQuantity: number
  refundedQuantity: number; activeReturnQuantity: number
  unitPrice?: number | null; returnStatus: ReturnStatus; returnReason?: string
  lineDeliveredAt?: string | null; productHandle?: string | null
  image?: { url: string } | null; variant?: { title: string } | null
}
interface ShipmentTracking { company: string; number: string; url: string }
interface Shipment {
  id: string; displayStatus: string; deliveredAt: string | null
  trackingInfo: ShipmentTracking[]; items: { id: string; quantity: number }[]
}
interface Order {
  id: string; name: string; createdAt: string; cancelledAt?: string | null
  displayFulfillmentStatus: string
  totalPriceSet: { shopMoney: { amount: string; currencyCode: string } }
  totalRefundedSet?: { shopMoney: { amount: string } } | null
  processedItems: LineItem[]; shipments: Shipment[]; orderStatus: string
  deliveredCount: number; dispatchedCount: number; outForDeliveryCount: number; attemptedDeliveryCount: number; confirmedCount: number
  notDispatchedCount: number; totalUnits: number
  earliestDelivery?: string | null; latestDelivery?: string | null
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
const STATUS_FILTERS = ["Delivered", "Partially delivered", "On its way", "Partially dispatched"]
const C = "shadow-xs py-0 gap-0"
function pUrl(h?: string | null) { return h ? `https://iblazevape.co.uk/products/${h}` : "https://iblazevape.co.uk" }

// Status border colour for selected order — returns CSS colour value for inline style
function orderStatusBorderColor(order: Order): string {
  if (order.cancelledAt) return "#f87171"          // red-400
  switch (order.orderStatus) {
    case "Delivered":            return "#22c55e"   // green-500
    case "Partially delivered":  return "#fb923c"   // amber-400 (orange-ish)
    case "On its way":
    case "Partially dispatched":
    case "Out for delivery":     return "#60a5fa"   // blue-400
    case "Attempted delivery":   return "#fb7185"   // rose-400
    case "Confirmed":            return "#a1a1aa"   // zinc-400
    default:                     return "#a1a1aa"
  }
}

// ─── Order Status Badge ───────────────────────────────────────────────────────
// Single badge — used in the detail header and grid card
function OrderStatusBadge({ order }: { order: Order }) {
  if (order.cancelledAt) return <Badge className="bg-red-50 text-red-700 hover:bg-red-50 border border-red-200 rounded-full text-xs font-medium">Cancelled</Badge>
  switch (order.orderStatus) {
    case "Delivered":            return <Badge className="bg-green-50 text-green-700 hover:bg-green-50 border border-green-200 rounded-full text-xs font-medium inline-flex items-center gap-1"><CheckCircle2 className="size-3"/>Delivered</Badge>
    case "Partially delivered":  return <Badge className="bg-amber-50 text-amber-700 hover:bg-amber-50 border border-amber-200 rounded-full text-xs font-medium inline-flex items-center gap-1"><Truck className="size-3"/>Partially delivered</Badge>
    case "On its way":           return <Badge className="bg-blue-50 text-blue-700 hover:bg-blue-50 border border-blue-200 rounded-full text-xs font-medium inline-flex items-center gap-1"><Truck className="size-3"/>On its way</Badge>
    case "Partially dispatched": return <Badge className="bg-blue-50 text-blue-700 hover:bg-blue-50 border border-blue-200 rounded-full text-xs font-medium inline-flex items-center gap-1"><Truck className="size-3"/>Partially dispatched</Badge>
    case "Out for delivery":     return <Badge className="bg-indigo-50 text-indigo-700 hover:bg-indigo-50 border border-indigo-200 rounded-full text-xs font-medium inline-flex items-center gap-1"><Truck className="size-3"/>Out for delivery</Badge>
    case "Attempted delivery":   return <Badge className="bg-rose-50 text-rose-700 hover:bg-rose-50 border border-rose-200 rounded-full text-xs font-medium inline-flex items-center gap-1"><Truck className="size-3"/>Attempted delivery</Badge>
    case "Confirmed":            return <Badge variant="secondary" className="rounded-full text-xs font-medium">Confirmed</Badge>
    default:                     return <Badge variant="secondary" className="rounded-full text-xs font-medium">{order.orderStatus}</Badge>
  }
}

// Badge + breakdown text (e.g. "9 delivered · 21 on its way") — used ONLY in the list row
function OrderStatusBadges({ order }: { order: Order }) {
  const { orderStatus, cancelledAt, deliveredCount, dispatchedCount, outForDeliveryCount, attemptedDeliveryCount, confirmedCount, notDispatchedCount, totalUnits } = order
  const showStats = !cancelledAt && totalUnits > 0 && orderStatus !== "Delivered" && orderStatus !== "Confirmed" && orderStatus !== "Cancelled" && orderStatus !== "Out for delivery" && orderStatus !== "Attempted delivery"
  const parts: string[] = []
  if (deliveredCount > 0)          parts.push(`${deliveredCount} delivered`)
  if (attemptedDeliveryCount > 0)  parts.push(`${attemptedDeliveryCount} attempted delivery`)
  if (outForDeliveryCount > 0)     parts.push(`${outForDeliveryCount} out for delivery`)
  if (dispatchedCount > 0)         parts.push(`${dispatchedCount} on its way`)
  if (confirmedCount > 0)          parts.push(`${confirmedCount} confirmed`)
  if (notDispatchedCount > 0)      parts.push(`${notDispatchedCount} pending`)
  return (
    <div className="flex flex-col gap-0.5">
      <div className="flex items-center gap-1.5 flex-wrap">
        <OrderStatusBadge order={order}/>
      </div>
      {showStats && parts.length > 1 && (
        <span className="text-[11px] text-muted-foreground">{parts.join(" · ")}</span>
      )}
    </div>
  )
}

// ─── Ineligible badges ────────────────────────────────────────────────────────
function OutlineBadge({ className, children }: { className: string; children: React.ReactNode }) {
  return <span className={cn("inline-flex items-center justify-center rounded-full border px-2 py-0.5 text-[11px] font-medium whitespace-nowrap gap-1", className)}>{children}</span>
}
function IneligibleBadge({ status }: { status: ReturnStatus }) {
  if (status === "Confirmed")                return <OutlineBadge className="bg-zinc-50 text-zinc-500 border-zinc-200">Confirmed</OutlineBadge>
  if (status === "On its way")               return <OutlineBadge className="bg-amber-50 text-amber-700 border-amber-200"><Truck className="size-3"/>On its way</OutlineBadge>
  if (status === "Out for delivery")         return <OutlineBadge className="bg-indigo-50 text-indigo-700 border-indigo-200"><Truck className="size-3"/>Out for delivery</OutlineBadge>
  if (status === "Attempted delivery")       return <OutlineBadge className="bg-rose-50 text-rose-700 border-rose-200"><Truck className="size-3"/>Attempted delivery</OutlineBadge>
  if (status === "Refunded")                 return <OutlineBadge className="bg-zinc-100 text-zinc-600 border-zinc-300">Refunded</OutlineBadge>
  if (status === "Cancelled")                return <OutlineBadge className="bg-red-50 text-red-700 border-red-200">Cancelled</OutlineBadge>
  if (status === "Passed the return window") return <OutlineBadge className="bg-zinc-100 text-zinc-500 border-zinc-200"><XCircle className="size-3"/>Window expired</OutlineBadge>
  if (status === "Return requested")         return <OutlineBadge className="bg-blue-50 text-blue-700 border-blue-200">Requested</OutlineBadge>
  if (status === "Return in progress")       return <OutlineBadge className="bg-purple-50 text-purple-700 border-purple-200">In progress</OutlineBadge>
  if (status === "Returned") return <OutlineBadge className="bg-teal-50 text-teal-700 border-teal-200">Returned</OutlineBadge>
  if (status === "Return declined")          return <OutlineBadge className="bg-zinc-100 text-zinc-500 border-zinc-200">Declined</OutlineBadge>
  if (status === "Return cancelled")         return <OutlineBadge className="bg-orange-50 text-orange-600 border-orange-200">Cancelled</OutlineBadge>
  return <span className="text-xs text-muted-foreground">{status}</span>
}
function ineligibleReasonText(status: ReturnStatus, reason?: string, lineDeliveredAt?: string | null): string | null {
  if (status === "Passed the return window") return (lineDeliveredAt ? `Delivered ${lineDeliveredAt}. ` : "") + (reason || "The return window for this item has closed.")
  if (status === "Return declined")    return reason || "This return was declined by our team."
  if (status === "Refunded")           return "This item has already been refunded."
  if (status === "On its way")         return "Items can only be returned once delivered."
  if (status === "Out for delivery")   return "Your parcel is out for delivery today — returns open once delivered."
  if (status === "Attempted delivery") return "A delivery attempt was made — please rebook or collect your parcel."
  if (status === "Confirmed")          return "We're preparing these items for shipping."
  return reason || null
}
// Ineligible cell — popover on click, no overlay/opacity change
function IneligibleStatusCell({ item }: { item: LineItem }) {
  const reasonTxt = ineligibleReasonText(item.returnStatus, item.returnReason, item.lineDeliveredAt)
  if (!reasonTxt) return <IneligibleBadge status={item.returnStatus}/>
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button className="inline-flex items-center gap-1 cursor-pointer">
          <IneligibleBadge status={item.returnStatus}/>
          <Info className="size-3 text-muted-foreground shrink-0"/>
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-3 bg-white" align="end" side="top">
        <p className="text-xs text-muted-foreground leading-relaxed">{reasonTxt}</p>
      </PopoverContent>
    </Popover>
  )
}

// ─── Return Window Badge ──────────────────────────────────────────────────────
function ReturnWindowBadge({ lineDeliveredAt }: { lineDeliveredAt?: string | null }) {
  if (!lineDeliveredAt) return null
  const d = new Date(lineDeliveredAt)
  if (isNaN(d.getTime())) return null
  const daysLeft = 30 - Math.floor((Date.now() - d.getTime()) / (1000 * 60 * 60 * 24))
  if (daysLeft <= 0) return null
  const isUrgent = daysLeft <= 5
  return (
    <span className={cn("inline-flex items-center gap-1 text-[11px] font-medium", isUrgent ? "text-amber-700" : "text-green-600")}>
      <Clock className="size-3"/>{daysLeft}d left
    </span>
  )
}

// ─── Product Thumb ────────────────────────────────────────────────────────────
function ProductThumb({ item, size = "sm" }: { item: LineItem; size?: "sm" | "md" }) {
  const cls = size === "md" ? "size-10" : "size-9"
  return (
    <a href={pUrl(item.productHandle)} target="_blank" rel="noopener noreferrer" className="shrink-0">
      <div className={cn(cls, "rounded-lg overflow-hidden bg-white border border-border hover:border-foreground transition-colors")}>
        {item.image?.url
          ? <img src={item.image.url} alt={item.title} className="w-full h-full object-cover"/>
          : (
            <div className="flex h-full w-full items-center justify-center bg-muted text-muted-foreground">
              <Package className={cn("shrink-0", size === "md" ? "size-4" : "size-3.5")} aria-hidden />
            </div>
          )}
      </div>
    </a>
  )
}

// ─── Loading overlay ──────────────────────────────────────────────────────────
function LoadingOverlay({ portalContent }: { portalContent: React.ReactNode }) {
  return (
    <div className="relative overflow-hidden" style={{ height: "100dvh", width: "100vw" }}>
      <div className="pointer-events-none select-none blur-xs brightness-95 h-full w-full">{portalContent}</div>
      <div className="absolute inset-0 z-50 flex items-center justify-center bg-background/40 backdrop-blur-xs">
        <Card className="w-full max-w-xs mx-4 shadow-xl">
          <div className="flex flex-col items-center justify-center gap-3 py-8 px-6">
            <div className="size-10 rounded-full bg-[#E5403B]/10 flex items-center justify-center">
              <Spinner className="size-5 text-[#E5403B]"/>
            </div>
            <div className="text-center">
              <p className="font-semibold text-sm">Authenticating</p>
              <p className="text-xs text-muted-foreground mt-0.5">Verifying your session securely...</p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  )
}

// ─── Shipment Items ───────────────────────────────────────────────────────────
function ShipmentItemList({ shipment, order, className }: { shipment: Shipment; order: Order; className?: string }) {
  const items = shipment.items.flatMap(({ id, quantity }) => {
    const li = order.processedItems.find(i => i.id === id)
    return li ? [{ ...li, shipQty: quantity }] : []
  })
  return (
    <div className={cn("divide-y divide-border", className)}>
      {items.map((item, i) => (
        <div key={i} className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0">
          <div className="size-8 rounded-md overflow-hidden bg-white border border-border shrink-0">
            {item.image?.url
              ? <img src={item.image.url} alt={item.title} className="w-full h-full object-cover"/>
              : (
                <div className="flex h-full w-full items-center justify-center bg-muted text-muted-foreground">
                  <Package className="size-3 shrink-0" aria-hidden />
                </div>
              )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-sm truncate">{item.title}</p>
            <p className="text-xs text-muted-foreground">{item.shipQty}×{item.variant?.title && item.variant.title !== "Default Title" ? ` ${item.variant.title}` : ""}</p>
          </div>
          {(item.unitPrice ?? 0) > 0 && <p className="text-sm font-medium shrink-0">£{((item.unitPrice ?? 0) * item.shipQty).toFixed(2)}</p>}
        </div>
      ))}
    </div>
  )
}
function ShipmentItemsModal({ shipment, order, idx }: { shipment: Shipment; order: Order; idx: number }) {
  const isDesktop  = useMediaQuery("(min-width: 768px)")
  const totalUnits = shipment.items.reduce((a, c) => a + c.quantity, 0)
  const isDelivered = shipment.displayStatus === "DELIVERED"
  const delivDate  = shipment.deliveredAt ? new Date(shipment.deliveredAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : null
  const sub = `${isDelivered && delivDate ? `Delivered ${delivDate}` : "On its way"} · ${totalUnits} unit${totalUnits !== 1 ? "s" : ""}`
  const trigger = (
    <button className="flex items-center gap-1 text-xs font-medium text-muted-foreground bg-muted px-2 py-1 rounded-md border border-dashed hover:bg-zinc-100 hover:border-zinc-300 transition-colors cursor-pointer shrink-0">
      <Package className="size-3.5"/>{totalUnits} units
    </button>
  )
  if (isDesktop) return (
    <Dialog>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-[420px] gap-0 p-0 overflow-hidden">
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-border">
          <DialogTitle className="flex items-center gap-2"><Truck className="size-4"/>Shipment {idx + 1}</DialogTitle>
          <DialogDescription>{sub}</DialogDescription>
        </DialogHeader>
        <ScrollArea className="max-h-[60vh] px-6 py-4"><ShipmentItemList shipment={shipment} order={order}/></ScrollArea>
      </DialogContent>
    </Dialog>
  )
  return (
    <Drawer shouldScaleBackground={false}>
      <DrawerTrigger asChild>{trigger}</DrawerTrigger>
      <DrawerContent>
        <DrawerHeader className="text-left pb-4">
          <DrawerTitle className="flex items-center gap-2"><Truck className="size-4"/>Shipment {idx + 1}</DrawerTitle>
          <DrawerDescription>{sub}</DrawerDescription>
        </DrawerHeader>
        <Separator/>
        <ScrollArea className="max-h-[60vh]"><ShipmentItemList shipment={shipment} order={order} className="px-4 py-4"/></ScrollArea>
        <DrawerFooter className="pt-2"><DrawerClose asChild><Button variant="outline" className="w-full">Close</Button></DrawerClose></DrawerFooter>
      </DrawerContent>
    </Drawer>
  )
}

// ─── Policy content ───────────────────────────────────────────────────────────
const POLICY_ITEMS = [
  { title: "Vape kits & mods",        desc: "30-day return period. 30-day warranty from delivery." },
  { title: "Batteries & chargers",    desc: "60-day battery warranty. 30-day charger warranty." },
  { title: "E-liquids & disposables", desc: "Must remain sealed and unopened. No returns on opened liquids." },
  { title: "Tanks & clearomisers",    desc: "7-day Dead On Arrival window — report faults within 7 days." },
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
      <p className="text-xs text-muted-foreground pt-2.5">Return postage at your expense. Tracked service required. Refunds within 5–10 business days.</p>
    </div>
  )
}
function HygienePolicy({ onAccept, onDecline, compact = false }: { onAccept: () => void; onDecline: () => void; compact?: boolean }) {
  const isDesktop = useMediaQuery("(min-width: 768px)")
  const trigger = compact
    ? <button className="flex items-center gap-1 text-xs font-medium text-muted-foreground bg-muted px-2 py-1 rounded-md border border-dashed hover:bg-zinc-100 hover:border-zinc-300 transition-colors cursor-pointer shrink-0">Read policy</button>
    : <button className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground bg-muted px-3 py-1.5 rounded-md border border-dashed hover:bg-zinc-100 hover:border-zinc-300 transition-colors cursor-pointer shrink-0"><ShieldCheck className="size-3.5"/>Read policy</button>
  if (isDesktop) return (
    <Dialog>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-[425px] gap-0 p-0 overflow-hidden">
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-border">
          <DialogTitle className="flex items-center gap-2"><ShieldCheck className="size-4 text-[#E5403B]"/>iBlaze Returns Policy</DialogTitle>
          <DialogDescription>Review before selecting items to return.</DialogDescription>
        </DialogHeader>
        <HygienePolicyList className="px-6 pt-4"/>
        <div className="flex gap-2 px-6 pb-6 pt-4">
          <DialogClose asChild><Button className="flex-1 bg-[#E5403B] hover:bg-[#cc3935] text-white" onClick={() => { onAccept(); toast.success("Policy accepted") }}><CheckCircle2 className="size-4"/>I accept</Button></DialogClose>
          <DialogClose asChild><Button variant="outline" className="flex-1" onClick={() => { onDecline(); toast.warning("Policy declined") }}>Decline</Button></DialogClose>
        </div>
      </DialogContent>
    </Dialog>
  )
  return (
    <Drawer shouldScaleBackground={false}>
      <DrawerTrigger asChild>{trigger}</DrawerTrigger>
      <DrawerContent>
        <DrawerHeader className="text-left pb-4">
          <DrawerTitle className="flex items-center gap-2"><ShieldCheck className="size-4 text-[#E5403B]"/>iBlaze Returns Policy</DrawerTitle>
          <DrawerDescription>Review before selecting items to return.</DrawerDescription>
        </DrawerHeader>
        <Separator/>
        <ScrollArea className="max-h-[50vh]"><HygienePolicyList className="px-4 py-4"/></ScrollArea>
        <DrawerFooter className="pt-2">
          <div className="flex gap-2">
            <DrawerClose asChild><Button className="flex-1 bg-[#E5403B] hover:bg-[#cc3935] text-white" onClick={() => { onAccept(); toast.success("Policy accepted") }}><CheckCircle2 className="size-4"/>I accept</Button></DrawerClose>
            <DrawerClose asChild><Button variant="outline" className="flex-1" onClick={() => { onDecline(); toast.warning("Policy declined") }}>Decline</Button></DrawerClose>
          </div>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  )
}

// ─── Orders List Panel ────────────────────────────────────────────────────────
function OrdersListPanel({
  orders, selectedOrder, onSelect, search, onSearch,
  statusFilter, onStatusFilter, loading, totalEligible, urgentOrder,
}: {
  orders: Order[]; selectedOrder: Order | null; onSelect: (o: Order) => void
  search: string; onSearch: (s: string) => void
  statusFilter: string[]; onStatusFilter: (f: string[]) => void
  loading: boolean; totalEligible: number; urgentOrder: { order: Order; daysLeft: number } | null
}) {
  return (
    <div className="flex flex-col h-full border-r border-border bg-white min-w-0 overflow-hidden">
      <div className="px-3 pt-3 pb-2 border-b border-border shrink-0 flex flex-col gap-2">
        {/* 1. Search */}
        <div className="relative">
          <Search className="absolute left-2.5 top-2 size-3.5 text-muted-foreground"/>
          <Input placeholder="Search orders..." value={search} onChange={e => onSearch(e.target.value)} className="pl-8 h-8 text-xs bg-muted/30"/>
        </div>
        {/* 2. Eligible banner — in the middle */}
        {!loading && totalEligible > 0 && (
          <div className="border border-border rounded-lg px-3 py-2 flex items-center gap-2">
            <RefreshCw className="size-3.5 text-muted-foreground shrink-0"/>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium">{totalEligible} item{totalEligible !== 1 ? "s" : ""} eligible for return</p>
              {urgentOrder && <p className="text-[10px] text-amber-700 font-medium truncate">{urgentOrder.order.name} · {urgentOrder.daysLeft}d left</p>}
            </div>
          </div>
        )}
        {/* 3. Order count + filter — below */}
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">{orders.length} order{orders.length !== 1 ? "s" : ""}</span>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="h-8 px-3 text-xs gap-1.5">
                <SlidersHorizontal className="size-3"/>Filter
                {statusFilter.length > 0 && <span className="size-4 rounded-full bg-foreground text-background text-[10px] font-bold flex items-center justify-center">{statusFilter.length}</span>}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-52 p-2 bg-white" align="end">
              <div className="flex flex-col gap-0.5">
                {STATUS_FILTERS.map(s => (
                  <label key={s} className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-muted cursor-pointer text-xs">
                    <Checkbox checked={statusFilter.includes(s)} onCheckedChange={c => onStatusFilter(c ? [...statusFilter, s] : statusFilter.filter(x => x !== s))}/>
                    {s}
                  </label>
                ))}
                {statusFilter.length > 0 && <button onClick={() => onStatusFilter([])} className="text-xs text-muted-foreground hover:text-foreground px-2 py-1 text-left rounded-md hover:bg-muted mt-1">Clear filters</button>}
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {/* Orders list — ScrollArea hides native scrollbar */}
      <ScrollArea className="flex-1">
        {loading ? (
          <div className="flex flex-col divide-y divide-border">
            {[1,2,3,4,5].map(i => (
              <div key={i} className="px-3 py-4 flex gap-2.5 animate-pulse">
                <div className="flex shrink-0">{[0,1,2].map(j => <div key={j} className="size-8 rounded-lg bg-muted" style={{ marginLeft: j > 0 ? "-8px" : "0" }}/>)}</div>
                <div className="flex-1"><div className="h-3 bg-muted rounded w-24 mb-2"/><div className="h-2.5 bg-muted rounded w-36"/></div>
              </div>
            ))}
          </div>
        ) : orders.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center px-4">
            <ShoppingBag className="size-8 text-muted-foreground/30 mb-2"/>
            <p className="text-sm text-muted-foreground">No orders found</p>
          </div>
        ) : (
          <div className="flex flex-col">
            {orders.map(o => <OrderListRow key={o.id} order={o} selected={selectedOrder?.id === o.id} onClick={() => onSelect(o)}/>)}
          </div>
        )}
      </ScrollArea>
    </div>
  )
}

function OrderListRow({ order, selected, onClick }: { order: Order; selected: boolean; onClick: () => void }) {
  const images = order.processedItems.map(i => i.image?.url).filter(Boolean).slice(0, 3) as string[]
  const total = parseFloat(order.totalPriceSet.shopMoney.amount)
  const isCancelled = !!order.cancelledAt
  const eligibleCount = order.processedItems
    .filter(i => i.returnStatus === "Eligible" && i.eligibleQuantity > 0)
    .reduce((s, i) => s + i.eligibleQuantity, 0)
  const dateLabel = (() => {
    if (isCancelled) return `Cancelled ${new Date(order.cancelledAt!).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}`
    if (order.latestDelivery) return `Delivered ${new Date(order.latestDelivery).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}`
    if (order.dispatchedCount > 0) return "On its way"
    return `Ordered ${new Date(order.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}`
  })()
  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full text-left px-3 py-4 flex items-start gap-3 hover:bg-muted/40 transition-colors border-b border-border last:border-b-0",
        selected && "bg-muted/30",
        isCancelled && "opacity-50"
      )}
      style={selected ? { borderRight: `3px solid ${orderStatusBorderColor(order)}` } : { borderRight: "3px solid transparent" }}
    >
      <div className="flex shrink-0 mt-0.5">
        {(isCancelled ? [] : images).map((url, i) => (
          <div key={i} className="size-9 rounded-lg border-2 border-white bg-muted overflow-hidden shadow-xs shrink-0" style={{ marginLeft: i > 0 ? "-8px" : "0" }}>
            <img src={url} alt="" className="w-full h-full object-cover"/>
          </div>
        ))}
        {isCancelled && <div className="size-9 rounded-lg bg-muted border border-border"/>}
        {!isCancelled && Array.from({ length: Math.max(0, 3 - images.length) }).map((_, i) => (
          <div key={i} className="size-9 rounded-lg border-2 border-white bg-muted shrink-0" style={{ marginLeft: images.length > 0 || i > 0 ? "-8px" : "0" }}/>
        ))}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 mb-1 flex-wrap">
          <span className="font-medium text-sm">{order.name}</span>
          {eligibleCount > 0 && (
            <span className="inline-flex items-center gap-1 text-[10px] font-medium border border-dashed border-green-400 text-green-700 bg-green-50 rounded-full px-1.5 py-0.5">
              <RotateCcw className="size-2.5"/>{eligibleCount}
            </span>
          )}
        </div>
        {/* Status badge + breakdown — no duplication */}
        <OrderStatusBadges order={order}/>
        <p className="text-xs text-muted-foreground mt-1">{dateLabel} · £{total.toFixed(2)}</p>
      </div>
      <ChevronRight className="size-4 text-muted-foreground shrink-0 mt-1"/>
    </button>
  )
}

// ─── Order Grid Card ──────────────────────────────────────────────────────────
function OrderGridCard({ order, onClick }: { order: Order; onClick: () => void }) {
  const uniqueImages = order.processedItems.map(i => i.image?.url).filter((u, i, a) => u && a.indexOf(u) === i).slice(0, 4) as string[]
  const total = parseFloat(order.totalPriceSet.shopMoney.amount)
  const eligibleCount = order.processedItems.filter(i => i.returnStatus === "Eligible" && i.eligibleQuantity > 0).reduce((s, i) => s + i.eligibleQuantity, 0)
  const dateLabel = order.cancelledAt
    ? `Cancelled ${new Date(order.cancelledAt).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}`
    : order.latestDelivery
    ? `Delivered ${new Date(order.latestDelivery).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}`
    : `Ordered ${new Date(order.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}`
  return (
    <button onClick={onClick} className="w-full text-left bg-white border border-border rounded-xl p-4 hover:border-zinc-300 transition-all duration-150 focus:outline-hidden flex flex-col gap-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-medium text-sm mb-1">{order.name}</p>
          <OrderStatusBadge order={order}/>
          {eligibleCount > 0 && (
            <span className="inline-flex items-center gap-1 text-[10px] font-medium border border-dashed border-green-400 text-green-700 bg-green-50 rounded-full px-1.5 py-0.5 mt-1.5 w-fit">
              <RotateCcw className="size-2.5"/>{eligibleCount} returnable
            </span>
          )}
        </div>
        <p className="font-medium text-sm shrink-0 tabular-nums">£{total.toFixed(2)}</p>
      </div>
      <div className="flex gap-1">
        {uniqueImages.map((url, i) => (
          <div key={i} className="size-9 rounded-md border border-border bg-white overflow-hidden shrink-0">
            <img src={url} alt="" className="w-full h-full object-cover"/>
          </div>
        ))}
      </div>
      <p className="text-xs text-muted-foreground">{dateLabel}</p>
    </button>
  )
}

// ─── Empty detail state ───────────────────────────────────────────────────────
function EmptyDetail() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-3 text-center p-8 bg-white">
      <div className="size-14 rounded-2xl bg-muted border border-border flex items-center justify-center">
        <ShoppingBag className="size-6 text-muted-foreground/50"/>
      </div>
      <div>
        <p className="font-medium text-sm text-muted-foreground">Select an order</p>
        <p className="text-xs text-muted-foreground/70 mt-0.5">Choose an order from the list to view details or start a return</p>
      </div>
    </div>
  )
}

// ─── Order Detail ─────────────────────────────────────────────────────────────
function OrderDetail({ order, onBack }: { order: Order; onBack: () => void }) {
  const [policyAccepted, setPolicyAccepted] = useState(false)
  const [selectedItems, setSelectedItems]   = useState<Record<string, { selected: boolean; quantity: number; reason: string; description: string }>>({})
  const [submitting, setSubmitting]         = useState(false)
  const [submitted, setSubmitted]           = useState(false)
  const [returnRef, setReturnRef]           = useState<string | null>(null)
  const [returnedCount, setReturnedCount]   = useState(0)
  const [returnedRefund, setReturnedRefund] = useState(0)
  const [searchQuery, setSearchQuery]       = useState("")
  const [showSearch, setShowSearch]         = useState(false)
  const [pageSize, setPageSize]             = useState("10")
  const [currentPage, setCurrentPage]       = useState(1)
  const [ineligibleStatusFilter, setIneligibleStatusFilter] = useState<string[]>([])
  const [activeTab, setActiveTab]           = useState<"eligible" | "ineligible">("eligible")
  const isDesktop = useMediaQuery("(min-width: 1024px)")

  const rawOrderId     = order.id.split("/").pop()
  const orderStatusUrl = `https://account.iblazevape.co.uk/orders/${rawOrderId}`
  const total          = parseFloat(order.totalPriceSet.shopMoney.amount)
  const orderAvgPrice  = order.totalUnits > 0 ? total / order.totalUnits : 0
  const refundedAmount = order.totalRefundedSet?.shopMoney?.amount ? parseFloat(order.totalRefundedSet.shopMoney.amount) : 0

  const eligibleItems   = useMemo(() => order.processedItems.filter(i => i.returnStatus === "Eligible" && i.eligibleQuantity > 0), [order])
  const ineligibleItems = useMemo(() => order.processedItems.filter(i => !(i.returnStatus === "Eligible" && i.eligibleQuantity > 0)), [order])
  const totalEligibleUnits = eligibleItems.reduce((s, i) => s + i.eligibleQuantity, 0)
  const totalIneligible    = ineligibleItems.reduce((s, i) => s + i.quantity, 0)
  const hasEligible        = eligibleItems.length > 0 && !order.cancelledAt
  const hasBothTabs        = eligibleItems.length > 0 && ineligibleItems.length > 0

  useEffect(() => {
    setActiveTab(eligibleItems.length > 0 ? "eligible" : "ineligible")
    setSelectedItems({}); setPolicyAccepted(false); setSearchQuery("")
    setIneligibleStatusFilter([]); setCurrentPage(1); setSubmitted(false); setShowSearch(false)
  }, [order.id])
  useEffect(() => { setCurrentPage(1) }, [activeTab, searchQuery, pageSize, ineligibleStatusFilter])

  const matchSearch = (item: LineItem) => {
    if (!searchQuery) return true
    const q = searchQuery.toLowerCase()
    return item.title.toLowerCase().includes(q) || (item.variant?.title || "").toLowerCase().includes(q)
  }
  const filteredEligible   = useMemo(() => eligibleItems.filter(matchSearch), [eligibleItems, searchQuery])
  const filteredIneligible = useMemo(() => ineligibleItems.filter(i => {
    if (!matchSearch(i)) return false
    if (ineligibleStatusFilter.length > 0 && !ineligibleStatusFilter.includes(i.returnStatus)) return false
    return true
  }), [ineligibleItems, searchQuery, ineligibleStatusFilter])

  const currentData = activeTab === "eligible" ? filteredEligible : filteredIneligible
  const size        = pageSize === "all" ? Math.max(currentData.length, 1) : parseInt(pageSize)
  const totalPages  = Math.ceil(currentData.length / size) || 1
  const paginated   = currentData.slice((currentPage - 1) * size, currentPage * size)

  const selectedCount   = Object.values(selectedItems).filter(v => v.selected).length
  const isAllSelected   = eligibleItems.length > 0 && eligibleItems.every(i => selectedItems[i.id]?.selected)
  const estimatedRefund = Object.entries(selectedItems).filter(([, v]) => v.selected).reduce((sum, [id, v]) => {
    const item = order.processedItems.find(i => i.id === id)
    return sum + (item ? (item.unitPrice ?? orderAvgPrice) * v.quantity : 0)
  }, 0)
  const canSubmit = selectedCount > 0 && policyAccepted &&
    Object.entries(selectedItems).filter(([, v]) => v.selected).every(([, v]) => v.reason && (v.reason !== "OTHER" || v.description.trim().length > 0))

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
    const items = Object.entries(selectedItems).filter(([, v]) => v.selected)
      .map(([lineItemId, v]) => ({ lineItemId, quantity: v.quantity, reason: v.reason, description: v.description }))
    if (!items.length) return
    setSubmitting(true)
    try {
      const res    = await fetch("/api/submit-return", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ orderId: rawOrderId, items }) })
      const result = await res.json()
      if (result.success) {
        setReturnRef(result.returnReference || null); setReturnedCount(selectedCount); setReturnedRefund(estimatedRefund); setSubmitted(true)
        setTimeout(() => { window.location.href = orderStatusUrl }, 5000)
      } else { toast.error("Submission failed", { description: result.error || "Something went wrong." }) }
    } catch { toast.error("Network error", { description: "Please check your connection." }) }
    finally { setSubmitting(false) }
  }

  const headerDateStr = (() => {
    if (order.cancelledAt) return `Cancelled ${new Date(order.cancelledAt).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}`
    if (order.latestDelivery) return `Delivered ${new Date(order.latestDelivery).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}`
    return `Ordered ${new Date(order.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}`
  })()

  if (submitted) return (
    <div className="max-w-sm mx-auto py-16 px-4">
      <div className="border border-border rounded-xl overflow-hidden bg-white">
        <div className="px-6 py-8 text-center border-b border-border">
          <div className="size-12 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-4"><CheckCircle2 className="size-6 text-green-600"/></div>
          <h2 className="text-base font-semibold mb-2">Return requested</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">Confirmation sent to your email. Our team reviews within 2–3 business days.</p>
        </div>
        <div className="px-5 py-4 flex flex-col gap-3">
          {returnRef && <div className="flex justify-between"><span className="text-xs text-muted-foreground">Reference</span><span className="text-xs font-medium font-mono">{returnRef}</span></div>}
          <div className="flex justify-between"><span className="text-xs text-muted-foreground">Items</span><span className="text-xs font-medium">{returnedCount}</span></div>
          <div className="flex justify-between"><span className="text-xs text-muted-foreground">Est. refund</span><span className="text-xs font-medium text-[#E5403B]">£{returnedRefund.toFixed(2)}</span></div>
        </div>
        <div className="px-5 pb-5"><Button variant="outline" className="w-full" onClick={onBack}><ArrowLeft className="size-4"/>Back to orders</Button></div>
      </div>
    </div>
  )

  return (
    <>
      <div className={cn("flex flex-col gap-4", !hasEligible ? "pb-4" : "pb-16")}>
        {/* Mobile back */}
        <Button variant="ghost" size="sm" onClick={onBack} className="lg:hidden -ml-2 text-muted-foreground w-fit">
          <ArrowLeft className="size-4"/>Back to orders
        </Button>

        {/* Order header */}
        <Card className={cn(C, "overflow-hidden")}>
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 px-5 py-4">
            <div>
              <div className="flex items-center gap-2 mb-1.5"><h2 className="text-base font-semibold">{order.name}</h2><OrderStatusBadge order={order}/></div>
              <p className="text-xs text-muted-foreground">{headerDateStr} · £{total.toFixed(2)} · {order.totalUnits} item{order.totalUnits !== 1 ? "s" : ""}</p>
            </div>
            <a href={orderStatusUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground hover:underline shrink-0">
              <ExternalLink className="size-3.5"/>View order status
            </a>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 border-t border-border divide-x divide-border">
            <div className="px-4 py-3">
              <p className="text-[10px] uppercase tracking-wider font-medium text-muted-foreground mb-1 flex items-center gap-1"><CreditCard className="size-3"/>Total paid</p>
              <p className="font-semibold text-sm tabular-nums">£{total.toFixed(2)}</p>
            </div>
            <div className="px-4 py-3">
              <p className="text-[10px] uppercase tracking-wider font-medium text-green-600 mb-1 flex items-center gap-1"><CheckCircle2 className="size-3"/>Eligible</p>
              <p className="font-semibold text-sm text-green-700">{totalEligibleUnits} item{totalEligibleUnits !== 1 ? "s" : ""}</p>
            </div>
            <div className="px-4 py-3">
              <p className="text-[10px] uppercase tracking-wider font-medium text-muted-foreground mb-1 flex items-center gap-1"><XCircle className="size-3"/>Ineligible</p>
              <p className="font-semibold text-sm text-muted-foreground">{totalIneligible} item{totalIneligible !== 1 ? "s" : ""}</p>
            </div>
            <div className="px-4 py-3">
              <p className="text-[10px] uppercase tracking-wider font-medium text-blue-600 mb-1 flex items-center gap-1"><RotateCcw className="size-3"/>Refunded</p>
              <p className="font-semibold text-sm text-blue-600 tabular-nums">£{refundedAmount.toFixed(2)}</p>
            </div>
          </div>
        </Card>

        {/* Cancelled */}
        {order.cancelledAt && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-center">
            <p className="font-semibold text-red-800 text-sm">This order was cancelled</p>
            <p className="text-xs text-red-700 mt-1">No items were dispatched — returns are not applicable.</p>
          </div>
        )}

        {/* Shipments */}
        {!order.cancelledAt && order.shipments?.length > 0 && (
          <div className="flex gap-3 overflow-x-auto snap-x pb-1" style={{ scrollbarWidth: "none" }}>
            {order.shipments.map((shipment, idx) => {
              const isDelivered = shipment.displayStatus === "DELIVERED"
              const dd = shipment.deliveredAt ? new Date(shipment.deliveredAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : null
              return (
                <div key={shipment.id} className={cn("snap-start border border-border rounded-xl bg-white overflow-hidden shrink-0", order.shipments.length === 1 ? "w-full" : "w-[80vw] sm:w-auto sm:flex-1 sm:min-w-[220px]")}>
                  <div className="flex items-center justify-between gap-2 px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <div className={cn("p-1.5 rounded-md", isDelivered ? "bg-green-50 text-green-600" : "bg-muted text-muted-foreground")}><Truck className="size-3.5"/></div>
                      <div>
                        <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">Shipment {idx + 1}</p>
                        <p className="text-xs font-medium">{isDelivered ? "Delivered" : "On its way"}{dd && <span className="text-muted-foreground font-normal"> · {dd}</span>}</p>
                      </div>
                    </div>
                    <ShipmentItemsModal shipment={shipment} order={order} idx={idx}/>
                  </div>
                  {shipment.trackingInfo.length > 0 && (
                    <div className="border-t border-border px-4 py-2 flex flex-col gap-1">
                      {shipment.trackingInfo.map((track, ti) => (
                        <div key={ti} className="flex items-center gap-1.5">
                          <MapPin className="size-3 text-muted-foreground shrink-0"/>
                          <span className="text-xs text-muted-foreground">{track.company}:</span>
                          {track.url
                            ? <a href={track.url} target="_blank" rel="noopener noreferrer" className="text-xs text-foreground font-medium hover:underline inline-flex items-center gap-0.5">{track.number}<ExternalLink className="size-2.5"/></a>
                            : <span className="text-xs font-medium">{track.number}</span>
                          }
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}

        {/* Items table */}
        {!order.cancelledAt && (
          <Card className={cn(C, "overflow-hidden flex flex-col")}>

            {/* Policy row — above toolbar */}
            {hasEligible && (
              <div className="px-4 py-3 border-b border-border flex items-center gap-3">
                <Checkbox
                  checked={policyAccepted}
                  onCheckedChange={c => setPolicyAccepted(!!c)}
                  className="data-[state=checked]:bg-[#E5403B] data-[state=checked]:border-[#E5403B] shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">
                    {policyAccepted ? "Returns policy accepted — select items below" : "Accept the returns policy to select items"}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">30-day returns · sealed liquids only · tracked postage at your cost</p>
                </div>
                <HygienePolicy compact onAccept={() => setPolicyAccepted(true)} onDecline={() => setPolicyAccepted(false)}/>
              </div>
            )}

            {/* Toolbar — all h-8 buttons */}
            <div className="px-3 py-2.5 border-b border-border flex items-center gap-2 bg-muted/20 flex-wrap">
              {/* Eligible/Ineligible — single Select combobox, same style as Show N */}
              {hasBothTabs && (
                <Select value={activeTab} onValueChange={v => setActiveTab(v as "eligible" | "ineligible")}>
                  <SelectTrigger className="h-8 w-auto min-w-[140px] text-xs bg-white shrink-0"><SelectValue/></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="eligible">Eligible ({totalEligibleUnits})</SelectItem>
                    <SelectItem value="ineligible">Ineligible ({totalIneligible})</SelectItem>
                  </SelectContent>
                </Select>
              )}
              {!hasBothTabs && (
                <span className="text-xs font-medium shrink-0">{eligibleItems.length > 0 ? `Eligible (${totalEligibleUnits})` : `Ineligible (${totalIneligible})`}</span>
              )}

              {/* Search — full bar on desktop, Command overlay on mobile */}
              {isDesktop ? (
                <div className="relative flex-1 min-w-[120px]">
                  <Search className="absolute left-2.5 top-2 size-3.5 text-muted-foreground"/>
                  <Input placeholder="Search product or variant..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-8 h-8 text-xs bg-white"/>
                </div>
              ) : (
                <>
                  <Button variant="outline" size="sm" className="h-8 w-8 px-0 bg-white shrink-0" onClick={() => setShowSearch(true)} aria-label="Search">
                    <Search className="size-3.5"/>
                  </Button>
                  {showSearch && (
                    <div className="fixed inset-0 z-50 bg-black/20 flex flex-col justify-start" onClick={() => setShowSearch(false)}>
                      <div className="bg-background m-4 mt-12 rounded-xl border border-border shadow-xl overflow-hidden" onClick={e => e.stopPropagation()}>
                        <Command>
                          <CommandInput
                            placeholder="Search product or variant..."
                            value={searchQuery}
                            onValueChange={setSearchQuery}
                            autoFocus
                          />
                          <CommandList className="max-h-[60vh]">
                            <CommandEmpty>No items found.</CommandEmpty>
                            <CommandGroup heading={activeTab === "eligible" ? "Eligible items" : "Ineligible items"}>
                              {(activeTab === "eligible" ? filteredEligible : filteredIneligible).map(item => {
                                const itemPrice = item.unitPrice ?? orderAvgPrice
                                return (
                                  <CommandItem
                                    key={item.id}
                                    value={`${item.title} ${item.variant?.title || ""}`}
                                    onSelect={() => {
                                      if (activeTab === "eligible" && policyAccepted) {
                                        const sel = selectedItems[item.id]
                                        setSelectedItems(p => ({ ...p, [item.id]: sel?.selected ? { ...p[item.id], selected: false } : { selected: true, quantity: item.eligibleQuantity, reason: p[item.id]?.reason || "", description: p[item.id]?.description || "" } }))
                                      }
                                      setShowSearch(false)
                                    }}
                                    className="flex items-center gap-3 px-3 py-2.5"
                                  >
                                    <div className="size-8 rounded-lg overflow-hidden bg-white border border-border shrink-0">
                                      {item.image?.url
                                        ? <img src={item.image.url} alt={item.title} className="w-full h-full object-cover"/>
                                        : (
                                          <div className="flex h-full w-full items-center justify-center bg-muted text-muted-foreground">
                                            <Package className="size-3 shrink-0" aria-hidden />
                                          </div>
                                        )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <p className="text-sm font-medium truncate">{item.title}</p>
                                      <p className="text-xs text-muted-foreground">{item.variant?.title && item.variant.title !== "Default Title" ? `${item.variant.title} · ` : ""}£{itemPrice.toFixed(2)} each</p>
                                    </div>
                                    {activeTab === "eligible" && selectedItems[item.id]?.selected && <CheckCircle2 className="size-4 text-[#E5403B] shrink-0"/>}
                                  </CommandItem>
                                )
                              })}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                        <div className="border-t border-border px-3 py-2 flex justify-end">
                          <button className="text-xs text-muted-foreground" onClick={() => { setSearchQuery(""); setShowSearch(false) }}>Clear &amp; close</button>
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}

              {/* Select all */}
              {activeTab === "eligible" && hasEligible && (
                <label className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer select-none shrink-0 h-8 px-1">
                  <Checkbox checked={isAllSelected} disabled={!policyAccepted} onCheckedChange={handleSelectAll} className="data-[state=checked]:bg-[#E5403B] data-[state=checked]:border-[#E5403B]"/>
                  All
                </label>
              )}

              {/* Filter — ineligible only */}
              {activeTab === "ineligible" && (
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="sm" className="h-8 px-3 text-xs gap-1.5 bg-white shrink-0">
                      <SlidersHorizontal className="size-3"/>Filter
                      {ineligibleStatusFilter.length > 0 && <span className="size-4 rounded-full bg-foreground text-background text-[10px] font-bold flex items-center justify-center">{ineligibleStatusFilter.length}</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-52 p-2 bg-white" align="end">
                    <div className="flex flex-col gap-0.5">
                      {Array.from(new Set(ineligibleItems.map(i => i.returnStatus))).map(status => (
                        <label key={status} className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-muted cursor-pointer text-xs">
                          <Checkbox checked={ineligibleStatusFilter.includes(status)} onCheckedChange={c => setIneligibleStatusFilter(p => c ? [...p, status] : p.filter(s => s !== status))}/>
                          {status}
                        </label>
                      ))}
                      {ineligibleStatusFilter.length > 0 && <button onClick={() => setIneligibleStatusFilter([])} className="text-xs text-muted-foreground px-2 py-1 text-left hover:bg-muted rounded-md mt-1">Clear</button>}
                    </div>
                  </PopoverContent>
                </Popover>
              )}

              {/* Show N — same Select style */}
              <Select value={pageSize} onValueChange={v => { setPageSize(v); setCurrentPage(1) }}>
                <SelectTrigger className="h-8 w-[100px] text-xs bg-white shrink-0"><SelectValue/></SelectTrigger>
                <SelectContent align="end">
                  <SelectItem value="5">Show 5</SelectItem>
                  <SelectItem value="10">Show 10</SelectItem>
                  <SelectItem value="25">Show 25</SelectItem>
                  <SelectItem value="all">Show All</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Table */}
            <div className="w-full overflow-x-auto" style={{ scrollbarWidth: "none" }}>
              <Table className="min-w-[560px]">
                <TableHeader className="bg-background">
                  <TableRow className="hover:bg-transparent">
                    {activeTab === "eligible" && (
                      <TableHead className="w-8 pl-4 pr-0">
                        <Checkbox checked={isAllSelected} onCheckedChange={handleSelectAll} disabled={!policyAccepted || eligibleItems.length === 0} className="data-[state=checked]:bg-[#E5403B] data-[state=checked]:border-[#E5403B]"/>
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
                  {paginated.length === 0 ? (
                    <TableRow><TableCell colSpan={6} className="h-24 text-center text-muted-foreground">No items found.</TableCell></TableRow>
                  ) : paginated.map((item, rowIdx) => {
                    const displayQty = activeTab === "eligible" ? item.eligibleQuantity : item.quantity
                    const sel        = selectedItems[item.id]
                    const isLocked   = !policyAccepted && activeTab === "eligible"
                    const itemPrice  = item.unitPrice ?? orderAvgPrice
                    return (
                      <React.Fragment key={`${item.id}-${rowIdx}`}>
                        <TableRow className={cn("transition-colors", sel?.selected && "bg-muted/20")}>
                          {activeTab === "eligible" && (
                            <TableCell className="pl-4 pr-0 py-3">
                              <Checkbox checked={sel?.selected || false} disabled={isLocked} onCheckedChange={c => { if (isLocked) return; setSelectedItems(p => ({ ...p, [item.id]: c ? { selected: true, quantity: item.eligibleQuantity, reason: "", description: "" } : { ...p[item.id], selected: false } })) }} className="data-[state=checked]:bg-[#E5403B] data-[state=checked]:border-[#E5403B]"/>
                            </TableCell>
                          )}
                          <TableCell className={cn("py-3", activeTab === "eligible" ? "pl-3" : "pl-5")}>
                            <div className="flex items-center gap-3">
                              <ProductThumb item={item}/>
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
                              {activeTab === "eligible" && <ReturnWindowBadge lineDeliveredAt={item.lineDeliveredAt}/>}
                            </div>
                          </TableCell>
                          {activeTab === "ineligible" && (
                            <TableCell className="pr-5 py-3 text-right">
                              <IneligibleStatusCell item={item}/>
                            </TableCell>
                          )}
                        </TableRow>
                        {sel?.selected && activeTab === "eligible" && (
                          <TableRow className="bg-zinc-50/60 hover:bg-zinc-50/60">
                            <TableCell colSpan={5} className="px-4 pt-3 pb-4">
                              <div className="ml-[calc(0.5rem+2.25rem+0.75rem)] grid grid-cols-2 gap-3">
                                <div>
                                  <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground block mb-1.5">Return qty</label>
                                  <Select value={String(sel.quantity)} onValueChange={v => setSelectedItems(p => ({ ...p, [item.id]: { ...p[item.id], quantity: parseInt(v) } }))}>
                                    <SelectTrigger className="h-9 text-sm bg-white"><SelectValue/></SelectTrigger>
                                    <SelectContent>{Array.from({ length: item.eligibleQuantity }, (_, i) => <SelectItem key={i + 1} value={String(i + 1)}>{i + 1}</SelectItem>)}</SelectContent>
                                  </Select>
                                </div>
                                <div>
                                  <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground block mb-1.5">Reason</label>
                                  <Select value={sel.reason} onValueChange={v => setSelectedItems(p => ({ ...p, [item.id]: { ...p[item.id], reason: v } }))}>
                                    <SelectTrigger className="h-9 text-sm bg-white"><SelectValue placeholder="Select reason..."/></SelectTrigger>
                                    <SelectContent>{RETURN_REASONS.map(r => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}</SelectContent>
                                  </Select>
                                </div>
                                {sel.reason && (
                                  <div className="col-span-2">
                                    <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground block mb-1.5">
                                      {sel.reason === "OTHER" ? <>Notes <span className="text-destructive">*required</span></> : "Notes (optional)"}
                                    </label>
                                    <Textarea value={sel.description} onChange={e => setSelectedItems(p => ({ ...p, [item.id]: { ...p[item.id], description: e.target.value } }))} placeholder={sel.reason === "OTHER" ? "Describe your reason (required)..." : "Any additional info..."} className="text-sm bg-white resize-none" rows={2}/>
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

            {/* Pagination */}
            {pageSize !== "all" && currentData.length > size && (
              <div className="px-4 py-3 border-t border-border flex items-center justify-between text-xs text-muted-foreground">
                <span>Showing {Math.min((currentPage - 1) * size + 1, currentData.length)}–{Math.min(currentPage * size, currentData.length)} of {currentData.length}</span>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}>Previous</Button>
                  <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage >= totalPages}>Next</Button>
                </div>
              </div>
            )}
          </Card>
        )}
      </div>

      {/* Sticky footer — from original code, connected to table */}
      {hasEligible && !order.cancelledAt && (
        <div className="sticky bottom-4 z-48 border border-border rounded-xl bg-background shadow-[0_2px_12px_rgba(0,0,0,0.08)]" style={{ paddingBottom: "env(safe-area-inset-bottom)" }}>
          <div className="px-3 sm:px-4 py-2 sm:py-2.5 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 sm:gap-3 min-w-0">
              <div className="shrink-0">
                <p className="text-[9px] sm:text-[10px] uppercase tracking-wider text-muted-foreground font-semibold leading-none mb-0.5">Selected</p>
                <p className="text-xs sm:text-sm font-semibold leading-tight">{selectedCount} item{selectedCount !== 1 ? "s" : ""}</p>
              </div>
              <Separator orientation="vertical" className="h-6 shrink-0"/>
              <div className="shrink-0">
                <p className="text-[9px] sm:text-[10px] uppercase tracking-wider text-muted-foreground font-semibold leading-none mb-0.5">Refund</p>
                <p className="text-xs sm:text-sm font-bold text-[#E5403B] leading-tight">£{estimatedRefund.toFixed(2)}</p>
              </div>
              {!policyAccepted && (
                <div className="hidden md:flex items-center gap-1.5 text-xs text-muted-foreground shrink-0">
                  <Lock className="size-3.5 shrink-0"/><span>Accept policy to continue</span>
                </div>
              )}
            </div>
            <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
              <Button variant="ghost" size="sm" onClick={onBack} className="text-muted-foreground hidden sm:inline-flex">Cancel</Button>
              <Button size="sm" className="bg-[#E5403B] hover:bg-[#cc3935] text-white disabled:opacity-50" disabled={!canSubmit || submitting} onClick={submitReturn}>
                {submitting ? <><Spinner className="size-4"/><span className="hidden sm:inline ml-1">Submitting...</span></> : <><RotateCcw className="size-4"/><span className="hidden sm:inline ml-1">Submit Return</span></>}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

// ─── Dashboard Client ─────────────────────────────────────────────────────────
export default function DashboardClient() {
  return (
    <SidebarLayoutProvider>
      <DashboardClientInner />
    </SidebarLayoutProvider>
  )
}

function DashboardClientInner() {
  const { layout } = useSidebarLayout()
  const [data, setData]                   = useState<OrdersData | null>(null)
  const [loading, setLoading]             = useState(true)
  const [error, setError]                 = useState<string | null>(null)
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  const [view, setView]                   = useState<"grid" | "list">("list")
  const [search, setSearch]               = useState("")
  const [statusFilter, setStatusFilter]   = useState<string[]>([])
  const [sidebarOpen, setSidebarOpen]     = useState(true)
  const [mobileShowDetail, setMobileShowDetail] = useState(false)
  const isDesktop = useMediaQuery("(min-width: 1024px)")

  useEffect(() => {
    fetch("/api/get-orders", { cache: "no-store" })
      .then(r => r.json())
      .then(d => { if (d.error) setError(d.error); else setData(d) })
      .catch(() => setError("Failed to load orders."))
      .finally(() => setLoading(false))
  }, [])

  const filteredOrders = useMemo(() => (data?.orders || []).filter(o => {
    const ms = o.name.toLowerCase().includes(search.toLowerCase())
    const mf = statusFilter.length === 0 || statusFilter.includes(o.orderStatus)
    return ms && mf
  }), [data, search, statusFilter])

  const totalEligible = useMemo(() => (data?.orders || []).reduce((sum, o) => {
    if (o.cancelledAt) return sum
    return sum + o.processedItems.filter(i => i.returnStatus === "Eligible" && i.eligibleQuantity > 0).reduce((s, i) => s + i.eligibleQuantity, 0)
  }, 0), [data])

  const urgentOrder = useMemo(() => {
    let urgent: { order: Order; daysLeft: number } | null = null
    for (const o of (data?.orders || [])) {
      if (o.cancelledAt) continue
      for (const item of o.processedItems) {
        if (item.returnStatus !== "Eligible" || !item.lineDeliveredAt) continue
        const d = new Date(item.lineDeliveredAt); if (isNaN(d.getTime())) continue
        const dl = 30 - Math.floor((Date.now() - d.getTime()) / (1000 * 60 * 60 * 24))
        if (dl > 0 && dl <= 5 && (!urgent || dl < urgent.daysLeft)) urgent = { order: o, daysLeft: dl }
      }
    }
    return urgent
  }, [data])

  const handleSelectOrder = (order: Order) => {
    setSelectedOrder(order)
    if (!isDesktop) setMobileShowDetail(true)
  }
  const handleBack = () => {
    setMobileShowDetail(false)
    setTimeout(() => setSelectedOrder(null), 50)
  }

  const user = { name: data?.firstName || "Customer", email: data?.email || "" }

  const portalContent = (
    <SidebarProvider
      open={sidebarOpen}
      onOpenChange={setSidebarOpen}
      style={{ "--sidebar-width": "18rem", "--sidebar-width-icon": "3.75rem", "--header-height": "3rem" } as React.CSSProperties}
    >
      <AppSidebar variant={layout} user={user} onNavigate={() => { setSelectedOrder(null); setMobileShowDetail(false) }} activeSection="#orders"/>
      <SidebarInset className="flex flex-col overflow-hidden min-w-0">
        <SiteHeader
          title={selectedOrder && !isDesktop ? selectedOrder.name : "My Orders"}
          search={isDesktop || !mobileShowDetail ? search : ""}
          onSearch={setSearch}
          showSearch={isDesktop || !mobileShowDetail}
        />

        {error && (
          <div className="mx-4 mt-4 flex items-center gap-3 p-4 rounded-xl bg-destructive/10 text-sm text-destructive border border-destructive/20">
            <ShoppingBag className="size-5 shrink-0"/>{error}
          </div>
        )}

        {/* Master-detail layout */}
        <div className="flex flex-1 min-h-0 min-w-0 overflow-hidden h-full">

          {/* Left list panel — 340px on desktop */}
          <div className={cn(
            "shrink-0 overflow-hidden h-full",
            isDesktop ? "w-[340px]" : mobileShowDetail ? "hidden" : "w-full"
          )}>
            {isDesktop ? (
              <OrdersListPanel
                orders={filteredOrders} selectedOrder={selectedOrder} onSelect={handleSelectOrder}
                search={search} onSearch={setSearch} statusFilter={statusFilter} onStatusFilter={setStatusFilter}
                loading={loading} totalEligible={totalEligible} urgentOrder={urgentOrder}
              />
            ) : (
              /* Mobile: orders list with header controls */
              <div className="flex flex-col h-full bg-white overflow-hidden">
                <div className="flex-1 overflow-hidden">
                  <ScrollArea className="h-full">
                    <div className="p-4 flex flex-col gap-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h2 className="text-lg font-semibold">{data?.firstName ? `Hi, ${data.firstName} 👋` : "Your orders"}</h2>
                          <p className="text-sm text-muted-foreground mt-0.5">Select an order to start a return</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs">
                                <SlidersHorizontal className="size-3.5"/>Status
                                {statusFilter.length > 0 && <span className="size-4 rounded-full bg-foreground text-background text-[10px] font-bold flex items-center justify-center">{statusFilter.length}</span>}
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-52 p-2 bg-white" align="end">
                              <div className="flex flex-col gap-0.5">
                                {STATUS_FILTERS.map(s => (
                                  <label key={s} className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-muted cursor-pointer text-xs">
                                    <Checkbox checked={statusFilter.includes(s)} onCheckedChange={c => setStatusFilter(p => c ? [...p, s] : p.filter(x => x !== s))}/>
                                    {s}
                                  </label>
                                ))}
                                {statusFilter.length > 0 && <button onClick={() => setStatusFilter([])} className="text-xs text-muted-foreground px-2 py-1 text-left hover:bg-muted rounded-md mt-1">Clear</button>}
                              </div>
                            </PopoverContent>
                          </Popover>
                          <div className="flex items-center gap-0.5 h-8 bg-white border border-border rounded-lg px-0.5">
                            <Button variant="ghost" size="icon" className={cn("size-7", view === "list" && "bg-muted shadow-xs")} onClick={() => setView("list")}><List className="size-4"/></Button>
                            <Button variant="ghost" size="icon" className={cn("size-7", view === "grid" && "bg-muted shadow-xs")} onClick={() => setView("grid")}><LayoutGrid className="size-4"/></Button>
                          </div>
                        </div>
                      </div>
                      {!loading && totalEligible > 0 && (
                        <div className="border border-border rounded-lg px-3 py-2 flex items-center gap-2">
                          <RefreshCw className="size-3.5 text-muted-foreground shrink-0"/>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium">{totalEligible} item{totalEligible !== 1 ? "s" : ""} eligible for return</p>
                            {urgentOrder && <p className="text-[10px] text-amber-700 font-medium truncate">{urgentOrder.order.name} · {urgentOrder.daysLeft}d left</p>}
                          </div>
                        </div>
                      )}
                      {view === "list" ? (
                        <Card className={cn(C, "overflow-hidden")}>
                          <CardContent className="p-0">
                            {filteredOrders.length === 0
                              ? <div className="py-16 text-center text-sm text-muted-foreground">No orders found</div>
                              : filteredOrders.map(o => <OrderListRow key={o.id} order={o} selected={false} onClick={() => handleSelectOrder(o)}/>)
                            }
                          </CardContent>
                        </Card>
                      ) : (
                        <div className="grid grid-cols-2 gap-3">
                          {filteredOrders.map(o => <OrderGridCard key={o.id} order={o} onClick={() => handleSelectOrder(o)}/>)}
                        </div>
                      )}
                    </div>
                  </ScrollArea>
                </div>
              </div>
            )}
          </div>

          {/* Right detail panel — flex-1 always fills remaining width */}
          <div className={cn(
            "flex flex-col min-w-0 flex-1 h-full overflow-hidden",
            !isDesktop && !mobileShowDetail && "hidden"
          )}>
            {selectedOrder ? (
              /* ScrollArea fills the remaining height, content scrolls inside */
              <ScrollArea className="h-full w-full">
                <div className="p-4">
                  <OrderDetail order={selectedOrder} onBack={handleBack}/>
                </div>
              </ScrollArea>
            ) : isDesktop ? <EmptyDetail/> : null}
          </div>

        </div>
      </SidebarInset>
    </SidebarProvider>
  )

  if (loading) return <LoadingOverlay portalContent={portalContent}/>
  return portalContent
}
