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
      <Badge variant="secondary" className="gap-2 px-4 py-2 text-sm border border-zinc-200 shadow-sm bg-white text-zinc-900">
        <Spinner className="size-4 animate-spin text-zinc-900" />
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
    <Button size="sm" className="bg-[#09090B] hover:bg-zinc-800 text-white shrink-0 shadow-sm focus:ring-zinc-200">
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
        <div key={p.title} className="rounded-lg border border-zinc-200 bg-zinc-50 p-3 space-y-0.5">
          <p className="font-semibold text-foreground text-xs">{p.title}</p>
          <p className="text-xs">{p.desc}</p>
        </div>
      ))}
      <p className="text-xs text-muted-foreground pt-1 leading-relaxed">
        Return postage is at your expense. A tracked service is required. Refunds processed within 5–10 business days.
      </p>
    </div>
  )

  const footer = (
    <div className="flex gap-2 pt-2 w-full">
      <Button className="flex-1 bg-[#09090B] hover:bg-zinc-800 text-white" onClick={handleAccept}>
        <CheckCircle2 className="size-4 mr-1.5" /> I Accept
      </Button>
      <Button variant="outline" className="flex-1 border-zinc-200" onClick={handleDecline}>
        Decline
      </Button>
    </div>
  )

  if (isDesktop) {
    return (
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>{trigger}</DialogTrigger>
        <DialogContent className="sm:max-w-md rounded-xl border border-zinc-200 shadow-saas">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-sm font-semibold tracking-wide uppercase text-zinc-500">
              <ShieldCheck className="size-4 text-zinc-900" /> Hygiene &amp; Returns Policy
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
      <DrawerContent className="rounded-t-xl border-t border-zinc-200">
        <DrawerHeader>
          <DrawerTitle className="flex items-center gap-2 text-sm font-semibold tracking-wide uppercase text-zinc-500">
            <ShieldCheck className="size-4 text-zinc-900" /> Hygiene &amp; Returns Policy
          </DrawerTitle>
        </DrawerHeader>
        <div className="px-4 pb-2">{body}</div>
        <DrawerFooter className="pt-2 gap-2">
          {footer}
          <DrawerClose asChild>
            <Button variant="ghost" size="sm" className="text-zinc-500">Cancel</Button>
          </DrawerClose>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  )
}

// ─── Order Card (Grid View) ──────────────────────────────────────────────────
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
      className="group w-full text-left bg-white border border-zinc-200 rounded-xl p-5 shadow-saas hover:shadow-saas-hover hover:border-zinc-300 transition-all duration-150 focus:outline-none focus:ring-4 focus:ring-zinc-100"
    >
      <div className="flex items-start justify-between mb-3 w-full">
        <div>
          <p className="font-semibold text-[15px] text-zinc-900 group-hover:underline transition-all decoration-1">Order {order.name}</p>
          <p className="text-[13px] text-muted-foreground mt-1">
            {date} &bull; {totalQty} item{totalQty !== 1 ? "s" : ""}
          </p>
        </div>
        <Badge variant="secondary" className="font-semibold text-sm bg-zinc-100 text-zinc-900 border-0 rounded-full px-2.5 py-0.5 shrink-0">
          £{total.toFixed(2)}
        </Badge>
      </div>
      <div className="flex items-center gap-2 mt-4 flex-wrap">
        {uniqueImages.map((url, i) => (
          <div key={i} className="w-10 h-10 rounded-md border border-zinc-200 bg-white overflow-hidden shrink-0 shadow-xs">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={url} alt="" className="w-full h-full object-contain p-0.5" />
          </div>
        ))}
        {extra > 0 && (
          <div className="w-10 h-10 rounded-md border border-zinc-200 bg-zinc-50 flex items-center justify-center shrink-0">
            <span className="text-[11px] font-bold text-zinc-500">+{extra}</span>
          </div>
        )}
      </div>
    </button>
  )
}

// ─── Order Row (List View) ────────────────────────────────────────────────────
function OrderRow({ order, onClick }: { order: Order; onClick: () => void }) {
  const images = order.processedItems.map(i => i.image?.url).filter(Boolean).slice(0, 3) as string[]
  const total = parseFloat(order.totalPriceSet.shopMoney.amount)
  const date = new Date(order.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })
  const totalQty = order.processedItems.reduce((s, i) => s + i.quantity, 0)

  return (
    <button
      onClick={onClick}
      className="w-full px-5 py-4 flex items-center gap-4 hover:bg-zinc-50/50 transition-colors text-left group border-b border-zinc-200 last:border-0 focus:outline-none"
    >
      <div className="flex -space-x-2 shrink-0 my-0.5">
        {images.map((url, i) => (
          <div key={i} className="w-9 h-9 rounded-lg border-2 border-white bg-white overflow-hidden shadow-xs">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={url} alt="" className="w-full h-full object-contain" />
          </div>
        ))}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-sm text-zinc-900 group-hover:underline decoration-1">Order {order.name}</p>
        <p className="text-xs text-zinc-500 mt-0.5">{date} &bull; {totalQty} item{totalQty !== 1 ? "s" : ""}</p>
      </div>
      <div className="flex items-center gap-3 shrink-0">
        <p className="font-semibold text-sm text-zinc-900">£{total.toFixed(2)}</p>
        <ChevronRight className="w-4 h-4 text-zinc-400" />
      </div>
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
      <div className="max-w-md mx-auto py-24 text-center space-y-4 px-4 flex flex-col items-center justify-center">
        <div className="w-16 h-16 bg-green-50 text-green-600 rounded-full flex items-center justify-center shadow-sm ring-4 ring-green-50">
          <CheckCircle2 className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold tracking-tight">Return Requested</h2>
        <p className="text-zinc-500 text-sm leading-relaxed max-w-xs">
          We&apos;ve sent you a confirmation email. Our team will review your return and be in touch once it&apos;s been completed.
        </p>
        <p className="text-xs text-zinc-400 mt-2 animate-pulse">Redirecting to your order overview history page...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6 w-full max-w-7xl mx-auto flex flex-col">
      <div class="w-full">
        <Button variant="ghost" size="sm" onClick={onBack} className="-ml-2 text-zinc-500 hover:text-zinc-900 transition-colors gap-1.5 focus:ring-zinc-100">
          <ArrowLeft className="w-4 h-4" /> Back to Orders
        </Button>
      </div>

      {/* Overview Context Summary Header */}
      <Card className="border-zinc-200 shadow-saas overflow-hidden">
        <CardContent className="p-5 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 w-full">
            <div>
              <div class="flex items-center gap-2.5 flex-wrap">
                <h2 class="text-xl font-bold tracking-tight text-zinc-900">Order {order.name}</h2>
                {order.isDelivered ? (
                  <Badge class="bg-green-50 border border-green-200 text-green-700 font-medium rounded-full text-xs px-2.5 py-0.5">Delivered</Badge>
                ) : (
                  <Badge variant="secondary" class="bg-zinc-100 border-0 text-zinc-900 font-medium rounded-full text-xs px-2.5 py-0.5">
                    {order.displayFulfillmentStatus === "IN_PROGRESS" ? "In Transit" :
                     order.displayFulfillmentStatus === "FULFILLED" ? "Shipped" : "Processing"}
                  </Badge>
                )}
              </div>
              <p class="text-[13px] text-zinc-500 mt-1.5">
                {order.isDelivered && order.deliveredAt
                  ? `Delivered on ${new Date(order.deliveredAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}`
                  : `Placed on ${date}`}
              </p>
              <p class="text-sm font-bold text-zinc-900 mt-2">
                £{total.toFixed(2)} GBP &bull; {totalQty} item{totalQty !== 1 ? "s" : ""}
              </p>
            </div>
            <a href={orderStatusUrl} target="_blank" rel="noopener noreferrer" className="shrink-0 sm:self-center">
              <Button variant="outline" size="sm" className="border-zinc-200 text-zinc-700 hover:bg-zinc-50 shadow-sm gap-1.5">
                <ExternalLink className="w-4 h-4" /> View Order Status
              </Button>
            </a>
          </div>
          <Separator className="bg-zinc-200 my-5" />
          <div className="flex items-start gap-3 text-sm text-zinc-600 bg-zinc-50 border border-zinc-200 rounded-xl p-4 shadow-xs">
            <Info className="w-4 h-4 mt-0.5 text-zinc-500 shrink-0" />
            <p className="leading-relaxed text-[13px]">Unwanted items can be returned within <strong className="text-zinc-900 font-semibold">30 days</strong> from delivery. Return postage is at your expense (tracked service required).</p>
          </div>
        </CardContent>
      </Card>

      {/* Policy Gate Validation Bar */}
      {!policyAccepted && (
        <Alert className="bg-zinc-50 border-zinc-200 shadow-saas rounded-xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div class="flex items-start gap-3">
            <ShieldCheck className="w-5 h-5 text-zinc-900 shrink-0 mt-0.5" />
            <div>
              <AlertTitle className="text-sm font-bold text-zinc-900">Hygiene &amp; Returns Policy</AlertTitle>
              <AlertDescription className="text-xs text-zinc-500 mt-1 leading-relaxed">
                Review and accept our returns policy parameters before selecting items to return.
              </AlertDescription>
            </div>
          </div>
          <HygienePolicy
            onAccept={() => setPolicyAccepted(true)}
            onDecline={() => setPolicyAccepted(false)}
          />
        </Alert>
      )}

      {/* Main Structural Matrix Columns Grid Layout Split */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start w-full">
        
        {/* Left Column: Line Array Feeds */}
        <div className="lg:col-span-2 space-y-6 w-full min-w-0">

          {/* Eligible Block Container */}
          {eligibleItems.length > 0 && (
            <Card className="border-zinc-200 shadow-saas rounded-xl overflow-hidden">
              <CardHeader className="bg-zinc-50/50 border-b border-zinc-200 px-5 py-[0.80rem] flex flex-row items-center justify-between">
                <CardTitle className="text-sm font-bold text-zinc-900">
                  Select items to return
                </CardTitle>
                <Badge class="bg-zinc-100 border-zinc-200 text-zinc-700 rounded-full text-xs font-semibold px-2.5 py-0.5 ml-auto">
                  {eligibleItems.length} eligible
                </Badge>
              </CardHeader>
              <CardContent className="p-0 divide-y divide-zinc-200">
                {eligibleItems.map(item => {
                  const sel = selectedItems[item.id]
                  const isLocked = !policyAccepted
                  const pUrl = productUrl(item.productHandle)
                  return (
                    <div key={item.id} className={cn("p-5 transition-colors duration-150 bg-white", sel?.selected && "bg-zinc-50/50")}>
                      <div className="flex items-start gap-4 w-full">
                        <div class="pt-1.5 shrink-0">
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
                            className="w-5 h-5 rounded border-zinc-300 text-zinc-900 focus:ring-zinc-200 focus:ring-offset-0 transition-colors"
                          />
                        </div>
                        
                        <a href={pUrl} target="_blank" rel="noopener noreferrer" className="relative shrink-0 block group/img">
                          <div className="w-16 h-16 rounded-lg overflow-hidden bg-white border border-zinc-200 p-0.5 shadow-xs transition-all group-hover/img:border-zinc-400">
                            {item.image?.url && (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={item.image.url} alt={item.title} className="w-full h-full object-contain" />
                            )}
                          </div>
                          <span className="absolute -top-2 -right-2 bg-zinc-900 text-white text-[10px] font-bold min-w-[20px] h-[20px] flex items-center justify-center rounded-full ring-2 ring-white z-10 shadow-sm">
                            {item.quantity}
                          </span>
                        </a>

                        <div className="flex-1 min-w-0 pt-0.5">
                          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-1 w-full">
                            <div className="min-w-0 pr-3">
                              <a href={pUrl} target="_blank" rel="noopener noreferrer"
                                className="text-[15px] font-semibold text-zinc-900 hover:underline leading-snug block truncate">
                                {item.title}
                              </a>
                              {item.variant?.title && item.variant.title !== "Default Title" && (
                                <p className="text-[13px] text-zinc-500 mt-1 truncate">{item.variant.title}</p>
                              )}
                            </div>
                            <p className="text-[15px] font-bold text-zinc-900 shrink-0 whitespace-nowrap">£{parseFloat(item.price || "0").toFixed(2)}</p>
                          </div>
                          {isLocked && (
                            <p className="text-xs text-zinc-400 mt-1.5 italic">Accept returns policy to unlock row selection tools</p>
                          )}
                        </div>
                      </div>

                      {/* Dropdown controls — revealed seamlessly on state change */}
                      {sel?.selected && (
                        <div className="mt-4 ml-9 bg-zinc-50 border border-zinc-200 rounded-xl p-4 space-y-4 shadow-inner">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                              <label className="text-xs font-bold uppercase tracking-wider text-zinc-500">Return Quantity</label>
                              <Select
                                value={String(sel.quantity)}
                                onValueChange={val => setSelectedItems(prev => ({ ...prev, [item.id]: { ...prev[item.id], quantity: parseInt(val) } }))}
                              >
                                <SelectTrigger className="h-9 text-sm bg-white border-zinc-200 focus:ring-zinc-200 focus:border-zinc-400 cursor-pointer">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="border-zinc-200 shadow-md">
                                  {Array.from({ length: item.quantity }, (_, i) => (
                                    <SelectItem key={i + 1} value={String(i + 1)} className="cursor-pointer">{i + 1}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="space-y-1.5">
                              <label className="text-xs font-bold uppercase tracking-wider text-zinc-500">Reason for return</label>
                              <Select
                                value={sel.reason}
                                onValueChange={val => setSelectedItems(prev => ({ ...prev, [item.id]: { ...prev[item.id], reason: val, description: "" } }))}
                              >
                                <SelectTrigger className="h-9 text-sm bg-white border-zinc-200 focus:ring-zinc-200 focus:border-zinc-400 cursor-pointer">
                                  <SelectValue placeholder="Select a reason..." />
                                </SelectTrigger>
                                <SelectContent className="border-zinc-200 shadow-md">
                                  {RETURN_REASONS.map(r => <SelectItem key={r.value} value={r.value} className="cursor-pointer">{r.label}</SelectItem>)}
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                          
                          {sel.reason === "OTHER" && (
                            <div className="space-y-1.5 w-full">
                              <label className="text-xs font-bold uppercase tracking-wider text-zinc-500 flex items-center gap-1">
                                Please specify reason <span className="text-red-500 font-bold">*</span>
                              </label>
                              <Textarea
                                value={sel.description}
                                onChange={e => setSelectedItems(prev => ({ ...prev, [item.id]: { ...prev[item.id], description: e.target.value } }))}
                                placeholder="Please detail the reason for your return request..."
                                className="text-sm bg-white border-zinc-200 focus:ring-zinc-200 focus:border-zinc-400 rounded-lg shadow-sm"
                                rows={2}
                              />
                            </div>
                          )}
                          {sel.reason && sel.reason !== "OTHER" && (
                            <div className="space-y-1.5 w-full">
                              <label className="text-xs font-bold uppercase tracking-wider text-zinc-500">
                                Additional notes <span className="text-zinc-400 normal-case font-normal ms-0.5">(optional)</span>
                              </label>
                              <Textarea
                                value={sel.description}
                                onChange={e => setSelectedItems(prev => ({ ...prev, [item.id]: { ...prev[item.id], description: e.target.value } }))}
                                placeholder="Provide any additional specifications or item notes if desired..."
                                className="text-sm bg-white border-zinc-200 focus:ring-zinc-200 focus:border-zinc-400 rounded-lg shadow-sm"
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

          {/* Ineligible Block Container */}
          {ineligibleItems.length > 0 && (
            <Card className="border-zinc-200 shadow-saas rounded-xl overflow-hidden">
              <CardHeader className="bg-zinc-50/50 border-b border-zinc-200 px-5 py-[0.80rem]">
                <CardTitle className="text-sm font-bold text-zinc-700">
                  {ineligibleItems.length} item{ineligibleItems.length !== 1 ? "s" : ""} in this order aren&apos;t eligible for return.
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0 divide-y divide-zinc-200">
                {ineligibleItems.map(item => {
                  const pUrl = productUrl(item.productHandle)
                  const reasonLabel =
                    item.returnStatus === "On its way" ? "On its way" :
                    item.returnStatus === "Not yet dispatched" ? "Not dispatched" :
                    item.returnStatus === "Passed the return window" ? "Window expired" :
                    item.returnStatus
                  return (
                    <div key={item.id} className="flex items-center justify-between p-4 bg-white/50 w-full hover:bg-white transition-colors duration-150 gap-4">
                      <div className="flex items-center gap-4 min-w-0">
                        <a href={pUrl} target="_blank" rel="noopener noreferrer" className="relative shrink-0 block">
                          <div className="w-12 h-12 rounded-lg border border-zinc-200 bg-white p-0.5 shadow-xs">
                            {item.image?.url && (
                              // eslint-disable-next-line @next/next/no-img-element
                              img src={item.image.url} alt={item.title} className="w-full h-full object-contain" />
                            )}
                          </div>
                          <span className="absolute -top-2 -right-2 bg-zinc-900 text-white text-[10px] font-bold min-w-[18px] h-[18px] flex items-center justify-center rounded-full ring-2 ring-white z-10 shadow-sm">
                            {item.quantity}
                          </span>
                        </a>
                        <div className="min-w-0 pr-2">
                          <a href={pUrl} target="_blank" rel="noopener noreferrer"
                            className="text-sm font-semibold text-zinc-900 hover:underline block truncate">
                            {item.title}
                          </a>
                          {item.variant?.title && item.variant.title !== "Default Title" && (
                            <p className="text-xs text-zinc-500 mt-1 truncate">{item.variant.title}</p>
                          )}
                          <div className="flex items-center gap-1.5 mt-1.5 sm:hidden">
                            <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                            <p className="text-xs text-zinc-500 leading-none">{reasonLabel}</p>
                          </div>
                        </div>
                      </div>
                      <span className="hidden sm:block text-sm font-medium text-zinc-500 whitespace-nowrap shrink-0 ml-auto">
                        {reasonLabel}
                      </span>
                    </div>
                  )
                })}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right Column: Sticky Dashboard Controllers Container Widgets */}
        <div className="lg:col-span-1 w-full flex flex-col gap-6">
          <div className="lg:sticky lg:top-6 flex flex-col gap-6 w-full">

            {/* Tracker App Integration */}
            <Card className="border-zinc-200 shadow-saas rounded-xl overflow-hidden bg-white">
              <CardContent className="p-5 space-y-3 w-full">
                <div>
                  <h3 className="font-semibold text-sm text-zinc-900">Order Status &amp; Tracker</h3>
                  <p class="text-xs text-zinc-500 mt-1 leading-relaxed">View your live order status securely via Shopify.</p>
                </div>
                <a href={orderStatusUrl} target="_blank" rel="noopener noreferrer" className="block w-full">
                  <Button variant="outline" className="w-full border-zinc-200 text-zinc-700 hover:bg-zinc-50 shadow-sm text-sm py-2">View Order Status</Button>
                </a>
              </CardContent>
            </Card>

            {/* Live Estimator Dynamic Form Actions Invoice Board */}
            <Card className="border-zinc-200 shadow-saas rounded-xl overflow-hidden bg-white">
              <div className="bg-zinc-50/50 border-b border-zinc-200 px-5 py-4">
                <h2 className="font-bold text-xs uppercase tracking-wider text-zinc-500">
                  Refund Estimator
                </h2>
              </div>
              <CardContent className="p-5 flex flex-col w-full">
                <div className="flex justify-between items-center text-sm mb-4 w-full">
                  <span className="text-zinc-500">{selectedCount} item{selectedCount !== 1 ? "s" : ""} selected</span>
                  <span className="font-semibold text-zinc-900">£{estimatedRefund.toFixed(2)}</span>
                </div>
                <Separator class="bg-zinc-200 mb-4" />
                <div className="flex justify-between items-center font-bold mb-6 w-full">
                  <span className="text-sm uppercase tracking-wide text-zinc-900">Estimated total</span>
                  <span className="text-xl text-zinc-900">£{estimatedRefund.toFixed(2)}</span>
                </div>

                {selectedCount === 0 && (
                  <p className="text-xs text-center text-zinc-400 italic mb-4">Select individual eligible line items above to calculate estimate totals</p>
                )}

                {submitError && (
                  <div className="flex items-start gap-2 p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-800 mb-4 shadow-xs">
                    <XCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-600" />
                    <p className="leading-relaxed">{submitError}</p>
                  </div>
                )}

                <div className="flex flex-col gap-2.5 w-full pt-1">
                  <Button
                    className="w-full bg-zinc-900 hover:bg-zinc-800 text-white transition-colors disabled:opacity-40 font-medium py-2.5 text-sm rounded-lg"
                    disabled={!canSubmit || submitting}
                    onClick={submitReturn}
                  >
                    {submitting ? (
                      <><Spinner className="size-4 animate-spin text-white mr-1.5" />Submitting...</>
                    ) : (
                      <><RotateCcw className="size-4 mr-1.5" />Submit Return Request</>
                    )}
                  </Button>
                  {!policyAccepted && eligibleItems.length > 0 && (
                    <p className="text-[11px] text-center text-zinc-400 mt-0.5">Accept the required store returns policy guidelines to submit</p>
                  )}
                  <Button variant="ghost" className="w-full text-zinc-500 hover:text-zinc-900 transition-colors py-2 text-sm" onClick={onBack}>
                    Cancel
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Micro Context Statistics Snapshot Box Summary */}
            <Card className="border-zinc-200 shadow-saas rounded-xl bg-white overflow-hidden">
              <CardContent className="p-5 space-y-2.5 text-[13px] leading-none">
                <p className="font-bold text-zinc-900 text-sm pb-1">Order Summary</p>
                <div className="flex justify-between items-center w-full text-zinc-500">
                  <span>Total invoice paid</span>
                  <span className="font-medium text-zinc-900">£{total.toFixed(2)} GBP</span>
                </div>
                <div className="flex justify-between items-center w-full text-zinc-500">
                  <span>Total quantity items</span>
                  <span className="font-medium text-zinc-900">{totalQty}</span>
                </div>
                <div className="flex justify-between items-center w-full text-zinc-500">
                  <span>Items eligible for returns status</span>
                  <span className="text-green-600 font-semibold">{eligibleItems.length}</span>
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
      <SidebarInset className="bg-background flex flex-col justify-between min-h-screen">
        <div>
          <SiteHeader
            title={selectedOrder ? selectedOrder.name : "My Orders"}
            search={search}
            onSearch={setSearch}
            showSearch={!selectedOrder}
            firstName={data?.firstName}
            email={data?.email}
          />

          <div className="flex flex-1 flex-col p-4 lg:p-6 gap-6 w-full">
            {selectedOrder ? (
              <OrderDetail order={selectedOrder} onBack={() => setSelectedOrder(null)} />
            ) : (
              <>
                <div className="flex items-center justify-between gap-4 flex-wrap sm:flex-nowrap w-full">
                  <div>
                    <h2 className="text-xl font-bold tracking-tight text-zinc-900">
                      {data?.firstName ? `Hi, ${data.firstName} 👋` : "Your Recent Orders"}
                    </h2>
                    <p className="text-sm text-zinc-500 mt-1">
                      Select an active purchase sequence card to manage standard unwanted item returns history.
                    </p>
                  </div>
                  <div className="flex items-center bg-zinc-100 border border-zinc-200 p-1 rounded-lg shrink-0 shadow-xs">
                    <Button variant="ghost" size="icon" className={cn("w-7 h-7 rounded-md transition-all text-zinc-500 focus:ring-0", view === "grid" && "bg-white shadow-sm text-zinc-900 hover:bg-white")} onClick={() => setView("grid")}>
                      <LayoutGrid className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className={cn("w-7 h-7 rounded-md transition-all text-zinc-500 focus:ring-0", view === "list" && "bg-white shadow-sm text-zinc-900 hover:bg-white")} onClick={() => setView("list")}>
                      <List className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                {error && (
                  <div className="flex items-center gap-3 p-4 rounded-xl bg-red-50 border border-red-200 text-sm text-red-800 shadow-xs max-w-xl">
                    <XCircle className="w-5 h-5 shrink-0 text-red-600" />
                    <p className="font-medium leading-none">{error}</p>
                  </div>
                )}

                {!error && filteredOrders.length === 0 && (
                  <div className="text-center py-24 border border-dashed border-zinc-200 rounded-2xl bg-white shadow-xs max-w-xl mx-auto w-full">
                    <ShoppingBag className="w-10 h-10 text-zinc-300 mx-auto mb-3" />
                    <p className="font-semibold text-zinc-900 text-sm">No recent matching orders found</p>
                    <p className="text-xs text-zinc-400 mt-1 max-w-[210px] mx-auto leading-relaxed">Fulfilled purchase records linked to this email stream account directory log appear here</p>
                  </div>
                )}

                {view === "grid" && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 w-full">
                    {filteredOrders.map(o => <OrderCard key={o.id} order={o} onClick={() => setSelectedOrder(o)} />)}
                  </div>
                )}
                {view === "list" && (
                  <Card className="border-zinc-200 shadow-saas rounded-xl overflow-hidden w-full max-w-4xl">
                    <CardContent className="p-0 flex flex-col">
                      {filteredOrders.map(o => <OrderRow key={o.id} order={o} onClick={() => setSelectedOrder(o)} />)}
                    </CardContent>
                  </Card>
                )}
              </>
            )}
          </div>
        </div>

        {/* PERSISTENT FOOTER ALIGNMENT LAYER (Touches the inset right boundary smoothly) */}
        <footer className="w-full py-5 bg-surface border-t border-zinc-200 text-center text-[11px] font-medium text-zinc-400 uppercase tracking-wider shrink-0 z-10 mt-12">
          <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
             &copy; 2026 iBlaze Vape. All rights reserved.
          </div>
        </footer>
      </SidebarInset>
    </SidebarProvider>
  )
}
