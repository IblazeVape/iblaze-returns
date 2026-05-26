"use client"

import * as React from "react"
import { useEffect, useState } from "react"
import { toast } from "sonner"
import {
  ChevronRight, LayoutGrid, List, ArrowLeft,
  RotateCcw, ExternalLink, CheckCircle2,
  XCircle, Info, ShoppingBag, AlertTriangle, ShieldCheck,
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
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog"
import {
  Drawer, DrawerClose, DrawerContent, DrawerFooter, DrawerHeader, DrawerTitle, DrawerTrigger,
} from "@/components/ui/drawer"
import { useMediaQuery } from "@/hooks/use-media-query"
import { cn } from "@/lib/utils"

type ReturnStatus = "Eligible" | "Not yet dispatched" | "On its way" | "Passed the return window"

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

function productUrl(handle?: string | null) {
  return handle ? `https://iblazevape.co.uk/products/${handle}` : "https://iblazevape.co.uk"
}

// ─── Loading Screen ───────────────────────────────────────────────────────────
function AuthenticatingScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#FAFAFA]">
      <Badge variant="secondary" className="gap-2 px-4 py-2 text-sm">
        <Spinner className="size-4" />
        Authenticating securely...
      </Badge>
    </div>
  )
}

// ─── Hygiene Policy (Dialog on desktop, Drawer on mobile) ─────────────────────
function HygienePolicy({
  onAccept,
  onDecline,
}: {
  onAccept: () => void
  onDecline: () => void
}) {
  const [open, setOpen] = useState(false)
  const isDesktop = useMediaQuery("(min-width: 768px)")

  const handleAccept = () => {
    setOpen(false)
    onAccept()
    toast.success("Policy accepted", {
      description: "You can now select items to return.",
    })
  }
  const handleDecline = () => {
    setOpen(false)
    onDecline()
    toast.error("Policy declined", {
      description: "You must accept the returns policy to submit a return.",
    })
  }

  const trigger = (
    <Button size="sm" className="bg-[#E5403B] hover:bg-[#cc3935] text-white shrink-0">
      Review &amp; Accept
    </Button>
  )

  const body = (
    <div className="space-y-3 text-sm text-muted-foreground">
      {[
        { title: "Vape Kits & Mods", desc: "30-day refund period. 30-day warranty from delivery." },
        { title: "Batteries & Chargers", desc: "60-day battery warranty. 30-day charger warranty." },
        { title: "E-Liquids & Disposables", desc: "Must remain sealed and unopened. No returns on opened liquids." },
        { title: "Tanks & Clearomisers", desc: "7-day Dead On Arrival window — report faults within 7 days." },
      ].map(p => (
        <div key={p.title} className="rounded-lg border bg-muted/30 p-3 space-y-0.5">
          <p className="font-semibold text-foreground text-xs">{p.title}</p>
          <p className="text-xs">{p.desc}</p>
        </div>
      ))}
      <p className="text-xs text-muted-foreground pt-1">
        Return postage is at your expense. A tracked service is required. Refunds processed within 5–10 business days.
      </p>
    </div>
  )

  const footer = (
    <div className="flex gap-2 pt-2">
      <Button className="flex-1 bg-[#E5403B] hover:bg-[#cc3935] text-white" onClick={handleAccept}>
        <CheckCircle2 className="size-4" /> I Accept
      </Button>
      <Button variant="outline" className="flex-1" onClick={handleDecline}>
        Decline
      </Button>
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
          <DrawerClose asChild>
            <Button variant="ghost" size="sm">Cancel</Button>
          </DrawerClose>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  )
}

// ─── Order Card ───────────────────────────────────────────────────────────────
function OrderCard({ order, onClick }: { order: Order; onClick: () => void }) {
  const uniqueImages = order.processedItems
    .map(i => i.image?.url)
    .filter((url, idx, arr) => url && arr.indexOf(url) === idx)
    .slice(0, 5) as string[]
  const totalQty = order.processedItems.reduce((s, i) => s + i.quantity, 0)
  const extra = order.processedItems.length > 5 ? order.processedItems.length - 5 : 0
  const total = parseFloat(order.totalPriceSet.shopMoney.amount)
  const date = new Date(order.createdAt).toLocaleDateString("en-GB", {
    day: "numeric", month: "short", year: "numeric",
  })

  return (
    <button
      onClick={onClick}
      className="group w-full text-left bg-white border border-border rounded-xl p-5 shadow-sm hover:shadow-md hover:border-zinc-300 transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-ring/30"
    >
      <div className="flex items-start justify-between mb-3">
        <div>
          <p className="font-semibold text-[15px] text-foreground group-hover:underline">{order.name}</p>
          <p className="text-[13px] text-muted-foreground mt-0.5">
            {date} &bull; {totalQty} item{totalQty !== 1 ? "s" : ""}
          </p>
        </div>
        <p className="font-semibold text-[15px] text-foreground">£{total.toFixed(2)}</p>
      </div>
      <div className="flex items-center gap-1.5 mt-3">
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

// ─── Order Row (list view) ────────────────────────────────────────────────────
function OrderRow({ order, onClick }: { order: Order; onClick: () => void }) {
  const images = order.processedItems.map(i => i.image?.url).filter(Boolean).slice(0, 3) as string[]
  const total = parseFloat(order.totalPriceSet.shopMoney.amount)
  const date = new Date(order.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })
  const totalQty = order.processedItems.reduce((s, i) => s + i.quantity, 0)

  return (
    <button
      onClick={onClick}
      className="w-full px-5 py-4 flex items-center gap-4 hover:bg-zinc-50 transition-colors text-left group border-b border-border last:border-0"
    >
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
        <p className="text-xs text-muted-foreground">{date} &bull; {totalQty} items</p>
      </div>
      <p className="font-semibold text-sm w-16 text-right">£{total.toFixed(2)}</p>
      <ChevronRight className="size-4 text-muted-foreground flex-shrink-0" />
    </button>
  )
}

// ─── Order Detail ─────────────────────────────────────────────────────────────
function OrderDetail({ order, onBack }: { order: Order; onBack: () => void }) {
  const [policyAccepted, setPolicyAccepted] = useState(false)
  const [selectedItems, setSelectedItems] = useState<
    Record<string, { selected: boolean; quantity: number; reason: string; description: string }>
  >({})
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  const eligibleItems = order.processedItems.filter(i => i.returnStatus === "Eligible")
  const ineligibleItems = order.processedItems.filter(i => i.returnStatus !== "Eligible")

  const total = parseFloat(order.totalPriceSet.shopMoney.amount)
  const totalQty = order.processedItems.reduce((s, i) => s + i.quantity, 0)
  const pricePerItem = totalQty > 0 ? total / totalQty : 0

  const selectedCount = Object.values(selectedItems).filter(v => v.selected).length
  const estimatedRefund = Object.entries(selectedItems)
    .filter(([, v]) => v.selected)
    .reduce((sum, [id, v]) => {
      const item = order.processedItems.find(i => i.id === id)
      return sum + (item ? pricePerItem * v.quantity : 0)
    }, 0)

  const canSubmit =
    selectedCount > 0 &&
    policyAccepted &&
    Object.entries(selectedItems)
      .filter(([, v]) => v.selected)
      .every(([, v]) => v.reason && (v.reason !== "OTHER" || v.description.trim().length > 0))

  const submitReturn = async () => {
    const items = Object.entries(selectedItems)
      .filter(([, v]) => v.selected)
      .map(([lineItemId, v]) => ({ lineItemId, quantity: v.quantity, reason: v.reason, description: v.description }))
    if (!items.length) return
    setSubmitting(true)
    setSubmitError(null)
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
        setSubmitError(result.error || "Something went wrong. Please try again.")
      }
    } catch {
      setSubmitError("Network error. Please try again.")
    } finally {
      setSubmitting(false)
    }
  }

  const orderStatusUrl = `https://account.iblazevape.co.uk/orders/${order.id.split("/").pop()}`
  const date = new Date(order.createdAt).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" })

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
    <div className="space-y-5 max-w-5xl">
      <Button variant="ghost" size="sm" onClick={onBack} className="-ml-2 text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" /> Back to Orders
      </Button>

      {/* Order header */}
      <Card>
        <CardContent className="p-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-lg font-semibold">{order.name}</h2>
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
                  : date}
              </p>
              <p className="text-sm font-semibold mt-1">£{total.toFixed(2)} GBP &bull; {totalQty} item{totalQty !== 1 ? "s" : ""}</p>
            </div>
            <a href={orderStatusUrl} target="_blank" rel="noopener noreferrer">
              <Button variant="outline" size="sm">
                <ExternalLink className="size-4" /> View Order Status
              </Button>
            </a>
          </div>
          <Separator className="my-4" />
          <div className="flex items-start gap-2 text-sm text-muted-foreground bg-muted/30 rounded-lg p-3">
            <Info className="size-4 mt-0.5 flex-shrink-0" />
            <p>Unwanted items can be returned within <strong className="text-foreground">30 days</strong> from delivery. Return postage is at your expense (tracked service required).</p>
          </div>
        </CardContent>
      </Card>

      {/* Hygiene policy gate — Alert style */}
      {!policyAccepted && (
        <Alert>
          <ShieldCheck className="size-4" />
          <AlertTitle>Hygiene &amp; Returns Policy</AlertTitle>
          <AlertDescription className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mt-1">
            <span>Review and accept our returns policy before selecting items to return.</span>
            <HygienePolicy
              onAccept={() => setPolicyAccepted(true)}
              onDecline={() => setPolicyAccepted(false)}
            />
          </AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 items-start">
        {/* Left: items */}
        <div className="lg:col-span-2 space-y-4">

          {/* Eligible */}
          {eligibleItems.length > 0 && (
            <Card>
              <CardHeader className="pb-3 pt-4 px-5">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  Select items to return
                  <Badge className="bg-green-100 text-green-700 border-0 ml-auto text-xs font-medium">
                    {eligibleItems.length} eligible
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0 divide-y divide-border">
                {eligibleItems.map(item => {
                  const sel = selectedItems[item.id]
                  const isLocked = !policyAccepted
                  const pUrl = productUrl(item.productHandle)
                  return (
                    <div key={item.id} className={cn("p-5 transition-colors", sel?.selected && "bg-muted/20")}>
                      <div className="flex items-start gap-3">
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
                          className="mt-1 shrink-0"
                        />
                        {/* Product image — links to product page */}
                        <a href={pUrl} target="_blank" rel="noopener noreferrer" className="relative shrink-0 block">
                          <div className="size-14 rounded-lg overflow-hidden bg-white border border-border">
                            {item.image?.url && (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={item.image.url} alt={item.title} className="w-full h-full object-contain p-0.5" />
                            )}
                          </div>
                          {/* Quantity badge */}
                          <span className="absolute -top-2 -right-2 bg-foreground text-white text-[10px] font-bold min-w-[18px] h-[18px] flex items-center justify-center rounded-full ring-2 ring-white z-10">
                            {item.quantity}
                          </span>
                        </a>
                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between items-start gap-2">
                            <div className="min-w-0">
                              <a href={pUrl} target="_blank" rel="noopener noreferrer"
                                className="text-[15px] font-semibold text-foreground hover:underline block truncate">
                                {item.title}
                              </a>
                              {item.variant?.title && item.variant.title !== "Default Title" && (
                                <p className="text-[13px] text-muted-foreground mt-0.5">{item.variant.title}</p>
                              )}
                            </div>
                          </div>
                          {isLocked && (
                            <p className="text-xs text-muted-foreground mt-1 italic">Accept policy to select</p>
                          )}
                        </div>
                      </div>

                      {/* Controls when selected */}
                      {sel?.selected && (
                        <div className="mt-4 ml-10 bg-zinc-50 border border-border rounded-xl p-4 space-y-4">
                          <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                              <label className="text-xs font-semibold uppercase tracking-wide text-foreground">Quantity</label>
                              <Select
                                value={String(sel.quantity)}
                                onValueChange={val => setSelectedItems(prev => ({ ...prev, [item.id]: { ...prev[item.id], quantity: parseInt(val) } }))}
                              >
                                <SelectTrigger className="h-9 text-sm bg-white">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {Array.from({ length: item.quantity }, (_, i) => (
                                    <SelectItem key={i + 1} value={String(i + 1)}>{i + 1}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="space-y-1.5">
                              <label className="text-xs font-semibold uppercase tracking-wide text-foreground">Reason</label>
                              <Select
                                value={sel.reason}
                                onValueChange={val => setSelectedItems(prev => ({ ...prev, [item.id]: { ...prev[item.id], reason: val, description: "" } }))}
                              >
                                <SelectTrigger className="h-9 text-sm bg-white">
                                  <SelectValue placeholder="Select..." />
                                </SelectTrigger>
                                <SelectContent>
                                  {RETURN_REASONS.map(r => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                          {sel.reason === "OTHER" && (
                            <div className="space-y-1.5">
                              <label className="text-xs font-semibold uppercase tracking-wide text-foreground">
                                Please describe <span className="text-destructive">*</span>
                              </label>
                              <Textarea
                                value={sel.description}
                                onChange={e => setSelectedItems(prev => ({ ...prev, [item.id]: { ...prev[item.id], description: e.target.value } }))}
                                placeholder="Describe your reason..."
                                className="text-sm bg-white"
                                rows={2}
                              />
                            </div>
                          )}
                          {sel.reason && sel.reason !== "OTHER" && (
                            <div className="space-y-1.5">
                              <label className="text-xs font-semibold uppercase tracking-wide text-foreground">
                                Additional notes <span className="text-muted-foreground font-normal normal-case">(optional)</span>
                              </label>
                              <Textarea
                                value={sel.description}
                                onChange={e => setSelectedItems(prev => ({ ...prev, [item.id]: { ...prev[item.id], description: e.target.value } }))}
                                placeholder="Any additional information..."
                                className="text-sm bg-white"
                                rows={2}
                              />
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )
                })}
              </CardContent>
            </Card>
          )}

          {/* Ineligible */}
          {ineligibleItems.length > 0 && (
            <Card>
              <CardHeader className="pb-3 pt-4 px-5">
                <CardTitle className="text-sm font-semibold">
                  {ineligibleItems.length} item{ineligibleItems.length !== 1 ? "s" : ""} in this order aren&apos;t eligible for return.
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0 divide-y divide-border">
                {ineligibleItems.map(item => {
                  const pUrl = productUrl(item.productHandle)
                  const reasonLabel =
                    item.returnStatus === "On its way" ? "On its way" :
                    item.returnStatus === "Not yet dispatched" ? "Not dispatched" :
                    item.returnStatus === "Passed the return window" ? "Window expired" :
                    item.returnStatus
                  return (
                    <div key={item.id} className="flex items-center justify-between p-4 gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        {/* Image with qty badge — links to product */}
                        <a href={pUrl} target="_blank" rel="noopener noreferrer" className="relative shrink-0 block">
                          <div className="size-12 rounded-lg border border-border bg-white overflow-hidden">
                            {item.image?.url && (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={item.image.url} alt={item.title} className="w-full h-full object-contain p-0.5" />
                            )}
                          </div>
                          <span className="absolute -top-2 -right-2 bg-foreground text-white text-[10px] font-bold min-w-[18px] h-[18px] flex items-center justify-center rounded-full ring-2 ring-white z-10">
                            {item.quantity}
                          </span>
                        </a>
                        <div className="min-w-0">
                          <a href={pUrl} target="_blank" rel="noopener noreferrer"
                            className="text-sm font-semibold text-foreground hover:underline block truncate">
                            {item.title}
                          </a>
                          {item.variant?.title && item.variant.title !== "Default Title" && (
                            <p className="text-xs text-muted-foreground mt-0.5">{item.variant.title}</p>
                          )}
                          {/* Reason on mobile */}
                          <div className="flex items-center gap-1 mt-1 sm:hidden">
                            <AlertTriangle className="size-3 text-amber-500 shrink-0" />
                            <p className="text-xs text-muted-foreground">{reasonLabel}</p>
                          </div>
                        </div>
                      </div>
                      <span className="hidden sm:block text-sm text-muted-foreground whitespace-nowrap shrink-0 ml-2">
                        {reasonLabel}
                      </span>
                    </div>
                  )
                })}
              </CardContent>
            </Card>
          )}

          {eligibleItems.length === 0 && ineligibleItems.length === 0 && (
            <Card>
              <CardContent className="p-8 text-center text-sm text-muted-foreground">
                No items found for this order.
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right: sticky sidebar */}
        <div className="lg:col-span-1">
          <div className="lg:sticky lg:top-6 space-y-4">

            {/* Order Status */}
            <Card>
              <CardContent className="p-5 space-y-3">
                <div>
                  <h3 className="font-semibold text-foreground">Order Status &amp; Tracker</h3>
                  <p className="text-xs text-muted-foreground mt-1">View your live order status securely via Shopify.</p>
                </div>
                <a href={orderStatusUrl} target="_blank" rel="noopener noreferrer" className="block">
                  <Button variant="outline" className="w-full">View Order Status</Button>
                </a>
              </CardContent>
            </Card>

            {/* Refund Estimator */}
            <Card>
              <CardHeader className="pb-3 pt-4 px-5">
                <CardTitle className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
                  Refund Estimator
                </CardTitle>
              </CardHeader>
              <CardContent className="px-5 pb-5 space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{selectedCount} item{selectedCount !== 1 ? "s" : ""} selected</span>
                  <span className="font-medium">£{estimatedRefund.toFixed(2)}</span>
                </div>
                <Separator />
                <div className="flex justify-between font-semibold">
                  <span className="text-sm">Estimated total</span>
                  <span className="text-[#E5403B] text-base">£{estimatedRefund.toFixed(2)}</span>
                </div>

                {selectedCount === 0 && (
                  <p className="text-xs text-center text-muted-foreground">Select items above to see your refund estimate</p>
                )}

                {submitError && (
                  <div className="flex items-start gap-2 p-3 rounded-lg bg-destructive/10 text-xs text-destructive">
                    <XCircle className="size-4 shrink-0 mt-0.5" />
                    {submitError}
                  </div>
                )}

                <div className="space-y-2 pt-1">
                  <Button
                    className="w-full bg-[#E5403B] hover:bg-[#cc3935] text-white disabled:opacity-50"
                    disabled={!canSubmit || submitting}
                    onClick={submitReturn}
                  >
                    {submitting ? <><Spinner className="size-4" />Submitting...</> : <><RotateCcw className="size-4" />Submit Return Request</>}
                  </Button>
                  {!policyAccepted && eligibleItems.length > 0 && (
                    <p className="text-xs text-center text-muted-foreground">Accept the returns policy to continue</p>
                  )}
                  <Button variant="ghost" className="w-full text-muted-foreground" onClick={onBack}>
                    Cancel
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Order summary */}
            <Card>
              <CardContent className="p-5 space-y-2 text-sm">
                <p className="font-semibold">Order Summary</p>
                <div className="flex justify-between text-muted-foreground">
                  <span>Total paid</span>
                  <span className="font-medium text-foreground">£{total.toFixed(2)} GBP</span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>Items</span>
                  <span>{totalQty}</span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>Eligible to return</span>
                  <span className="text-green-600 font-medium">{eligibleItems.length}</span>
                </div>
              </CardContent>
            </Card>

          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Main Dashboard ────────────────────────────────────────────────────────────
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
                  <p className="text-sm text-muted-foreground mt-0.5">
                    Select an order to view details or initiate a return.
                  </p>
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
                  <XCircle className="size-5 shrink-0" />{error}
                </div>
              )}

              {!error && filteredOrders.length === 0 && (
                <div className="text-center py-20">
                  <ShoppingBag className="size-12 text-muted-foreground/30 mx-auto mb-4" />
                  <p className="font-medium text-muted-foreground">No orders found</p>
                  <p className="text-sm text-muted-foreground/60 mt-1">Orders placed with this account will appear here</p>
                </div>
              )}

              {view === "grid" && (
                <div className="grid grid-cols-2 md:grid-cols-2 xl:grid-cols-3 gap-4">
                  {filteredOrders.map(o => <OrderCard key={o.id} order={o} onClick={() => setSelectedOrder(o)} />)}
                </div>
              )}
              {view === "list" && (
                <Card>
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
