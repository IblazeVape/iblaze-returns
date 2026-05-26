"use client"

import * as React from "react"
import { useEffect, useState } from "react"
import { toast } from "sonner"
import {
  ChevronRight, LayoutGrid, List, ArrowLeft,
  RotateCcw, ExternalLink, CheckCircle2,
  ShoppingBag, ShieldCheck, Clock, Truck, PackageX,
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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Drawer, DrawerClose, DrawerContent, DrawerFooter, DrawerHeader, DrawerTitle, DrawerTrigger } from "@/components/ui/drawer"
import { useMediaQuery } from "@/hooks/use-media-query"
import { cn } from "@/lib/utils"

type ReturnStatus = "Eligible" | "Not yet dispatched" | "On its way" | "Passed the return window" | "Returned"

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

// Suppress default Card py-6 gap-6
const C = "shadow-sm py-0 gap-0"

function pUrl(handle?: string | null) {
  return handle ? `https://iblazevape.co.uk/products/${handle}` : "https://iblazevape.co.uk"
}

// ─── Ineligible reason label + icon ───────────────────────────────────────
function IneligibleReason({ status }: { status: ReturnStatus }) {
  if (status === "On its way") return (
    <div className="flex items-center gap-1.5 text-amber-600">
      <Truck className="size-3.5 shrink-0" />
      <span className="text-xs font-medium">On its way</span>
    </div>
  )
  if (status === "Not yet dispatched") return (
    <div className="flex items-center gap-1.5 text-muted-foreground">
      <Clock className="size-3.5 shrink-0" />
      <span className="text-xs font-medium">Not dispatched</span>
    </div>
  )
  if (status === "Passed the return window") return (
    <div className="flex items-center gap-1.5 text-destructive">
      <PackageX className="size-3.5 shrink-0" />
      <span className="text-xs font-medium">Window expired</span>
    </div>
  )
  if (status === "Returned") return (
    <Badge variant="secondary" className="text-xs font-medium">Returned</Badge>
  )
  return <span className="text-xs text-muted-foreground">{status}</span>
}

// ─── Loading Screen ────────────────────────────────────────────────────────
function AuthenticatingScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30">
      <div className="relative w-full max-w-xs overflow-hidden mx-4">
        {/* Ghost card underneath for the blur effect */}
        <Card>
          <CardHeader>
            <CardTitle>iBlaze Returns</CardTitle>
            <CardDescription>Secure customer portal</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Verifying session</span>
              <span className="font-medium">...</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Loading orders</span>
              <span className="font-medium">...</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Preparing portal</span>
              <span className="font-medium">...</span>
            </div>
          </CardContent>
        </Card>
        {/* Overlay */}
        <Card className="bg-background/80 absolute inset-0 z-10 backdrop-blur-sm border-0">
          <CardContent className="flex h-full flex-col items-center justify-center gap-2.5 p-0">
            <Spinner className="size-5 opacity-60" />
            <span className="text-muted-foreground text-sm">Authenticating securely...</span>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

// ─── Order List Skeletons ─────────────────────────────────────────────────
function OrderCardSkeleton() {
  return (
    <div className="bg-white border border-border rounded-xl p-5 shadow-sm">
      <div className="flex items-start justify-between mb-3">
        <div className="space-y-1.5">
          <Skeleton className="h-4 w-24 rounded" />
          <Skeleton className="h-3 w-32 rounded" />
        </div>
        <Skeleton className="h-4 w-14 rounded" />
      </div>
      <div className="flex gap-1.5 mt-3">
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

  const trigger = (
    <Button size="sm" className="bg-[#E5403B] hover:bg-[#cc3935] text-white shrink-0">
      Review &amp; Accept
    </Button>
  )

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

  if (isDesktop) {
    return (
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>{trigger}</DialogTrigger>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShieldCheck className="size-4 text-[#E5403B]" /> iBlaze Returns Policy
            </DialogTitle>
          </DialogHeader>
          {body}
          {footer}
        </DialogContent>
      </Dialog>
    )
  }

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
  const extra = uniqueImages.length < order.processedItems.length
    ? order.processedItems.length - uniqueImages.length : 0
  const totalQty = order.processedItems.reduce((s, i) => s + i.quantity, 0)
  const total = parseFloat(order.totalPriceSet.shopMoney.amount)
  const date = new Date(order.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })
  return (
    <button
      onClick={onClick}
      className="group w-full text-left bg-white border border-border rounded-xl p-5 shadow-sm hover:shadow-md hover:border-zinc-300 transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-ring/30"
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

  const eligibleItems = order.processedItems.filter(i => i.returnStatus === "Eligible")
  const ineligibleItems = order.processedItems.filter(i => i.returnStatus !== "Eligible")
  const hasEligible = eligibleItems.length > 0

  const total = parseFloat(order.totalPriceSet.shopMoney.amount)
  const totalQty = order.processedItems.reduce((s, i) => s + i.quantity, 0)
  const pricePerItem = totalQty > 0 ? total / totalQty : 0
  const refundedAmount = order.totalRefundedSet?.shopMoney?.amount
    ? parseFloat(order.totalRefundedSet.shopMoney.amount) : 0
  const hasRefund = refundedAmount > 0

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
      const orderId = order.id.split("/").pop()
      const res = await fetch("/api/submit-return", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId, items }),
      })
      const result = await res.json()
      if (result.success) {
        setSubmitted(true)
        setTimeout(() => {
          window.location.href = `https://account.iblazevape.co.uk/orders/${orderId}`
        }, 3000)
      } else {
        toast.error("Submission failed", { description: result.error || "Something went wrong. Please try again." })
      }
    } catch {
      toast.error("Network error", { description: "Please check your connection and try again." })
    } finally {
      setSubmitting(false)
    }
  }

  const orderStatusUrl = `https://account.iblazevape.co.uk/orders/${order.id.split("/").pop()}`

  if (submitted) {
    return (
      <div className="max-w-md mx-auto py-20 text-center space-y-4 px-4">
        <div className="size-16 bg-green-50 rounded-full flex items-center justify-center mx-auto">
          <CheckCircle2 className="size-8 text-green-500" />
        </div>
        <h2 className="text-xl font-semibold">Return Requested</h2>
        <p className="text-muted-foreground text-sm">
          We&apos;ve sent you a confirmation email. Our team will review your return and be in touch once it&apos;s been completed.
        </p>
        <p className="text-xs text-muted-foreground">Redirecting to your order page...</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <Button variant="ghost" size="sm" onClick={onBack} className="-ml-2 text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" /> Back to Orders
      </Button>

      {/* ── Top row: order header 2/3 + refunded 1/3 ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-start">
        <Card className={cn(C, "lg:col-span-2")}>
          <CardContent className="px-5 py-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-base font-semibold">{order.name}</h2>
                  {order.isDelivered
                    ? <Badge className="bg-green-100 text-green-700 border-0 text-xs">Delivered</Badge>
                    : <Badge variant="secondary" className="text-xs">
                        {order.displayFulfillmentStatus === "IN_PROGRESS" ? "In Transit" :
                         order.displayFulfillmentStatus === "FULFILLED" ? "Shipped" : "Processing"}
                      </Badge>}
                </div>
                <p className="text-sm text-muted-foreground mt-0.5">
                  {order.isDelivered && order.deliveredAt
                    ? `Delivered ${new Date(order.deliveredAt).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}`
                    : new Date(order.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}
                </p>
                <p className="text-sm font-semibold mt-0.5">
                  £{total.toFixed(2)} GBP &bull; {totalQty} item{totalQty !== 1 ? "s" : ""}
                </p>
              </div>
              <a href={orderStatusUrl} target="_blank" rel="noopener noreferrer">
                <Button variant="outline" size="sm" className="shrink-0">
                  <ExternalLink className="size-4" /> View Order Status
                </Button>
              </a>
            </div>
          </CardContent>
        </Card>

        {hasRefund ? (
          <Card className={C}>
            <CardContent className="px-5 py-4">
              <div className="flex items-center gap-2.5 mb-1">
                <span className="text-base font-bold">£{refundedAmount.toFixed(2)} GBP</span>
                <Badge variant="outline" className="text-xs font-semibold">Refunded</Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                {refundedAmount >= total
                  ? "You received a full refund for this order."
                  : "You received partial refunds for this order."}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="hidden lg:block" />
        )}
      </div>

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

      {/* ── Main content: 2-col when eligible, full-width when not ── */}
      {hasEligible ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-start">

          {/* Left col: eligible table + ineligible table */}
          <div className="lg:col-span-2 flex flex-col gap-4">

            {/* ── Eligible items table ── */}
            <Card className={cn(C, "overflow-hidden")}>
              <CardHeader className="px-5 py-3 border-b">
                <CardTitle className="text-sm font-semibold flex items-center justify-between">
                  Select items to return
                  <Badge className="bg-green-100 text-green-700 border-0 text-xs font-medium">
                    {eligibleItems.length} eligible
                  </Badge>
                </CardTitle>
              </CardHeader>
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="w-10 pl-4 pr-0"></TableHead>
                    <TableHead>Product</TableHead>
                    <TableHead className="hidden sm:table-cell">Variant</TableHead>
                    <TableHead className="text-right pr-4">Price</TableHead>
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
                          isLocked && "opacity-60"
                        )}>
                          <TableCell className="pl-4 pr-0">
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
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <a href={url} target="_blank" rel="noopener noreferrer" className="relative shrink-0 block">
                                <div className="size-10 rounded-md overflow-hidden bg-white border border-border">
                                  {item.image?.url && (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img src={item.image.url} alt={item.title} className="w-full h-full object-contain p-0.5" />
                                  )}
                                </div>
                                <span className="absolute -top-1.5 -right-1.5 bg-foreground text-white text-[9px] font-bold min-w-[16px] h-[16px] flex items-center justify-center rounded-full ring-2 ring-background z-10">
                                  {item.quantity}
                                </span>
                              </a>
                              <div>
                                <a href={url} target="_blank" rel="noopener noreferrer"
                                  className="font-medium text-sm text-foreground hover:underline block leading-tight">
                                  {item.title}
                                </a>
                                {item.variant?.title && item.variant.title !== "Default Title" && (
                                  <p className="text-xs text-muted-foreground sm:hidden">{item.variant.title}</p>
                                )}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="hidden sm:table-cell text-sm text-muted-foreground">
                            {item.variant?.title && item.variant.title !== "Default Title"
                              ? item.variant.title : "—"}
                          </TableCell>
                          <TableCell className="text-right pr-4 font-medium text-sm">
                            £{linePrice.toFixed(2)}
                          </TableCell>
                        </TableRow>

                        {/* Expanded return form */}
                        {sel?.selected && (
                          <TableRow className="hover:bg-transparent bg-muted/10">
                            <TableCell colSpan={4} className="px-4 py-3">
                              <div className="ml-[calc(1rem+2.5rem+0.75rem)] grid grid-cols-2 gap-3">
                                <div className="space-y-1">
                                  <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Quantity</label>
                                  <Select
                                    value={String(sel.quantity)}
                                    onValueChange={val => setSelectedItems(prev => ({ ...prev, [item.id]: { ...prev[item.id], quantity: parseInt(val) } }))}
                                  >
                                    <SelectTrigger className="h-8 text-sm bg-white"><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                      {Array.from({ length: item.quantity }, (_, i) => (
                                        <SelectItem key={i + 1} value={String(i + 1)}>{i + 1}</SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>
                                <div className="space-y-1">
                                  <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Reason</label>
                                  <Select
                                    value={sel.reason}
                                    onValueChange={val => setSelectedItems(prev => ({ ...prev, [item.id]: { ...prev[item.id], reason: val, description: "" } }))}
                                  >
                                    <SelectTrigger className="h-8 text-sm bg-white"><SelectValue placeholder="Select..." /></SelectTrigger>
                                    <SelectContent>
                                      {RETURN_REASONS.map(r => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
                                    </SelectContent>
                                  </Select>
                                </div>
                                {(sel.reason === "OTHER" || sel.reason) && (
                                  <div className="col-span-2 space-y-1">
                                    <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                                      {sel.reason === "OTHER" ? <>Notes <span className="text-destructive">*</span></> : "Notes (optional)"}
                                    </label>
                                    <Textarea
                                      value={sel.description}
                                      onChange={e => setSelectedItems(prev => ({ ...prev, [item.id]: { ...prev[item.id], description: e.target.value } }))}
                                      placeholder={sel.reason === "OTHER" ? "Describe your reason..." : "Any additional information..."}
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
            </Card>

            {/* ── Ineligible items table (only shown if any) ── */}
            {ineligibleItems.length > 0 && (
              <Card className={cn(C, "overflow-hidden")}>
                <CardHeader className="px-5 py-3 border-b">
                  <CardTitle className="text-sm font-semibold flex items-center justify-between">
                    {ineligibleItems.length} item{ineligibleItems.length !== 1 ? "s" : ""} in this order aren&apos;t eligible for return
                    <Badge variant="secondary" className="text-xs font-medium">{ineligibleItems.length}</Badge>
                  </CardTitle>
                </CardHeader>
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="pl-4">Product</TableHead>
                      <TableHead className="hidden sm:table-cell">Variant</TableHead>
                      <TableHead className="pr-4 text-right">Reason</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {ineligibleItems.map(item => {
                      const url = pUrl(item.productHandle)
                      return (
                        <TableRow key={item.id} className="opacity-75">
                          <TableCell className="pl-4">
                            <div className="flex items-center gap-3">
                              <a href={url} target="_blank" rel="noopener noreferrer" className="relative shrink-0 block">
                                <div className="size-10 rounded-md overflow-hidden bg-white border border-border">
                                  {item.image?.url && (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img src={item.image.url} alt={item.title} className="w-full h-full object-contain p-0.5" />
                                  )}
                                </div>
                                <span className="absolute -top-1.5 -right-1.5 bg-foreground text-white text-[9px] font-bold min-w-[16px] h-[16px] flex items-center justify-center rounded-full ring-2 ring-background z-10">
                                  {item.quantity}
                                </span>
                              </a>
                              <div>
                                <a href={url} target="_blank" rel="noopener noreferrer"
                                  className="font-medium text-sm text-foreground hover:underline block leading-tight">
                                  {item.title}
                                </a>
                                {item.variant?.title && item.variant.title !== "Default Title" && (
                                  <p className="text-xs text-muted-foreground sm:hidden">{item.variant.title}</p>
                                )}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="hidden sm:table-cell text-sm text-muted-foreground">
                            {item.variant?.title && item.variant.title !== "Default Title"
                              ? item.variant.title : "—"}
                          </TableCell>
                          <TableCell className="pr-4 text-right">
                            <IneligibleReason status={item.returnStatus} />
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </Card>
            )}
          </div>

          {/* ── Right sidebar — sticky ── */}
          <div className="lg:col-span-1 self-start sticky top-6">
            <div className="flex flex-col gap-3">
              <Card className={cn(C, "overflow-hidden")}>
                <CardHeader className="px-5 py-3 border-b">
                  <CardTitle className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
                    Refund Estimator
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-5 py-4">
                  <div className="flex justify-between text-sm mb-3">
                    <span className="text-muted-foreground">{selectedCount} item{selectedCount !== 1 ? "s" : ""} selected</span>
                    <span className="font-medium">£{estimatedRefund.toFixed(2)}</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between font-semibold mt-3 mb-4">
                    <span className="text-sm">Estimated total</span>
                    <span className="text-[#E5403B] text-base">£{estimatedRefund.toFixed(2)}</span>
                  </div>
                  {selectedCount === 0 && (
                    <p className="text-xs text-center text-muted-foreground mb-3">Select items to see your estimate</p>
                  )}
                  <div className="flex flex-col gap-2">
                    <Button
                      className="w-full bg-[#E5403B] hover:bg-[#cc3935] text-white disabled:opacity-50"
                      disabled={!canSubmit || submitting}
                      onClick={submitReturn}
                    >
                      {submitting
                        ? <><Spinner className="size-4" />Submitting...</>
                        : <><RotateCcw className="size-4" />Submit Return Request</>}
                    </Button>
                    {!policyAccepted && (
                      <p className="text-xs text-center text-muted-foreground">Accept the returns policy to continue</p>
                    )}
                    <Button variant="ghost" className="w-full text-muted-foreground text-sm" onClick={onBack}>Cancel</Button>
                  </div>
                </CardContent>
              </Card>

              <Card className={C}>
                <CardContent className="px-5 py-4">
                  <p className="font-semibold text-sm mb-2">Order Summary</p>
                  <div className="flex justify-between text-sm text-muted-foreground mb-1.5">
                    <span>Total paid</span>
                    <span className="font-medium text-foreground">£{total.toFixed(2)} GBP</span>
                  </div>
                  <div className="flex justify-between text-sm text-muted-foreground mb-1.5">
                    <span>Items</span><span>{totalQty}</span>
                  </div>
                  <div className="flex justify-between text-sm text-muted-foreground">
                    <span>Eligible to return</span>
                    <span className="text-green-600 font-medium">{eligibleItems.length}</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>

      ) : (
        /* ── All ineligible: full-width table, no sidebar ── */
        <Card className={cn(C, "overflow-hidden")}>
          <CardHeader className="px-5 py-3 border-b">
            <CardTitle className="text-sm font-semibold">
              {ineligibleItems.length} item{ineligibleItems.length !== 1 ? "s" : ""} in this order aren&apos;t eligible for return
            </CardTitle>
          </CardHeader>
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="pl-4">Product</TableHead>
                <TableHead className="hidden sm:table-cell">Variant</TableHead>
                <TableHead className="pr-4 text-right">Reason</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {ineligibleItems.map(item => {
                const url = pUrl(item.productHandle)
                return (
                  <TableRow key={item.id} className="opacity-75">
                    <TableCell className="pl-4">
                      <div className="flex items-center gap-3">
                        <a href={url} target="_blank" rel="noopener noreferrer" className="relative shrink-0 block">
                          <div className="size-10 rounded-md overflow-hidden bg-white border border-border">
                            {item.image?.url && (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={item.image.url} alt={item.title} className="w-full h-full object-contain p-0.5" />
                            )}
                          </div>
                          <span className="absolute -top-1.5 -right-1.5 bg-foreground text-white text-[9px] font-bold min-w-[16px] h-[16px] flex items-center justify-center rounded-full ring-2 ring-background z-10">
                            {item.quantity}
                          </span>
                        </a>
                        <div>
                          <a href={url} target="_blank" rel="noopener noreferrer"
                            className="font-medium text-sm text-foreground hover:underline block leading-tight">
                            {item.title}
                          </a>
                          {item.variant?.title && item.variant.title !== "Default Title" && (
                            <p className="text-xs text-muted-foreground sm:hidden">{item.variant.title}</p>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell text-sm text-muted-foreground">
                      {item.variant?.title && item.variant.title !== "Default Title" ? item.variant.title : "—"}
                    </TableCell>
                    <TableCell className="pr-4 text-right">
                      <IneligibleReason status={item.returnStatus} />
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </Card>
      )}
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

  if (loading) return <AuthenticatingScreen />

  const filteredOrders = (data?.orders || []).filter(o =>
    o.name.toLowerCase().includes(search.toLowerCase())
  )
  const user = { name: data?.firstName || "Customer", email: data?.email || "" }

  return (
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

        <div className="flex flex-1 flex-col p-4 lg:p-6 gap-4">
          {selectedOrder ? (
            <OrderDetail order={selectedOrder} onBack={() => setSelectedOrder(null)} />
          ) : (
            <>
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold">
                    {data?.firstName ? `Hi, ${data.firstName} 👋` : "Your Recent Orders"}
                  </h2>
                  <p className="text-sm text-muted-foreground mt-0.5">Select an order to view details or initiate a return.</p>
                </div>
                <div className="flex items-center gap-1 bg-muted rounded-lg p-1">
                  <Button variant="ghost" size="icon" className={cn("size-7", view === "grid" && "bg-background shadow-sm")} onClick={() => setView("grid")}>
                    <LayoutGrid className="size-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className={cn("size-7", view === "list" && "bg-background shadow-sm")} onClick={() => setView("list")}>
                    <List className="size-4" />
                  </Button>
                </div>
              </div>

              {error && (
                <div className="flex items-center gap-3 p-4 rounded-xl bg-destructive/10 text-sm text-destructive">
                  <PackageX className="size-5 shrink-0" />{error}
                </div>
              )}

              {/* Skeleton loaders while orders haven't populated yet */}
              {!error && !data && (
                <div className="grid grid-cols-2 xl:grid-cols-3 gap-4">
                  {Array.from({ length: 6 }).map((_, i) => <OrderCardSkeleton key={i} />)}
                </div>
              )}

              {!error && data && filteredOrders.length === 0 && (
                <div className="text-center py-20">
                  <ShoppingBag className="size-12 text-muted-foreground/30 mx-auto mb-4" />
                  <p className="font-medium text-muted-foreground">No orders found</p>
                </div>
              )}

              {view === "grid" && filteredOrders.length > 0 && (
                <div className="grid grid-cols-2 xl:grid-cols-3 gap-4">
                  {filteredOrders.map(o => <OrderCard key={o.id} order={o} onClick={() => setSelectedOrder(o)} />)}
                </div>
              )}

              {view === "list" && filteredOrders.length > 0 && (
                <Card className={C}>
                  <CardContent className="p-0">
                    {filteredOrders.map(o => <OrderRow key={o.id} order={o} onClick={() => setSelectedOrder(o)} />)}
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
