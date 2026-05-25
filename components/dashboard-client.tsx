


"use client"

import * as React from "react"
import { useEffect, useMemo, useState } from "react"
import { toast } from "sonner"
import {
  ArrowLeft,
  CheckCircle2,
  ChevronRight,
  ExternalLink,
  Info,
  LayoutGrid,
  List,
  RotateCcw,
  ShieldCheck,
  ShoppingBag,
  XCircle,
} from "lucide-react"

import { AppSidebar } from "@/components/app-sidebar"
import { SiteHeader } from "@/components/site-header"

import {
  SidebarInset,
  SidebarProvider,
} from "@/components/ui/sidebar"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Spinner } from "@/components/ui/spinner"
import { Separator } from "@/components/ui/separator"
import { Checkbox } from "@/components/ui/checkbox"
import { Textarea } from "@/components/ui/textarea"

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"

import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer"

import { useMediaQuery } from "@/hooks/use-media-query"
import { cn } from "@/lib/utils"

// ─────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────

type ReturnStatus =
  | "Eligible"
  | "Not yet dispatched"
  | "On its way"
  | "Passed the return window"

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
  totalPriceSet: {
    shopMoney: {
      amount: string
      currencyCode: string
    }
  }
  processedItems: LineItem[]
  isDelivered?: boolean
  deliveredAt?: string | null
}

interface OrdersData {
  firstName: string
  email: string
  orders: Order[]
}

// ─────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────

const RETURN_REASONS = [
  {
    value: "CHANGED_MIND",
    label: "Changed my mind",
  },
  {
    value: "WRONG_ITEM",
    label: "Wrong item received",
  },
  {
    value: "FAULTY",
    label: "Faulty / not working",
  },
  {
    value: "DAMAGED",
    label: "Damaged in transit",
  },
  {
    value: "NOT_AS_DESCRIBED",
    label: "Not as described",
  },
  {
    value: "OTHER",
    label: "Other",
  },
]

function productUrl(handle?: string | null) {
  return handle
    ? `https://iblazevape.co.uk/products/${handle}`
    : "https://iblazevape.co.uk"
}

// ─────────────────────────────────────────────────────────────
// LOADING SCREEN
// ─────────────────────────────────────────────────────────────

function AuthenticatingScreen() {
  return (
    <div className="min-h-screen bg-[#fafafa] flex items-center justify-center">
      <div className="bg-white border rounded-2xl px-5 py-4 shadow-sm flex items-center gap-3">
        <Spinner className="size-4" />
        <span className="text-sm font-medium">
          Authenticating securely...
        </span>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// POLICY MODAL
// ─────────────────────────────────────────────────────────────

function HygienePolicy({
  onAccept,
  onDecline,
}: {
  onAccept: () => void
  onDecline: () => void
}) {
  const [open, setOpen] = useState(false)

  const isDesktop = useMediaQuery("(min-width: 768px)")

  const content = (
    <div className="space-y-3 text-sm text-muted-foreground">
      {[
        {
          title: "Vape Kits & Mods",
          desc: "30-day refund period. 30-day warranty from delivery.",
        },
        {
          title: "Batteries & Chargers",
          desc: "60-day battery warranty. 30-day charger warranty.",
        },
        {
          title: "E-Liquids & Disposables",
          desc: "Must remain sealed and unopened.",
        },
        {
          title: "Tanks & Clearomisers",
          desc: "7-day Dead On Arrival reporting window.",
        },
      ].map(item => (
        <div
          key={item.title}
          className="rounded-2xl bg-muted/40 p-4"
        >
          <p className="font-medium text-foreground text-sm">
            {item.title}
          </p>

          <p className="text-xs mt-1 leading-relaxed">
            {item.desc}
          </p>
        </div>
      ))}
    </div>
  )

  const actions = (
    <div className="flex gap-2 pt-2">
      <Button
        className="flex-1 bg-[#E5403B] hover:bg-[#cf3d37]"
        onClick={() => {
          setOpen(false)
          onAccept()

          toast.success("Returns policy accepted")
        }}
      >
        <CheckCircle2 className="size-4" />
        Accept
      </Button>

      <Button
        variant="outline"
        className="flex-1"
        onClick={() => {
          setOpen(false)
          onDecline()

          toast.error("Returns policy declined")
        }}
      >
        Decline
      </Button>
    </div>
  )

  const trigger = (
    <Button className="bg-[#E5403B] hover:bg-[#cf3d37] text-white rounded-xl">
      Review Policy
    </Button>
  )

  if (isDesktop) {
    return (
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          {trigger}
        </DialogTrigger>

        <DialogContent className="sm:max-w-lg rounded-3xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShieldCheck className="size-4 text-[#E5403B]" />
              iBlaze Returns Policy
            </DialogTitle>
          </DialogHeader>

          {content}

          {actions}
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Drawer open={open} onOpenChange={setOpen}>
      <DrawerTrigger asChild>
        {trigger}
      </DrawerTrigger>

      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>
            iBlaze Returns Policy
          </DrawerTitle>
        </DrawerHeader>

        <div className="px-4">
          {content}
        </div>

        <DrawerFooter>
          {actions}

          <DrawerClose asChild>
            <Button variant="ghost">
              Cancel
            </Button>
          </DrawerClose>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  )
}

// ─────────────────────────────────────────────────────────────
// ORDER CARD
// ─────────────────────────────────────────────────────────────

function OrderCard({
  order,
  onClick,
}: {
  order: Order
  onClick: () => void
}) {
  const images = order.processedItems
    .map(i => i.image?.url)
    .filter(Boolean)
    .slice(0, 4) as string[]

  const total = parseFloat(order.totalPriceSet.shopMoney.amount)

  const totalQty = order.processedItems.reduce(
    (sum, item) => sum + item.quantity,
    0
  )

  const date = new Date(order.createdAt).toLocaleDateString(
    "en-GB",
    {
      day: "numeric",
      month: "short",
      year: "numeric",
    }
  )

  return (
    <button
      onClick={onClick}
      className="group rounded-3xl border bg-white p-5 text-left transition-all hover:shadow-lg hover:-translate-y-0.5"
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="font-semibold text-base group-hover:underline">
            {order.name}
          </p>

          <p className="text-sm text-muted-foreground mt-1">
            {date} • {totalQty} items
          </p>
        </div>

        <div className="text-right">
          <p className="font-semibold text-base">
            £{total.toFixed(2)}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 mt-5">
        {images.map((img, i) => (
          <div
            key={i}
            className="size-12 rounded-xl border bg-white overflow-hidden"
          >
            <img
              src={img}
              alt=""
              className="w-full h-full object-contain p-1"
            />
          </div>
        ))}
      </div>
    </button>
  )
}

// ─────────────────────────────────────────────────────────────
// ORDER DETAIL
// ─────────────────────────────────────────────────────────────

function OrderDetail({
  order,
  onBack,
}: {
  order: Order
  onBack: () => void
}) {
  const [policyAccepted, setPolicyAccepted] = useState(false)

  const [selectedItems, setSelectedItems] = useState<
    Record<
      string,
      {
        selected: boolean
        quantity: number
        reason: string
        description: string
      }
    >
  >({})

  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  const eligibleItems = order.processedItems.filter(
    item => item.returnStatus === "Eligible"
  )

  const ineligibleItems = order.processedItems.filter(
    item => item.returnStatus !== "Eligible"
  )

  const total = parseFloat(order.totalPriceSet.shopMoney.amount)

  const totalQty = order.processedItems.reduce(
    (sum, item) => sum + item.quantity,
    0
  )

  const selectedCount = Object.values(selectedItems)
    .filter(v => v.selected)
    .length

  const estimatedRefund = useMemo(() => {
    const pricePerItem = totalQty > 0 ? total / totalQty : 0

    return Object.entries(selectedItems)
      .filter(([, v]) => v.selected)
      .reduce((sum, [id, v]) => {
        const item = order.processedItems.find(i => i.id === id)

        return sum + (item ? pricePerItem * v.quantity : 0)
      }, 0)
  }, [selectedItems, order, total, totalQty])

  const canSubmit =
    selectedCount > 0 &&
    policyAccepted &&
    Object.entries(selectedItems)
      .filter(([, v]) => v.selected)
      .every(
        ([, v]) =>
          v.reason &&
          (v.reason !== "OTHER" || v.description.trim().length > 0)
      )

  const submitReturn = async () => {
    try {
      setSubmitting(true)
      setSubmitError(null)

      const items = Object.entries(selectedItems)
        .filter(([, v]) => v.selected)
        .map(([lineItemId, v]) => ({
          lineItemId,
          quantity: v.quantity,
          reason: v.reason,
          description: v.description,
        }))

      const orderId = order.id.split("/").pop()

      const res = await fetch("/api/submit-return", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          orderId,
          items,
        }),
      })

      const result = await res.json()

      if (result.success) {
        setSubmitted(true)

        setTimeout(() => {
          window.location.href = `https://account.iblazevape.co.uk/orders/${orderId}`
        }, 3000)
      } else {
        setSubmitError(result.error || "Something went wrong")
      }
    } catch {
      setSubmitError("Network error")
    } finally {
      setSubmitting(false)
    }
  }

  if (submitted) {
    return (
      <div className="max-w-md mx-auto py-20 text-center">
        <div className="size-20 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-5">
          <CheckCircle2 className="size-10 text-green-600" />
        </div>

        <h2 className="text-2xl font-semibold">
          Return Submitted
        </h2>

        <p className="text-muted-foreground text-sm mt-3 leading-relaxed">
          Your request has been submitted successfully.
        </p>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      <Button
        variant="ghost"
        onClick={onBack}
        className="-ml-2"
      >
        <ArrowLeft className="size-4" />
        Back to Orders
      </Button>

      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-5">
        <div>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-3xl font-semibold tracking-tight">
              {order.name}
            </h1>

            <Badge className="bg-green-100 text-green-700 border-0">
              {order.isDelivered ? "Delivered" : "Processing"}
            </Badge>
          </div>

          <p className="text-muted-foreground mt-2 text-sm">
            {new Date(order.createdAt).toLocaleDateString("en-GB", {
              weekday: "long",
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
          </p>
        </div>

        <a
          href={`https://account.iblazevape.co.uk/orders/${order.id.split("/").pop()}`}
          target="_blank"
          rel="noopener noreferrer"
        >
          <Button variant="outline" className="rounded-xl h-11">
            <ExternalLink className="size-4" />
            View Order Status
          </Button>
        </a>
      </div>

      <div className="rounded-3xl bg-muted/40 p-5 flex gap-3 items-start">
        <Info className="size-4 mt-0.5 text-muted-foreground" />

        <div className="space-y-1">
          <p className="font-medium text-sm">
            Returns accepted within 30 days.
          </p>

          <p className="text-sm text-muted-foreground">
            Return postage is customer responsibility.
          </p>
        </div>
      </div>

      {!policyAccepted && (
        <div className="rounded-3xl border bg-white p-6 flex flex-col lg:flex-row lg:items-center justify-between gap-5">
          <div>
            <div className="flex items-center gap-2">
              <ShieldCheck className="size-4 text-[#E5403B]" />

              <p className="font-semibold">
                Returns Policy
              </p>
            </div>

            <p className="text-sm text-muted-foreground mt-2">
              Review and accept the policy before selecting items.
            </p>
          </div>

          <HygienePolicy
            onAccept={() => setPolicyAccepted(true)}
            onDecline={() => setPolicyAccepted(false)}
          />
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_360px] gap-8 items-start">
        <div className="space-y-6">
          <div className="rounded-3xl border bg-white overflow-hidden">
            <div className="px-6 py-5 border-b bg-muted/20">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold">
                    Return Items
                  </h2>

                  <p className="text-sm text-muted-foreground mt-1">
                    Select products you want to return.
                  </p>
                </div>

                <Badge className="bg-green-100 text-green-700 border-0">
                  {eligibleItems.length} eligible
                </Badge>
              </div>
            </div>

            <div className="divide-y">
              {eligibleItems.map(item => {
                const selected = selectedItems[item.id]

                return (
                  <div
                    key={item.id}
                    className={cn(
                      "p-6 transition-colors",
                      selected?.selected && "bg-muted/20"
                    )}
                  >
                    <div className="flex gap-4 items-start">
                      <Checkbox
                        checked={selected?.selected || false}
                        disabled={!policyAccepted}
                        className="mt-6"
                        onCheckedChange={checked => {
                          setSelectedItems(prev => ({
                            ...prev,
                            [item.id]: checked
                              ? {
                                  selected: true,
                                  quantity: 1,
                                  reason: "",
                                  description: "",
                                }
                              : {
                                  ...prev[item.id],
                                  selected: false,
                                },
                          }))
                        }}
                      />

                      <div className="relative shrink-0">
                        <div className="size-24 rounded-2xl border overflow-hidden bg-white">
                          {item.image?.url && (
                            <img
                              src={item.image.url}
                              alt={item.title}
                              className="w-full h-full object-contain p-1"
                            />
                          )}
                        </div>

                        <div className="absolute -top-2 -right-2 size-6 rounded-full bg-black text-white text-xs flex items-center justify-center font-semibold">
                          {item.quantity}
                        </div>
                      </div>

                      <div className="flex-1 min-w-0">
                        <a
                          href={productUrl(item.productHandle)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-semibold text-base hover:underline block"
                        >
                          {item.title}
                        </a>

                        {item.variant?.title && (
                          <p className="text-sm text-muted-foreground mt-1">
                            {item.variant.title}
                          </p>
                        )}

                        {!policyAccepted && (
                          <p className="text-xs text-muted-foreground mt-3">
                            Accept the policy to continue.
                          </p>
                        )}

                        {selected?.selected && (
                          <div className="mt-6 rounded-2xl border bg-white p-5 space-y-5">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                              <div>
                                <label className="text-xs uppercase tracking-wide text-muted-foreground font-medium">
                                  Quantity
                                </label>

                                <Select
                                  value={String(selected.quantity)}
                                  onValueChange={value => {
                                    setSelectedItems(prev => ({
                                      ...prev,
                                      [item.id]: {
                                        ...prev[item.id],
                                        quantity: parseInt(value),
                                      },
                                    }))
                                  }}
                                >
                                  <SelectTrigger className="mt-2 rounded-xl h-11">
                                    <SelectValue />
                                  </SelectTrigger>

                                  <SelectContent>
                                    {Array.from(
                                      { length: item.quantity },
                                      (_, i) => (
                                        <SelectItem
                                          key={i + 1}
                                          value={String(i + 1)}
                                        >
                                          {i + 1}
                                        </SelectItem>
                                      )
                                    )}
                                  </SelectContent>
                                </Select>
                              </div>

                              <div>
                                <label className="text-xs uppercase tracking-wide text-muted-foreground font-medium">
                                  Reason
                                </label>

                                <Select
                                  value={selected.reason}
                                  onValueChange={value => {
                                    setSelectedItems(prev => ({
                                      ...prev,
                                      [item.id]: {
                                        ...prev[item.id],
                                        reason: value,
                                      },
                                    }))
                                  }}
                                >
                                  <SelectTrigger className="mt-2 rounded-xl h-11">
                                    <SelectValue placeholder="Select reason" />
                                  </SelectTrigger>

                                  <SelectContent>
                                    {RETURN_REASONS.map(reason => (
                                      <SelectItem
                                        key={reason.value}
                                        value={reason.value}
                                      >
                                        {reason.label}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>

                            <div>
                              <label className="text-xs uppercase tracking-wide text-muted-foreground font-medium">
                                Notes
                              </label>

                              <Textarea
                                rows={3}
                                value={selected.description}
                                onChange={e => {
                                  setSelectedItems(prev => ({
                                    ...prev,
                                    [item.id]: {
                                      ...prev[item.id],
                                      description: e.target.value,
                                    },
                                  }))
                                }}
                                className="mt-2 rounded-xl resize-none"
                                placeholder="Add more details"
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {ineligibleItems.length > 0 && (
            <div className="rounded-3xl border bg-white overflow-hidden">
              <div className="px-6 py-5 border-b bg-muted/20">
                <h2 className="font-semibold text-lg">
                  Unavailable for Return
                </h2>
              </div>

              <div className="divide-y">
                {ineligibleItems.map(item => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between gap-4 p-5"
                  >
                    <div className="flex items-center gap-4 min-w-0">
                      <div className="size-16 rounded-2xl border overflow-hidden bg-white shrink-0">
                        {item.image?.url && (
                          <img
                            src={item.image.url}
                            alt={item.title}
                            className="w-full h-full object-contain p-1"
                          />
                        )}
                      </div>

                      <div>
                        <p className="font-medium text-sm">
                          {item.title}
                        </p>

                        <p className="text-xs text-muted-foreground mt-1">
                          {item.returnStatus}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="xl:sticky xl:top-6">
          <div className="rounded-3xl border bg-white overflow-hidden shadow-sm">
            <div className="p-6 border-b bg-muted/20">
              <p className="text-sm text-muted-foreground">
                Estimated Refund
              </p>

              <div className="mt-3 text-4xl font-semibold tracking-tight">
                £{estimatedRefund.toFixed(2)}
              </div>
            </div>

            <div className="p-6 space-y-5">
              <div className="space-y-3 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">
                    Selected items
                  </span>

                  <span className="font-medium">
                    {selectedCount}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">
                    Total order value
                  </span>

                  <span className="font-medium">
                    £{total.toFixed(2)}
                  </span>
                </div>
              </div>

              <Separator />

              {submitError && (
                <div className="rounded-2xl bg-red-50 text-red-600 p-4 text-sm flex gap-2 items-start">
                  <XCircle className="size-4 mt-0.5 shrink-0" />
                  {submitError}
                </div>
              )}

              <Button
                className="w-full h-12 rounded-xl bg-[#E5403B] hover:bg-[#cf3d37] text-white"
                disabled={!canSubmit || submitting}
                onClick={submitReturn}
              >
                {submitting ? (
                  <>
                    <Spinner className="size-4" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <RotateCcw className="size-4" />
                    Submit Return
                  </>
                )}
              </Button>

              <Button
                variant="ghost"
                className="w-full"
                onClick={onBack}
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// MAIN DASHBOARD
// ─────────────────────────────────────────────────────────────

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
        if (d.error) {
          setError(d.error)
        } else {
          setData(d)
        }
      })
      .catch(() => {
        setError("Failed to load orders")
      })
      .finally(() => {
        setLoading(false)
      })
  }, [])

  if (loading) {
    return <AuthenticatingScreen />
  }

  const filteredOrders = (data?.orders || []).filter(order =>
    order.name.toLowerCase().includes(search.toLowerCase())
  )

  const user = {
    name: data?.firstName || "Customer",
    email: data?.email || "",
  }

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
        activeSection={activeSection}
        onNavigate={section => {
          setActiveSection(section)
          setSelectedOrder(null)
        }}
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

        <div className="flex flex-col flex-1 p-4 lg:p-8 gap-6 bg-[#fafafa] min-h-screen">
          {selectedOrder ? (
            <OrderDetail
              order={selectedOrder}
              onBack={() => setSelectedOrder(null)}
            />
          ) : (
            <>
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <div>
                  <h1 className="text-3xl font-semibold tracking-tight">
                    {data?.firstName
                      ? `Hi, ${data.firstName}`
                      : "Your Orders"}
                  </h1>

                  <p className="text-muted-foreground text-sm mt-2">
                    View orders and manage returns.
                  </p>
                </div>

                <div className="flex items-center gap-1 bg-white border rounded-xl p-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setView("grid")}
                    className={cn(
                      "rounded-lg",
                      view === "grid" && "bg-muted"
                    )}
                  >
                    <LayoutGrid className="size-4" />
                  </Button>

                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setView("list")}
                    className={cn(
                      "rounded-lg",
                      view === "list" && "bg-muted"
                    )}
                  >
                    <List className="size-4" />
                  </Button>
                </div>
              </div>

              {error && (
                <div className="rounded-2xl bg-red-50 text-red-600 p-4 text-sm flex items-center gap-2">
                  <XCircle className="size-4" />
                  {error}
                </div>
              )}

              {!error && filteredOrders.length === 0 && (
                <div className="text-center py-24">
                  <ShoppingBag className="size-12 text-muted-foreground/30 mx-auto mb-5" />

                  <h3 className="font-medium">
                    No orders found
                  </h3>

                  <p className="text-sm text-muted-foreground mt-2">
                    Orders will appear here.
                  </p>
                </div>
              )}

              {view === "grid" && (
                <div className="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-3 gap-5">
                  {filteredOrders.map(order => (
                    <OrderCard
                      key={order.id}
                      order={order}
                      onClick={() => setSelectedOrder(order)}
                    />
                  ))}
                </div>
              )}

              {view === "list" && (
                <div className="rounded-3xl border bg-white overflow-hidden">
                  {filteredOrders.map(order => (
                    <button
                      key={order.id}
                      onClick={() => setSelectedOrder(order)}
                      className="w-full flex items-center justify-between px-6 py-5 hover:bg-muted/30 border-b last:border-b-0 transition-colors"
                    >
                      <div className="text-left">
                        <p className="font-medium">
                          {order.name}
                        </p>

                        <p className="text-sm text-muted-foreground mt-1">
                          {new Date(order.createdAt).toLocaleDateString("en-GB")}
                        </p>
                      </div>

                      <div className="flex items-center gap-4">
                        <p className="font-semibold">
                          £{parseFloat(order.totalPriceSet.shopMoney.amount).toFixed(2)}
                        </p>

                        <ChevronRight className="size-4 text-muted-foreground" />
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
```
