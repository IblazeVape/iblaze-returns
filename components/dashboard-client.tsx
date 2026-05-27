"use client"

import * as React from "react"
import { createPortal } from "react-dom"
import { useEffect, useState } from "react"
import { toast } from "sonner"
import {
  ChevronRight, LayoutGrid, List, ArrowLeft,
  RotateCcw, CheckCircle2, ShoppingBag, ShieldCheck,
  ExternalLink, Lock,
} from "lucide-react"
import { AppSidebar } from "@/components/app-sidebar"
import { SiteHeader } from "@/components/site-header"
import { SidebarInset, SidebarProvider, useSidebar } from "@/components/ui/sidebar"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Spinner } from "@/components/ui/spinner"
import { Separator } from "@/components/ui/separator"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Drawer, DrawerClose, DrawerContent, DrawerFooter, DrawerHeader, DrawerTitle, DrawerTrigger } from "@/components/ui/drawer"
import { useMediaQuery } from "@/hooks/use-media-query"
import { cn } from "@/lib/utils"

type ReturnStatus =
  | "Eligible"
  | "Not yet dispatched"
  | "On its way"
  | "Passed the return window"
  | "Returned"
  | "Return requested"
  | "Return approved"
  | "Return completed"
  | "Return declined"
  | "Return cancelled"

interface LineItem {
  id: string
  title: string
  quantity: number
  unitPrice?: number | null
  returnStatus: ReturnStatus
  returnReason?: string
  lineDeliveredAt?: string | null
  productHandle?: string | null
  image?: { url: string } | null
  variant?: { title: string } | null
}

interface Order {
  id: string
  name: string
  createdAt: string
  displayFulfillmentStatus: string
  totalPriceSet: { shopMoney: { amount: string; currencyCode: string } }
  totalRefundedSet?: { shopMoney: { amount: string } } | null
  processedItems: LineItem[]
  isDelivered?: boolean
  deliveredAt?: string | null
  canceledAt?: string | null
}

interface OrdersData {
  firstName: string
  email: string
  orders: Order[]
}

const RETURN_REASONS = [
  { value: "CHANGED_MIND",     label: "Changed my mind" },
  { value: "WRONG_ITEM",       label: "Wrong item received" },
  { value: "FAULTY",           label: "Faulty / not working" },
  { value: "DAMAGED",          label: "Damaged in transit" },
  { value: "NOT_AS_DESCRIBED", label: "Not as described" },
  { value: "OTHER",            label: "Other" },
]

const C = "shadow-sm py-0 gap-0"
const TABLE_H = "xl:h-[480px]"

function pUrl(handle?: string | null) {
  return handle ? `https://iblazevape.co.uk/products/${handle}` : "https://iblazevape.co.uk"
}

// ─── Consistent outline badge helper ──────────────────────────────────────
function OutlineBadge({ className, children }: { className: string; children: React.ReactNode }) {
  return (
    <span className={cn(
      "inline-flex items-center justify-center rounded-full border px-2 py-0.5 text-[11px] font-medium whitespace-nowrap",
      className
    )}>
      {children}
    </span>
  )
}

// ─── Ineligible reason chip — all use consistent outline badge style ───────
function IneligibleReason({ status, reason, lineDeliveredAt }: {
  status: ReturnStatus
  reason?: string
  lineDeliveredAt?: string | null
}) {
  // Badges with hover card for items that have a detail message
  const withHover = (badge: React.ReactNode, title: string, body: string) => (
    <HoverCard openDelay={100} closeDelay={100}>
      <HoverCardTrigger asChild>
        <div className="inline-flex">{badge}</div>
      </HoverCardTrigger>
      <HoverCardContent side="top" align="end" className="w-72 px-4 py-3">
        <div className="flex flex-col gap-1">
          <h4 className="font-medium text-sm">{title}</h4>
          <p className="text-sm text-muted-foreground">{body}</p>
        </div>
      </HoverCardContent>
    </HoverCard>
  )

  if (status === "On its way") return (
    <div className="flex flex-col items-end gap-0.5">
      <OutlineBadge className="bg-amber-50 text-amber-700 border-amber-200">On its way</OutlineBadge>
    </div>
  )

  if (status === "Not yet dispatched") return (
    <OutlineBadge className="bg-zinc-50 text-zinc-500 border-zinc-200">Not dispatched</OutlineBadge>
  )

  if (status === "Passed the return window") {
    const badge = (
      <div className="flex flex-col items-end gap-0.5">
        <OutlineBadge className="bg-red-50 text-red-700 border-red-200">Window expired</OutlineBadge>
        {lineDeliveredAt && (
          <span className="text-[10px] text-muted-foreground">Arrived {lineDeliveredAt}</span>
        )}
      </div>
    )
    return reason ? withHover(badge, "Return window closed", reason) : badge
  }

  if (status === "Return requested") return (
    <OutlineBadge className="bg-blue-50 text-blue-700 border-blue-200">Requested</OutlineBadge>
  )

  if (status === "Return approved") return (
    <OutlineBadge className="bg-green-50 text-green-700 border-green-200">Approved</OutlineBadge>
  )

  if (status === "Return completed" || status === "Returned") return (
    <OutlineBadge className="bg-teal-50 text-teal-700 border-teal-200">Completed</OutlineBadge>
  )

  if (status === "Return declined") {
    const badge = <OutlineBadge className="bg-red-50 text-red-700 border-red-200">Declined</OutlineBadge>
    return reason ? withHover(badge, "Return declined", reason) : badge
  }

  if (status === "Return cancelled") return (
    <OutlineBadge className="bg-orange-50 text-orange-600 border-orange-200">Cancelled</OutlineBadge>
  )

  return <span className="text-xs text-muted-foreground">{status}</span>
}

// ─── Product thumbnail ─────────────────────────────────────────────────────
function ProductThumb({ item }: { item: LineItem }) {
  const url = pUrl(item.productHandle)
  return (
    <a href={url} target="_blank" rel="noopener noreferrer" className="relative shrink-0 block">
      <div className="size-10 rounded-md overflow-hidden bg-white border border-border hover:border-foreground transition-colors duration-150">
        {item.image?.url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={item.image.url} alt={item.title} className="w-full h-full object-contain p-0.5" />
        )}
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
      <div className="flex gap-1.5">{[1,2,3].map(i => <Skeleton key={i} className="w-10 h-10 rounded-md" />)}</div>
    </div>
  )
}

// ─── Hygiene Policy ────────────────────────────────────────────────────────
function HygienePolicy({ onAccept, onDecline }: { onAccept: () => void; onDecline: () => void }) {
  const [open, setOpen] = useState(false)
  const isDesktop = useMediaQuery("(min-width: 768px)")

  const handleAccept = () => { setOpen(false); onAccept(); toast.success("Policy accepted", { description: "You can now select items to return." }) }
  const handleDecline = () => { setOpen(false); onDecline(); toast.warning("Policy declined", { description: "You must accept the returns policy to continue." }) }

  const policyItems = [
    { title: "Vape Kits & Mods",       desc: "30-day refund period. 30-day warranty from delivery." },
    { title: "Batteries & Chargers",   desc: "60-day battery warranty. 30-day charger warranty." },
    { title: "E-Liquids & Disposables",desc: "Must remain sealed and unopened. No returns on opened liquids." },
    { title: "Tanks & Clearomisers",   desc: "7-day Dead On Arrival window — report faults within 7 days." },
  ]
  const body = (
    <div className="space-y-2 text-sm">
      {policyItems.map(p => (
        <div key={p.title} className="rounded-lg border bg-muted/30 px-3 py-2.5">
          <p className="font-semibold text-xs">{p.title}</p>
          <p className="text-xs text-muted-foreground mt-0.5">{p.desc}</p>
        </div>
      ))}
      <p className="text-xs text-muted-foreground pt-1">Return postage is at your expense. Tracked service required. Refunds within 5–10 business days.</p>
    </div>
  )
  const footer = (
    <div className="flex gap-2 pt-2">
      <Button className="flex-1 bg-[#E5403B] hover:bg-[#cc3935] text-white" onClick={handleAccept}><CheckCircle2 className="size-4" /> I Accept</Button>
      <Button variant="outline" className="flex-1" onClick={handleDecline}>Decline</Button>
    </div>
  )
  const trigger = <Button size="sm" className="bg-[#E5403B] hover:bg-[#cc3935] text-white shrink-0">Review &amp; Accept</Button>

  if (isDesktop) return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle className="flex items-center gap-2"><ShieldCheck className="size-4 text-[#E5403B]" /> iBlaze Returns Policy</DialogTitle></DialogHeader>
        {body}{footer}
      </DialogContent>
    </Dialog>
  )
  return (
    <Drawer open={open} onOpenChange={setOpen}>
      <DrawerTrigger asChild>{trigger}</DrawerTrigger>
      <DrawerContent>
        <DrawerHeader><DrawerTitle className="flex items-center gap-2"><ShieldCheck className="size-4 text-[#E5403B]" /> iBlaze Returns Policy</DrawerTitle></DrawerHeader>
        <div className="px-4 pb-2">{body}</div>
        <DrawerFooter>{footer}<DrawerClose asChild><Button variant="ghost" size="sm">Cancel</Button></DrawerClose></DrawerFooter>
      </DrawerContent>
    </Drawer>
  )
}

// ─── Order Card (grid) ─────────────────────────────────────────────────────
function OrderCard({ order, onClick }: { order: Order; onClick: () => void }) {
  const uniqueImages = order.processedItems.map(i => i.image?.url).filter((u, i, a) => u && a.indexOf(u) === i).slice(0, 5) as string[]
  const extra = order.processedItems.length - uniqueImages.length
  const totalQty = order.processedItems.reduce((s, i) => s + i.quantity, 0)
  const total = parseFloat(order.totalPriceSet.shopMoney.amount)
  const date = new Date(order.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })
  return (
    <button onClick={onClick} className="group w-full text-left bg-white border border-border rounded-xl p-5 shadow-sm hover:shadow-md hover:border-zinc-300 transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-ring/30 flex flex-col justify-between">
      <div className="flex items-start justify-between mb-3">
        <div>
          <p className="font-semibold text-[15px] group-hover:underline">{order.name}</p>
          <p className="text-[13px] text-muted-foreground mt-0.5">{date} &bull; {totalQty} item{totalQty !== 1 ? "s" : ""}</p>
        </div>
        <p className="font-semibold text-[15px]">£{total.toFixed(2)}</p>
      </div>
      <div className="flex items-center gap-1.5">
        {uniqueImages.map((url, i) => (
          <div key={i} className="w-10 h-10 rounded-md border border-border bg-white overflow-hidden shrink-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={url} alt="" className="w-full h-full object-contain p-0.5" />
          </div>
        ))}
        {extra > 0 && <div className="w-10 h-10 rounded-md border border-border bg-zinc-50 flex items-center justify-center shrink-0"><span className="text-[11px] font-bold text-muted-foreground">+{extra}</span></div>}
      </div>
    </button>
  )
}

function OrderRow({ order, onClick }: { order: Order; onClick: () => void }) {
  const images = order.processedItems.map(i => i.image?.url).filter(Boolean).slice(0, 3) as string[]
  const total = parseFloat(order.totalPriceSet.shopMoney.amount)
  const date = new Date(order.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })
  const totalQty = order.processedItems.reduce((s, i) => s + i.quantity, 0)
  return (
    <button onClick={onClick} className="w-full px-5 py-3.5 flex items-center gap-4 hover:bg-zinc-50 transition-colors text-left group border-b border-border last:border-0">
      <div className="flex -space-x-2">
        {images.map((url, i) => <div key={i} className="size-9 rounded-lg border-2 border-white bg-white overflow-hidden shadow-sm"><img src={url} alt="" className="w-full h-full object-contain" /></div>)}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-sm group-hover:underline">{order.name}</p>
        <p className="text-xs text-muted-foreground">{date} &bull; {totalQty} item{totalQty !== 1 ? "s" : ""}</p>
      </div>
      <p className="font-semibold text-sm w-16 text-right">£{total.toFixed(2)}</p>
      <ChevronRight className="size-4 text-muted-foreground shrink-0" />
    </button>
  )
}

// ─── Shared table card shell ───────────────────────────────────────────────
function TableCard({ title, badge, fullWidth, children }: {
  title: string
  badge: React.ReactNode
  fullWidth?: boolean
  children: React.ReactNode
}) {
  return (
    <Card className={cn(C, "overflow-hidden flex flex-col", fullWidth ? "w-full" : TABLE_H)}>
      <CardHeader className="px-5 py-3 border-b gap-0 shrink-0">
        <CardTitle className="text-sm font-semibold flex items-center justify-between">
          {title}
          {badge}
        </CardTitle>
      </CardHeader>
      {children}
    </Card>
  )
}

// ─── Order Detail ──────────────────────────────────────────────────────────
function OrderDetail({ order, onBack }: { order: Order; onBack: () => void }) {
  const [policyAccepted, setPolicyAccepted] = useState(false)
  const [selectedItems, setSelectedItems] = useState<
    Record<string, { selected: boolean; quantity: number; reason: string; description: string }>
  >({})
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [mounted, setMounted] = useState(false)
  useEffect(() => { setMounted(true) }, [])
  const { state: sidebarState, isMobile: sidebarMobile } = useSidebar()

  const rawOrderId = order.id.split("/").pop()
  const orderStatusUrl = `https://account.iblazevape.co.uk/orders/${rawOrderId}`

  const eligibleItems = order.processedItems.filter(i => i.returnStatus === "Eligible")
  const ineligibleItems = order.processedItems.filter(i => i.returnStatus !== "Eligible")
  const hasEligible = eligibleItems.length > 0

  const total = parseFloat(order.totalPriceSet.shopMoney.amount)
  const totalQty = order.processedItems.reduce((s, i) => s + i.quantity, 0)
  const orderAvgPrice = totalQty > 0 ? total / totalQty : 0
  const refundedAmount = order.totalRefundedSet?.shopMoney?.amount ? parseFloat(order.totalRefundedSet.shopMoney.amount) : 0

  const selectedCount = Object.values(selectedItems).filter(v => v.selected).length
  const estimatedRefund = Object.entries(selectedItems)
    .filter(([, v]) => v.selected)
    .reduce((sum, [id, v]) => {
      const item = order.processedItems.find(i => i.id === id)
      return sum + (item ? (item.unitPrice ?? orderAvgPrice) * v.quantity : 0)
    }, 0)

  const canSubmit =
    selectedCount > 0 && policyAccepted &&
    Object.entries(selectedItems)
      .filter(([, v]) => v.selected)
      .every(([, v]) => v.reason && (v.reason !== "OTHER" || v.description.trim().length > 0))

  const submitReturn = async () => {
    const items = Object.entries(selectedItems)
      .filter(([, v]) => v.selected)
      .map(([lineItemId, v]) => ({ lineItemId, quantity: v.quantity, reason: v.reason, description: v.description }))
    if (!items.length) return
    setSubmitting(true)
    try {
      const res = await fetch("/api/submit-return", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId: rawOrderId, items }),
      })
      const result = await res.json()
      if (result.success) {
        setSubmitted(true)
        setTimeout(() => { window.location.href = orderStatusUrl }, 3000)
      } else {
        toast.error("Submission failed", { description: result.error || "Something went wrong. Please try again." })
      }
    } catch {
      toast.error("Network error", { description: "Please check your connection and try again." })
    } finally {
      setSubmitting(false)
    }
  }

  if (submitted) {
    return (
      <div className="max-w-md mx-auto py-20 text-center space-y-4 px-4">
        <div className="size-16 bg-green-50 rounded-full flex items-center justify-center mx-auto">
          <CheckCircle2 className="size-8 text-green-500" />
        </div>
        <h2 className="text-xl font-semibold">Return Requested</h2>
        <p className="text-muted-foreground text-sm">We&apos;ve sent you a confirmation email. Our team will review your return and be in touch once it&apos;s completed.</p>
        <p className="text-xs text-muted-foreground">Redirecting to your order page...</p>
      </div>
    )
  }

  // ── Ineligible table content (shared between layouts) ──
  const IneligibleTableContent = (
    <>
      {ineligibleItems.length === 0 ? (
        <div className="flex-1 flex items-center justify-center p-8 text-center text-muted-foreground text-sm">
          All items in this order are eligible for return.
        </div>
      ) : (
        <ScrollArea className="flex-1 min-h-0">
          <Table>
            <TableHeader className="sticky top-0 bg-background z-10">
              <TableRow className="hover:bg-transparent">
                <TableHead className="pl-4">Product</TableHead>
                <TableHead className="text-right hidden sm:table-cell">Unit</TableHead>
                <TableHead className="text-right pr-2 hidden sm:table-cell">Total</TableHead>
                <TableHead className="pr-4 text-right">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {ineligibleItems.map(item => {
                const url = pUrl(item.productHandle)
                return (
                  <TableRow key={item.id}>
                    <TableCell className="pl-4 py-3">
                      <div className="flex items-center gap-3">
                        <ProductThumb item={item} />
                        <div className="min-w-0">
                          <a href={url} target="_blank" rel="noopener noreferrer"
                            className="font-medium text-sm hover:underline block leading-tight truncate max-w-[200px]">
                            {item.title}
                          </a>
                          {item.variant?.title && item.variant.title !== "Default Title" ? (
                              <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
                                <span className="text-xs text-muted-foreground">{item.variant.title}</span>
                                <span className="inline-flex items-center justify-center bg-muted rounded text-[11px] font-semibold text-foreground w-[28px] h-[18px]">{item.quantity}</span>
                              </div>
                            ) : (
                              <span className="inline-flex items-center justify-center bg-muted rounded text-[11px] font-semibold text-foreground w-[28px] h-[18px] mt-0.5">{item.quantity}</span>
                            )}
                          <span className="sm:hidden inline-flex items-center gap-1 mt-1 text-[11px] text-muted-foreground tabular-nums">
                            £{(item.unitPrice ?? orderAvgPrice).toFixed(2)} × {item.quantity}
                          </span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="py-3 text-sm whitespace-nowrap hidden sm:table-cell">
                      <div className="flex items-center justify-end gap-1.5 tabular-nums">
                        <span className="text-muted-foreground text-right">£{(item.unitPrice ?? orderAvgPrice).toFixed(2)}&nbsp;×</span>
                        <span className="inline-flex items-center justify-center bg-muted rounded text-[11px] font-semibold text-foreground w-[28px] h-[18px]">{item.quantity}</span>
                      </div>
                    </TableCell>
                    <TableCell className="pr-2 py-3 font-semibold text-sm whitespace-nowrap hidden sm:table-cell text-right tabular-nums">
                      £{((item.unitPrice ?? orderAvgPrice) * item.quantity).toFixed(2)}
                    </TableCell>
                    <TableCell className="pr-4 py-3 text-right">
                      <IneligibleReason
                        status={item.returnStatus}
                        reason={item.returnReason}
                        lineDeliveredAt={item.lineDeliveredAt}
                      />
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </ScrollArea>
      )}
    </>
  )

  return (
    <>
      <div className={cn("flex flex-col gap-4", hasEligible && "pb-[120px] sm:pb-[64px]")}>

        <Button variant="ghost" size="sm" onClick={onBack} className="-ml-2 text-muted-foreground hover:text-foreground w-fit">
          <ArrowLeft className="size-4" /> Back to Orders
        </Button>

        {/* ── Order header card ── */}
        <Card className={cn(C, "overflow-hidden")}>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-5 py-4">
            <div>
              <div className="flex items-center gap-2 mb-0.5">
                <h2 className="text-base font-semibold">{order.name}</h2>
                {order.canceledAt
                  ? <Badge className="bg-red-100 text-red-700 hover:bg-red-100 border-0 text-xs">Canceled</Badge>
                  : order.isDelivered
                  ? <Badge className="bg-green-100 text-green-700 hover:bg-green-100 border-0 text-xs">Delivered</Badge>
                  : <Badge variant="secondary" className="text-xs">
                      {order.displayFulfillmentStatus === "IN_PROGRESS" || order.displayFulfillmentStatus === "FULFILLED" || order.displayFulfillmentStatus === "PARTIAL" ? "In Transit"
                        : order.displayFulfillmentStatus === "UNFULFILLED" ? "Unfulfilled" : "Processing"}
                    </Badge>}
              </div>
              <p className="text-xs text-muted-foreground">
                {order.canceledAt
                  ? `Canceled ${new Date(order.canceledAt).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}`
                  : order.isDelivered && order.deliveredAt
                  ? `Delivered ${new Date(order.deliveredAt).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}`
                  : `Ordered ${new Date(order.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}`}
                {" "}&bull; £{total.toFixed(2)} GBP &bull; {totalQty} item{totalQty !== 1 ? "s" : ""}
              </p>
            </div>
            <a href={orderStatusUrl} target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors hover:underline underline-offset-4">
              <ExternalLink className="size-3.5" /> View Order Status
            </a>
          </div>
          <div className="grid grid-cols-4 border-t border-border divide-x divide-border">
            <div className="px-3 sm:px-5 py-2.5 sm:py-3"><p className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">Total Paid</p><p className="font-semibold text-sm mt-0.5">£{total.toFixed(2)}</p></div>
            <div className="px-3 sm:px-5 py-2.5 sm:py-3"><p className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">Eligible</p><p className="font-semibold text-sm mt-0.5 text-green-600">{eligibleItems.length}</p></div>
            <div className="px-3 sm:px-5 py-2.5 sm:py-3"><p className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">Ineligible</p><p className="font-semibold text-sm mt-0.5 text-zinc-500">{ineligibleItems.reduce((s,i)=>s+i.quantity,0)}</p></div>
            <div className="px-3 sm:px-5 py-2.5 sm:py-3"><p className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">Refunded</p><p className="font-semibold text-sm mt-0.5 text-blue-600">£{refundedAmount.toFixed(2)}</p></div>
          </div>
        </Card>

        {/* ── Policy gate ── */}
        {hasEligible && !policyAccepted && (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-lg border bg-card px-4 py-3 text-sm">
            <div className="flex items-center gap-2 min-w-0">
              <ShieldCheck className="size-4 text-muted-foreground shrink-0" />
              <span className="font-medium">Hygiene &amp; Returns Policy</span>
              <span className="text-muted-foreground hidden sm:inline">— Review and accept before selecting items.</span>
            </div>
            <span className="text-muted-foreground sm:hidden text-xs pl-6">Review and accept our returns policy before selecting items.</span>
            <HygienePolicy onAccept={() => setPolicyAccepted(true)} onDecline={() => setPolicyAccepted(false)} />
          </div>
        )}

        {/* ── Tables ──
            Both eligible + ineligible: side by side on xl
            Only eligible:   eligible full width, no ineligible card
            Only ineligible: ineligible full width, no eligible card
        ── */}
        {hasEligible ? (
          <div className={ineligibleItems.length > 0 ? "grid grid-cols-1 xl:grid-cols-2 gap-4" : "flex flex-col gap-4"}>

            {/* Eligible — full width when no ineligible items */}
            <TableCard
              title="Select items to return"
              badge={
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      if (!policyAccepted) return
                      const allSelected = eligibleItems.every(i => selectedItems[i.id]?.selected)
                      const next: typeof selectedItems = {}
                      eligibleItems.forEach(i => {
                        next[i.id] = allSelected
                          ? { ...selectedItems[i.id], selected: false }
                          : { selected: true, quantity: selectedItems[i.id]?.quantity || 1, reason: selectedItems[i.id]?.reason || "", description: selectedItems[i.id]?.description || "" }
                      })
                      setSelectedItems(prev => ({ ...prev, ...next }))
                    }}
                    disabled={!policyAccepted}
                    className="text-xs text-[#E5403B] hover:underline disabled:opacity-40 disabled:cursor-not-allowed font-medium"
                  >
                    {eligibleItems.every(i => selectedItems[i.id]?.selected) ? "Deselect all" : "Select all"}
                  </button>
                  <Badge className="bg-green-100 text-green-700 hover:bg-green-100 border-0 text-xs font-medium h-5 w-5 p-0 flex items-center justify-center rounded-full">
                    {eligibleItems.length}
                  </Badge>
                </div>
              }
              fullWidth={ineligibleItems.length === 0}
            >
              <ScrollArea className="flex-1 min-h-0">
                <Table>
                  <TableHeader className="sticky top-0 bg-background z-10">
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="w-8 pl-4 pr-0"></TableHead>
                      <TableHead className="pl-3">Product</TableHead>
                      <TableHead className="text-right pr-4 hidden sm:table-cell">Unit</TableHead>
                      <TableHead className="text-right pr-4">Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {eligibleItems.map(item => {
                      const sel = selectedItems[item.id]
                      const isLocked = !policyAccepted
                      const url = pUrl(item.productHandle)
                      const itemPrice = item.unitPrice ?? orderAvgPrice
                      const linePrice = itemPrice * item.quantity
                      return (
                        <React.Fragment key={item.id}>
                          <TableRow className={cn(
                            "transition-colors",
                            sel?.selected && "bg-muted/20 hover:bg-muted/30",
                          )}>
                            <TableCell className="pl-4 pr-0 py-3">
                              <Checkbox
                                checked={sel?.selected || false}
                                disabled={isLocked}
                                onCheckedChange={checked => {
                                  if (isLocked) return
                                  setSelectedItems(prev => ({
                                    ...prev,
                                    [item.id]: checked
                                      ? { selected: true, quantity: 1, reason: "", description: "" }
                                      : { ...prev[item.id], selected: false },
                                  }))
                                }}
                              />
                            </TableCell>
                            <TableCell className="pl-3 py-3">
                              <div className="flex items-center gap-3">
                                <ProductThumb item={item} />
                                <div className="min-w-0">
                                  <a href={url} target="_blank" rel="noopener noreferrer"
                                    className="font-medium text-sm hover:underline block leading-tight truncate max-w-[170px]">
                                    {item.title}
                                  </a>
                                  {item.variant?.title && item.variant.title !== "Default Title" && (
                                    <span className="inline-block mt-1 text-[11px] bg-muted text-muted-foreground rounded px-1.5 py-0.5 leading-none">{item.variant.title}</span>
                                  )}
                                  {/* Qty + unit price visible only when Unit col is hidden (mobile) */}
                                  <span className="sm:hidden inline-flex items-center gap-1 mt-1 text-[11px] text-muted-foreground tabular-nums">
                                    £{itemPrice.toFixed(2)} × {item.quantity} = <span className="font-semibold text-foreground">£{linePrice.toFixed(2)}</span>
                                  </span>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell className="pr-4 py-3 text-sm whitespace-nowrap hidden sm:table-cell">
                              <div className="flex items-center justify-end gap-1.5 tabular-nums">
                                <span className="text-muted-foreground text-right">£{itemPrice.toFixed(2)}&nbsp;×</span>
                                <span className="inline-flex items-center justify-center bg-muted rounded text-[11px] font-semibold text-foreground w-[28px] h-[18px]">{item.quantity}</span>
                              </div>
                            </TableCell>
                            <TableCell className="text-right pr-4 py-3 font-semibold text-sm whitespace-nowrap">
                              £{linePrice.toFixed(2)}
                            </TableCell>
                          </TableRow>

                          {sel?.selected && (
                            <TableRow className="hover:bg-transparent bg-zinc-50/60">
                              <TableCell colSpan={4} className="px-4 pb-3 pt-1">
                                <div className="ml-[calc(0.5rem+2.5rem+0.75rem)] grid grid-cols-2 gap-2.5">
                                  <div>
                                    <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground block mb-1">Quantity</label>
                                    <Select value={String(sel.quantity)} onValueChange={val => setSelectedItems(prev => ({ ...prev, [item.id]: { ...prev[item.id], quantity: parseInt(val) } }))}>
                                      <SelectTrigger className="h-8 text-sm bg-white"><SelectValue /></SelectTrigger>
                                      <SelectContent>
                                        {Array.from({ length: item.quantity }, (_, i) => <SelectItem key={i+1} value={String(i+1)}>{i+1}</SelectItem>)}
                                      </SelectContent>
                                    </Select>
                                  </div>
                                  <div>
                                    <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground block mb-1">Reason</label>
                                    <Select value={sel.reason} onValueChange={val => setSelectedItems(prev => ({ ...prev, [item.id]: { ...prev[item.id], reason: val, description: "" } }))}>
                                      <SelectTrigger className="h-8 text-sm bg-white"><SelectValue placeholder="Select..." /></SelectTrigger>
                                      <SelectContent>
                                        {RETURN_REASONS.map(r => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
                                      </SelectContent>
                                    </Select>
                                  </div>
                                  {sel.reason && (
                                    <div className="col-span-2">
                                      <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground block mb-1">
                                        {sel.reason === "OTHER" ? <>Notes <span className="text-destructive">*</span></> : "Notes (optional)"}
                                      </label>
                                      <Textarea
                                        value={sel.description}
                                        onChange={e => setSelectedItems(prev => ({ ...prev, [item.id]: { ...prev[item.id], description: e.target.value } }))}
                                        placeholder={sel.reason === "OTHER" ? "Describe your reason (required)..." : "Any additional information..."}
                                        className="text-sm bg-white resize-none"
                                        rows={2}
                                      />
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
            </TableCard>

            {/* Ineligible — only shown when there are ineligible items */}
            {ineligibleItems.length > 0 && (
              <TableCard
                title="Not eligible for return"
                badge={<Badge variant="secondary" className="text-xs font-medium h-5 w-5 p-0 flex items-center justify-center rounded-full">{ineligibleItems.length}</Badge>}
              >
                {IneligibleTableContent}
              </TableCard>
            )}
          </div>

        ) : (
          /* No eligible items — ineligible card takes full width */
          <TableCard
            title="Not eligible for return"
            badge={<Badge variant="secondary" className="text-xs font-medium h-5 w-5 p-0 flex items-center justify-center rounded-full">{ineligibleItems.length}</Badge>}
            fullWidth
          >
            {IneligibleTableContent}
          </TableCard>
        )}
      </div>

      {/* ── Portalled fixed action bar — no blur/glass ── */}
      {mounted && hasEligible && createPortal(
        <div
          className="fixed bottom-0 right-0 z-[48] border-t border-border bg-background shadow-[0_-2px_12px_rgba(0,0,0,0.08)]"
          style={{ left: sidebarMobile ? "0px" : sidebarState === "collapsed" ? "4.5rem" : "18rem" }}
        >
          <div className="px-4 lg:px-6 py-2.5 flex items-center justify-between gap-2">
            {/* Left: stats */}
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
                  <Lock className="size-3.5 shrink-0" />
                  <span>Accept policy to continue</span>
                </div>
              )}
            </div>
            {/* Right: actions */}
            <div className="flex items-center gap-2 shrink-0">
              <Button variant="ghost" size="sm" onClick={onBack} className="text-muted-foreground hidden sm:inline-flex">Cancel</Button>
              <Button
                size="sm"
                className="bg-[#E5403B] hover:bg-[#cc3935] text-white disabled:opacity-50"
                disabled={!canSubmit || submitting}
                onClick={submitReturn}
              >
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

// ─── Main Dashboard ────────────────────────────────────────────────────────
export default function DashboardClient() {
  const [data, setData] = useState<OrdersData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  const [view, setView] = useState<"grid" | "list">("grid")
  const [search, setSearch] = useState("")
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
                <Card className={C}>
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
            <CardContent className="flex flex-col items-center justify-center gap-3 py-8">
              <div className="size-10 rounded-full bg-[#E5403B]/10 flex items-center justify-center"><Spinner className="size-5 text-[#E5403B]" /></div>
              <div className="text-center"><p className="font-semibold text-sm">Authenticating</p><p className="text-xs text-muted-foreground mt-0.5">Verifying your session securely...</p></div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return portalContent
}
