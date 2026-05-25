"use client"

import { useEffect, useState } from "react"
import {
  Package, ChevronRight, LayoutGrid, List, ArrowLeft,
  RotateCcw, ExternalLink, CheckCircle2, Clock, Truck,
  XCircle, Info, ShoppingBag, Search
} from "lucide-react"
import { AppSidebar } from "@/components/app-sidebar"
import { SiteHeader } from "@/components/site-header"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Separator } from "@/components/ui/separator"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"

type ReturnStatus = "Eligible" | "Not yet dispatched" | "On its way" | "Passed the return window"

interface LineItem {
  id: string
  title: string
  quantity: number
  returnStatus: ReturnStatus
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
}

interface OrdersData {
  firstName: string
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

function getStatusBadge(status: ReturnStatus) {
  switch (status) {
    case "Eligible": return <Badge className="bg-green-100 text-green-700 border-0 hover:bg-green-100">Eligible</Badge>
    case "Not yet dispatched": return <Badge variant="secondary">Not Dispatched</Badge>
    case "On its way": return <Badge className="bg-blue-100 text-blue-700 border-0 hover:bg-blue-100">On Its Way</Badge>
    case "Passed the return window": return <Badge variant="destructive">Window Closed</Badge>
  }
}

function getFulfillmentBadge(status: string) {
  switch (status) {
    case "FULFILLED": return <Badge className="bg-green-100 text-green-700 border-0 hover:bg-green-100">Delivered</Badge>
    case "PARTIALLY_FULFILLED": return <Badge className="bg-blue-100 text-blue-700 border-0 hover:bg-blue-100">Partial</Badge>
    case "IN_PROGRESS": return <Badge className="bg-blue-100 text-blue-700 border-0 hover:bg-blue-100">In Progress</Badge>
    default: return <Badge variant="secondary">Processing</Badge>
  }
}

function getFulfillmentIcon(status: string) {
  switch (status) {
    case "FULFILLED": return <CheckCircle2 className="size-5 text-green-500" />
    case "PARTIALLY_FULFILLED": return <Truck className="size-5 text-blue-500" />
    case "IN_PROGRESS": return <Truck className="size-5 text-blue-500" />
    default: return <Clock className="size-5 text-muted-foreground" />
  }
}

// ─── Order Card Skeleton ──────────────────────────────────────────────────────
function OrderCardSkeleton() {
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex justify-between">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-5 w-16" />
        </div>
        <Skeleton className="h-3 w-36 mt-1" />
      </CardHeader>
      <CardContent>
        <div className="flex gap-2 mb-3">
          <Skeleton className="w-10 h-10 rounded-lg" />
          <Skeleton className="w-10 h-10 rounded-lg" />
          <Skeleton className="w-10 h-10 rounded-lg" />
          <Skeleton className="w-10 h-10 rounded-lg" />
        </div>
        <Skeleton className="h-5 w-20" />
      </CardContent>
    </Card>
  )
}

// ─── Order Card ───────────────────────────────────────────────────────────────
function OrderCard({ order, onClick }: { order: Order; onClick: () => void }) {
  const images = order.processedItems.map(i => i.image?.url).filter(Boolean).slice(0, 5) as string[]
  const extra = order.processedItems.length - 5
  const hasEligible = order.processedItems.some(i => i.returnStatus === "Eligible")
  const total = parseFloat(order.totalPriceSet.shopMoney.amount)

  return (
    <Card
      className="cursor-pointer hover:border-[#E5403B]/40 hover:shadow-md transition-all duration-200 group"
      onClick={onClick}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-sm font-semibold group-hover:text-[#E5403B] transition-colors">
              {order.name}
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-0.5">
              {new Date(order.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
              {" · "}{order.processedItems.length} item{order.processedItems.length !== 1 ? "s" : ""}
            </p>
          </div>
          <div className="text-right space-y-1">
            <p className="text-sm font-semibold">£{total.toFixed(2)}</p>
            {getFulfillmentBadge(order.displayFulfillmentStatus)}
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="flex items-center gap-1.5 mb-3">
          {images.map((url, i) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img key={i} src={url} alt="" className="w-10 h-10 rounded-lg object-cover border border-border" />
          ))}
          {extra > 0 && (
            <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center text-xs font-medium text-muted-foreground">
              +{extra}
            </div>
          )}
        </div>
        <div className="flex items-center justify-between">
          {hasEligible
            ? <Badge className="bg-green-100 text-green-700 border-0 hover:bg-green-100 text-xs">Return Available</Badge>
            : <span />
          }
          <ChevronRight className="size-4 text-muted-foreground group-hover:text-[#E5403B] transition-colors" />
        </div>
      </CardContent>
    </Card>
  )
}

// ─── Order Detail ─────────────────────────────────────────────────────────────
function OrderDetail({ order, onBack }: { order: Order; onBack: () => void }) {
  const [selectedItems, setSelectedItems] = useState<Record<string, { selected: boolean; quantity: number; reason: string; description: string }>>({})
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

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

  const submitReturn = async () => {
    const items = Object.entries(selectedItems)
      .filter(([, v]) => v.selected)
      .map(([lineItemId, v]) => ({ lineItemId, quantity: v.quantity, reason: v.reason, description: v.description }))
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
      if (result.success) setSubmitted(true)
      else setSubmitError(result.error)
    } catch {
      setSubmitError("Network error. Please try again.")
    } finally {
      setSubmitting(false)
    }
  }

  const orderStatusUrl = `https://account.iblazevape.co.uk/orders/${order.id.split("/").pop()}`

  if (submitted) {
    return (
      <div className="max-w-lg mx-auto py-20 text-center space-y-4 px-4">
        <div className="size-16 bg-green-50 rounded-full flex items-center justify-center mx-auto">
          <CheckCircle2 className="size-8 text-green-500" />
        </div>
        <h2 className="text-xl font-semibold">Return Requested</h2>
        <p className="text-muted-foreground text-sm">
          We&apos;ve sent a confirmation email. Our team will review your return and be in touch shortly.
        </p>
        <Button variant="outline" onClick={onBack} className="mt-2">
          <ArrowLeft className="size-4" />Back to Orders
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" onClick={onBack} className="-ml-2 text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" />Back to Orders
      </Button>

      {/* Order header card */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              {getFulfillmentIcon(order.displayFulfillmentStatus)}
              <div>
                <h2 className="text-lg font-semibold">{order.name}</h2>
                <p className="text-sm text-muted-foreground">
                  {new Date(order.createdAt).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
                </p>
                <div className="flex items-center gap-2 mt-1">
                  {getFulfillmentBadge(order.displayFulfillmentStatus)}
                  <span className="text-sm font-semibold">£{total.toFixed(2)} GBP</span>
                </div>
              </div>
            </div>
            <a href={orderStatusUrl} target="_blank" rel="noopener noreferrer">
              <Button variant="outline" size="sm">
                <ExternalLink className="size-4" />View Order Status
              </Button>
            </a>
          </div>

          <Separator className="my-4" />

          <div className="flex items-start gap-2 text-sm text-muted-foreground">
            <Truck className="size-4 mt-0.5 flex-shrink-0" />
            <div>
              <span className="font-medium text-foreground">Order Status & Tracker — </span>
              View your live order status securely via Shopify.{" "}
              <a href={orderStatusUrl} target="_blank" rel="noopener noreferrer" className="text-[#E5403B] underline underline-offset-4">
                View Order Status →
              </a>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Items + Estimator */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Items list */}
        <div className="lg:col-span-2 space-y-3">
          <h3 className="font-semibold">Order Items</h3>
          <Card>
            <CardContent className="p-0 divide-y divide-border">
              {order.processedItems.map((item) => {
                const sel = selectedItems[item.id]
                const isEligible = item.returnStatus === "Eligible"
                return (
                  <div key={item.id} className={cn("p-4 transition-colors", sel?.selected && "bg-muted/40")}>
                    <div className="flex items-start gap-3">
                      {isEligible && (
                        <Checkbox
                          checked={sel?.selected || false}
                          onCheckedChange={(checked) => {
                            setSelectedItems(prev => ({
                              ...prev,
                              [item.id]: checked
                                ? { selected: true, quantity: item.quantity, reason: "CHANGED_MIND", description: "" }
                                : { ...prev[item.id], selected: false }
                            }))
                          }}
                          className="mt-1"
                        />
                      )}
                      <div className={cn("size-12 rounded-lg overflow-hidden bg-muted flex-shrink-0 border border-border", !isEligible && "ml-7")}>
                        {item.image?.url && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={item.image.url} alt={item.title} className="w-full h-full object-cover" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{item.title}</p>
                        {item.variant?.title && item.variant.title !== "Default Title" && (
                          <p className="text-xs text-muted-foreground">{item.variant.title}</p>
                        )}
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          <span className="text-xs text-muted-foreground">Qty: {item.quantity}</span>
                          {getStatusBadge(item.returnStatus)}
                        </div>
                      </div>
                    </div>

                    {sel?.selected && (
                      <div className="mt-4 ml-10 space-y-3 animate-fade-in">
                        <div>
                          <label className="text-xs font-medium block mb-1.5">Return reason</label>
                          <Select
                            value={sel.reason}
                            onValueChange={(val) => setSelectedItems(prev => ({ ...prev, [item.id]: { ...prev[item.id], reason: val } }))}
                          >
                            <SelectTrigger className="text-sm h-9">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {RETURN_REASONS.map(r => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <label className="text-xs font-medium block mb-1.5">
                            Notes <span className="text-muted-foreground font-normal">(optional)</span>
                          </label>
                          <Textarea
                            value={sel.description}
                            onChange={(e) => setSelectedItems(prev => ({ ...prev, [item.id]: { ...prev[item.id], description: e.target.value } }))}
                            placeholder="Tell us more about the issue..."
                            className="text-sm"
                            rows={2}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </CardContent>
          </Card>

          <div className="flex items-start gap-2 p-3 rounded-lg bg-muted/50 border text-xs text-muted-foreground">
            <Info className="size-4 flex-shrink-0 mt-0.5" />
            <p>Unwanted items can be returned within <strong className="text-foreground">30 days</strong> from delivery. Return postage is at your expense (tracked service required).</p>
          </div>
        </div>

        {/* Refund Estimator */}
        <div className="lg:col-span-1">
          <div className="lg:sticky lg:top-6 space-y-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <RotateCcw className="size-4 text-[#E5403B]" />
                  Refund Estimator
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{selectedCount} item{selectedCount !== 1 ? "s" : ""} selected</span>
                  <span className="font-medium">£{estimatedRefund.toFixed(2)}</span>
                </div>
                <Separator />
                <div className="flex justify-between text-sm font-semibold">
                  <span>Estimated total</span>
                  <span className="text-[#E5403B] text-base">£{estimatedRefund.toFixed(2)}</span>
                </div>
                {selectedCount === 0 && (
                  <p className="text-xs text-muted-foreground text-center">Select items to calculate your refund</p>
                )}

                {submitError && (
                  <div className="flex items-start gap-2 p-3 rounded-lg bg-destructive/10 text-xs text-destructive">
                    <XCircle className="size-4 flex-shrink-0 mt-0.5" />{submitError}
                  </div>
                )}

                <div className="space-y-2 pt-1">
                  <Button
                    className="w-full bg-[#E5403B] hover:bg-[#cc3935] text-white"
                    disabled={selectedCount === 0 || submitting}
                    onClick={submitReturn}
                  >
                    <RotateCcw className="size-4" />
                    {submitting ? "Submitting..." : "Submit Request"}
                  </Button>
                  <Button variant="ghost" className="w-full text-muted-foreground" onClick={() => setSelectedItems({})}>
                    Cancel
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-4 space-y-3 text-sm">
                <p className="font-semibold">Order Summary</p>
                <div className="flex justify-between text-muted-foreground">
                  <span>Total paid</span>
                  <span className="font-medium text-foreground">£{total.toFixed(2)} GBP</span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>Items</span>
                  <span>{totalQty}</span>
                </div>
                {order.displayFulfillmentStatus === "FULFILLED" && (
                  <div className="flex items-center gap-2 p-2 rounded-lg bg-green-50 text-xs text-green-700">
                    <CheckCircle2 className="size-4 flex-shrink-0" />
                    This order has been delivered
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Main Dashboard ───────────────────────────────────────────────────────────
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

  const user = {
    name: data?.firstName || "Customer",
    email: "",
  }

  const headerTitle = selectedOrder ? selectedOrder.name : "My Orders"

  return (
    <SidebarProvider
      style={{
        "--sidebar-width": "18rem",
        "--header-height": "3rem",
      } as React.CSSProperties}
    >
      <AppSidebar
        variant="inset"
        user={user}
        onNavigate={(section) => {
          setActiveSection(section)
          setSelectedOrder(null)
        }}
        activeSection={activeSection}
      />
      <SidebarInset>
        <SiteHeader
          title={headerTitle}
          search={search}
          onSearch={setSearch}
          showSearch={!selectedOrder}
        />

        {/* Mobile search */}
        {!selectedOrder && (
          <div className="sm:hidden px-4 py-2 border-b">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                placeholder="Search orders..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-8 h-8 text-sm"
              />
            </div>
          </div>
        )}

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
                  <XCircle className="size-5 flex-shrink-0" />{error}
                </div>
              )}

              {loading && (
                <div className={cn(
                  view === "grid"
                    ? "grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4"
                    : "space-y-3"
                )}>
                  {Array.from({ length: 6 }).map((_, i) => <OrderCardSkeleton key={i} />)}
                </div>
              )}

              {!loading && filteredOrders.length === 0 && (
                <div className="text-center py-20">
                  <ShoppingBag className="size-12 text-muted-foreground/30 mx-auto mb-4" />
                  <p className="font-medium text-muted-foreground">No orders found</p>
                  <p className="text-sm text-muted-foreground/60 mt-1">Orders placed with this account will appear here</p>
                </div>
              )}

              {!loading && view === "grid" && (
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                  {filteredOrders.map(order => (
                    <OrderCard key={order.id} order={order} onClick={() => setSelectedOrder(order)} />
                  ))}
                </div>
              )}

              {!loading && view === "list" && (
                <Card>
                  <CardContent className="p-0 divide-y divide-border">
                    {filteredOrders.map(order => (
                      <button
                        key={order.id}
                        onClick={() => setSelectedOrder(order)}
                        className="w-full px-5 py-4 flex items-center gap-4 hover:bg-muted/50 transition-colors text-left"
                      >
                        <div className="flex -space-x-1.5">
                          {order.processedItems.slice(0, 3).map((item, i) => item.image?.url ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img key={i} src={item.image.url} alt="" className="size-9 rounded-lg object-cover border-2 border-background" />
                          ) : null)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm">{order.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(order.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                            {" · "}{order.processedItems.length} items
                          </p>
                        </div>
                        {getFulfillmentBadge(order.displayFulfillmentStatus)}
                        <p className="font-semibold text-sm w-16 text-right">
                          £{parseFloat(order.totalPriceSet.shopMoney.amount).toFixed(2)}
                        </p>
                        <ChevronRight className="size-4 text-muted-foreground flex-shrink-0" />
                      </button>
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
