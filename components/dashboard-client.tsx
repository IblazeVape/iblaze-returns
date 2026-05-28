"use client"

import * as React from "react"
import { createPortal } from "react-dom"
import { useEffect, useState, useMemo } from "react"
import { toast } from "sonner"
import { ChevronRight, LayoutGrid, List, ArrowLeft, RotateCcw, CheckCircle2, ShoppingBag, ShieldCheck, ExternalLink, Lock, Truck, Package, Search, MapPin } from "lucide-react"

import { AppSidebar } from "@/components/app-sidebar"
import { SiteHeader } from "@/components/site-header"
import { SidebarInset, SidebarProvider, useSidebar } from "@/components/ui/sidebar"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Spinner } from "@/components/ui/spinner"
import { Separator } from "@/components/ui/separator"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Drawer, DrawerContent, DrawerDescription, DrawerFooter, DrawerHeader, DrawerTitle, DrawerTrigger } from "@/components/ui/drawer"
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

const RETURN_REASONS = [
  { value: "CHANGED_MIND",     label: "Changed my mind" },
  { value: "WRONG_ITEM",       label: "Wrong item received" },
  { value: "FAULTY",           label: "Faulty / not working" },
  { value: "DAMAGED",          label: "Damaged in transit" },
  { value: "NOT_AS_DESCRIBED", label: "Not as described" },
  { value: "OTHER",            label: "Other" },
]

const C = "shadow-sm py-0 gap-0"

function pUrl(handle?: string | null) {
  return handle ? `https://iblazevape.co.uk/products/${handle}` : "https://iblazevape.co.uk"
}

// ─── Order Status Badges ─────────────────────────────────────────────────────
function OrderStatusBadges({ order }: { order: Order }) {
  const { orderStatus, cancelledAt, deliveredCount, dispatchedCount, confirmedCount, notDispatchedCount, totalUnits } = order

  if (cancelledAt) {
    return <Badge className="bg-red-50 text-red-700 hover:bg-red-50 border border-red-200 rounded-md text-xs font-medium">Cancelled</Badge>
  }

  const primary = (() => {
    switch (orderStatus) {
      case "Delivered":            return <Badge className="bg-green-50 text-green-700 hover:bg-green-50 border border-green-200 rounded-md text-xs font-medium">Delivered</Badge>
      case "Partially delivered":  return <Badge className="bg-amber-50 text-amber-700 hover:bg-amber-50 border border-amber-200 rounded-md text-xs font-medium">Partially delivered</Badge>
      case "On its way":           return <Badge className="bg-blue-50 text-blue-700 hover:bg-blue-50 border border-blue-200 rounded-md text-xs font-medium">On its way</Badge>
      case "Partially dispatched": return <Badge className="bg-blue-50 text-blue-700 hover:bg-blue-50 border border-blue-200 rounded-md text-xs font-medium">Partially dispatched</Badge>
      case "Confirmed":            return <Badge variant="secondary" className="rounded-md text-xs font-medium">Confirmed</Badge>
      default:                     return <Badge variant="secondary" className="rounded-md text-xs font-medium">{orderStatus}</Badge>
    }
  })()

  const showStats = totalUnits > 0 && orderStatus !== "Delivered" && orderStatus !== "Confirmed" && orderStatus !== "Cancelled"
  const parts: string[] = []
  if (deliveredCount > 0)     parts.push(`${deliveredCount} delivered`)
  if (dispatchedCount > 0)    parts.push(`${dispatchedCount} on its way`)
  if (confirmedCount > 0)     parts.push(`${confirmedCount} confirmed`)
  if (notDispatchedCount > 0) parts.push(`${notDispatchedCount} pending`)

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {primary}
      {showStats && parts.length > 1 && <span className="text-[11px] text-muted-foreground">{parts.join(" · ")}</span>}
    </div>
  )
}

// ─── Ineligible Badge ────────────────────────────────────────────────────────
function OutlineBadge({ className, children }: { className: string; children: React.ReactNode }) {
  return (
    <span className={cn("inline-flex items-center justify-center rounded-md border px-2 py-0.5 text-[11px] font-medium whitespace-nowrap", className)}>
      {children}
    </span>
  )
}

function IneligibleReason({ status, reason, lineDeliveredAt }: { status: ReturnStatus; reason?: string; lineDeliveredAt?: string | null }) {
  const withHover = (badge: React.ReactNode, title: string, body: string) => (
    <HoverCard openDelay={100} closeDelay={100}>
      <HoverCardTrigger asChild><div className="inline-flex">{badge}</div></HoverCardTrigger>
      <HoverCardContent side="top" align="end" className="w-64 px-4 py-3">
        <div className="flex flex-col gap-1">
          <h4 className="font-medium text-sm">{title}</h4>
          <p className="text-sm text-muted-foreground break-words">{body}</p>
        </div>
      </HoverCardContent>
    </HoverCard>
  )

  if (status === "Confirmed")          return <OutlineBadge className="bg-zinc-50 text-zinc-500 border-zinc-200">Confirmed</OutlineBadge>
  if (status === "On its way")         return <OutlineBadge className="bg-amber-50 text-amber-700 border-amber-200">On its way</OutlineBadge>
  if (status === "Not yet dispatched") return <OutlineBadge className="bg-zinc-50 text-zinc-500 border-zinc-200">Not dispatched</OutlineBadge>
  if (status === "Refunded")           return <OutlineBadge className="bg-zinc-100 text-zinc-600 border-zinc-300">Refunded</OutlineBadge>
  if (status === "Cancelled")          return <OutlineBadge className="bg-red-50 text-red-700 border-red-200">Cancelled</OutlineBadge>
  if (status === "Passed the return window") {
    const badge = (
      <div className="flex flex-col items-end gap-0.5">
        <OutlineBadge className="bg-red-50 text-red-700 border-red-200">Window expired</OutlineBadge>
        {lineDeliveredAt && <span className="text-[10px] text-muted-foreground">Arrived {lineDeliveredAt}</span>}
      </div>
    )
    return reason ? withHover(badge, "Return window closed", reason) : badge
  }
  if (status === "Return requested")   return <OutlineBadge className="bg-blue-50 text-blue-700 border-blue-200">Requested</OutlineBadge>
  if (status === "Return in progress") return <OutlineBadge className="bg-purple-50 text-purple-700 border-purple-200">In progress</OutlineBadge>
  if (status === "Return completed" || status === "Returned") return <OutlineBadge className="bg-teal-50 text-teal-700 border-teal-200">Completed</OutlineBadge>
  if (status === "Return declined") {
    const badge = <OutlineBadge className="bg-red-50 text-red-700 border-red-200">Declined</OutlineBadge>
    return reason ? withHover(badge, "Return declined", reason) : badge
  }
  if (status === "Return cancelled") return <OutlineBadge className="bg-orange-50 text-orange-600 border-orange-200">Cancelled</OutlineBadge>
  return <span className="text-xs text-muted-foreground">{status}</span>
}

function ProductThumb({ item }: { item: LineItem }) {
  return (
    <a href={pUrl(item.productHandle)} target="_blank" rel="noopener noreferrer" className="shrink-0">
      <div className="size-10 rounded-md overflow-hidden bg-white border border-border hover:border-foreground transition-colors">
        {item.image?.url && <img src={item.image.url} alt={item.title} className="w-full h-full object-contain p-0.5" />}
      </div>
    </a>
  )
}

function OrderCardSkeleton() {
  return (
    <div className="bg-white border border-border rounded-xl p-5">
      <div className="flex items-start justify-between mb-3">
        <div className="space-y-1.5"><Skeleton className="h-4 w-24" /><Skeleton className="h-3 w-32" /></div>
        <Skeleton className="h-4 w-14" />
      </div>
      <div className="flex gap-1.5">{[1, 2, 3].map(i => <Skeleton key={i} className="w-10 h-10 rounded-md" />)}</div>
    </div>
  )
}

// ─── Shipment item list ───────────────────────────────────────────────────────
function ShipmentItemList({ shipment, order, className }: { shipment: Shipment; order: Order; className?: string }) {
  const shipmentItems = shipment.items.flatMap(({ id, quantity }) => {
    const li = order.processedItems.find(i => i.id === id)
    if (!li) return []
    return [{ ...li, shipQty: quantity }]
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
                {item.image?.url && <img src={item.image.url} alt={item.title} className="w-full h-full object-contain" />}
              </div>
            </a>
            <div className="flex-1 min-w-0">
              <a href={pUrl(item.productHandle)} target="_blank" rel="noopener noreferrer" className="font-medium text-sm hover:underline truncate block leading-tight">
                {item.title}
              </a>
              <p className="text-xs text-muted-foreground mt-0.5">{item.shipQty}×{hasVariant ? ` ${item.variant!.title}` : ""}</p>
            </div>
            {itemPrice > 0 && <p className="text-sm font-semibold shrink-0 tabular-nums">£{(itemPrice * item.shipQty).toFixed(2)}</p>}
          </div>
        )
      })}
    </div>
  )
}

// ─── Hygiene policy list ──────────────────────────────────────────────────────
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

// ─── Shipment Items Modal ─────────────────────────────────────────────────────
function ShipmentItemsModal({ shipment, order, idx }: { shipment: Shipment; order: Order; idx: number }) {
  const [open, setOpen] = React.useState(false)
  const isDesktop = useMediaQuery("(min-width: 768px)")

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
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>{trigger}</DialogTrigger>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Truck className="size-4" /> {title}</DialogTitle>
            <DialogDescription>{subtitle}</DialogDescription>
          </DialogHeader>
          <ScrollArea className="max-h-[60vh]">
            <ShipmentItemList shipment={shipment} order={order} />
          </ScrollArea>
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Drawer open={open} onOpenChange={setOpen}>
      <DrawerTrigger asChild>{trigger}</DrawerTrigger>
      <DrawerContent className="flex flex-col max-h-[85svh]">
        <DrawerHeader className="text-left">
          <DrawerTitle className="flex items-center gap-2"><Truck className="size-4" /> {title}</DrawerTitle>
          <DrawerDescription>{subtitle}</DrawerDescription>
        </DrawerHeader>
        <ScrollArea className="flex-1 min-h-0">
          <ShipmentItemList shipment={shipment} order={order} className="px-4 pb-4" />
        </ScrollArea>
        <DrawerFooter className="pt-2">
          <Button variant="outline" className="w-full" onClick={() => setOpen(false)}>Close</Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  )
}

// ─── Hygiene Policy Modal ─────────────────────────────────────────────────────
function HygienePolicy({ onAccept, onDecline }: { onAccept: () => void; onDecline: () => void }) {
  const [open, setOpen] = useState(false)
  const isDesktop = useMediaQuery("(min-width: 768px)")

  const handleAccept  = () => { setOpen(false); onAccept();  toast.success("Policy accepted") }
  const handleDecline = () => { setOpen(false); onDecline(); toast.warning("Policy declined") }

  const acceptDecline = (
    <div className="flex gap-2">
      <Button className="flex-1 bg-[#E5403B] hover:bg-[#cc3935] text-white" onClick={handleAccept}><CheckCircle2 className="size-4" /> I Accept</Button>
      <Button variant="outline" className="flex-1" onClick={handleDecline}>Decline</Button>
    </div>
  )

  const trigger = <Button size="sm" className="bg-[#E5403B] hover:bg-[#cc3935] text-white shrink-0">Review &amp; Accept</Button>

  if (isDesktop) {
    return (
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>{trigger}</DialogTrigger>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><ShieldCheck className="size-4 text-[#E5403B]" /> iBlaze Returns Policy</DialogTitle>
            <DialogDescription>Review our returns policy before selecting items to return.</DialogDescription>
          </DialogHeader>
          <HygienePolicyList />
          {acceptDecline}
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Drawer open={open} onOpenChange={setOpen}>
      <DrawerTrigger asChild>{trigger}</DrawerTrigger>
      <DrawerContent>
        <DrawerHeader className="text-left">
          <DrawerTitle className="flex items-center gap-2"><ShieldCheck className="size-4 text-[#E5403B]" /> iBlaze Returns Policy</DrawerTitle>
          <DrawerDescription>Review our returns policy before selecting items to return.</DrawerDescription>
        </DrawerHeader>
        <ScrollArea className="max-h-[50vh]">
          <HygienePolicyList className="px-4 pb-4" />
        </ScrollArea>
        <DrawerFooter className="pt-2">{acceptDecline}</DrawerFooter>
      </DrawerContent>
    </Drawer>
  )
}

function OrderCard({ order, onClick }: { order: Order; onClick: () => void }) {
  const uniqueImages = order.processedItems.map(i => i.image?.url).filter((u, i, a) => u && a.indexOf(u) === i).slice(0, 5) as string[]
  const extra = order.processedItems.length - uniqueImages.length
  const total = parseFloat(order.totalPriceSet.shopMoney.amount)
  const date  = new Date(order.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })

  return (
    <button onClick={onClick} className="group w-full text-left bg-white border border-border rounded-xl p-5 shadow-sm hover:shadow-md hover:border-zinc-300 transition-all duration-150 focus:outline-none flex flex-col justify-between gap-3">
      <div className="flex items-start justify-between">
        <div>
          <p className="font-semibold text-[15px] group-hover:underline">{order.name}</p>
          <p className="text-[13px] text-muted-foreground mt-0.5">{date} &bull; {order.totalUnits} item{order.totalUnits !== 1 ? "s" : ""}</p>
          <div className="mt-1.5"><OrderStatusBadges order={order} /></div>
        </div>
        <p className="font-semibold text-[15px] shrink-0">£{total.toFixed(2)}</p>
      </div>
      <div className="flex items-center gap-1.5">
        {uniqueImages.map((url, i) => (
          <div key={i} className="w-10 h-10 rounded-md border border-border bg-white overflow-hidden shrink-0">
            <img src={url} alt="" className="w-full h-full object-contain p-0.5" />
          </div>
        ))}
        {extra > 0 && (
          <div className="w-10 h-10 rounded-md border border-border bg-zinc-50 flex items-center justify-center shrink-0">
            <span className="text-[11px] font-bold text-muted-foreground">+{extra}</span>
          </div>
        )}
      </div>
    </button>
  )
}

function OrderRow({ order, onClick }: { order: Order; onClick: () => void }) {
  const images = order.processedItems.map(i => i.image?.url).filter(Boolean).slice(0, 3) as string[]
  const total  = parseFloat(order.totalPriceSet.shopMoney.amount)
  const date   = new Date(order.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })

  return (
    <button onClick={onClick} className="w-full px-5 py-3.5 flex items-center gap-4 hover:bg-zinc-50 transition-colors text-left group border-b border-border last:border-0">
      <div className="flex -space-x-2 w-[92px] shrink-0">
        {images.map((url, i) => (
          <div key={i} className="size-9 rounded-lg border-2 border-white bg-white overflow-hidden shadow-sm shrink-0">
            <img src={url} alt="" className="w-full h-full object-contain" />
          </div>
        ))}
        {Array.from({ length: 3 - images.length }).map((_, i) => (
          <div key={`empty-${i}`} className="size-9 rounded-lg border-2 border-white bg-zinc-100 shrink-0" />
        ))}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-sm group-hover:underline">{order.name}</p>
        <p className="text-xs text-muted-foreground">{date} &bull; {order.totalUnits} item{order.totalUnits !== 1 ? "s" : ""}</p>
        <div className="mt-1"><OrderStatusBadges order={order} /></div>
      </div>
      <p className="font-semibold text-sm w-16 text-right shrink-0">£{total.toFixed(2)}</p>
      <ChevronRight className="size-4 text-muted-foreground shrink-0" />
    </button>
  )
}

// ─── Order Detail ─────────────────────────────────────────────────────────────
function OrderDetail({ order, onBack }: { order: Order; onBack: () => void }) {
  const [policyAccepted, setPolicyAccepted] = useState(false)
  const [selectedItems, setSelectedItems]   = useState<Record<string, { selected: boolean; quantity: number; reason: string; description: string }>>({})
  const [submitting, setSubmitting]   = useState(false)
  const [submitted, setSubmitted]     = useState(false)
  const [mounted, setMounted]         = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [pageSize, setPageSize]       = useState("10")
  const [currentPage, setCurrentPage] = useState(1)

  useEffect(() => { setMounted(true) }, [])
  const { state: sidebarState, isMobile: sidebarMobile } = useSidebar()

  const rawOrderId     = order.id.split("/").pop()
  const orderStatusUrl = `https://account.iblazevape.co.uk/orders/${rawOrderId}`
  const total          = parseFloat(order.totalPriceSet.shopMoney.amount)
  const orderAvgPrice  = order.totalUnits > 0 ? total / order.totalUnits : 0
  const refundedAmount = order.totalRefundedSet?.shopMoney?.amount ? parseFloat(order.totalRefundedSet.shopMoney.amount) : 0

  const eligibleItems   = useMemo(() => order.processedItems.filter(i => i.returnStatus === "Eligible" && i.eligibleQuantity > 0), [order])
  const ineligibleItems = useMemo(() => order.processedItems.filter(i => !(i.returnStatus === "Eligible" && i.eligibleQuantity > 0)), [order])

  const hasEligible          = eligibleItems.length > 0 && !order.cancelledAt
  const totalEligibleUnits   = eligibleItems.reduce((s, i) => s + i.eligibleQuantity, 0)
  const totalIneligibleUnits = ineligibleItems.reduce((s, i) => s + i.quantity, 0)

  const matchesSearch = (item: LineItem) => {
    if (!searchQuery) return true
    const q = searchQuery.toLowerCase()
    return item.title.toLowerCase().includes(q) || (item.variant?.title || "").toLowerCase().includes(q)
  }

  const filteredEligible   = useMemo(() => eligibleItems.filter(matchesSearch),   [eligibleItems,   searchQuery])
  const filteredIneligible = useMemo(() => ineligibleItems.filter(matchesSearch), [ineligibleItems, searchQuery])

  const [activeTab, setActiveTab] = useState<"eligible" | "ineligible">("eligible")
  useEffect(() => { setActiveTab("eligible") }, [order.id])

  const currentData   = activeTab === "eligible" ? filteredEligible : filteredIneligible
  const size          = pageSize === "all" ? Math.max(currentData.length, 1) : parseInt(pageSize)
  const totalPages    = Math.ceil(currentData.length / size) || 1
  const paginatedData = currentData.slice((currentPage - 1) * size, currentPage * size)

  useEffect(() => { setCurrentPage(1) }, [activeTab, searchQuery, pageSize])

  const selectedCount   = Object.values(selectedItems).filter(v => v.selected).length
  const estimatedRefund = Object.entries(selectedItems).filter(([, v]) => v.selected).reduce((sum, [id, v]) => {
    const item = order.processedItems.find(i => i.id === id)
    return sum + (item ? (item.unitPrice ?? orderAvgPrice) * v.quantity : 0)
  }, 0)

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
  const isAllSelected = eligibleItems.length > 0 && selectedCount === eligibleItems.length

  const submitReturn = async () => {
    const items = Object.entries(selectedItems).filter(([, v]) => v.selected).map(([lineItemId, v]) => ({ lineItemId, quantity: v.quantity, reason: v.reason, description: v.description }))
    if (!items.length) return
    setSubmitting(true)
    try {
      const res = await fetch("/api/submit-return", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ orderId: rawOrderId, items }) })
      const result = await res.json()
      if (result.success) {
        setSubmitted(true)
        setTimeout(() => { window.location.href = orderStatusUrl }, 3000)
      } else { toast.error("Submission failed", { description: result.error || "Something went wrong." }) }
    } catch { toast.error("Network error", { description: "Please check your connection." }) }
    finally { setSubmitting(false) }
  }

  if (submitted) {
    return (
      <div className="max-w-md mx-auto py-20 text-center space-y-4 px-4">
        <div className="size-16 bg-green-50 rounded-full flex items-center justify-center mx-auto"><CheckCircle2 className="size-8 text-green-500" /></div>
        <h2 className="text-xl font-semibold">Return Requested</h2>
        <p className="text-muted-foreground text-sm">We&apos;ve sent you a confirmation email. Our team will review your return and be in touch.</p>
      </div>
    )
  }

  const headerDateStr = (() => {
    if (order.cancelledAt) return `Cancelled ${new Date(order.cancelledAt).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}`
    if (order.latestDelivery && order.earliestDelivery) {
      const earliest = new Date(order.earliestDelivery).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })
      const latest   = new Date(order.latestDelivery).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })
      return earliest === latest ? `Delivered ${latest}` : `Delivered ${earliest} – ${latest}`
    }
    return `Ordered ${new Date(order.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}`
  })()

  return (
    <>
      <div className={cn("flex flex-col gap-4", hasEligible && "pb-[120px] sm:pb-[64px]")}>
        <Button variant="ghost" size="sm" onClick={onBack} className="-ml-2 text-muted-foreground hover:text-foreground w-fit">
          <ArrowLeft className="size-4" /> Back to Orders
        </Button>

        {/* ── Order header card ── */}
        <Card className={cn(C, "overflow-hidden")}>
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 px-5 py-4">
            <div>
              <div className="flex items-center gap-2 mb-1.5"><h2 className="text-base font-semibold">{order.name}</h2></div>
              <OrderStatusBadges order={order} />
              <p className="text-xs text-muted-foreground mt-1.5">{headerDateStr} &bull; £{total.toFixed(2)} GBP &bull; {order.totalUnits} item{order.totalUnits !== 1 ? "s" : ""}</p>
            </div>
            <a href={orderStatusUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground hover:underline shrink-0">
              <ExternalLink className="size-3.5" /> View Order Status
            </a>
          </div>
          <div className="grid grid-cols-4 border-t border-border divide-x divide-border">
            <div className="px-3 sm:px-5 py-2.5 sm:py-3"><p className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">Total Paid</p><p className="font-semibold text-sm mt-0.5">£{total.toFixed(2)}</p></div>
            <div className="px-3 sm:px-5 py-2.5 sm:py-3"><p className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">Eligible</p><p className="font-semibold text-sm mt-0.5 text-green-600">{totalEligibleUnits}</p></div>
            <div className="px-3 sm:px-5 py-2.5 sm:py-3"><p className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">Ineligible</p><p className="font-semibold text-sm mt-0.5 text-zinc-500">{totalIneligibleUnits}</p></div>
            <div className="px-3 sm:px-5 py-2.5 sm:py-3"><p className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">Refunded</p><p className="font-semibold text-sm mt-0.5 text-blue-600">£{refundedAmount.toFixed(2)}</p></div>
          </div>
        </Card>

        {order.cancelledAt && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-5 text-center">
            <h3 className="font-semibold text-red-800 text-base">This order was cancelled</h3>
            <p className="text-sm text-red-700 mt-1">No items were dispatched — returns are not applicable.</p>
          </div>
        )}

        {/* ── Shipments & tracking ── */}
        {!order.cancelledAt && order.shipments && order.shipments.length > 0 && (
          <div className="flex flex-col gap-2">
            <h3 className="text-sm font-semibold flex items-center gap-2"><Truck className="size-4" /> Shipments &amp; Tracking</h3>
            <ScrollArea className="w-full">
              <div className="flex gap-3 pb-3 snap-x">
                {order.shipments.map((shipment, idx) => {
                  const isDelivered   = shipment.displayStatus === "DELIVERED"
                  const deliveredDate = shipment.deliveredAt ? new Date(shipment.deliveredAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : null
                  const cardCls = cn("snap-start border rounded-lg p-4 bg-white shadow-sm flex flex-col gap-3", order.shipments.length === 1 ? "w-full" : "w-[85vw] shrink-0 sm:flex-1 sm:w-auto sm:min-w-[240px]")
                  return (
                    <div key={shipment.id} className={cardCls}>
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2.5">
                          <div className={cn("p-1.5 rounded-md", isDelivered ? "bg-green-50 text-green-600" : "bg-muted text-muted-foreground")}><Truck className="size-4" /></div>
                          <div>
                            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Shipment {idx + 1}</p>
                            <p className="text-sm font-medium">{isDelivered ? "Delivered" : "On its way"}{deliveredDate && <span className="text-muted-foreground font-normal"> · {deliveredDate}</span>}</p>
                          </div>
                        </div>
                        <ShipmentItemsModal shipment={shipment} order={order} idx={idx} />
                      </div>
                      {shipment.trackingInfo.length > 0 && (
                        <div className="flex flex-col gap-1.5 border-t pt-3">
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
              <ScrollBar orientation="horizontal" />
            </ScrollArea>
          </div>
        )}

        {/* ── Policy gate ── */}
        {hasEligible && !policyAccepted && (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-lg border bg-card px-4 py-3 text-sm">
            <div className="flex items-center gap-2 min-w-0">
              <ShieldCheck className="size-4 text-muted-foreground shrink-0" />
              <span className="font-medium">Hygiene &amp; Returns Policy</span>
              <span className="text-muted-foreground hidden sm:inline">— Review and accept before selecting items.</span>
            </div>
            <HygienePolicy onAccept={() => setPolicyAccepted(true)} onDecline={() => setPolicyAccepted(false)} />
          </div>
        )}

        {/* ── Items table ── */}
        {!order.cancelledAt && (
          <Card className={cn(C, "overflow-hidden flex flex-col")}>
            <div className="px-5 py-3 border-b bg-muted/20 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <Select value={activeTab} onValueChange={(v) => setActiveTab(v as "eligible" | "ineligible")}>
                <SelectTrigger className="w-[185px] h-9 bg-white"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="eligible">Eligible ({totalEligibleUnits})</SelectItem>
                  <SelectItem value="ineligible">Ineligible ({totalIneligibleUnits})</SelectItem>
                </SelectContent>
              </Select>
              <div className="flex items-center gap-2">
                <div className="relative w-full md:w-64">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input placeholder="Search product or variant..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-9 h-9 bg-white" />
                </div>
                <Select value={pageSize} onValueChange={setPageSize}>
                  <SelectTrigger className="w-[110px] h-9 bg-white"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="5">Show 5</SelectItem>
                    <SelectItem value="10">Show 10</SelectItem>
                    <SelectItem value="25">Show 25</SelectItem>
                    <SelectItem value="all">Show All</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <ScrollArea className="flex-1">
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

                    return (
                      <React.Fragment key={`${item.id}-${rowIdx}`}>
                        <TableRow className={cn("transition-colors", sel?.selected && "bg-muted/20")}>
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
                          <TableCell className="text-right pr-4 py-3 font-semibold text-sm tabular-nums">£{(itemPrice * (activeTab === "eligible" ? (sel?.quantity || item.eligibleQuantity) : displayQty)).toFixed(2)}</TableCell>
                          {activeTab === "ineligible" && (
                            <TableCell className="pr-5 py-3 text-right">
                              <IneligibleReason status={item.returnStatus} reason={item.returnReason} lineDeliveredAt={item.lineDeliveredAt} />
                            </TableCell>
                          )}
                        </TableRow>

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
            </ScrollArea>

            {pageSize !== "all" && currentData.length > size && (
              <div className="p-4 border-t flex items-center justify-between text-sm text-muted-foreground">
                <span>Showing {Math.min((currentPage - 1) * size + 1, currentData.length)}–{Math.min(currentPage * size, currentData.length)} of {currentData.length} entries</span>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}>Previous</Button>
                  <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage >= totalPages}>Next</Button>
                </div>
              </div>
            )}
          </Card>
        )}
      </div>

      {/* ── Portalled sticky footer ── */}
      {mounted && hasEligible && !order.cancelledAt && createPortal(
        <div className="fixed bottom-0 right-0 z-[48] border-t border-border bg-background shadow-[0_-2px_12px_rgba(0,0,0,0.08)]" style={{ left: sidebarMobile ? "0px" : sidebarState === "collapsed" ? "4.5rem" : "18rem" }}>
          <div className="px-4 lg:px-6 py-2.5 flex items-center justify-between gap-2">
            <div className="flex items-center gap-3 min-w-0">
              <div className="shrink-0">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold leading-none mb-0.5">Selected</p>
                <p className="text-sm font-semibold leading-tight">{selectedCount} item{selectedCount !== 1 ? "s" : ""}</p>
              </div>
              <Separator orientation="vertical" className="h-7 shrink-0" />
              <div className="shrink-0">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold leading-none mb-0.5">Refund</p>
                <p className="text-sm font-bold text-[#E5403B] leading-tight">£{estimatedRefund.toFixed(2)}</p>
              </div>
              {!policyAccepted && (
                <div className="hidden sm:flex items-center gap-1.5 text-xs text-muted-foreground shrink-0">
                  <Lock className="size-3.5 shrink-0" /><span>Accept policy to continue</span>
                </div>
              )}
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Button variant="ghost" size="sm" onClick={onBack} className="text-muted-foreground hidden sm:inline-flex">Cancel</Button>
              <Button size="sm" className="bg-[#E5403B] hover:bg-[#cc3935] text-white disabled:opacity-50" disabled={!canSubmit || submitting} onClick={submitReturn}>
                {submitting ? <><Spinner className="size-4" /> Submitting...</> : <><RotateCcw className="size-4" /> Submit Return</>}
              </Button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  )
}

export default function DashboardClient() {
  const [data, setData]                   = useState<OrdersData | null>(null)
  const [loading, setLoading]             = useState(true)
  const [error, setError]                 = useState<string | null>(null)
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  const [view, setView]                   = useState<"grid" | "list">("grid")
  const [search, setSearch]               = useState("")
  const [activeSection, setActiveSection] = useState("#orders")

  useEffect(() => {
    fetch("/api/get-orders")
      .then(r => r.json())
      .then(d => { if (d.error) setError(d.error); else setData(d) })
      .catch(() => setError("Failed to load orders."))
      .finally(() => setLoading(false))
  }, [])

  const filteredOrders = (data?.orders || []).filter(o => o.name.toLowerCase().includes(search.toLowerCase()))
  const user = { name: data?.firstName || "Customer", email: data?.email || "" }

  const portalContent = (
    <SidebarProvider style={{ "--sidebar-width": "18rem", "--header-height": "3rem" } as React.CSSProperties}>
      <AppSidebar variant="inset" user={user} onNavigate={s => { setActiveSection(s); setSelectedOrder(null) }} activeSection={activeSection} />
      <SidebarInset>
        <SiteHeader title={selectedOrder ? selectedOrder.name : "My Orders"} search={search} onSearch={setSearch} showSearch={!selectedOrder} firstName={data?.firstName} email={data?.email} />
        <div className="flex flex-1 flex-col p-4 lg:p-6 gap-4">
          {selectedOrder ? (
            <OrderDetail order={selectedOrder} onBack={() => setSelectedOrder(null)} />
          ) : (
            <>
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold">{data?.firstName ? `Hi, ${data.firstName} 👋` : "Your Recent Orders"}</h2>
                  <p className="text-sm text-muted-foreground mt-0.5">Select an order to view details or initiate a return.</p>
                </div>
                <div className="flex items-center gap-1 bg-muted rounded-lg p-1">
                  <Button variant="ghost" size="icon" className={cn("size-7", view === "grid" && "bg-background shadow-sm")} onClick={() => setView("grid")}><LayoutGrid className="size-4" /></Button>
                  <Button variant="ghost" size="icon" className={cn("size-7", view === "list" && "bg-background shadow-sm")} onClick={() => setView("list")}><List className="size-4" /></Button>
                </div>
              </div>

              {error && (
                <div className="flex items-center gap-3 p-4 rounded-xl bg-destructive/10 text-sm text-destructive border border-destructive/20">
                  <ShoppingBag className="size-5 shrink-0" />{error}
                </div>
              )}

              {view === "grid" && (
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                  {loading ? Array.from({ length: 6 }).map((_, i) => <OrderCardSkeleton key={i} />) : filteredOrders.map(o => <OrderCard key={o.id} order={o} onClick={() => setSelectedOrder(o)} />)}
                </div>
              )}

              {view === "list" && !loading && (
                <Card className={cn(C, "overflow-hidden")}>
                  <CardContent className="p-0">
                    {filteredOrders.length === 0
                      ? <div className="text-center py-20"><ShoppingBag className="size-12 text-muted-foreground/30 mx-auto mb-4" /><p className="font-medium text-muted-foreground">No orders found</p></div>
                      : filteredOrders.map(o => <OrderRow key={o.id} order={o} onClick={() => setSelectedOrder(o)} />)}
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </div>
      </SidebarInset>
    </SidebarProvider>
  )

  if (loading) {
    return (
      <div className="relative h-screen w-screen overflow-hidden">
        <div className="pointer-events-none select-none blur-sm brightness-95 h-full w-full">{portalContent}</div>
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-background/40 backdrop-blur-sm">
          <Card className="w-full max-w-xs mx-4 shadow-xl">
            <div className="flex flex-col items-center justify-center gap-3 py-8 px-6">
              <div className="size-10 rounded-full bg-[#E5403B]/10 flex items-center justify-center"><Spinner className="size-5 text-[#E5403B]" /></div>
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

  return portalContent
}
