"use client"

import * as React from "react"
import { useEffect, useState } from "react"
import { toast } from "sonner"
import {
  ChevronRight, LayoutGrid, List, ArrowLeft,
  RotateCcw, CheckCircle2, ShoppingBag, ShieldCheck,
  Clock, Truck, PackageX, Lock, ExternalLink
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
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
  returnStatus: ReturnStatus
  returnReason?: string
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
}

interface OrdersData {
  firstName: string
  email: string
  orders: Order[]
}

const RETURN_REASONS = [
  { value: "CHANGED_MIND", label: "Changed my mind" },
  { value: "WRONG_ITEM", label: "Wrong item received" },
  { value: "FAULTY", label: "Faulty / not working" },
  { value: "DAMAGED", label: "Damaged in transit" },
  { value: "NOT_AS_DESCRIBED", label: "Not as described" },
  { value: "OTHER", label: "Other" },
]

// Card base reset for standard grids
const C = "shadow-sm py-0 gap-0"
const CH = "px-6 py-4 border-b gap-0 bg-white"

function pUrl(handle?: string | null) {
  return handle ? `https://iblazevape.co.uk/products/${handle}` : "https://iblazevape.co.uk"
}

// ─── Ineligible reason chip ────────────────────────────────────────────────
function IneligibleReason({ status }: { status: ReturnStatus }) {
  if (status === "On its way") return (
    <div className="inline-flex items-center gap-1.5 text-amber-600">
      <Truck className="size-3.5 shrink-0" />
      <span className="text-xs font-medium whitespace-nowrap">On its way</span>
    </div>
  )
  if (status === "Not yet dispatched") return (
    <div className="inline-flex items-center gap-1.5 text-muted-foreground">
      <Clock className="size-3.5 shrink-0" />
      <span className="text-xs font-medium whitespace-nowrap">Not dispatched</span>
    </div>
  )
  if (status === "Passed the return window") return (
    <div className="inline-flex items-center gap-1.5 text-destructive">
      <PackageX className="size-3.5 shrink-0" />
      <span className="text-xs font-medium whitespace-nowrap">Window expired</span>
    </div>
  )
  if (status === "Return requested") return (
    <Badge variant="outline" className="text-xs font-medium bg-blue-50 text-blue-700 border-blue-200">Requested</Badge>
  )
  if (status === "Return approved") return (
    <Badge variant="outline" className="text-xs font-medium bg-green-50 text-green-700 border-green-200">Approved</Badge>
  )
  if (status === "Return completed" || status === "Returned") return (
    <Badge variant="secondary" className="text-xs font-medium">Completed</Badge>
  )
  if (status === "Return declined") return (
    <Badge variant="destructive" className="text-xs font-medium">Declined</Badge>
  )
  if (status === "Return cancelled") return (
    <span className="text-xs text-muted-foreground font-medium">Cancelled</span>
  )
  return <span className="text-xs text-muted-foreground">{status}</span>
}

// ─── Product thumbnail ─────────────────────────────────────────────────────
function ProductThumb({ item }: { item: LineItem }) {
  const url = pUrl(item.productHandle)
  return (
    <a href={url} target="_blank" rel="noopener noreferrer" className="relative shrink-0 block">
      <div className="size-12 rounded-md overflow-hidden bg-white border border-border">
        {item.image?.url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={item.image.url} alt={item.title} className="w-full h-full object-contain p-1" />
        )}
      </div>
      <span className="absolute -top-1.5 -right-1.5 bg-foreground text-white text-[10px] font-bold min-w-[18px] h-[18px] flex items-center justify-center rounded-full ring-2 ring-background z-10">
        {item.quantity}
      </span>
    </a>
  )
}

// ─── Skeleton grid cards ───────────────────────────────────────────────────
function OrderCardSkeleton() {
  return (
    <div className="bg-white border border-border rounded-xl p-5">
      <div className="flex items-start justify-between mb-3">
        <div className="space-y-1.5">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-3 w-32" />
        </div>
        <Skeleton className="h-4 w-14" />
      </div>
      <div className="flex gap-1.5">
        {[1,2,3].map(i => <Skeleton key={i} className="w-10 h-10 rounded-md" />)}
      </div>
    </div>
  )
}

// ─── Hygiene Policy Dialog / Drawer ───────────────────────────────────────
function HygienePolicy({ onAccept, onDecline }: { onAccept: () => void; onDecline: () => void }) {
  const [open, setOpen] = useState(false)
  const isDesktop = useMediaQuery("(min-width: 768px)")

  const handleAccept = () => {
    setOpen(false)
    onAccept()
    toast.success("Policy accepted", { description: "You can now select items to return." })
  }
  const handleDecline = () => {
    setOpen(false)
    onDecline()
    toast.warning("Policy declined", { description: "You must accept the returns policy to continue." })
  }

  const policyItems = [
    { title: "Vape Kits & Mods", desc: "30-day refund period. 30-day warranty from delivery." },
    { title: "Batteries & Chargers", desc: "60-day battery warranty. 30-day charger warranty." },
    { title: "E-Liquids & Disposables", desc: "Must remain sealed and unopened. No returns on opened liquids." },
    { title: "Tanks & Clearomisers", desc: "7-day Dead On Arrival window — report faults within 7 days." },
  ]

  const body = (
    <div className="space-y-2 text-sm">
      {policyItems.map(p => (
        <div key={p.title} className="rounded-lg border bg-muted/30 px-3 py-2.5">
          <p className="font-semibold text-foreground text-xs">{p.title}</p>
          <p className="text-xs text-muted-foreground mt-0.5">{p.desc}</p>
        </div>
      ))}
      <p className="text-xs text-muted-foreground pt-1">
        Return postage is at your expense. Tracked service required. Refunds within 5–10 business days.
      </p>
    </div>
  )

  const footer = (
    <div className="flex gap-2 pt-2">
      <Button className="flex-1 bg-[#E5403B] hover:bg-[#cc3935] text-white" onClick={handleAccept}>
        <CheckCircle2 className="size-4" /> I Accept
      </Button>
      <Button variant="outline" className="flex-1" onClick={handleDecline}>Decline</Button>
    </div>
  )

  const trigger = (
    <Button size="sm" className="bg-[#E5403B] hover:bg-[#cc3935] text-white shrink-0">
      Review &amp; Accept
    </Button>
  )

  if (isDesktop) return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldCheck className="size-4 text-[#E5403B]" /> iBlaze Returns Policy
          </DialogTitle>
        </DialogHeader>
        {body}{footer}
      </DialogContent>
    </Dialog>
  )

  return (
    <Drawer open={open} onOpenChange={setOpen}>
      <DrawerTrigger asChild>{trigger}</DrawerTrigger>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle className="flex items-center gap-2">
            <ShieldCheck className="size-4 text-[#E5403B]" /> iBlaze Returns Policy
          </DrawerTitle>
        </DrawerHeader>
        <div className="px-4 pb-2">{body}</div>
        <DrawerFooter>
          {footer}
          <DrawerClose asChild><Button variant="ghost" size="sm">Cancel</Button></DrawerClose>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  )
}

// ─── Order Card (grid view) ────────────────────────────────────────────────
function OrderCard({ order, onClick }: { order: Order; onClick: () => void }) {
  const uniqueImages = order.processedItems
    .map(i => i.image?.url)
    .filter((url, idx, arr) => url && arr.indexOf(url) === idx)
    .slice(0, 5) as string[]
  const extra = order.processedItems.length - uniqueImages.length
  const totalQty = order.processedItems.reduce((s, i) => s + i.quantity, 0)
  const total = parseFloat(order.totalPriceSet.shopMoney.amount)
  const date = new Date(order.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })
  return (
    <button
      onClick={onClick}
      className="group w-full text-left bg-white border border-border rounded-xl p-5 shadow-sm hover:shadow-md hover:border-zinc-300 transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-ring/30 flex flex-col justify-between"
    >
      <div className="flex items-start justify-between mb-3">
        <div>
          <p className="font-semibold text-[15px] text-foreground group-hover:underline">{order.name}</p>
          <p className="text-[13px] text-muted-foreground mt-0.5">{date} &bull; {totalQty} item{totalQty !== 1 ? "s" : ""}</p>
        </div>
        <p className="font-semibold text-[15px] text-foreground">£{total.toFixed(2)}</p>
      </div>
      <div className="flex items-center gap-1.5">
        {uniqueImages.map((url, i) => (
          <div key={i} className="w-10 h-10 rounded-md border border-border bg-white overflow-hidden shrink-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
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

// ─── Order Row (list view) ─────────────────────────────────────────────────
function OrderRow({ order, onClick }: { order: Order; onClick: () => void }) {
  const images = order.processedItems.map(i => i.image?.url).filter(Boolean).slice(0, 3) as string[]
  const total = parseFloat(order.totalPriceSet.shopMoney.amount)
  const date = new Date(order.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })
  const totalQty = order.processedItems.reduce((s, i) => s + i.quantity, 0)
  return (
    <button onClick={onClick} className="w-full px-5 py-3.5 flex items-center gap-4 hover:bg-zinc-50 transition-colors text-left group border-b border-border last:border-0">
      <div className="flex -space-x-2">
        {images.map((url, i) => (
          <div key={i} className="size-9 rounded-lg border-2 border-white bg-white overflow-hidden shadow-sm">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={url} alt="" className="w-full h-full object-contain" />
          </div>
        ))}
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

// ─── Order Detail ──────────────────────────────────────────────────────────
function OrderDetail({ order, onBack }: { order: Order; onBack: () => void }) {
  const [policyAccepted, setPolicyAccepted] = useState(false)
  const [selectedItems, setSelectedItems] = useState<
    Record<string, { selected: boolean; quantity: number; reason: string; description: string }>
  >({})
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  const rawOrderId = order.id.split("/").pop()
  const orderStatusUrl = `https://account.iblazevape.co.uk/orders/${rawOrderId}?buyer_token_attempted=1&locale=en-GB`

  const eligibleItems = order.processedItems.filter(i => i.returnStatus === "Eligible")
  const ineligibleItems = order.processedItems.filter(i => i.returnStatus !== "Eligible")
  const hasEligible = eligibleItems.length > 0

  const total = parseFloat(order.totalPriceSet.shopMoney.amount)
  const totalQty = order.processedItems.reduce((s, i) => s + i.quantity, 0)
  const pricePerItem = totalQty > 0 ? total / totalQty : 0
  const refundedAmount = order.totalRefundedSet?.shopMoney?.amount
    ? parseFloat(order.totalRefundedSet.shopMoney.amount) : 0

  const selectedCount = Object.values(selectedItems).filter(v => v.selected).length
  const estimatedRefund = Object.entries(selectedItems)
    .filter(([, v]) => v.selected)
    .reduce((sum, [id, v]) => {
      const item = order.processedItems.find(i => i.id === id)
      return sum + (item ? pricePerItem * v.quantity : 0)
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
        setTimeout(() => { window.location.href = `https://account.iblazevape.co.uk/orders/${rawOrderId}` }, 3000)
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
        <p className="text-muted-foreground text-sm">
          We&apos;ve sent you what we said earlier. Our team will review your return and be in touch once it&apos;s completed.
        </p>
        <p className="text-xs text-muted-foreground">Redirecting to your order page...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6 pb-12">
      <div>
        <Button variant="ghost" size="sm" onClick={onBack} className="-ml-2 text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-4 mr-1" /> Back to Orders
        </Button>
      </div>

      {/* ── Premium Order Header Card ── */}
      <Card className="border-border shadow-sm overflow-hidden mb-2">
        <div className="bg-zinc-50/50 p-6 md:p-8 flex flex-col md:flex-row md:items-start justify-between gap-6 border-b">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-2xl font-bold tracking-tight">{order.name}</h1>
              {order.isDelivered ? (
                <Badge className="bg-green-100 text-green-700 hover:bg-green-100 border-0">Delivered</Badge>
              ) : (
                <Badge variant="secondary">
                  {order.displayFulfillmentStatus === "IN_PROGRESS" ? "In Transit" :
                   order.displayFulfillmentStatus === "FULFILLED" ? "Shipped" : "Processing"}
                </Badge>
              )}
            </div>
            <p className="text-muted-foreground text-sm mb-1">
              {order.isDelivered && order.deliveredAt
                ? `Delivered on ${new Date(order.deliveredAt).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}`
                : `Placed on ${new Date(order.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}`}
            </p>
            <p className="font-medium text-sm">
              £{total.toFixed(2)} GBP &bull; {totalQty} item{totalQty !== 1 ? "s" : ""}
            </p>
          </div>
          
          <div className="flex flex-col items-start md:items-end gap-2">
            <Button asChild className="bg-black hover:bg-zinc-800 text-white w-full md:w-auto shadow-sm">
              <a href={orderStatusUrl} target="_blank" rel="noopener noreferrer">
                View Order Status
                <ExternalLink className="size-4 ml-2 opacity-80" />
              </a>
            </Button>
            <p className="text-[11px] text-muted-foreground flex items-center gap-1.5 md:mr-1">
              <ShieldCheck className="size-3.5" /> Securely via Shopify
            </p>
          </div>
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-4 divide-x divide-y md:divide-y-0 border-border bg-white text-sm">
          <div className="p-5 flex flex-col gap-1.5">
            <span className="text-muted-foreground text-xs uppercase tracking-wider font-semibold">Total Paid</span>
            <span className="font-bold text-lg">£{total.toFixed(2)}</span>
          </div>
          <div className="p-5 flex flex-col gap-1.5">
            <span className="text-muted-foreground text-xs uppercase tracking-wider font-semibold">Eligible</span>
            <span className="font-bold text-lg text-green-600">{eligibleItems.length} item{eligibleItems.length !== 1 ? "s" : ""}</span>
          </div>
          <div className="p-5 flex flex-col gap-1.5">
            <span className="text-muted-foreground text-xs uppercase tracking-wider font-semibold">Ineligible</span>
            <span className="font-bold text-lg text-zinc-600">{ineligibleItems.length} item{ineligibleItems.length !== 1 ? "s" : ""}</span>
          </div>
          <div className="p-5 flex flex-col gap-1.5">
            <span className="text-muted-foreground text-xs uppercase tracking-wider font-semibold">Refunded</span>
            <span className="font-bold text-lg text-blue-600">£{refundedAmount.toFixed(2)}</span>
          </div>
        </div>
      </Card>

      {/* ── Policy gate ── */}
      {hasEligible && !policyAccepted && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-lg border bg-card px-5 py-4 text-sm shadow-sm">
          <div className="flex items-center gap-2 min-w-0">
            <ShieldCheck className="size-4 text-muted-foreground shrink-0" />
            <span className="font-medium text-base">Hygiene &amp; Returns Policy</span>
            <span className="text-muted-foreground hidden sm:inline ml-1">— Review and accept before selecting items.</span>
          </div>
          <span className="text-muted-foreground sm:hidden text-sm pl-6">Review and accept our returns policy before selecting items.</span>
          <HygienePolicy onAccept={() => setPolicyAccepted(true)} onDecline={() => setPolicyAccepted(false)} />
        </div>
      )}

      {/* ── Main Layout: Tables on Left, Sticky Sidebar on Right ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">

        {/* ── Left Column: Both Tables ── */}
        <div className="lg:col-span-2 flex flex-col gap-6">

          {/* Eligible Items Card */}
          <Card className={cn(C, "overflow-hidden")}>
            <CardHeader className={CH}>
              <CardTitle className="text-base font-semibold flex items-center justify-between">
                Select items to return
                <Badge className="bg-green-100 text-green-700 border-0 text-xs font-medium px-2 py-0.5">
                  {eligibleItems.length} eligible
                </Badge>
              </CardTitle>
            </CardHeader>
            {eligibleItems.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground text-sm">
                No items in this order are currently eligible for return.
              </div>
            ) : (
              <div className="max-h-[500px] overflow-y-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="w-10 pl-6 pr-0"></TableHead>
                      <TableHead className="py-4">Product</TableHead>
                      <TableHead className="hidden sm:table-cell py-4">Variant</TableHead>
                      <TableHead className="text-right pr-6 py-4">Price</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {eligibleItems.map(item => {
                      const sel = selectedItems[item.id]
                      const isLocked = !policyAccepted
                      const url = pUrl(item.productHandle)
                      const linePrice = pricePerItem * item.quantity
                      return (
                        <React.Fragment key={item.id}>
                          <TableRow className={cn(
                            "transition-colors",
                            sel?.selected && "bg-muted/20 hover:bg-muted/30",
                            isLocked && "opacity-60 cursor-not-allowed"
                          )}>
                            <TableCell className="pl-6 py-4 pr-0">
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
                            <TableCell className="py-4">
                              <div className="flex items-center gap-4">
                                <ProductThumb item={item} />
                                <div>
                                  <a href={url} target="_blank" rel="noopener noreferrer"
                                    className="font-medium text-sm text-foreground hover:underline block leading-tight">
                                    {item.title}
                                  </a>
                                  {item.variant?.title && item.variant.title !== "Default Title" && (
                                    <p className="text-xs text-muted-foreground sm:hidden mt-1">{item.variant.title}</p>
                                  )}
                                </div>
                              </div>
                            </TableCell>
                            <TableCell className="hidden sm:table-cell text-sm text-muted-foreground py-4">
                              {item.variant?.title && item.variant.title !== "Default Title" ? item.variant.title : "—"}
                            </TableCell>
                            <TableCell className="text-right pr-6 py-4 font-medium text-sm">£{linePrice.toFixed(2)}</TableCell>
                          </TableRow>

                          {/* Expanded form row */}
                          {sel?.selected && (
                            <TableRow className="hover:bg-transparent bg-zinc-50/50">
                              <TableCell colSpan={4} className="px-6 pb-4 pt-1 border-b">
                                <div className="ml-[calc(1.5rem+3rem+1rem)] grid grid-cols-2 gap-4">
                                  <div>
                                    <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground block mb-1.5">Quantity</label>
                                    <Select
                                      value={String(sel.quantity)}
                                      onValueChange={val => setSelectedItems(prev => ({ ...prev, [item.id]: { ...prev[item.id], quantity: parseInt(val) } }))}
                                    >
                                      <SelectTrigger className="h-9 text-sm bg-white"><SelectValue /></SelectTrigger>
                                      <SelectContent>
                                        {Array.from({ length: item.quantity }, (_, i) => (
                                          <SelectItem key={i + 1} value={String(i + 1)}>{i + 1}</SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                  </div>
                                  <div>
                                    <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground block mb-1.5">Reason</label>
                                    <Select
                                      value={sel.reason}
                                      onValueChange={val => setSelectedItems(prev => ({ ...prev, [item.id]: { ...prev[item.id], reason: val, description: "" } }))}
                                    >
                                      <SelectTrigger className="h-9 text-sm bg-white"><SelectValue placeholder="Select..." /></SelectTrigger>
                                      <SelectContent>
                                        {RETURN_REASONS.map(r => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
                                      </SelectContent>
                                    </Select>
                                  </div>
                                  {sel.reason && (
                                    <div className="col-span-2 mt-1">
                                      <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground block mb-1.5">
                                        {sel.reason === "OTHER" ? <>Notes <span className="text-destructive">*</span></> : "Notes (optional)"}
                                      </label>
                                      <Textarea
                                        value={sel.description}
                                        onChange={e => setSelectedItems(prev => ({ ...prev, [item.id]: { ...prev[item.id], description: e.target.value } }))}
                                        placeholder={sel.reason === "OTHER" ? "Describe your reason..." : "Any additional information..."}
                                        className="text-sm bg-white resize-none h-20"
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
              </div>
            )}
          </Card>

          {/* Ineligible Items Card */}
          <Card className={cn(C, "overflow-hidden")}>
            <CardHeader className={CH}>
              <CardTitle className="text-base font-semibold flex items-center justify-between">
                {ineligibleItems.length} item{ineligibleItems.length !== 1 ? "s" : ""} aren&apos;t eligible for return
                <Badge variant="secondary" className="text-xs font-medium px-2 py-0.5">{ineligibleItems.length}</Badge>
              </CardTitle>
            </CardHeader>
            {ineligibleItems.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground text-sm">
                All items in this order are currently eligible for return.
              </div>
            ) : (
              <div className="max-h-[500px] overflow-y-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="pl-6 py-4">Product</TableHead>
                      <TableHead className="hidden sm:table-cell py-4">Variant</TableHead>
                      <TableHead className="pr-6 py-4 text-right">Reason</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {ineligibleItems.map(item => {
                      const url = pUrl(item.productHandle)
                      return (
                        <TableRow key={item.id}>
                          <TableCell className="pl-6 py-4">
                            <div className="flex items-center gap-4">
                              <ProductThumb item={item} />
                              <div>
                                <a href={url} target="_blank" rel="noopener noreferrer"
                                  className="font-medium text-sm text-foreground hover:underline block leading-tight">
                                  {item.title}
                                </a>
                                {item.variant?.title && item.variant.title !== "Default Title" && (
                                  <p className="text-xs text-muted-foreground sm:hidden mt-1">{item.variant.title}</p>
                                )}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="hidden sm:table-cell text-sm text-muted-foreground py-4">
                            {item.variant?.title && item.variant.title !== "Default Title" ? item.variant.title : "—"}
                          </TableCell>
                          <TableCell className="pr-6 py-4 text-right">
                            <div className="flex flex-col items-end gap-1.5">
                              <IneligibleReason status={item.returnStatus} />
                              {item.returnReason && item.returnStatus === "Return declined" && (
                                <span className="text-[12px] text-muted-foreground text-right max-w-[240px] leading-snug whitespace-normal break-words">
                                  {item.returnReason}
                                </span>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </Card>

        </div>

        {/* ── Right Column: Sticky Refund Sidebar ── */}
        <div className="lg:col-span-1 self-start lg:sticky lg:top-24">
          <div className="flex flex-col gap-4">
            <Card className={cn(C, "overflow-hidden")}>
              <CardHeader className={CH}>
                <CardTitle className="text-sm uppercase tracking-wider text-muted-foreground font-semibold">
                  Refund Estimator
                </CardTitle>
              </CardHeader>
              <CardContent className="px-6 py-5">
                <div className="flex justify-between text-sm mb-4">
                  <span className="text-muted-foreground">{selectedCount} item{selectedCount !== 1 ? "s" : ""} selected</span>
                  <span className="font-medium">£{estimatedRefund.toFixed(2)}</span>
                </div>
                <Separator />
                <div className="flex justify-between font-semibold mt-4 mb-5">
                  <span className="text-base">Estimated total</span>
                  <span className="text-[#E5403B] text-xl">£{estimatedRefund.toFixed(2)}</span>
                </div>
                {selectedCount === 0 && (
                  <p className="text-sm text-center text-muted-foreground mb-4">Select items to see your estimate</p>
                )}
                <div className="flex flex-col gap-3">
                  <Button
                    size="lg"
                    className="w-full bg-[#E5403B] hover:bg-[#cc3935] text-white disabled:opacity-50 text-sm"
                    disabled={!canSubmit || submitting}
                    onClick={submitReturn}
                  >
                    {submitting
                      ? <><Spinner className="size-4 mr-2" />Submitting...</>
                      : <><RotateCcw className="size-4 mr-2" />Submit Return Request</>}
                  </Button>
                  {!policyAccepted && hasEligible && (
                    <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground mt-1">
                      <Lock className="size-3.5" />
                      <span>Accept policy to continue</span>
                    </div>
                  )}
                  <Button variant="ghost" className="w-full text-muted-foreground text-sm" onClick={onBack}>Cancel Return</Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
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

  const filteredOrders = (data?.orders || []).filter(o =>
    o.name.toLowerCase().includes(search.toLowerCase())
  )
  const user = { name: data?.firstName || "Customer", email: data?.email || "" }

  const portalContent = (
    <SidebarProvider style={{ "--sidebar-width": "18rem", "--header-height": "3rem" } as React.CSSProperties}>
      <AppSidebar
        variant="inset"
        user={user}
        onNavigate={s => { setActiveSection(s); setSelectedOrder(null) }}
        activeSection={activeSection}
      />
      <SidebarInset>
        <SiteHeader
          title={selectedOrder ? selectedOrder.name : "My Orders"}
          search={search}
          onSearch={setSearch}
          showSearch={!selectedOrder}
          firstName={data?.firstName}
          email={data?.email}
        />

        <div className="flex flex-1 flex-col p-4 lg:p-8 gap-6">
          {selectedOrder ? (
            <OrderDetail order={selectedOrder} onBack={() => setSelectedOrder(null)} />
          ) : (
            <>
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold tracking-tight">
                    {data?.firstName ? `Hi, ${data.firstName} 👋` : "Your Recent Orders"}
                  </h2>
                  <p className="text-sm text-muted-foreground mt-1">Select an order to view details or initiate a return.</p>
                </div>
                <div className="flex items-center gap-1 bg-muted/60 rounded-lg p-1 border">
                  <Button variant="ghost" size="icon" className={cn("size-8", view === "grid" && "bg-background shadow-sm")} onClick={() => setView("grid")}>
                    <LayoutGrid className="size-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className={cn("size-8", view === "list" && "bg-background shadow-sm")} onClick={() => setView("list")}>
                    <List className="size-4" />
                  </Button>
                </div>
              </div>

              {error && (
                <div className="flex items-center gap-3 p-4 rounded-xl bg-destructive/10 text-sm text-destructive font-medium border border-destructive/20">
                  <PackageX className="size-5 shrink-0" />{error}
                </div>
              )}

              {view === "grid" && (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                  {loading
                    ? Array.from({ length: 6 }).map((_, i) => <OrderCardSkeleton key={i} />)
                    : filteredOrders.map(o => <OrderCard key={o.id} order={o} onClick={() => setSelectedOrder(o)} />)
                  }
                </div>
              )}

              {view === "list" && !loading && (
                <Card className={C}>
                  <CardContent className="p-0">
                    {filteredOrders.length === 0
                      ? <div className="text-center py-24"><ShoppingBag className="size-12 text-muted-foreground/30 mx-auto mb-4" /><p className="font-medium text-muted-foreground">No orders found</p></div>
                      : filteredOrders.map(o => <OrderRow key={o.id} order={o} onClick={() => setSelectedOrder(o)} />)
                    }
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
        <div className="pointer-events-none select-none blur-sm brightness-95 h-full w-full">
          {portalContent}
        </div>
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-background/40 backdrop-blur-sm">
          <Card className="w-full max-w-xs mx-4 shadow-xl border-border/50">
            <CardContent className="flex flex-col items-center justify-center gap-4 py-10">
              <div className="size-12 rounded-full bg-[#E5403B]/10 flex items-center justify-center">
                <Spinner className="size-6 text-[#E5403B]" />
              </div>
              <div className="text-center">
                <p className="font-semibold text-base">Authenticating</p>
                <p className="text-sm text-muted-foreground mt-1">Verifying your session securely...</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return portalContent
}
