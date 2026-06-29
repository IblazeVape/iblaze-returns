"use client"

import * as React from "react"
import { useEffect, useState, useMemo, useCallback, useRef, Suspense } from "react"
import { useSearchParams } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import { toast } from "sonner"
import {
  ArrowLeft, CheckCircle2, Package, RotateCcw, Lock, Wand2,
  XCircle, Truck, Clock, ShieldCheck, Search, SlidersHorizontal,
  ExternalLink, ChevronRight, BadgeCheck, Eye, CircleX,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Textarea } from "@/components/ui/textarea"
import { Separator } from "@/components/ui/separator"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Drawer, DrawerClose, DrawerContent, DrawerDescription, DrawerFooter, DrawerHeader, DrawerTitle, DrawerTrigger } from "@/components/ui/drawer"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { AppSidebar } from "@/components/app-sidebar"
import { SiteHeader } from "@/components/site-header"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { SidebarLayoutProvider, useSidebarLayout } from "@/components/sidebar-layout-provider"
import { useMediaQuery } from "@/hooks/use-media-query"
import { cn } from "@/lib/utils"

// ─── Types ────────────────────────────────────────────────────────────────────
type ReturnStatus =
  | "Eligible" | "Confirmed" | "On its way" | "Out for delivery" | "Attempted delivery"
  | "Passed the return window" | "Returned" | "Refunded"
  | "Return requested" | "Return in progress"
  | "Return declined" | "Return cancelled" | "Cancelled"
  | "Final sale" | "Not eligible"

interface LineItem {
  id: string; title: string; quantity: number; eligibleQuantity: number
  refundedQuantity: number; requestedReturnQuantity: number
  openReturnQuantity: number; completedReturnQuantity: number
  declinedReturnQuantity: number
  declinedReturnEntries: { quantity: number; message: string; declineReason?: string }[]
  inTransitQuantity?: number; pendingQuantity?: number
  unitPrice?: number | null; returnStatus: ReturnStatus; returnReason?: string
  lineDeliveredAt?: string | null; productHandle?: string | null
  image?: { url: string } | null; variant?: { title: string } | null
}
type DisplayItem = LineItem & { splitQty?: number; splitKey?: string }

interface Order {
  id: string; name: string; createdAt: string; cancelledAt?: string | null
  displayFulfillmentStatus: string
  totalPriceSet: { shopMoney: { amount: string; currencyCode: string } }
  totalRefundedSet?: { shopMoney: { amount: string } } | null
  processedItems: LineItem[]
  orderStatus: string; totalUnits: number
  deliveredCount: number; dispatchedCount: number; outForDeliveryCount: number; attemptedDeliveryCount: number; confirmedCount: number; notDispatchedCount: number
  earliestDelivery?: string | null; latestDelivery?: string | null
  eligibilitySource?: "shopify" | "shopify-admin" | "fallback"
}
interface OrdersData { firstName: string; email: string; orders: Order[] }

// ─── Constants ────────────────────────────────────────────────────────────────
const RETURN_REASONS = [
  { value: "CHANGED_MIND",     label: "Changed my mind" },
  { value: "WRONG_ITEM",       label: "Wrong item received" },
  { value: "FAULTY",           label: "Faulty / not working" },
  { value: "DAMAGED",          label: "Damaged in transit" },
  { value: "NOT_AS_DESCRIBED", label: "Not as described" },
  { value: "OTHER",            label: "Other" },
]

const POLICY_ITEMS = [
  { title: "Vape Kits & Mods",       desc: "30-day refund period. 30-day warranty from delivery." },
  { title: "Batteries & Chargers",   desc: "60-day battery warranty. 30-day charger warranty." },
  { title: "E-Liquids & Disposables",desc: "Must remain sealed and unopened. No returns on opened liquids." },
  { title: "Tanks & Clearomisers",   desc: "7-day Dead On Arrival window — report faults within 7 days." },
]

const RETURN_WINDOW_DAYS = 30

// ─── Helpers ──────────────────────────────────────────────────────────────────
function pUrl(handle?: string | null) {
  return handle ? `https://iblazevape.co.uk/products/${handle}` : "https://iblazevape.co.uk"
}

function fmt(d: string) {
  return new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })
}

function daysLeftToReturn(lineDeliveredAt?: string | null): number | null {
  if (!lineDeliveredAt) return null
  const delivered = new Date(lineDeliveredAt)
  if (isNaN(delivered.getTime())) return null
  const deadline = new Date(delivered.getTime() + RETURN_WINDOW_DAYS * 24 * 60 * 60 * 1000)
  const days = Math.ceil((deadline.getTime() - Date.now()) / (24 * 60 * 60 * 1000))
  return days > 0 ? days : null
}

function orderGlowClass(order: Order): string {
  if (order.cancelledAt) return "hover:border-red-300 hover:shadow-[0_0_0_3px_rgba(239,68,68,0.1),0_2px_10px_rgba(239,68,68,0.08)]"
  switch (order.orderStatus) {
    case "Delivered":            return "hover:border-green-300 hover:shadow-[0_0_0_3px_rgba(34,197,94,0.1),0_2px_10px_rgba(34,197,94,0.08)]"
    case "Partially delivered":  return "hover:border-amber-300 hover:shadow-[0_0_0_3px_rgba(245,158,11,0.1),0_2px_10px_rgba(245,158,11,0.08)]"
    case "On its way":
    case "Partially dispatched":
    case "Out for delivery":     return "hover:border-blue-300 hover:shadow-[0_0_0_3px_rgba(59,130,246,0.1),0_2px_10px_rgba(59,130,246,0.08)]"
    case "Attempted delivery":   return "hover:border-rose-300 hover:shadow-[0_0_0_3px_rgba(244,63,94,0.1),0_2px_10px_rgba(244,63,94,0.08)]"
    case "Confirmed":            return "hover:border-zinc-400 hover:shadow-[0_0_0_3px_rgba(161,161,170,0.15),0_2px_10px_rgba(161,161,170,0.1)]"
    default:                     return "hover:border-zinc-300 hover:shadow-sm"
  }
}

function getOrderFulfillmentBreakdown(order: Order): string | null {
  if (order.cancelledAt) return null
  const { deliveredCount, dispatchedCount, outForDeliveryCount, attemptedDeliveryCount, confirmedCount, notDispatchedCount } = order
  const parts: string[] = []
  if (deliveredCount > 0) parts.push(`${deliveredCount} delivered`)
  if (attemptedDeliveryCount > 0) parts.push(`${attemptedDeliveryCount} attempted delivery`)
  if (outForDeliveryCount > 0) parts.push(`${outForDeliveryCount} out for delivery`)
  if (dispatchedCount > 0) parts.push(`${dispatchedCount} on its way`)
  const notYet = confirmedCount + notDispatchedCount
  if (notYet > 0) parts.push(`${notYet} not yet shipped`)
  return parts.length > 1 ? parts.join(" · ") : null
}

function resolveDeclineMessage(message: string): string {
  const t = message.trim()
  if (!t || /^decline reason\.?$/i.test(t) || /^n\/?a$/i.test(t)) return "Your return request was declined."
  if (t.length < 12 && !/\s/.test(t) && !/[.!?]/.test(t)) return "Your return request was declined."
  return t
}

function groupDeclinedEntries(entries: { quantity: number; message: string }[]) {
  const map = new Map<string, number>()
  for (const e of entries) {
    const msg = resolveDeclineMessage(e.message)
    map.set(msg, (map.get(msg) || 0) + e.quantity)
  }
  return [...map.entries()].map(([message, quantity]) => ({ message, quantity }))
}

function getIneligibleGroupKey(item: LineItem): string {
  if (item.returnStatus === "Return declined") return `declined:${resolveDeclineMessage(item.returnReason || "")}`
  return `${item.returnStatus}:${item.returnReason || ""}`
}

function getIneligibleGroupMessage(item: LineItem): string {
  switch (item.returnStatus) {
    case "Confirmed":            return "These items haven't shipped yet. Your return window starts on delivery."
    case "On its way":           return "These items are on their way. Your return window starts on delivery."
    case "Out for delivery":     return "These items are out for delivery today. Your return window starts on delivery."
    case "Attempted delivery":   return "A delivery attempt was made. Please rebook or collect — your return window starts once delivered."
    case "Passed the return window": return "The return window has expired for these items."
    case "Return requested":         return "We've received your return request."
    case "Return in progress":       return "Your return is in progress."
    case "Returned":                 return "These items have already been returned."
    case "Refunded":                 return "These items have already been refunded."
    case "Return declined":          return resolveDeclineMessage(item.returnReason || "Your return request was declined.")
    case "Return cancelled":         return "This return request was cancelled."
    case "Final sale":
    case "Not eligible":             return "These items aren't eligible for return."
    default:                         return "These items aren't eligible for return."
  }
}

function getReturnStatusIcon(status: ReturnStatus): { icon: React.ElementType; color: string } {
  switch (status) {
    case "Return requested":   return { icon: Eye,          color: "text-violet-600" }
    case "Return in progress": return { icon: RotateCcw,    color: "text-orange-600" }
    case "Returned":           return { icon: CheckCircle2, color: "text-teal-600"   }
    case "Return cancelled":   return { icon: XCircle,      color: "text-zinc-500"   }
    case "Return declined":    return { icon: CircleX,      color: "text-red-600"    }
    case "Refunded":           return { icon: BadgeCheck,   color: "text-green-600"  }
    case "Attempted delivery": return { icon: Truck,        color: "text-rose-600"   }
    case "Out for delivery":   return { icon: Truck,        color: "text-indigo-600" }
    case "On its way":         return { icon: Package,      color: "text-indigo-600" }
    case "Cancelled":          return { icon: XCircle,      color: "text-rose-600"   }
    case "Passed the return window": return { icon: Lock,   color: "text-stone-600"  }
    case "Confirmed":          return { icon: Clock,        color: "text-slate-600"  }
    default:                   return { icon: Lock,         color: "text-zinc-400"   }
  }
}

function buildIneligibleDisplayItems(order: Order): DisplayItem[] {
  const result: DisplayItem[] = []
  for (const item of order.processedItems) {
    const isFullyEligible = item.returnStatus === "Eligible" && item.eligibleQuantity >= item.quantity
    if (isFullyEligible) continue
    const isPartiallyEligible = item.returnStatus === "Eligible" && item.eligibleQuantity > 0
    let remaining = isPartiallyEligible ? Math.max(0, item.quantity - item.eligibleQuantity) : item.quantity
    const take = (qty: number) => { const n = Math.min(Math.max(0, qty), remaining); remaining -= n; return n }

    const reqQty = take(item.requestedReturnQuantity)
    if (reqQty > 0) result.push({ ...item, returnStatus: "Return requested", returnReason: "", splitQty: reqQty, splitKey: `${item.id}-req` })
    const openQty = take(item.openReturnQuantity)
    if (openQty > 0) result.push({ ...item, returnStatus: "Return in progress", returnReason: "", splitQty: openQty, splitKey: `${item.id}-open` })
    const compQty = take(item.completedReturnQuantity)
    if (compQty > 0) result.push({ ...item, returnStatus: "Returned", returnReason: "", splitQty: compQty, splitKey: `${item.id}-comp` })

    if (item.declinedReturnEntries.length > 0) {
      const grouped = groupDeclinedEntries(item.declinedReturnEntries)
      grouped.forEach((entry, i) => {
        const dQty = take(entry.quantity)
        if (dQty > 0) result.push({ ...item, returnStatus: "Return declined", returnReason: entry.message, splitQty: dQty, splitKey: `${item.id}-dec-${i}`, declinedReturnEntries: [{ quantity: dQty, message: entry.message }] })
      })
    }

    const refQty = take(item.refundedQuantity || 0)
    if (refQty > 0) result.push({ ...item, returnStatus: "Refunded", returnReason: "", splitQty: refQty, splitKey: `${item.id}-ref` })

    if (isPartiallyEligible && remaining > 0) {
      result.push({ ...item, returnStatus: item.returnStatus, splitQty: remaining, splitKey: `${item.id}-rem` })
    } else if (remaining > 0) {
      result.push({ ...item, splitQty: remaining, splitKey: `${item.id}-rem` })
    }
  }
  return result
}

// ─── Small UI Components ───────────────────────────────────────────────────────
function ReturnWindowBadge({ days }: { days: number }) {
  return (
    <span className={cn("text-[11px] font-medium tabular-nums",
      days <= 7 ? "text-red-600" : days <= 14 ? "text-amber-600" : "text-green-600"
    )}> · {days}d left</span>
  )
}

function ProductImagePlaceholder({ iconClassName }: { iconClassName?: string }) {
  return (
    <div className="flex h-full w-full items-center justify-center bg-muted text-muted-foreground">
      <Package className={cn("size-4 shrink-0", iconClassName)} />
    </div>
  )
}

function ProductThumb({ item }: { item: LineItem }) {
  return (
    <a href={pUrl(item.productHandle)} target="_blank" rel="noopener noreferrer" className="shrink-0">
      <div className="size-10 rounded-md overflow-hidden bg-card border border-border hover:border-foreground transition-colors">
        {item.image?.url
          ? <img src={item.image.url} alt={item.title} className="w-full h-full object-cover" />
          : <ProductImagePlaceholder />}
      </div>
    </a>
  )
}

// ─── Status Label (same as dashboard) ────────────────────────────────────────
function StatusLabel({ order }: { order: Order }) {
  const { orderStatus, cancelledAt, deliveredCount, dispatchedCount, confirmedCount, notDispatchedCount } = order
  const deliveryDate = order.latestDelivery || order.earliestDelivery
  const breakdown = getOrderFulfillmentBreakdown(order)

  if (cancelledAt) return (
    <span className="text-[10px] font-medium text-red-600 shrink-0 inline-flex items-center gap-1">
      <XCircle className="size-3 shrink-0" />Cancelled {fmt(cancelledAt)}
    </span>
  )
  if (breakdown) {
    const notYetShipped = confirmedCount + notDispatchedCount
    const parts = [
      deliveredCount > 0 && <span key="d" className="inline-flex items-center gap-0.5 text-green-600"><CheckCircle2 className="size-3 shrink-0" />{deliveredCount} delivered</span>,
      dispatchedCount > 0 && <span key="s" className="inline-flex items-center gap-0.5 text-slate-600"><Truck className="size-3 shrink-0" />{dispatchedCount} on its way</span>,
      notYetShipped > 0 && <span key="p" className="inline-flex items-center gap-0.5 text-muted-foreground"><Clock className="size-3 shrink-0" />{notYetShipped} not yet shipped</span>,
    ].filter(Boolean)
    return (
      <span className="text-[10px] font-medium shrink-0 flex items-center gap-0.5">
        {parts.map((el, i) => <React.Fragment key={i}>{i > 0 && <span className="text-muted-foreground"> · </span>}{el}</React.Fragment>)}
      </span>
    )
  }

  const map: Record<string, [string, string, React.ElementType]> = {
    "Delivered":            ["text-green-600",        deliveryDate ? `Delivered ${fmt(deliveryDate)}` : "Delivered", CheckCircle2],
    "Partially delivered":  ["text-amber-600",        "Partially delivered", Package],
    "On its way":           ["text-blue-600",         "On its way", Truck],
    "Partially dispatched": ["text-blue-600",         "On its way", Truck],
    "Confirmed":            ["text-muted-foreground", "Confirmed",  Clock],
  }
  const [color, label, Icon] = map[orderStatus] || ["text-muted-foreground", orderStatus, Clock]
  return (
    <span className={cn("text-[10px] font-medium shrink-0 inline-flex items-center gap-1", color)}>
      <Icon className="size-3 shrink-0" />{label}
    </span>
  )
}

// ─── Order Card (same as dashboard) ──────────────────────────────────────────
function OrderCard({ order, onClick, index = 0 }: { order: Order; onClick: () => void; index?: number }) {
  const allUniqueImages = order.processedItems.map(i => i.image?.url).filter((u, i, a) => u && a.indexOf(u) === i) as string[]
  const uniqueImages = allUniqueImages.slice(0, 3)
  const extra = allUniqueImages.length - uniqueImages.length
  const total = parseFloat(order.totalPriceSet.shopMoney.amount)
  const cancelled = !!order.cancelledAt

  return (
    <div className={cn("h-full w-full", cancelled && "opacity-50")}>
      <motion.button
        onClick={cancelled ? undefined : onClick}
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.28, delay: Math.min(index * 0.055, 0.4), ease: [0.25, 0.1, 0.25, 1] }}
        className={cn(
          "group w-full h-full text-left bg-card border rounded-xl transition-[border-color,box-shadow] duration-150 focus:outline-none focus-visible:ring-0 flex flex-col overflow-hidden",
          cancelled ? "border-border cursor-not-allowed" : cn("border-border", orderGlowClass(order))
        )}
      >
        <div className="flex-1 px-4 pt-4 pb-3 flex flex-col gap-1.5">
          <div className="flex items-start justify-between gap-2">
            <p className={cn("font-semibold text-sm truncate", !cancelled && "group-hover:underline")}>{order.name}</p>
            <p className="font-semibold text-sm shrink-0">£{total.toFixed(2)}</p>
          </div>
          <p className="text-xs text-muted-foreground">Ordered {fmt(order.createdAt)} &bull; {order.totalUnits} item{order.totalUnits !== 1 ? "s" : ""}</p>
        </div>
        <div className="w-full px-4 py-2.5 border-t border-border bg-muted/60 flex items-center gap-1.5 shrink-0">
          <div className="flex items-center flex-1 min-w-0">
            <div className="flex -space-x-2">
              {uniqueImages.length > 0 ? uniqueImages.map((url, i) => (
                <div key={i} className="w-8 h-8 rounded-md border-2 border-muted bg-card overflow-hidden shadow-sm shrink-0">
                  <img src={url} alt="" className="w-full h-full object-cover" />
                </div>
              )) : (
                <div className="w-8 h-8 rounded-md border-2 border-muted bg-card overflow-hidden shadow-sm shrink-0 flex items-center justify-center bg-muted">
                  <Package className="size-3 text-muted-foreground" />
                </div>
              )}
            </div>
            {extra > 0 && <span className="text-[10px] font-medium text-muted-foreground ml-1.5">+{extra}</span>}
          </div>
          <StatusLabel order={order} />
        </div>
      </motion.button>
    </div>
  )
}

// ─── Policy Modal (same as dashboard) ────────────────────────────────────────
function HygienePolicyList({ itemPx = "px-6" }: { itemPx?: string }) {
  return (
    <div className="divide-y divide-border">
      {POLICY_ITEMS.map(p => (
        <div key={p.title} className={cn("py-3", itemPx)}>
          <p className="font-medium text-sm">{p.title}</p>
          <p className="text-xs text-muted-foreground mt-0.5">{p.desc}</p>
        </div>
      ))}
      <p className={cn("text-xs text-muted-foreground py-3", itemPx)}>Return postage is at your expense. Tracked service required. Refunds within 5–10 business days.</p>
    </div>
  )
}

function HygienePolicy({ onAccept, onDecline, link = false }: {
  onAccept: () => void; onDecline: () => void; link?: boolean
}) {
  const isDesktop = useMediaQuery("(min-width: 768px)")
  const trigger = link
    ? <Button variant="ghost" size="sm" className="h-auto shrink-0 gap-0.5 px-2 py-1 text-xs font-medium leading-snug text-muted-foreground hover:text-foreground">Review &amp; Accept<ChevronRight className="size-3.5 shrink-0" /></Button>
    : <Button size="sm" className="bg-[#E5403B] hover:bg-[#cc3935] text-white shrink-0">Review &amp; Accept</Button>

  if (isDesktop) {
    return (
      <Dialog>
        <DialogTrigger asChild>{trigger}</DialogTrigger>
        <DialogContent className="sm:max-w-[425px] gap-0 p-0 overflow-hidden">
          <DialogHeader className="px-6 pt-6 pb-4 border-b border-border">
            <DialogTitle className="flex items-center gap-2"><ShieldCheck className="size-4 text-[#E5403B]" /> iBlaze Returns Policy</DialogTitle>
            <DialogDescription>Review our returns policy before selecting items to return.</DialogDescription>
          </DialogHeader>
          <HygienePolicyList itemPx="px-6" />
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
        <ScrollArea className="max-h-[50vh]"><HygienePolicyList itemPx="px-4" /></ScrollArea>
        <DrawerFooter className="pt-2">
          <div className="flex gap-2">
            <DrawerClose asChild><Button className="flex-1 bg-[#E5403B] hover:bg-[#cc3935] text-white" onClick={() => { onAccept(); toast.success("Policy accepted") }}><CheckCircle2 className="size-4" /> I Accept</Button></DrawerClose>
            <DrawerClose asChild><Button variant="outline" className="flex-1" onClick={() => { onDecline(); toast.warning("Policy declined") }}>Decline</Button></DrawerClose>
          </div>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  )
}

// ─── Step 1: Order Selection ──────────────────────────────────────────────────
function StepOrders({
  orders, firstName, onSelect,
}: {
  orders: Order[]; firstName: string; onSelect: (o: Order) => void
}) {
  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="text-lg font-semibold">{firstName ? `Hi, ${firstName} 👋` : "Your orders"}</h2>
        <p className="text-sm text-muted-foreground mt-0.5">{orders.length} order{orders.length !== 1 ? "s" : ""} · select one to start your return</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
        {orders.map((order, i) => (
          <OrderCard key={order.id} order={order} index={i} onClick={() => onSelect(order)} />
        ))}
      </div>
    </div>
  )
}

// ─── Step 2: Return Detail (same design as dashboard OrderDetail) ─────────────
function StepReturnDetail({
  order, onBack, avgPrice,
}: {
  order: Order; onBack: () => void; avgPrice: number
}) {
  const [policyAccepted, setPolicyAccepted] = useState(false)
  const [selectedItems, setSelectedItems] = useState<Record<string, { selected: boolean; quantity: number; reason: string; description: string }>>({})
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [pageSize, setPageSize] = useState("10")
  const [currentPage, setCurrentPage] = useState(1)
  const [ineligibleStatusFilter, setIneligibleStatusFilter] = useState<ReturnStatus[]>([])

  const rawOrderId = order.id.split("/").pop()
  const orderStatusUrl = `https://account.iblazevape.co.uk/orders/${rawOrderId}`

  const eligibleItems = useMemo(() => order.processedItems.filter(i => i.returnStatus === "Eligible" && i.eligibleQuantity > 0), [order])
  const ineligibleItems = useMemo(() => buildIneligibleDisplayItems(order), [order])
  const hasEligible = eligibleItems.length > 0 && !order.cancelledAt
  const hasBothTabs = eligibleItems.length > 0 && ineligibleItems.length > 0
  const fullyIneligible = ineligibleItems.length > 0 && eligibleItems.length === 0
  const totalEligibleUnits = eligibleItems.reduce((s, i) => s + i.eligibleQuantity, 0)
  const totalIneligibleUnits = ineligibleItems.reduce((s, i) => s + (i.splitQty ?? i.quantity), 0)

  const [activeTab, setActiveTab] = useState<"eligible" | "ineligible">(() => eligibleItems.length > 0 ? "eligible" : "ineligible")
  useEffect(() => { setActiveTab(eligibleItems.length > 0 ? "eligible" : "ineligible") }, [order.id]) // eslint-disable-line react-hooks/exhaustive-deps

  // Ineligible filter options
  const ineligibleFilterOptions = useMemo(() => {
    const groups = new Map<string, ReturnStatus[]>()
    for (const item of ineligibleItems) {
      const label = item.returnStatus as string
      const existing = groups.get(label) ?? []
      if (!existing.includes(item.returnStatus)) existing.push(item.returnStatus)
      groups.set(label, existing)
    }
    return [...groups.entries()].map(([label, statuses]) => ({ label, statuses }))
  }, [ineligibleItems])
  const showIneligibleFilter = ineligibleFilterOptions.length > 1

  const matchesSearch = (item: LineItem) => {
    if (!searchQuery) return true
    const q = searchQuery.toLowerCase()
    return item.title.toLowerCase().includes(q) || (item.variant?.title || "").toLowerCase().includes(q)
  }

  const filteredEligible = useMemo(() => eligibleItems.filter(matchesSearch), [eligibleItems, searchQuery]) // eslint-disable-line react-hooks/exhaustive-deps
  const filteredIneligible = useMemo(() =>
    ineligibleItems
      .filter(item => {
        if (!matchesSearch(item)) return false
        if (ineligibleStatusFilter.length > 0 && !ineligibleStatusFilter.includes(item.returnStatus)) return false
        return true
      })
      .sort((a, b) => getIneligibleGroupKey(a).localeCompare(getIneligibleGroupKey(b))),
  [ineligibleItems, searchQuery, ineligibleStatusFilter]) // eslint-disable-line react-hooks/exhaustive-deps

  const currentData = (activeTab === "eligible" ? filteredEligible : filteredIneligible) as DisplayItem[]
  const size = pageSize === "all" ? Math.max(currentData.length, 1) : parseInt(pageSize)
  const totalPages = Math.ceil(currentData.length / size) || 1
  const paginatedData = currentData.slice((currentPage - 1) * size, currentPage * size)

  useEffect(() => { setCurrentPage(1) }, [activeTab, searchQuery, pageSize, ineligibleStatusFilter])

  const selectedCount = Object.values(selectedItems).filter(v => v.selected).length
  const estimatedRefund = Object.entries(selectedItems).filter(([, v]) => v.selected).reduce((sum, [id, v]) => {
    const item = order.processedItems.find(i => i.id === id)
    return sum + (item ? (item.unitPrice ?? avgPrice) * v.quantity : 0)
  }, 0)
  const isAllSelected = eligibleItems.length > 0 && selectedCount === eligibleItems.length
  const canSubmit = selectedCount > 0 && policyAccepted && Object.entries(selectedItems)
    .filter(([, v]) => v.selected)
    .every(([, v]) => v.reason && (v.reason !== "OTHER" || v.description.trim().length > 0))

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
    const items = Object.entries(selectedItems).filter(([, v]) => v.selected).map(([lineItemId, v]) => ({ lineItemId, quantity: v.quantity, reason: v.reason, description: v.description }))
    if (!items.length) return
    setSubmitting(true)
    try {
      const res = await fetch("/api/submit-return", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ orderId: rawOrderId, items }) })
      const result = await res.json()
      if (result.success) {
        setSubmitted(true)
      } else if (res.status === 401) {
        toast.error("Session expired", { description: "Please log in again." })
        setTimeout(() => { window.location.href = "/" }, 1500)
      } else if (result.code === "ELIGIBILITY_CHANGED") {
        toast.error("Eligibility changed", { description: "Some items are no longer eligible. Please review your selection." })
      } else {
        toast.error("Submission failed", { description: result.error || "Something went wrong." })
      }
    } catch { toast.error("Network error", { description: "Please check your connection." }) }
    finally { setSubmitting(false) }
  }

  if (submitted) {
    return (
      <div className="max-w-md mx-auto py-20 text-center space-y-4 px-4">
        <div className="size-16 bg-green-50 rounded-full flex items-center justify-center mx-auto"><CheckCircle2 className="size-8 text-green-500" /></div>
        <h2 className="text-xl font-semibold">Return Requested</h2>
        <p className="text-muted-foreground text-sm">We've sent you a confirmation email. Our team will review your return and be in touch within 2–3 business days.</p>
        <Button variant="outline" onClick={onBack} className="gap-2"><ArrowLeft className="size-4" />Return another order</Button>
      </div>
    )
  }

  return (
    <>
      <div className={cn("flex flex-col gap-4 px-4 pt-4", !hasEligible ? "pb-4" : "pb-9")}>
        <Button variant="ghost" size="sm" onClick={onBack} className="-ml-2 text-muted-foreground hover:text-foreground w-fit">
          <ArrowLeft className="size-4" /> Back to Orders
        </Button>

        {order.eligibilitySource === "fallback" && !order.cancelledAt && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-900">
            Return eligibility could not be loaded from Shopify. Shown counts are based on shipping status only and may not be accurate.
          </div>
        )}

        {/* ── Unified order + items card ── */}
        <div className={cn("rounded-xl border bg-card overflow-hidden flex flex-col shadow-sm", order.cancelledAt && "border-red-200")}>
          {order.cancelledAt && <div className="h-1 bg-red-400 w-full" />}

          {/* Order header */}
          <div className={cn("px-5 py-3.5 border-b flex items-center justify-between gap-4", order.cancelledAt ? "bg-red-50/40" : "bg-muted/20")}>
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground tabular-nums">
                Placed {new Date(order.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}
                {" · "}{order.totalUnits} item{order.totalUnits !== 1 ? "s" : ""}
                {" · "}£{parseFloat(order.totalPriceSet.shopMoney.amount).toFixed(2)}
              </p>
              {order.cancelledAt && <p className="text-xs text-red-600 mt-1">This order was cancelled — returns are not applicable.</p>}
            </div>
            {/* Stat blocks */}
            {!order.cancelledAt && (
              <div className="inline-flex items-stretch self-stretch shrink-0 border-l border-border -my-3.5 -mr-5">
                <div className="inline-flex items-stretch divide-x divide-border">
                  {hasBothTabs && (
                    <>
                      <button type="button" onClick={() => { setActiveTab("eligible"); setCurrentPage(1) }}
                        className={cn("inline-flex flex-col items-center justify-center gap-0 px-3 sm:px-4 min-w-[3.25rem] shrink-0 h-full bg-card transition-colors cursor-pointer hover:bg-muted/80", activeTab === "eligible" ? "bg-muted" : "opacity-55")}>
                        <span className="text-xl font-bold tabular-nums leading-none text-green-700">{totalEligibleUnits}</span>
                        <span className="text-[9px] uppercase tracking-wide text-muted-foreground leading-none mt-1 whitespace-nowrap">ready</span>
                      </button>
                      <button type="button" onClick={() => { setActiveTab("ineligible"); setCurrentPage(1) }}
                        className={cn("inline-flex flex-col items-center justify-center gap-0 px-3 sm:px-4 min-w-[3.25rem] shrink-0 h-full bg-card transition-colors cursor-pointer hover:bg-muted/80", activeTab === "ineligible" ? "bg-muted" : "opacity-55")}>
                        <span className="text-xl font-bold tabular-nums leading-none text-[#E5403B]">{totalIneligibleUnits}</span>
                        <span className="text-[9px] uppercase tracking-wide text-muted-foreground leading-none mt-1 whitespace-nowrap">blocked</span>
                      </button>
                    </>
                  )}
                  {fullyIneligible && (
                    <span className="inline-flex flex-col items-center justify-center gap-0 px-3 sm:px-4 min-w-[3.25rem] shrink-0 h-full bg-card">
                      <span className="text-xl font-bold tabular-nums leading-none text-[#E5403B]">{totalIneligibleUnits}</span>
                      <span className="text-[9px] uppercase tracking-wide text-muted-foreground leading-none mt-1 whitespace-nowrap">blocked</span>
                    </span>
                  )}
                  {hasEligible && !hasBothTabs && (
                    <span className="inline-flex flex-col items-center justify-center gap-0 px-3 sm:px-4 min-w-[3.25rem] shrink-0 h-full bg-card">
                      <span className="text-xl font-bold tabular-nums leading-none text-green-700">{totalEligibleUnits}</span>
                      <span className="text-[9px] uppercase tracking-wide text-muted-foreground leading-none mt-1 whitespace-nowrap">ready</span>
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Policy gate */}
          {!order.cancelledAt && hasEligible && !policyAccepted && (
            <div className="flex items-center justify-between gap-3 border-b bg-muted/20 px-3 py-2.5">
              <div className="flex min-w-0 items-center gap-2 overflow-hidden">
                <Lock className="size-3.5 shrink-0 text-foreground" />
                <span className="truncate text-xs font-medium leading-snug text-foreground">Accept our returns policy to select items to return</span>
              </div>
              <HygienePolicy link onAccept={() => setPolicyAccepted(true)} onDecline={() => setPolicyAccepted(false)} />
            </div>
          )}

          {/* Toolbar */}
          {!order.cancelledAt && (
            <div className="border-b bg-muted/20 px-3 py-2.5">
              <div className="flex items-center gap-2">
                {hasBothTabs && (
                  <Select value={activeTab} onValueChange={(v) => { setActiveTab(v as "eligible" | "ineligible"); setCurrentPage(1) }}>
                    <SelectTrigger className="w-[160px] h-8 bg-transparent text-sm"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="eligible">Eligible ({totalEligibleUnits})</SelectItem>
                      <SelectItem value="ineligible">Ineligible ({totalIneligibleUnits})</SelectItem>
                    </SelectContent>
                  </Select>
                )}
                <div className="relative flex-1">
                  <Search className="absolute left-2.5 top-2 h-4 w-4 text-muted-foreground" />
                  <Input placeholder="Search product or variant…" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-9 bg-transparent text-sm h-8" />
                </div>
                {activeTab === "ineligible" && showIneligibleFilter && (
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="h-8 gap-1.5 text-sm shrink-0 px-3 bg-transparent">
                        <SlidersHorizontal className="size-3" />Filter
                        {ineligibleStatusFilter.length > 0 && <span className="rounded-full bg-foreground text-background text-[10px] font-bold px-1.5 leading-5">{ineligibleStatusFilter.length}</span>}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-52 p-2" align="end">
                      <div className="flex flex-col gap-0.5">
                        {ineligibleFilterOptions.map(({ label, statuses }) => (
                          <label key={label} className="flex items-center gap-2.5 px-2 py-1.5 rounded-md hover:bg-muted cursor-pointer text-sm">
                            <Checkbox checked={statuses.every(s => ineligibleStatusFilter.includes(s))} onCheckedChange={c => setIneligibleStatusFilter(p => c ? [...p, ...statuses.filter(s => !p.includes(s))] : p.filter(s => !statuses.includes(s)))} />{label}
                          </label>
                        ))}
                        {ineligibleStatusFilter.length > 0 && <button onClick={() => setIneligibleStatusFilter([])} className="text-xs text-muted-foreground hover:text-foreground px-2 py-1 text-left w-full rounded-md hover:bg-muted mt-1">Clear filters</button>}
                      </div>
                    </PopoverContent>
                  </Popover>
                )}
                <Select value={pageSize} onValueChange={setPageSize}>
                  <SelectTrigger className="w-[100px] h-8 bg-transparent text-sm shrink-0"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="5">Show 5</SelectItem>
                    <SelectItem value="10">Show 10</SelectItem>
                    <SelectItem value="25">Show 25</SelectItem>
                    <SelectItem value="all">Show All</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {/* Mobile tab bar */}
          {!order.cancelledAt && hasBothTabs && (
            <div className="flex border-b sm:hidden">
              <button type="button" className={cn("flex-1 py-2.5 text-sm font-medium relative transition-colors", activeTab === "eligible" ? "text-foreground font-semibold" : "text-muted-foreground")} onClick={() => { setActiveTab("eligible"); setCurrentPage(1) }}>
                Eligible ({totalEligibleUnits}){activeTab === "eligible" && <span className="absolute bottom-0 left-0 right-0 h-px bg-foreground" />}
              </button>
              <div className="w-px bg-border self-stretch" />
              <button type="button" className={cn("flex-1 py-2.5 text-sm font-medium relative transition-colors", activeTab === "ineligible" ? "text-foreground font-semibold" : "text-muted-foreground")} onClick={() => { setActiveTab("ineligible"); setCurrentPage(1) }}>
                Ineligible ({totalIneligibleUnits}){activeTab === "ineligible" && <span className="absolute bottom-0 left-0 right-0 h-px bg-foreground" />}
              </button>
            </div>
          )}

          {activeTab === "ineligible" && !order.cancelledAt && (
            <div className="border-b px-5 py-2.5 text-[11px] leading-snug text-muted-foreground bg-muted/10">
              These items can&apos;t be selected here.{" "}
              <a href={orderStatusUrl} target="_blank" rel="noopener noreferrer" className="font-medium text-foreground underline underline-offset-2 inline-flex items-center gap-1">View return progress <ExternalLink className="size-3" /></a>
            </div>
          )}

          {/* Table */}
          <div className="w-full">
            <Table>
              <TableHeader className="bg-background">
                <TableRow className="hover:bg-transparent">
                  {activeTab === "eligible" && (
                    <TableHead className="w-8 pl-4 pr-0">
                      <Checkbox checked={isAllSelected} onCheckedChange={handleSelectAll} disabled={!policyAccepted || eligibleItems.length === 0} />
                    </TableHead>
                  )}
                  <TableHead className={activeTab === "eligible" ? "pl-3" : "pl-5"}>Product</TableHead>
                  <TableHead className="hidden sm:table-cell">Variant</TableHead>
                  <TableHead className="text-center hidden sm:table-cell">Qty</TableHead>
                  <TableHead className="text-right pr-4">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedData.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={activeTab === "eligible" ? 5 : 4} className="h-24 text-center text-muted-foreground">No items found.</TableCell>
                  </TableRow>
                ) : paginatedData.map((item, rowIdx) => {
                  const displayQty = activeTab === "eligible" ? item.eligibleQuantity : (item.splitQty ?? item.quantity)
                  const sel = selectedItems[item.id]
                  const isLocked = !policyAccepted && activeTab === "eligible"
                  const itemPrice = item.unitPrice ?? avgPrice
                  const groupKey = activeTab === "ineligible" ? getIneligibleGroupKey(item) : ""
                  const showGroupHeader = activeTab === "ineligible" && (rowIdx === 0 || getIneligibleGroupKey(paginatedData[rowIdx - 1]) !== groupKey)
                  const { icon: GIcon, color: gColor } = getReturnStatusIcon(item.returnStatus)

                  return (
                    <React.Fragment key={`${item.id}-${rowIdx}`}>
                      {showGroupHeader && (
                        <TableRow className="bg-muted/80 hover:bg-muted/80 border-b border-border/60">
                          <TableCell colSpan={4} className="py-3 pl-5 pr-4 whitespace-normal">
                            <div className="flex items-center gap-2">
                              <GIcon className={cn("size-3.5 shrink-0", gColor)} />
                              <p className="text-[11px] leading-snug text-muted-foreground">{getIneligibleGroupMessage(item)}</p>
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                      <TableRow className={cn("transition-colors", sel?.selected && "bg-muted/20")}>
                        {activeTab === "eligible" && (
                          <TableCell className="pl-4 pr-0 py-3">
                            <Checkbox checked={sel?.selected || false} disabled={isLocked}
                              onCheckedChange={c => { if (isLocked) return; setSelectedItems(p => ({ ...p, [item.id]: c ? { selected: true, quantity: item.eligibleQuantity, reason: "", description: "" } : { ...p[item.id], selected: false } })) }} />
                          </TableCell>
                        )}
                        <TableCell className={cn("py-3", activeTab === "eligible" ? "pl-3" : "pl-5")}>
                          <div className="flex items-center gap-3">
                            <ProductThumb item={item} />
                            <div className="min-w-0">
                              <a href={pUrl(item.productHandle)} target="_blank" rel="noopener noreferrer" className="font-medium text-sm hover:underline truncate block max-w-[160px] sm:max-w-[200px]">{item.title}</a>
                              <span className="sm:hidden text-[11px] text-muted-foreground block">{displayQty}×{item.variant?.title && item.variant.title !== "Default Title" ? ` ${item.variant.title}` : ""}</span>
                              <span className="text-[11px] text-muted-foreground">
                                £{itemPrice.toFixed(2)} each{activeTab === "eligible" && (() => { const d = daysLeftToReturn(item.lineDeliveredAt); return d !== null ? <ReturnWindowBadge days={d} /> : null })()}
                              </span>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="py-3 text-sm hidden sm:table-cell">
                          {item.variant?.title && item.variant.title !== "Default Title" ? item.variant.title : <span className="text-muted-foreground">—</span>}
                        </TableCell>
                        <TableCell className="py-3 text-sm text-center tabular-nums hidden sm:table-cell">{displayQty}</TableCell>
                        <TableCell className="text-right pr-4 py-3 font-semibold text-sm tabular-nums">
                          £{(itemPrice * (activeTab === "eligible" ? (sel?.quantity || item.eligibleQuantity) : displayQty)).toFixed(2)}
                        </TableCell>
                      </TableRow>

                      {/* Inline reason + qty row */}
                      {sel?.selected && activeTab === "eligible" && (
                        <>
                          <TableRow className="bg-white hover:bg-white border-b-0">
                            <TableCell className="pl-4 pr-0 pb-2 pt-3 hidden sm:table-cell" />
                            <TableCell className="pl-3 pb-2 pt-3 hidden sm:table-cell">
                              <div>
                                <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground block mb-1">Return Qty</label>
                                <Select value={String(sel.quantity)} onValueChange={v => setSelectedItems(p => ({ ...p, [item.id]: { ...p[item.id], quantity: parseInt(v) } }))}>
                                  <SelectTrigger className="h-8 text-sm w-24"><SelectValue /></SelectTrigger>
                                  <SelectContent>{Array.from({ length: item.eligibleQuantity }, (_, i) => <SelectItem key={i + 1} value={String(i + 1)}>{i + 1}</SelectItem>)}</SelectContent>
                                </Select>
                              </div>
                            </TableCell>
                            <TableCell className="pb-2 pt-3 hidden sm:table-cell">
                              <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground block mb-1">Reason</label>
                              <Select value={sel.reason} onValueChange={v => setSelectedItems(p => ({ ...p, [item.id]: { ...p[item.id], reason: v } }))}>
                                <SelectTrigger className="h-8 text-sm bg-card"><SelectValue placeholder="Select…" /></SelectTrigger>
                                <SelectContent>{RETURN_REASONS.map(r => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}</SelectContent>
                              </Select>
                            </TableCell>
                            <TableCell className="pb-2 pt-3 hidden sm:table-cell" />
                            {/* Mobile: full-width stacked */}
                            <TableCell colSpan={2} className="pb-3 pt-2 px-3 sm:hidden">
                              <div className="flex flex-col gap-2.5">
                                <div className="flex items-end gap-2">
                                  <div className="w-1/2">
                                    <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground block mb-1">Return Qty</label>
                                    <Select value={String(sel.quantity)} onValueChange={v => setSelectedItems(p => ({ ...p, [item.id]: { ...p[item.id], quantity: parseInt(v) } }))}>
                                      <SelectTrigger className="h-8 text-sm w-full"><SelectValue /></SelectTrigger>
                                      <SelectContent>{Array.from({ length: item.eligibleQuantity }, (_, i) => <SelectItem key={i + 1} value={String(i + 1)}>{i + 1}</SelectItem>)}</SelectContent>
                                    </Select>
                                  </div>
                                  <div className="w-1/2">
                                    <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground block mb-1">Reason</label>
                                    <Select value={sel.reason} onValueChange={v => setSelectedItems(p => ({ ...p, [item.id]: { ...p[item.id], reason: v } }))}>
                                      <SelectTrigger className="h-8 text-sm w-full"><SelectValue placeholder="Select…" /></SelectTrigger>
                                      <SelectContent>{RETURN_REASONS.map(r => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}</SelectContent>
                                    </Select>
                                  </div>
                                </div>
                              </div>
                            </TableCell>
                          </TableRow>
                          <TableRow className="bg-white hover:bg-white hidden sm:table-row">
                            <TableCell className="pl-4 pr-0 pt-0 pb-3" />
                            <TableCell colSpan={99} className="pl-3 pr-4 pt-0 pb-3">
                              <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground block mb-1">
                                {sel.reason === "OTHER" ? <>Notes <span className="text-destructive">*</span></> : "Notes (optional)"}
                              </label>
                              <Textarea value={sel.description} onChange={e => setSelectedItems(p => ({ ...p, [item.id]: { ...p[item.id], description: e.target.value } }))} placeholder={sel.reason === "OTHER" ? "Describe your reason (required)…" : "Any additional info…"} className="text-sm resize-none" rows={2} />
                            </TableCell>
                          </TableRow>
                          <TableRow className="bg-white hover:bg-white sm:hidden">
                            <TableCell colSpan={2} className="pl-3 pr-4 pt-0 pb-3">
                              <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground block mb-1">
                                {sel.reason === "OTHER" ? <>Notes <span className="text-destructive">*</span></> : "Notes (optional)"}
                              </label>
                              <Textarea value={sel.description} onChange={e => setSelectedItems(p => ({ ...p, [item.id]: { ...p[item.id], description: e.target.value } }))} placeholder={sel.reason === "OTHER" ? "Describe your reason (required)…" : "Any additional info…"} className="text-sm resize-none" rows={2} />
                            </TableCell>
                          </TableRow>
                        </>
                      )}
                    </React.Fragment>
                  )
                })}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          {pageSize !== "all" && currentData.length > size && (
            <div className="p-4 border-t flex items-center justify-between text-sm text-muted-foreground">
              <span>Showing {Math.min((currentPage - 1) * size + 1, currentData.length)}–{Math.min(currentPage * size, currentData.length)} of {currentData.length}</span>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}>Previous</Button>
                <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage >= totalPages}>Next</Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Sticky footer */}
      <AnimatePresence>
        {hasEligible && !order.cancelledAt && activeTab === "eligible" && (
          <motion.div
            className="sticky bottom-4 z-[48] mx-4 border border-border rounded-xl bg-background shadow-[0_2px_12px_rgba(0,0,0,0.08)]"
            style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 16 }}
            transition={{ duration: 0.22, ease: [0.25, 0.1, 0.25, 1] }}
          >
            <div className="px-3 sm:px-4 py-2 sm:py-2.5 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                <div className="shrink-0">
                  <p className="text-[9px] sm:text-[10px] uppercase tracking-wider text-muted-foreground font-semibold leading-none mb-0.5">Selected</p>
                  <p className="text-xs sm:text-sm font-semibold leading-tight">{selectedCount} item{selectedCount !== 1 ? "s" : ""}</p>
                </div>
                <Separator orientation="vertical" className="h-6 shrink-0" />
                <div className="shrink-0">
                  <p className="text-[9px] sm:text-[10px] uppercase tracking-wider text-muted-foreground font-semibold leading-none mb-0.5">Refund</p>
                  <p className="text-xs sm:text-sm font-bold text-[#E5403B] leading-tight">£{estimatedRefund.toFixed(2)}</p>
                </div>
                {!policyAccepted && (
                  <div className="hidden lg:flex items-center gap-1.5 text-xs text-muted-foreground shrink-0">
                    <Lock className="size-3.5 shrink-0" /><span>Accept policy to continue</span>
                  </div>
                )}
              </div>
              <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                <Button variant="ghost" size="sm" onClick={onBack} className="text-muted-foreground hidden sm:inline-flex">Cancel</Button>
                <Button size="sm" className="bg-[#E5403B] hover:bg-[#cc3935] text-white disabled:opacity-50" disabled={!canSubmit || submitting} onClick={submitReturn}>
                  {submitting
                    ? <><span className="size-4 animate-spin rounded-full border-2 border-white border-t-transparent" /><span className="hidden sm:inline ml-1">Submitting…</span></>
                    : <><RotateCcw className="size-4" /><span className="hidden sm:inline ml-1">Submit Return</span></>}
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}

// ─── Wizard Inner ─────────────────────────────────────────────────────────────
function WizardInner() {
  const { layout } = useSidebarLayout()
  const [data, setData]         = useState<OrdersData | null>(null)
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState<string | null>(null)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)

  const searchParams = useSearchParams()
  const deepLinkOrderId = searchParams?.get("order") ||
    (typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("order") : null)
  const deepLinkApplied = useRef(false)

  useEffect(() => {
    fetch("/api/get-orders")
      .then(async r => {
        const d = await r.json()
        if (!r.ok || d.error != null) { setError(d.error || "Failed to load your orders."); return }
        setData(d)
        const orderId = new URLSearchParams(window.location.search).get("order")
        if (orderId && !deepLinkApplied.current) {
          const target = (d.orders as Order[]).find((o: Order) => o.id.split("/").pop() === orderId)
          if (target) { deepLinkApplied.current = true; setSelectedOrder(target) }
        }
      })
      .catch(() => setError("Failed to load orders."))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (!deepLinkOrderId || !data || deepLinkApplied.current) return
    const target = data.orders.find(o => o.id.split("/").pop() === deepLinkOrderId)
    if (target) { deepLinkApplied.current = true; setSelectedOrder(target) }
  }, [deepLinkOrderId, data])

  const avgPrice = useMemo(() => {
    if (!selectedOrder) return 0
    const total = parseFloat(selectedOrder.totalPriceSet.shopMoney.amount)
    return selectedOrder.totalUnits > 0 ? total / selectedOrder.totalUnits : 0
  }, [selectedOrder])

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
            selectedOrder ? (
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-muted-foreground font-normal shrink-0">Return Wizard</span>
                <ChevronRight className="size-3.5 text-muted-foreground shrink-0" />
                <button onClick={() => setSelectedOrder(null)} className="font-medium hover:underline truncate">{selectedOrder.name}</button>
              </div>
            ) : (
              <div className="flex items-center gap-1.5"><Wand2 className="size-4 shrink-0" /><span>Return Wizard</span></div>
            )
          }
          showSearch={false}
          firstName={data?.firstName}
          email={data?.email}
          orderStatusUrl={selectedOrder ? `https://account.iblazevape.co.uk/orders/${selectedOrder.id.split("/").pop()}` : undefined}
        />

        <div className="flex-1 min-h-0 overflow-y-auto styled-scroll">
          {loading && (
            <div className="flex items-center justify-center py-24">
              <div className="size-8 animate-spin rounded-full border-4 border-[#E5403B] border-t-transparent" />
            </div>
          )}
          {error && (
            <div className="p-4">
              <div className="rounded-xl border border-destructive/20 bg-destructive/10 p-4 text-sm text-destructive">{error}</div>
            </div>
          )}
          {!loading && !error && data && (
            <AnimatePresence mode="wait" initial={false}>
              {selectedOrder ? (
                <motion.div key="detail"
                  initial={{ opacity: 0, x: 18 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 18 }}
                  transition={{ duration: 0.22, ease: [0.25, 0.1, 0.25, 1] }}
                  className="flex flex-col"
                >
                  <StepReturnDetail order={selectedOrder} onBack={() => setSelectedOrder(null)} avgPrice={avgPrice} />
                </motion.div>
              ) : (
                <motion.div key="orders"
                  initial={{ opacity: 0, x: -18 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -18 }}
                  transition={{ duration: 0.22, ease: [0.25, 0.1, 0.25, 1] }}
                  className="p-4"
                >
                  <StepOrders orders={data.orders} firstName={data.firstName} onSelect={setSelectedOrder} />
                </motion.div>
              )}
            </AnimatePresence>
          )}
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
