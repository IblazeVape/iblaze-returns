"use client"

import { useEffect, useState } from "react"
import {
  ChevronRight, LayoutGrid, List, ArrowLeft,
  RotateCcw, ExternalLink, CheckCircle2,
  XCircle, Info, ShoppingBag, AlertTriangle,
  ShieldCheck
} from "lucide-react"
import { AppSidebar } from "@/components/app-sidebar"
import { SiteHeader } from "@/components/site-header"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { cn } from "@/lib/utils"

type ReturnStatus = "Eligible" | "Not yet dispatched" | "On its way" | "Passed the return window"

interface LineItem {
  id: string
  title: string
  quantity: number
  returnStatus: ReturnStatus
  returnReason?: string
  image?: { url: string }
  variant?: { title: string }
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

// ─── Authenticating Screen ─────────────────────────────────────────────────
function AuthenticatingScreen() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#FAFAFA] gap-4">
      <div className="flex flex-col items-center gap-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="https://cdn.shopify.com/s/files/1/0941/5383/4761/files/IblazeLogo.png?v=14858"
          className="h-10 w-10 object-contain animate-pulse"
          alt="iBlaze"
        />
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <ShieldCheck className="size-4 text-[#E5403B]" />
          Authenticating securely...
        </div>
      </div>
    </div>
  )
}

// ─── Order Card (matches screenshot design) ────────────────────────────────
function OrderCard({ order, onClick }: { order: Order; onClick: () => void }) {
  const images = order.processedItems
    .map(i => i.image?.url)
    .filter(Boolean)
    .filter((url, idx, arr) => arr.indexOf(url) === idx) // dedupe
    .slice(0, 5) as string[]
  const totalLineItems = order.processedItems.length
  const extra = totalLineItems > 5 ? totalLineItems - 5 : 0
  const total = parseFloat(order.totalPriceSet.shopMoney.amount)
  const date = new Date(order.createdAt).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  })
  const itemCount = order.processedItems.reduce((s, i) => s + i.quantity, 0)

  return (
    <button
      onClick={onClick}
      className="group w-full text-left bg-white border border-border rounded-xl p-5 shadow-sm hover:shadow-md hover:border-zinc-300 transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-ring/30"
    >
      {/* Header row */}
      <div className="flex items-start justify-between mb-3">
        <div>
          <p className="font-semibold text-[15px] text-foreground group-hover:underline">
            {order.name}
          </p>
          <p className="text-[13px] text-muted-foreground mt-0.5">
            {date} &bull; {itemCount} item{itemCount !== 1 ? "s" : ""}
          </p>
        </div>
        <p className="font-semibold text-[15px] text-foreground">£{total.toFixed(2)}</p>
      </div>

      {/* Product images */}
      <div className="flex items-center gap-1.5 mt-3">
        {images.map((url, i) => (
          // eslint-disable-next-line @next/next/no-img-element
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

// ─── Order Row (list view) ─────────────────────────────────────────────────
function OrderRow({ order, onClick }: { order: Order; onClick: () => void }) {
  const images = order.processedItems.map(i => i.image?.url).filter(Boolean).slice(0, 3) as string[]
  const total = parseFloat(order.totalPriceSet.shopMoney.amount)
  const date = new Date(order.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })
  const itemCount = order.processedItems.reduce((s, i) => s + i.quantity, 0)

  return (
    <button
      onClick={onClick}
      className="w-full px-5 py-4 flex items-center gap-4 hover:bg-zinc-50 transition-colors text-left group border-b border-border last:border-0"
    >
      <div className="flex -space-x-2">
        {images.map((url, i) => (
          // eslint-disable-next-line @next/next/no-img-element
          <div key={i} className="size-9 rounded-lg border-2 border-white bg-white overflow-hidden shadow-sm">
            <img src={url} alt="" className="w-full h-full object-contain" />
          </div>
        ))}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-sm group-hover:underline">{order.name}</p>
        <p className="text-xs text-muted-foreground">{date} &bull; {itemCount} items</p>
      </div>
      <p className="font-semibold text-sm w-16 text-right">£{total.toFixed(2)}</p>
      <ChevronRight className="size-4 text-muted-foreground flex-shrink-0" />
    </button>
  )
}

// ─── Hygiene Policy Drawer ─────────────────────────────────────────────────
function HygienePolicyDrawer({
  accepted,
  onAccept,
  onDecline,
}: {
  accepted: boolean
  onAccept: () => void
  onDecline: () => void
}) {
  const [open, setOpen] = useState(false)

  if (accepted) return null

  return (
    <Card className="border-amber-200 bg-amber-50/50">
      <CardContent className="p-4 flex items-start gap-3">
        <ShieldCheck className="size-5 text-amber-600 flex-shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-amber-900">Review Return Policy</p>
          <p className="text-xs text-amber-700 mt-0.5">
            You must accept our returns policy before selecting items.
          </p>
        </div>
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button size="sm" className="bg-[#E5403B] hover:bg-[#cc3935] text-white flex-shrink-0">
              View &amp; Accept
            </Button>
          </SheetTrigger>
          <SheetContent side="bottom" className="max-h-[80vh] overflow-y-auto rounded-t-2xl">
            <SheetHeader className="pb-4">
              <SheetTitle className="flex items-center gap-2">
                <ShieldCheck className="size-5 text-[#E5403B]" />
                iBlaze Returns Policy
              </SheetTitle>
            </SheetHeader>
            <div className="space-y-4 pb-6">
              <p className="text-sm text-muted-foreground">
                Please review the following terms before initiating a return.
              </p>
              {[
                {
                  title: "Vape Kits & Mods",
                  desc: "30-day refund period for unwanted items. 30-day warranty for faulty items from date of delivery.",
                },
                {
                  title: "Batteries & Chargers",
                  desc: "60-day warranty on batteries. 30-day warranty on chargers from date of delivery.",
                },
                {
                  title: "E-Liquids & Disposables",
                  desc: "Must strictly remain sealed and unopened. Opened e-liquids or disposables cannot be returned for hygiene and safety reasons.",
                },
                {
                  title: "Tanks & Clearomisers",
                  desc: "7-day Dead On Arrival (DOA) notification window. Any faults must be reported within 7 days of delivery.",
                },
              ].map(item => (
                <div key={item.title} className="rounded-xl border bg-card p-4 space-y-1">
                  <p className="font-semibold text-sm">{item.title}</p>
                  <p className="text-sm text-muted-foreground">{item.desc}</p>
                </div>
              ))}
              <div className="rounded-xl border bg-muted/40 p-4 text-xs text-muted-foreground space-y-1">
                <p>• Return postage is at your expense. A tracked service is required.</p>
                <p>• Items must be in original packaging where possible.</p>
                <p>• Refunds processed within 5–10 business days of receiving the return.</p>
              </div>
              <div className="flex gap-3 pt-2">
                <Button
                  className="flex-1 bg-[#E5403B] hover:bg-[#cc3935] text-white"
                  onClick={() => { onAccept(); setOpen(false) }}
                >
                  <CheckCircle2 className="size-4" />
                  I Accept — Continue
                </Button>
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => { onDecline(); setOpen(false) }}
                >
                  Decline
                </Button>
              </div>
            </div>
          </SheetContent>
        </Sheet>
      </CardContent>
    </Card>
  )
}

// ─── Order Detail ──────────────────────────────────────────────────────────
function OrderDetail({ order, onBack }: { order: Order; onBack: () => void }) {
  const [policyAccepted, setPolicyAccepted] = useState(false)
  const [policyDeclined, setPolicyDeclined] = useState(false)
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
      .map(([lineItemId, v]) => ({
        lineItemId,
        quantity: v.quantity,
        reason: v.reason,
        description: v.description,
      }))
    if (items.length === 0) return
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
          const shopifyOrderId = order.id.split("/").pop()
          window.location.href = `https://account.iblazevape.co.uk/orders/${shopifyOrderId}`
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

  const date = new Date(order.createdAt).toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  })

  const orderStatusUrl = `https://account.iblazevape.co.uk/orders/${order.id.split("/").pop()}`

  if (submitted) {
    return (
      <div className="max-w-md mx-auto py-20 text-center space-y-4 px-4">
        <div className="size-16 bg-green-50 rounded-full flex items-center justify-center mx-auto">
          <CheckCircle2 className="size-8 text-green-500" />
        </div>
        <h2 className="text-xl font-semibold">Return Requested</h2>
        <p className="text-muted-foreground text-sm">
          We&apos;ve sent you a confirmation email. Our team will review your return and be in
          touch once it&apos;s been completed.
        </p>
        <p className="text-xs text-muted-foreground">
          Redirecting you to your order page in a moment...
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-5 max-w-5xl">
      <Button
        variant="ghost"
        size="sm"
        onClick={onBack}
        className="-ml-2 text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Back to Orders
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
                      {order.displayFulfillmentStatus === "FULFILLED" ? "Shipped" :
                       order.displayFulfillmentStatus === "IN_PROGRESS" ? "In Transit" : "Processing"}
                    </Badge>
                }
              </div>
              <p className="text-sm text-muted-foreground mt-0.5">
                {order.isDelivered && order.deliveredAt
                  ? `Delivered ${new Date(order.deliveredAt).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}`
                  : date}
              </p>
              <p className="text-sm font-semibold mt-1">
                £{total.toFixed(2)} GBP &bull; {totalQty} item{totalQty !== 1 ? "s" : ""}
              </p>
            </div>
            <a href={orderStatusUrl} target="_blank" rel="noopener noreferrer">
              <Button variant="outline" size="sm">
                <ExternalLink className="size-4" />
                View Order Status
              </Button>
            </a>
          </div>
          <Separator className="my-4" />
          <div className="flex items-start gap-2 text-sm text-muted-foreground bg-muted/30 rounded-lg p-3">
            <Info className="size-4 mt-0.5 flex-shrink-0" />
            <p>
              Unwanted items can be returned within{" "}
              <strong className="text-foreground">30 days</strong> from delivery. Return postage
              is at your expense (tracked service required).
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Policy declined alert */}
      {policyDeclined && (
        <Alert className="border-destructive/50 bg-destructive/5">
          <XCircle className="size-4 text-destructive" />
          <AlertDescription className="text-destructive text-sm">
            Returns cannot be processed until you accept our returns policy. Click &quot;View &amp; Accept&quot; above to continue.
          </AlertDescription>
        </Alert>
      )}

      {/* Hygiene policy gate */}
      <HygienePolicyDrawer
        accepted={policyAccepted}
        onAccept={() => { setPolicyAccepted(true); setPolicyDeclined(false) }}
        onDecline={() => setPolicyDeclined(true)}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 space-y-4">

          {/* Eligible items */}
          {eligibleItems.length > 0 && (
            <Card>
              <CardHeader className="pb-3 pt-4 px-5">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <RotateCcw className="size-4 text-[#E5403B]" />
                  Select items to return
                  <Badge className="bg-green-100 text-green-700 border-0 ml-auto">
                    {eligibleItems.length} eligible
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0 divide-y divide-border">
                {eligibleItems.map(item => {
                  const sel = selectedItems[item.id]
                  const isLocked = !policyAccepted
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
                          className="mt-1"
                        />
                        <div className="size-14 rounded-lg overflow-hidden bg-white flex-shrink-0 border border-border">
                          {item.image?.url && (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={item.image.url}
                              alt={item.title}
                              className="w-full h-full object-contain p-0.5"
                            />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold">{item.title}</p>
                          {item.variant?.title && item.variant.title !== "Default Title" && (
                            <p className="text-xs text-muted-foreground mt-0.5">{item.variant.title}</p>
                          )}
                          <p className="text-xs text-muted-foreground mt-0.5">
                            Qty: {item.quantity}
                          </p>
                        </div>
                        {isLocked && (
                          <span className="text-xs text-muted-foreground italic shrink-0">
                            Accept policy first
                          </span>
                        )}
                      </div>

                      {sel?.selected && (
                        <div className="mt-4 ml-10 space-y-3">
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="text-xs font-medium block mb-1.5">Quantity</label>
                              <Select
                                value={String(sel.quantity)}
                                onValueChange={val =>
                                  setSelectedItems(prev => ({
                                    ...prev,
                                    [item.id]: { ...prev[item.id], quantity: parseInt(val) },
                                  }))
                                }
                              >
                                <SelectTrigger className="h-9 text-sm">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {Array.from({ length: item.quantity }, (_, i) => (
                                    <SelectItem key={i + 1} value={String(i + 1)}>
                                      {i + 1}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            <div>
                              <label className="text-xs font-medium block mb-1.5">Reason</label>
                              <Select
                                value={sel.reason}
                                onValueChange={val =>
                                  setSelectedItems(prev => ({
                                    ...prev,
                                    [item.id]: { ...prev[item.id], reason: val, description: "" },
                                  }))
                                }
                              >
                                <SelectTrigger className="h-9 text-sm">
                                  <SelectValue placeholder="Select reason..." />
                                </SelectTrigger>
                                <SelectContent>
                                  {RETURN_REASONS.map(r => (
                                    <SelectItem key={r.value} value={r.value}>
                                      {r.label}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                          {sel.reason === "OTHER" && (
                            <div>
                              <label className="text-xs font-medium block mb-1.5">
                                Please describe <span className="text-destructive">*</span>
                              </label>
                              <Textarea
                                value={sel.description}
                                onChange={e =>
                                  setSelectedItems(prev => ({
                                    ...prev,
                                    [item.id]: { ...prev[item.id], description: e.target.value },
                                  }))
                                }
                                placeholder="Please describe your reason..."
                                className="text-sm"
                                rows={2}
                              />
                            </div>
                          )}
                          {sel.reason && sel.reason !== "OTHER" && (
                            <div>
                              <label className="text-xs font-medium block mb-1.5">
                                Additional notes{" "}
                                <span className="text-muted-foreground font-normal">(optional)</span>
                              </label>
                              <Textarea
                                value={sel.description}
                                onChange={e =>
                                  setSelectedItems(prev => ({
                                    ...prev,
                                    [item.id]: { ...prev[item.id], description: e.target.value },
                                  }))
                                }
                                placeholder="Any additional information..."
                                className="text-sm"
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

          {/* Ineligible items — matches screenshot 2 */}
          {ineligibleItems.length > 0 && (
            <Card>
              <CardHeader className="pb-3 pt-4 px-5">
                <CardTitle className="text-sm font-semibold text-foreground">
                  {ineligibleItems.length} item{ineligibleItems.length !== 1 ? "s" : ""} in this order aren&apos;t eligible for return.
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0 divide-y divide-border">
                {ineligibleItems.map(item => (
                  <div key={item.id} className="flex items-center justify-between p-4">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="relative shrink-0">
                        <div className="size-12 rounded-lg border border-border bg-white overflow-hidden">
                          {item.image?.url && (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={item.image.url}
                              alt={item.title}
                              className="w-full h-full object-contain p-0.5"
                            />
                          )}
                        </div>
                        <span className="absolute -top-2 -right-2 bg-foreground text-white text-[10px] font-bold min-w-[18px] h-[18px] flex items-center justify-center rounded-full ring-2 ring-white">
                          {item.quantity}
                        </span>
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold truncate">{item.title}</p>
                        {item.variant?.title && item.variant.title !== "Default Title" && (
                          <p className="text-xs text-muted-foreground mt-0.5">{item.variant.title}</p>
                        )}
                        {/* Show reason inline on hover/small screens */}
                        <div className="flex items-center gap-1 mt-1 sm:hidden">
                          <AlertTriangle className="size-3 text-amber-500 flex-shrink-0" />
                          <p className="text-xs text-muted-foreground">
                            {item.returnReason ||
                              (item.returnStatus === "On its way"
                                ? "On its way"
                                : item.returnStatus === "Not yet dispatched"
                                ? "Not yet dispatched"
                                : "Return window passed")}
                          </p>
                        </div>
                      </div>
                    </div>
                    {/* Right side reason label — matches screenshot */}
                    <span className="hidden sm:block text-sm text-muted-foreground whitespace-nowrap ml-4 shrink-0">
                      {item.returnStatus === "On its way"
                        ? "On its way"
                        : item.returnStatus === "Not yet dispatched"
                        ? "Not dispatched"
                        : item.returnStatus === "Passed the return window"
                        ? "Window expired"
                        : item.returnStatus}
                    </span>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {eligibleItems.length === 0 && ineligibleItems.length === 0 && (
            <Card>
              <CardContent className="p-8 text-center text-muted-foreground text-sm">
                No items found for this order.
              </CardContent>
            </Card>
          )}
        </div>

        {/* Refund Estimator sidebar */}
        <div className="lg:col-span-1">
          <div className="lg:sticky lg:top-6 space-y-4">
            <Card>
              <CardHeader className="pb-3 pt-4 px-5">
                <CardTitle className="text-sm flex items-center gap-2">
                  <RotateCcw className="size-4 text-[#E5403B]" />
                  Refund Estimator
                </CardTitle>
              </CardHeader>
              <CardContent className="px-5 pb-5 space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">
                    {selectedCount} item{selectedCount !== 1 ? "s" : ""} selected
                  </span>
                  <span className="font-medium">£{estimatedRefund.toFixed(2)}</span>
                </div>
                <Separator />
                <div className="flex justify-between text-sm font-semibold">
                  <span>Estimated refund</span>
                  <span className="text-[#E5403B] text-base">£{estimatedRefund.toFixed(2)}</span>
                </div>

                {selectedCount === 0 && (
                  <p className="text-xs text-muted-foreground text-center py-1">
                    Select eligible items above to estimate your refund
                  </p>
                )}

                {submitError && (
                  <div className="flex items-start gap-2 p-3 rounded-lg bg-destructive/10 text-xs text-destructive">
                    <XCircle className="size-4 flex-shrink-0 mt-0.5" />
                    {submitError}
                  </div>
                )}

                <div className="space-y-2 pt-1">
                  <Button
                    className="w-full bg-[#E5403B] hover:bg-[#cc3935] text-white disabled:opacity-50"
                    disabled={!canSubmit || submitting}
                    onClick={submitReturn}
                  >
                    {submitting ? "Submitting..." : <><RotateCcw className="size-4" />Submit Return Request</>}
                  </Button>
                  {!policyAccepted && eligibleItems.length > 0 && (
                    <p className="text-xs text-center text-muted-foreground">
                      Accept the returns policy to continue
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>

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
      .then(d => {
        if (d.error) setError(d.error)
        else setData(d)
      })
      .catch(() => setError("Failed to load orders."))
      .finally(() => setLoading(false))
  }, [])

  const filteredOrders = (data?.orders || []).filter(o =>
    o.name.toLowerCase().includes(search.toLowerCase())
  )

  const user = { name: data?.firstName || "Customer", email: data?.email || "" }
  const headerTitle = selectedOrder ? selectedOrder.name : "My Orders"

  if (loading) return <AuthenticatingScreen />

  return (
    <SidebarProvider
      style={{ "--sidebar-width": "18rem", "--header-height": "3rem" } as React.CSSProperties}
    >
      <AppSidebar
        variant="inset"
        user={user}
        onNavigate={section => { setActiveSection(section); setSelectedOrder(null) }}
        activeSection={activeSection}
      />
      <SidebarInset>
        <SiteHeader
          title={headerTitle}
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
              {/* Page header */}
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
                  <Button
                    variant="ghost"
                    size="icon"
                    className={cn("size-7", view === "grid" && "bg-background shadow-sm")}
                    onClick={() => setView("grid")}
                  >
                    <LayoutGrid className="size-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className={cn("size-7", view === "list" && "bg-background shadow-sm")}
                    onClick={() => setView("list")}
                  >
                    <List className="size-4" />
                  </Button>
                </div>
              </div>

              {error && (
                <div className="flex items-center gap-3 p-4 rounded-xl bg-destructive/10 text-sm text-destructive">
                  <XCircle className="size-5 flex-shrink-0" />
                  {error}
                </div>
              )}

              {!error && filteredOrders.length === 0 && !loading && (
                <div className="text-center py-20">
                  <ShoppingBag className="size-12 text-muted-foreground/30 mx-auto mb-4" />
                  <p className="font-medium text-muted-foreground">No orders found</p>
                  <p className="text-sm text-muted-foreground/60 mt-1">
                    Orders placed with this account will appear here
                  </p>
                </div>
              )}

              {/* Grid view — matches screenshot 3 */}
              {view === "grid" && (
                <div className="grid grid-cols-2 md:grid-cols-2 xl:grid-cols-3 gap-4">
                  {filteredOrders.map(order => (
                    <OrderCard
                      key={order.id}
                      order={order}
                      onClick={() => setSelectedOrder(order)}
                    />
                  ))}
                </div>
              )}

              {/* List view */}
              {view === "list" && (
                <Card>
                  <CardContent className="p-0">
                    {filteredOrders.map(order => (
                      <OrderRow
                        key={order.id}
                        order={order}
                        onClick={() => setSelectedOrder(order)}
                      />
                    ))}
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
