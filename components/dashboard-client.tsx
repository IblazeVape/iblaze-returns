"use client"

import * as React from "react"
import { useEffect, useState, useMemo, useRef, useLayoutEffect, useCallback, Suspense } from "react"
import { useSearchParams } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import { portalToast, setPortalToastPosition } from "@/lib/portal-toast"
import { PortalCustomScripts } from "@/components/apps-returns/portal-custom-scripts"
import { ChevronRight, ChevronDown, LayoutGrid, List, ArrowLeft, RotateCcw, CheckCircle2, ShoppingBag, ShieldCheck, ExternalLink, Lock, Truck, Package, Search, MapPin, SlidersHorizontal, XCircle, CircleX, Columns2, Clock, BadgeCheck, HelpCircle, Eye, Info, type LucideIcon } from "lucide-react"

import { PortalShell } from "@/components/portal-shell"
import { SidebarLayoutProvider, useSidebarLayout } from "@/components/sidebar-layout-provider"
import { isAppsReturnsPortal, isGuestOrderContext, getGuestOrderId, lookupAnotherOrder } from "@/lib/apps-returns-portal-mode"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Spinner } from "@/components/ui/spinner"
import { Separator } from "@/components/ui/separator"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card"
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Drawer, DrawerClose, DrawerContent, DrawerDescription, DrawerFooter, DrawerHeader, DrawerTitle, DrawerTrigger } from "@/components/ui/drawer"
import { useMediaQuery } from "@/hooks/use-media-query"
import { PolicyHtml } from "@/components/policy-html"
import { getCachedAccentColor, setCachedAccentColor, getCachedSidebarDefaultOpen, setCachedSidebarDefaultOpen } from "@/lib/accent-color-cache"
import type { TenantBranding, ReturnLifecycleStyle, ReturnLifecycleStyles, ReturnLifecycleMessages, RefundStatusLabels } from "@/lib/tenant"
import { DEFAULT_TENANT_FIELDS } from "@/lib/tenant"
import { getStatusIcon as getIneligibleStatusIconComponent } from "@/lib/status-icons"
import { cn } from "@/lib/utils"

// ─── Types ────────────────────────────────────────────────────────────────────
type ReturnStatus =
  | "Eligible" | "Cancelled"
  | "notReturnable" | "returnRequested" | "returnInProgress"
  | "returnDeclined" | "returnCanceled" | "returnCompleted"

type ShippingStage = "confirmed" | "onItsWay" | "outForDelivery" | "attemptedDelivery"

interface LineItem {
  id: string
  title: string
  quantity: number
  eligibleQuantity: number
  refundedQuantity: number
  requestedReturnQuantity: number
  openReturnQuantity: number
  completedReturnQuantity: number
  declinedReturnQuantity: number
  declinedReturnEntries: { quantity: number; message: string; declineReason?: string }[]
  inTransitQuantity?: number
  outForDeliveryQuantity?: number
  attemptedDeliveryQuantity?: number
  pendingQuantity?: number
  unitPrice?: number | null
  returnStatus: ReturnStatus
  returnReason?: string
  notReturnableReason?: "notDelivered" | "outsideWindow" | "finalSale" | "other" | null
  shippingStage?: ShippingStage | null
  refundStatus?: "notRefunded" | "partiallyRefunded" | "refunded"
  lineDeliveredAt?: string | null
  productHandle?: string | null
  image?: { url: string } | null
  variant?: { title: string } | null
}

// Used in the ineligible tab — may be a split view of a partially-eligible item
type DisplayItem = LineItem & { splitQty?: number; splitKey?: string }

const SHIPPING_STAGE_MESSAGE_KEY: Record<ShippingStage, keyof ReturnLifecycleMessages> = {
  confirmed: "shippingConfirmed",
  onItsWay: "shippingOnItsWay",
  outForDelivery: "shippingOutForDelivery",
  attemptedDelivery: "shippingAttemptedDelivery",
}

interface ShipmentTracking { company: string; number: string; url: string }
interface Shipment {
  id: string
  displayStatus: string
  shippedAt: string | null
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
  outForDeliveryCount: number
  attemptedDeliveryCount: number
  confirmedCount: number
  notDispatchedCount: number
  totalUnits: number
  earliestDelivery?: string | null
  latestDelivery?: string | null
  eligibilitySource?: "shopify" | "shopify-admin" | "fallback"
  statusPageUrl?: string | null
}

interface OrdersData { firstName: string; email: string; returnWindowDays: number; orders: Order[] }

const RETURN_REASONS = [
  { value: "CHANGED_MIND",     label: "Changed my mind" },
  { value: "WRONG_ITEM",       label: "Wrong item received" },
  { value: "FAULTY",           label: "Faulty / not working" },
  { value: "DAMAGED",          label: "Damaged in transit" },
  { value: "NOT_AS_DESCRIBED", label: "Not as described" },
  { value: "OTHER",            label: "Other" },
]

const STATUS_FILTERS = ["Delivered", "Partially delivered", "On its way", "Partially dispatched"]

const C = "shadow-xs py-0 gap-0"

function pUrl(handle?: string | null) {
  return handle ? `https://iblazevape.co.uk/products/${handle}` : "https://iblazevape.co.uk"
}

const RETURN_WINDOW_DATE_FMT: Intl.DateTimeFormatOptions = {
  day: "numeric",
  month: "short",
  year: "numeric",
}

function parseDeliveredDate(lineDeliveredAt?: string | null): Date | null {
  if (!lineDeliveredAt) return null
  const delivered = new Date(lineDeliveredAt)
  return isNaN(delivered.getTime()) ? null : delivered
}

function formatReturnWindowClosedFromDelivered(delivered: Date | null, returnWindowDays: number): string | null {
  const closed = delivered ? returnWindowClosedOnFromDate(delivered, returnWindowDays) : null
  if (!closed) return null
  return closed.toLocaleDateString("en-GB", RETURN_WINDOW_DATE_FMT)
}

function returnWindowClosedOnFromDate(delivered: Date, returnWindowDays: number): Date {
  return new Date(delivered.getTime() + returnWindowDays * 24 * 60 * 60 * 1000)
}

function returnWindowClosedOn(lineDeliveredAt: string | null | undefined, returnWindowDays: number): Date | null {
  const delivered = parseDeliveredDate(lineDeliveredAt)
  if (!delivered) return null
  return returnWindowClosedOnFromDate(delivered, returnWindowDays)
}

function formatReturnWindowClosedDate(lineDeliveredAt: string | null | undefined, returnWindowDays: number): string | null {
  return formatReturnWindowClosedFromDelivered(parseDeliveredDate(lineDeliveredAt), returnWindowDays)
}

function parseCloseDateFromReturnReason(reason?: string): Date | null {
  const match = reason?.match(/closed on (\d{1,2} \w{3,9} \d{4})/i)
  return match ? parseDeliveredDate(match[1]) : null
}

/** Best delivery date for return-window copy — line item, shipment, order, then parsed reason. */
function resolveDeliveredAt(item: LineItem, order: Order): Date | null {
  const fromLine = parseDeliveredDate(item.lineDeliveredAt)
  if (fromLine) return fromLine

  for (const shipment of order.shipments ?? []) {
    if (!shipment.items.some(i => i.id === item.id)) continue
    if (shipment.deliveredAt) {
      const d = new Date(shipment.deliveredAt)
      if (!isNaN(d.getTime())) return d
    }
  }

  for (const iso of [order.latestDelivery, order.earliestDelivery]) {
    if (!iso) continue
    const d = new Date(iso)
    if (!isNaN(d.getTime())) return d
  }

  return parseCloseDateFromReturnReason(item.returnReason)
}

function resolveGroupDeliveredAt(items: LineItem[], order: Order): Date | null {
  for (const item of items) {
    const d = resolveDeliveredAt(item, order)
    if (d) return d
  }
  return null
}

function formatReturnWindowClosedForItem(item: LineItem, order: Order, returnWindowDays: number, groupItems?: LineItem[]): string | null {
  const delivered = groupItems?.length
    ? resolveGroupDeliveredAt(groupItems, order)
    : resolveDeliveredAt(item, order)
  return formatReturnWindowClosedFromDelivered(delivered, returnWindowDays)
}

function daysLeftToReturn(lineDeliveredAt: string | null | undefined, returnWindowDays: number): number | null {
  if (!lineDeliveredAt) return null
  const deadline = returnWindowClosedOn(lineDeliveredAt, returnWindowDays)
  if (!deadline) return null
  const today = new Date()
  const days = Math.ceil((deadline.getTime() - today.getTime()) / (24 * 60 * 60 * 1000))
  return days > 0 ? days : null
}

function ReturnWindowBadge({ days }: { days: number }) {
  const urgent  = days <= 7
  const warning = days <= 14 && days > 7
  return (
    <span className={cn("text-[11px] font-medium tabular-nums",
      urgent  ? "text-red-600" :
      warning ? "text-amber-600" :
                "text-green-600"
    )}> · {days}d left to return</span>
  )
}

// ─── Ineligible item buckets (shared by summary + header stat blocks) ─────────
function ineligibleBucketCounts(ineligibleItems: DisplayItem[]): Record<string, number> {
  const buckets: Record<string, number> = {}
  const add = (key: string, q: number) => { buckets[key] = (buckets[key] || 0) + q }

  for (const item of ineligibleItems) {
    const q = item.splitQty ?? item.quantity
    const status = item.returnStatus

    switch (status) {
      case "returnRequested":
        add("requested", q)
        break
      case "returnInProgress":
        add("in_progress", q)
        break
      case "returnDeclined":
        add("declined", q)
        break
      case "returnCompleted":
        if (item.refundStatus === "refunded") add("refunded", q)
        else add("completed", q)
        break
      case "notReturnable":
        switch (item.notReturnableReason) {
          case "outsideWindow":
            add("window", q)
            break
          case "finalSale":
            add("final_sale", q)
            break
          case "notDelivered":
            switch (item.shippingStage) {
              case "onItsWay":
                add("in_transit", q)
                break
              case "outForDelivery":
                add("out_for_delivery", q)
                break
              case "attemptedDelivery":
                add("attempted_delivery", q)
                break
              case "confirmed":
              default:
                add("not_shipped", q)
            }
            break
          default:
            add("other", q)
        }
        break
      default:
        add("other", q)
    }
  }

  return buckets
}

function statusFiltersMatch(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false
  const sa = [...a].sort()
  const sb = [...b].sort()
  return sa.every((v, i) => v === sb[i])
}

type HeaderStatBlock = {
  id: string
  count: number
  caption: string
  textColor: string
  tab: "eligible" | "ineligible"
  statusFilter: ReturnStatus[]
  title?: string
}

function computeHeaderStatBlocks(
  totalEligibleUnits: number,
  ineligibleItems: DisplayItem[],
): HeaderStatBlock[] {
  const buckets = ineligibleBucketCounts(ineligibleItems)
  const blocks: HeaderStatBlock[] = []

  if (totalEligibleUnits > 0) {
    blocks.push({
      id: "ready",
      count: totalEligibleUnits,
      caption: "ready",
      textColor: "text-green-700",
      tab: "eligible",
      statusFilter: [],
      title: "Ready to return now",
    })
  }

  const ineligibleDefs: Array<{
    id: string
    count: number
    caption: string
    textColor: string
    statusFilter: ReturnStatus[]
    title: string
  }> = [
    { id: "processing", count: buckets.in_progress || 0, caption: "processing", textColor: "text-orange-600", statusFilter: ["returnInProgress"], title: "Return being processed" },
    { id: "requested", count: buckets.requested || 0, caption: "requested", textColor: "text-violet-600", statusFilter: ["returnRequested"], title: "Return awaiting review" },
    { id: "declined", count: buckets.declined || 0, caption: "declined", textColor: "text-[var(--brand)]", statusFilter: ["returnDeclined"], title: "Return declined" },
    { id: "in_transit", count: buckets.in_transit || 0, caption: "awaiting", textColor: "text-blue-600", statusFilter: ["notReturnable"], title: "Awaiting delivery — returnable once delivered" },
    { id: "attempted", count: buckets.attempted_delivery || 0, caption: "attempted", textColor: "text-rose-600", statusFilter: ["notReturnable"], title: "Delivery attempted — action may be needed" },
    { id: "out_for_delivery", count: buckets.out_for_delivery || 0, caption: "out for delivery", textColor: "text-blue-600", statusFilter: ["notReturnable"], title: "Out for delivery today" },
    { id: "not_shipped", count: buckets.not_shipped || 0, caption: "not shipped", textColor: "text-zinc-600", statusFilter: ["notReturnable"], title: "Not dispatched yet" },
    { id: "window", count: buckets.window || 0, caption: "expired", textColor: "text-zinc-500", statusFilter: ["notReturnable"], title: "Past return window" },
    {
      id: "returned",
      count: buckets.completed || 0,
      caption: "returned",
      textColor: "text-teal-600",
      statusFilter: ["returnCompleted"],
      title: "Returned",
    },
    {
      id: "refunded",
      count: buckets.refunded || 0,
      caption: "refunded",
      textColor: "text-green-600",
      statusFilter: ["returnCompleted"],
      title: "Refunded",
    },
    { id: "final_sale", count: buckets.final_sale || 0, caption: "final sale", textColor: "text-zinc-500", statusFilter: ["notReturnable"], title: "Final sale — not returnable" },
  ]

  for (const def of ineligibleDefs) {
    if (def.count > 0) {
      blocks.push({ ...def, tab: "ineligible" })
    }
  }

  if (buckets.other) {
    blocks.push({
      id: "other",
      count: buckets.other,
      caption: "blocked",
      textColor: "text-zinc-500",
      tab: "ineligible",
      statusFilter: [],
      title: "Not eligible",
    })
  }

  return blocks
}

// ─── Plain-English order summary (rule-based, from item statuses + reasons) ───
function summarizeOrderMessage(
  order: Order,
  totalEligibleUnits: number,
  ineligibleItems: DisplayItem[],
): { text: string; positive: boolean } {
  if (order.cancelledAt) {
    return { text: "This order was cancelled — returns are not available.", positive: false }
  }

  const n = order.totalUnits
  const buckets = ineligibleBucketCounts(ineligibleItems)

  const inTransit = buckets.in_transit || 0
  const notShipped = buckets.not_shipped || 0
  const preparing = buckets.preparing || 0
  const notYetShipped = notShipped + preparing
  const waiting = inTransit + notYetShipped
  const declined = order.processedItems.reduce(
    (s, item) => s + item.declinedReturnEntries.reduce((a, e) => a + e.quantity, 0),
    0,
  )
  const requested = buckets.requested || 0
  const inProgress = buckets.in_progress || 0
  const windowExpired = buckets.window || 0
  const completed = buckets.completed || 0
  const refunded = buckets.refunded || 0

  // ── Simple cases ──────────────────────────────────────────────────────────
  if (totalEligibleUnits === n && waiting === 0 && declined === 0 && requested === 0 && inProgress === 0) {
    return {
      text: n === 1 ? "Ready to return." : `All ${n} items are ready to return.`,
      positive: true,
    }
  }

  if (waiting === n && totalEligibleUnits === 0 && declined === 0 && requested === 0 && inProgress === 0) {
    if (inTransit === n) {
      return { text: "Your order is still on the way — returns open once delivered.", positive: false }
    }
    if (notYetShipped === n) {
      return { text: "Nothing has shipped yet — returns open once items are delivered.", positive: false }
    }
    return { text: "Items are still being dispatched — returns open once delivered.", positive: false }
  }

  const clauses: string[] = []

  // What they can do now
  if (totalEligibleUnits > 0) {
    clauses.push(
      totalEligibleUnits === 1
        ? "1 item ready to return now"
        : `${totalEligibleUnits} items ready to return now`
    )
  }

  if (declined > 0) {
    clauses.push(declined === 1 ? "1 declined return" : `${declined} declined returns`)
  }

  if (requested > 0) {
    clauses.push(requested === 1 ? "1 return awaiting review" : `${requested} returns awaiting review`)
  }
  if (inProgress > 0) {
    clauses.push(inProgress === 1 ? "1 return being processed" : `${inProgress} returns being processed`)
  }

  // Waiting on delivery / dispatch — keep in-transit and not-shipped separate
  if (inTransit > 0) {
    if (totalEligibleUnits > 0) {
      clauses.push(
        inTransit === 1
          ? "1 more in transit until delivered"
          : `${inTransit} more in transit until delivered`,
      )
    } else {
      clauses.push(
        inTransit === 1
          ? "1 item in transit — returnable once delivered"
          : `${inTransit} items in transit — returnable once delivered`,
      )
    }
  }

  if (notYetShipped > 0) {
    clauses.push(
      notYetShipped === 1
        ? "1 item not shipped yet"
        : `${notYetShipped} items not shipped yet`,
    )
  }

  if (windowExpired > 0) {
    clauses.push(windowExpired === 1 ? "1 item past the return window" : `${windowExpired} items past the return window`)
  }
  if (completed > 0) {
    clauses.push(completed === 1 ? "1 item already returned" : `${completed} items already returned`)
  }
  if (refunded > 0) {
    clauses.push(refunded === 1 ? "1 item already refunded" : `${refunded} items already refunded`)
  }

  if (buckets.final_sale) {
    clauses.push(buckets.final_sale === 1 ? "1 final sale item" : `${buckets.final_sale} final sale items`)
  }
  if (buckets.other) {
    clauses.push(buckets.other === 1 ? "1 item not eligible" : `${buckets.other} items not eligible`)
  }

  if (clauses.length === 0) {
    return { text: "Nothing to return right now.", positive: false }
  }

  // Up to 3 clauses when declines exist — declines should not be dropped
  const text = joinSummaryClauses(clauses, declined > 0 ? 3 : 2)

  return { text, positive: totalEligibleUnits > 0 }
}

function joinSummaryClauses(clauses: string[], max = 2): string {
  const parts = clauses.slice(0, max)
  if (parts.length === 1) return `${parts[0]}.`
  return `${parts[0]} · ${parts[1]}.`
}

function buildFullSummaryText(
  order: Order,
  totalEligibleUnits: number,
  ineligibleItems: DisplayItem[],
): string {
  if (order.cancelledAt) return "This order was cancelled — returns are not available."

  const buckets = ineligibleBucketCounts(ineligibleItems)
  const declined          = order.processedItems.reduce(
    (s, item) => s + item.declinedReturnEntries.reduce((a, e) => a + e.quantity, 0), 0,
  )
  const requested         = buckets.requested || 0
  const inProgress        = buckets.in_progress || 0
  const attempted         = buckets.attempted_delivery || 0
  const outForDelivery    = buckets.out_for_delivery || 0
  const inTransit         = buckets.in_transit || 0
  const notYetShipped     = (buckets.not_shipped || 0) + (buckets.preparing || 0)
  const windowExpired     = buckets.window || 0
  const completed         = buckets.completed || 0
  const refunded          = buckets.refunded || 0
  const finalSale         = buckets.final_sale || 0
  const other             = buckets.other || 0

  const clauses: string[] = []
  if (totalEligibleUnits > 0)
    clauses.push(totalEligibleUnits === 1 ? "1 item ready to return" : `${totalEligibleUnits} items ready to return`)
  if (declined > 0)
    clauses.push(declined === 1 ? "1 declined return" : `${declined} declined returns`)
  if (requested > 0)
    clauses.push(requested === 1 ? "1 return awaiting review" : `${requested} returns awaiting review`)
  if (inProgress > 0)
    clauses.push(inProgress === 1 ? "1 return being processed" : `${inProgress} returns being processed`)
  if (attempted > 0)
    clauses.push(attempted === 1 ? "1 failed delivery attempt" : `${attempted} failed delivery attempts`)
  if (outForDelivery > 0)
    clauses.push(outForDelivery === 1 ? "1 item out for delivery" : `${outForDelivery} items out for delivery`)
  if (inTransit > 0)
    clauses.push(inTransit === 1 ? "1 item in transit" : `${inTransit} items in transit`)
  if (notYetShipped > 0)
    clauses.push(notYetShipped === 1 ? "1 item not yet shipped" : `${notYetShipped} items not yet shipped`)
  if (windowExpired > 0)
    clauses.push(windowExpired === 1 ? "1 item past the return window" : `${windowExpired} items past the return window`)
  if (completed > 0)
    clauses.push(completed === 1 ? "1 item already returned" : `${completed} items already returned`)
  if (refunded > 0)
    clauses.push(refunded === 1 ? "1 item already refunded" : `${refunded} items already refunded`)
  if (finalSale > 0)
    clauses.push(finalSale === 1 ? "1 final sale item" : `${finalSale} final sale items`)
  if (other > 0)
    clauses.push(other === 1 ? "1 item not eligible" : `${other} items not eligible`)

  if (clauses.length === 0) return "Nothing to return right now."
  return clauses.join(" · ") + "."
}

function cap(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1)
}

function joinFragments(fragments: string[]): string {
  if (fragments.length === 0) return ""
  if (fragments.length === 1) return " " + cap(fragments[0]) + "."
  return " " + cap(fragments.slice(0, -1).join(", ") + ", and " + fragments[fragments.length - 1]) + "."
}

function buildNarrativeParagraph(
  order: Order,
  totalEligibleUnits: number,
  ineligibleItems: DisplayItem[],
  returnWindowDays: number,
  { showWindowDate = true }: { showWindowDate?: boolean } = {},
): string {
  const total = parseFloat(order.totalPriceSet.shopMoney.amount)
  const refundedAmount = order.totalRefundedSet?.shopMoney?.amount
    ? parseFloat(order.totalRefundedSet.shopMoney.amount)
    : 0
  const placedDate = new Date(order.createdAt).toLocaleDateString("en-GB", {
    day: "numeric", month: "long", year: "numeric",
  })
  const n = order.totalUnits

  let intro = `Your order of ${n} item${n !== 1 ? "s" : ""} was placed on ${placedDate} for £${total.toFixed(2)}`
  if (refundedAmount > 0) intro += ` (£${refundedAmount.toFixed(2)} refunded)`
  intro += "."

  if (order.cancelledAt) return `${intro} This order was cancelled and returns are not available.`

  // Bucket counts
  const buckets = ineligibleBucketCounts(ineligibleItems)
  const declined   = order.processedItems.reduce(
    (s, item) => s + item.declinedReturnEntries.reduce((a, e) => a + e.quantity, 0), 0,
  )
  const requested  = buckets.requested || 0
  const inProgress = buckets.in_progress || 0
  const attempted  = buckets.attempted_delivery || 0
  const ofd        = buckets.out_for_delivery || 0
  const inTransit  = buckets.in_transit || 0
  const preparing   = buckets.preparing || 0
  const notShipped  = (buckets.not_shipped || 0) + preparing
  const expired     = buckets.window || 0
  const completed   = buckets.completed || 0
  const refunded    = buckets.refunded || 0
  const finalSale   = buckets.final_sale || 0
  const other       = buckets.other || 0

  const awaitingDelivery = notShipped + inTransit + ofd + attempted
  const activeReturns    = requested + inProgress + declined
  const alreadyDone      = completed + refunded + finalSale + expired + other

  // Return window close date (show if all expired items share one date)
  const expiredItems  = ineligibleItems.filter(i => i.returnStatus === "notReturnable" && i.notReturnableReason === "outsideWindow")
  const expiredDates  = new Set(expiredItems.map(i => formatReturnWindowClosedForItem(i, order, returnWindowDays) ?? ""))
  const expiredDateStr = expiredDates.size === 1 && [...expiredDates][0] ? [...expiredDates][0] : null

  // ── Scenario: all items awaiting delivery, nothing else going on ──────────
  if (awaitingDelivery === n && totalEligibleUnits === 0 && activeReturns === 0 && alreadyDone === 0) {
    if (notShipped === n) {
      // Distinguish "being prepared" (Confirmed + preparing reason) from "not yet dispatched"
      if (preparing === n)
        return `${intro} We're preparing your order for shipping. Your return window starts on delivery and closes ${returnWindowDays} days later.`
      return `${intro} Your order hasn't shipped yet — your return window opens once the items are delivered.`
    }
    if (inTransit === n)
      return `${intro} Your order is still on its way — returns open once delivered.`
    if (ofd === n)
      return `${intro} Your order is out for delivery today — returns open once it arrives.`
    if (attempted === n)
      return `${intro} A delivery attempt was made for your order. Please rebook or collect — returns open once delivered.`
    return `${intro} None of the items have been delivered yet — returns open once they arrive.`
  }

  // ── Scenario: everything already done (no eligible, no pending delivery, no active returns) ──
  if (totalEligibleUnits === 0 && awaitingDelivery === 0 && activeReturns === 0) {
    if (completed === n) return `${intro} All ${n === 1 ? "" : `${n} `}item${n !== 1 ? "s have" : " has"} already been returned.`
    if (refunded  === n) return `${intro} All ${n === 1 ? "" : `${n} `}item${n !== 1 ? "s have" : " has"} already been refunded.`
    if (expired   === n) {
      const datePart = showWindowDate && expiredDateStr ? ` — it closed on ${expiredDateStr}` : ""
      return `${intro} All items are past the ${returnWindowDays}-day return window${datePart}.`
    }
    if (finalSale === n) return `${intro} All items were final sale and cannot be returned.`
  }

  // ── Scenario: partially delivered — all delivered items eligible, rest awaiting ──
  // e.g. "4 delivered, 14 not yet shipped" → merge into one sentence
  const otherIneligible = activeReturns + alreadyDone
  if (totalEligibleUnits > 0 && awaitingDelivery > 0 && otherIneligible === 0 && totalEligibleUnits + awaitingDelivery === n) {
    const readyPart  = totalEligibleUnits === 1 ? "1 item has been delivered and is ready to return" : `${totalEligibleUnits} items have been delivered and are ready to return`
    const waitPart   = notShipped > 0 && inTransit === 0 && ofd === 0 && attempted === 0
      ? `the remaining ${awaitingDelivery === 1 ? "1 hasn't" : `${awaitingDelivery} haven't`} been shipped yet`
      : inTransit > 0 && notShipped === 0 && ofd === 0 && attempted === 0
        ? `the remaining ${awaitingDelivery === 1 ? "1 is" : `${awaitingDelivery} are`} still on their way`
        : `the remaining ${awaitingDelivery} ${awaitingDelivery === 1 ? "hasn't" : "haven't"} arrived yet`
    return `${intro} ${cap(readyPart)} — ${waitPart}.`
  }

  // ── Scenario: partial delivery + return statuses on delivered items ─────────
  // e.g. 9 delivered (3 in progress, 1 declined, 5 returned), 4 not shipped
  // → "Of the 9 delivered items, 3 returns are being processed, 1 return
  //    request was declined, and 5 have already been returned — the remaining
  //    4 haven't shipped yet."
  if (awaitingDelivery > 0 && order.deliveredCount > 0) {
    const retF: string[] = []
    if (totalEligibleUnits > 0)
      retF.push(totalEligibleUnits === 1 ? "1 is ready to return" : `${totalEligibleUnits} are ready to return`)
    if (requested > 0)
      retF.push(requested === 1 ? "1 return request is awaiting our review" : `${requested} return requests are awaiting our review`)
    if (inProgress > 0)
      retF.push(inProgress === 1 ? "1 return is being processed" : `${inProgress} returns are being processed`)
    if (declined > 0)
      retF.push(declined === 1 ? "1 return request was declined" : `${declined} return requests were declined`)
    if (expired > 0) {
      const dp = showWindowDate && expiredDateStr ? ` (window closed ${expiredDateStr})` : ""
      retF.push(expired === 1 ? `1 is past the return window${dp}` : `${expired} are past the return window${dp}`)
    }
    if (completed > 0)
      retF.push(completed === 1 ? "1 has already been returned" : `${completed} have already been returned`)
    if (refunded > 0)
      retF.push(refunded === 1 ? "1 has already been refunded" : `${refunded} have already been refunded`)
    if (finalSale > 0)
      retF.push(finalSale === 1 ? "1 was final sale and can't be returned" : `${finalSale} were final sale and can't be returned`)
    if (other > 0)
      retF.push(other === 1 ? "1 isn't eligible" : `${other} aren't eligible`)

    if (retF.length > 0) {
      const dc = order.deliveredCount
      const deliveredStr = `Of the ${dc} delivered item${dc !== 1 ? "s" : ""}`
      const retStr = retF.length === 1
        ? retF[0]
        : retF.slice(0, -1).join(", ") + ", and " + retF[retF.length - 1]
      const awaitTail = notShipped > 0 && inTransit === 0 && ofd === 0 && attempted === 0
        ? (awaitingDelivery === 1 ? "the remaining 1 hasn't shipped yet" : `the remaining ${awaitingDelivery} haven't shipped yet`)
        : inTransit > 0 && notShipped === 0 && ofd === 0 && attempted === 0
          ? (awaitingDelivery === 1 ? "the remaining 1 is still on its way" : `the remaining ${awaitingDelivery} are still on their way`)
          : ofd > 0 && notShipped === 0 && inTransit === 0 && attempted === 0
            ? (awaitingDelivery === 1 ? "the remaining 1 is out for delivery today" : `the remaining ${awaitingDelivery} are out for delivery today`)
            : (awaitingDelivery === 1 ? "the remaining 1 hasn't arrived yet" : `the remaining ${awaitingDelivery} haven't arrived yet`)
      return `${intro} ${deliveredStr}, ${retStr} — ${awaitTail}.`
    }
  }

  // ── Default: build paragraph with clauses, suppressing delivery fragments
  //    that are already covered by the fulfillment clause ───────────────────
  const fparts = buildOrderFulfillmentBreakdownParts(order)
  const hasFulfillmentClause = fparts.length > 1
  const fulfillmentClause    = hasFulfillmentClause
    ? " " + fparts.map((p, i) => i === 0 ? cap(p) : p).join(", ") + "."
    : ""

  // Eligible clause — suppress when fulfillment clause already contextualises it
  let eligibleClause: string
  if (totalEligibleUnits === n) {
    eligibleClause = n === 1 ? " It is ready to return." : ` All ${n} items are ready to return.`
  } else if (totalEligibleUnits > 0) {
    // If fulfillment clause already said "N delivered" and eligible === delivered, be concise
    if (hasFulfillmentClause && totalEligibleUnits === order.deliveredCount) {
      eligibleClause = totalEligibleUnits === 1
        ? " The delivered item is ready to return."
        : ` The ${totalEligibleUnits} delivered items are ready to return.`
    } else {
      eligibleClause = totalEligibleUnits === 1
        ? " 1 item is ready to return."
        : ` ${totalEligibleUnits} items are ready to return.`
    }
  } else {
    eligibleClause = " None of the items are currently eligible to return."
  }

  // Ineligible fragments — skip delivery-state ones when fulfillment clause covers them
  const fragments: string[] = []
  if (requested > 0)
    fragments.push(requested === 1 ? "1 return request is awaiting our review" : `${requested} return requests are awaiting our review`)
  if (inProgress > 0)
    fragments.push(inProgress === 1 ? "1 return is being processed" : `${inProgress} returns are being processed`)
  if (declined > 0)
    fragments.push(declined === 1 ? "1 return request was declined" : `${declined} return requests were declined`)
  if (!hasFulfillmentClause && attempted > 0)
    fragments.push(attempted === 1 ? "1 item had a failed delivery attempt — please rebook or collect before returning" : `${attempted} items had failed delivery attempts`)
  if (!hasFulfillmentClause && ofd > 0)
    fragments.push(ofd === 1 ? "1 item is out for delivery today and will be returnable once it arrives" : `${ofd} items are out for delivery today and will be returnable once they arrive`)
  if (!hasFulfillmentClause && inTransit > 0)
    fragments.push(inTransit === 1 ? "1 item is still on its way and will be returnable once delivered" : `${inTransit} items are still on their way and will be returnable once delivered`)
  if (!hasFulfillmentClause && notShipped > 0)
    fragments.push(notShipped === 1 ? "1 item hasn't been shipped yet" : `${notShipped} items haven't been shipped yet`)
  if (expired > 0) {
    const datePart = showWindowDate && expiredDateStr ? ` (closed ${expiredDateStr})` : ""
    fragments.push(expired === 1 ? `1 item is past the ${returnWindowDays}-day return window${datePart}` : `${expired} items are past the ${returnWindowDays}-day return window${datePart}`)
  }
  if (completed > 0)
    fragments.push(completed === 1 ? "1 item has already been returned" : `${completed} items have already been returned`)
  if (refunded > 0)
    fragments.push(refunded === 1 ? "1 item has already been refunded" : `${refunded} items have already been refunded`)
  if (finalSale > 0)
    fragments.push(finalSale === 1 ? "1 item was final sale and can't be returned" : `${finalSale} items were final sale and can't be returned`)
  if (other > 0)
    fragments.push(other === 1 ? "1 item isn't eligible for return" : `${other} items aren't eligible for return`)

  // Inline join — lowercase, no leading space, no trailing period (used inside a sentence)
  const inline = (f: string[]) =>
    f.length === 0 ? "" :
    f.length === 1 ? f[0] :
    f.slice(0, -1).join(", ") + ", and " + f[f.length - 1]

  // Blend reasons directly into the eligibility sentence
  if (fragments.length > 0 && totalEligibleUnits === 0) {
    return `${intro}${fulfillmentClause} None of the items are currently eligible to return — ${inline(fragments)}.`
  }
  if (fragments.length > 0 && totalEligibleUnits > 0) {
    const readyStr = totalEligibleUnits === 1 ? "1 item is ready to return" : `${totalEligibleUnits} items are ready to return`
    const otherCount = n - totalEligibleUnits
    return `${intro}${fulfillmentClause} ${cap(readyStr)}. The other ${otherCount}: ${inline(fragments)}.`
  }

  return intro + fulfillmentClause + eligibleClause
}

// ─── Spinning conic-gradient border alert (matches button technique) ──────────
function SnakeBorderAlert({ paragraph }: { paragraph: string }) {
  const [expanded, setExpanded] = useState(false)
  const [overflows, setOverflows] = useState(false)
  const textRef = useRef<HTMLParagraphElement>(null)

  // Measure whether the clamped text actually overflows — skip when expanded
  // so overflows stays true and the "Show less" button remains visible
  useLayoutEffect(() => {
    if (expanded) return
    const el = textRef.current
    if (!el) return
    setOverflows(el.scrollHeight > el.clientHeight + 1)
  }, [expanded, paragraph])

  return (
    <div
      className="relative rounded-lg overflow-hidden p-px"
      style={{ background: "hsl(var(--border))" }}
    >
      {/* Spinning bright light sweeps over the static border */}
      <motion.div
        className="absolute pointer-events-none"
        style={{
          inset: "-100%",
          width: "300%",
          height: "300%",
          background:
            "conic-gradient(from 0deg, transparent 65%, currentColor 75%, transparent 85%)",
          opacity: 0.55,
        }}
        animate={{ rotate: 360 }}
        transition={{ duration: 6, repeat: Infinity, ease: "linear" }}
        aria-hidden
      />
      {/* Inner content */}
      <div className="relative rounded-lg bg-card px-4 py-3 text-foreground">
        <div className="flex items-start gap-3">
          <Info className="size-4 mt-0.5 shrink-0" aria-hidden />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold tracking-tight">Order summary</p>
            <p
              ref={textRef}
              className={cn(
                "text-xs text-muted-foreground mt-1 leading-relaxed",
                !expanded && "line-clamp-2",
              )}
            >
              {paragraph}
            </p>
            {overflows && (
              <button
                type="button"
                onClick={() => setExpanded(e => !e)}
                className="mt-1 text-xs font-medium text-foreground/50 hover:text-foreground transition-colors"
              >
                {expanded ? "Show less" : "Read more"}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// Wrapper: computes narrative from an Order, renders SnakeBorderAlert
function OrderSummaryAlertFromOrder({ order, returnWindowDays }: { order: Order; returnWindowDays: number }) {
  const eligibleItems   = useMemo(
    () => order.processedItems.filter(i => i.returnStatus === "Eligible" && i.eligibleQuantity > 0),
    [order],
  )
  const ineligibleItems = useMemo(() => buildIneligibleDisplayItems(order), [order])
  const totalEligibleUnits = eligibleItems.reduce((s, i) => s + i.eligibleQuantity, 0)
  const paragraph = useMemo(
    () => buildNarrativeParagraph(order, totalEligibleUnits, ineligibleItems, returnWindowDays),
    [order, totalEligibleUnits, ineligibleItems, returnWindowDays],
  )
  return <SnakeBorderAlert key={order.id} paragraph={paragraph} />
}

// ─── Sticky header strip: edge-to-edge, bottom-border only, sweeping light ────
function StickyOrderSummaryStrip({ order, returnWindowDays }: { order: Order; returnWindowDays: number }) {
  const eligibleItems      = useMemo(
    () => order.processedItems.filter(i => i.returnStatus === "Eligible" && i.eligibleQuantity > 0),
    [order],
  )
  const ineligibleItems    = useMemo(() => buildIneligibleDisplayItems(order), [order])
  const totalEligibleUnits = eligibleItems.reduce((s, i) => s + i.eligibleQuantity, 0)
  const paragraph          = useMemo(
    () => buildNarrativeParagraph(order, totalEligibleUnits, ineligibleItems, returnWindowDays, { showWindowDate: false }),
    [order, totalEligibleUnits, ineligibleItems, returnWindowDays],
  )

  const [summaryOpen, setSummaryOpen] = useState(false)
  useEffect(() => { setSummaryOpen(false) }, [order.id])

  // No order name — already shown in the header title above
  const triggerLabel = totalEligibleUnits > 0
    ? `${totalEligibleUnits} item${totalEligibleUnits !== 1 ? "s" : ""} ready to return`
    : order.cancelledAt
      ? "Order cancelled"
      : "Order summary"

  // Align the ⓘ icon's CENTER with the □ sidebar icon's center above.
  // Sidebar: size-7 button (-ml-1) at 1rem padding → icon center = 1.625rem.
  // ⓘ is size-3.5 (0.875rem) → left edge must sit at 1.625 - 0.4375 = 1.1875rem.
  const hPad: React.CSSProperties = {
    paddingLeft:  "1.1875rem",
    paddingRight: "max(1rem, env(safe-area-inset-right))",
  }

  return (
    <div className="relative shrink-0">
      {/* Trigger keeps the muted header background */}
      <button
        type="button"
        onClick={() => setSummaryOpen(o => !o)}
        aria-expanded={summaryOpen}
        className="flex w-full items-center justify-between py-3 text-xs font-medium text-foreground bg-muted/20 text-left"
        style={hPad}
      >
        <span className="flex items-center gap-2 min-w-0">
          <Info className="size-3.5 shrink-0 text-foreground/60" aria-hidden />
          <span className="truncate">{triggerLabel}</span>
        </span>
        <ChevronDown className={cn("size-3.5 shrink-0 text-foreground/50 transition-transform duration-300", summaryOpen && "rotate-180")} aria-hidden />
      </button>

      {/* Content: white background, full-width top border. Same CSS grid-rows
          technique the sidebar uses for its expand/collapse — a GPU-friendly
          CSS transition instead of a JS-driven height:auto animation, which is
          what caused the lag on mobile. */}
      <div
        className={cn(
          "grid overflow-hidden transition-[grid-template-rows] duration-250 ease-in-out",
          summaryOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
        )}
      >
        <div className="min-h-0 bg-card border-t border-border">
          <div className="pt-2 pb-2" style={hPad}>
            <p className="text-xs text-muted-foreground leading-relaxed">{paragraph}</p>
          </div>
        </div>
      </div>

      {/* Static bottom border */}
      <div className="absolute bottom-0 left-0 right-0 h-px bg-border" />
      {/* Sweeping light */}
      <motion.div
        className="absolute bottom-0 h-px opacity-70"
        style={{
          width: "30%",
          background: "linear-gradient(to right, transparent, currentColor, transparent)",
        }}
        animate={{ left: ["-30%", "100%"] }}
        transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
      />
    </div>
  )
}

function CountBadge({
  value,
  variant = "brand",
}: {
  value: number | string
  variant?: "brand" | "green"
}) {
  const base = "inline-flex items-center justify-center rounded-full text-[11px] font-semibold min-w-7 h-7 px-1"
  if (variant === "green") {
    return <span className={cn(base, "bg-green-50 text-green-700 border border-green-200")}>{value}</span>
  }
  return (
    <span
      className={cn(base, "text-[var(--brand)]")}
      style={{ backgroundColor: "#FFF5F5", border: "1px solid #FECACA" }}
    >
      {value}
    </span>
  )
}

// ─── Status pill for order header card ───────────────────────────────────────
function getOrderStatusSegment(order: Order): { text: string; label: string } | null {
  const { orderStatus, cancelledAt } = order
  if (cancelledAt) return null
  const map: Record<string, [string, string]> = {
    "Delivered":            ["text-green-700",  "Delivered"],
    "Partially delivered":  ["text-amber-700",  "Partially delivered"],
    "On its way":           ["text-blue-700",   "On its way"],
    "Partially dispatched": ["text-blue-700",   "Partially dispatched"],
    "Out for delivery":     ["text-indigo-700", "Out for delivery"],
    "Attempted delivery":   ["text-rose-700",   "Attempted delivery"],
    "Confirmed":            ["text-zinc-600",   "Confirmed"],
  }
  const [text, label] = map[orderStatus] || ["text-zinc-600", orderStatus]
  return { text, label }
}

function getOrderFulfillmentHeadline(order: Order): string {
  if (order.cancelledAt) return "Cancelled"
  switch (order.orderStatus) {
    case "Delivered":            return "Delivered"
    case "Partially delivered":  return "Partially delivered"
    case "On its way":           return "On its way"
    case "Partially dispatched": return "Partially dispatched"
    case "Out for delivery":     return "Out for delivery"
    case "Attempted delivery":   return "Attempted delivery"
    case "Confirmed":            return "Confirmed"
    default:                     return order.orderStatus
  }
}

function buildOrderFulfillmentBreakdownParts(order: Order): string[] {
  const { deliveredCount, dispatchedCount, outForDeliveryCount, attemptedDeliveryCount, confirmedCount, notDispatchedCount } = order
  const parts: string[] = []
  if (deliveredCount > 0) parts.push(`${deliveredCount} delivered`)
  if (attemptedDeliveryCount > 0) parts.push(`${attemptedDeliveryCount} attempted delivery`)
  if (outForDeliveryCount > 0) parts.push(`${outForDeliveryCount} out for delivery`)
  if (dispatchedCount > 0) parts.push(`${dispatchedCount} on its way`)
  const notYetShipped = confirmedCount + notDispatchedCount
  if (notYetShipped > 0) parts.push(`${notYetShipped} not yet shipped`)
  return parts
}

function getOrderFulfillmentBreakdown(order: Order): string | null {
  if (order.cancelledAt) return null
  const parts = buildOrderFulfillmentBreakdownParts(order)
  if (parts.length <= 1) return null
  return parts.join(" · ")
}

function getOrderPageHeaderTitle(order: Order): string {
  return `${getOrderFulfillmentHeadline(order)} ${order.name}`
}

type OrderSummaryPart =
  | { type: "all-items"; count: number; suffix: string }
  | { type: "text"; text: string }

function orderSummaryPartFromCount(
  count: number,
  total: number,
  singular: string,
  plural: string,
  allSuffix: string,
): OrderSummaryPart {
  if (count === total) {
    if (count === 1) return { type: "text", text: singular }
    return { type: "all-items", count, suffix: allSuffix }
  }
  if (count === 1) return { type: "text", text: singular }
  return { type: "text", text: plural.replace("{n}", String(count)) }
}

function joinOrderSummarySuffixes(suffixes: string[]): string {
  if (suffixes.length <= 1) return suffixes[0] ?? ""
  if (suffixes.length === 2) return `${suffixes[0]} and ${suffixes[1]}`
  return `${suffixes.slice(0, -1).join(", ")}, and ${suffixes[suffixes.length - 1]}`
}

function collapseOrderSummaryParts(parts: OrderSummaryPart[]): string[] {
  const labels: string[] = []
  let i = 0
  while (i < parts.length) {
    const part = parts[i]
    if (part.type === "all-items") {
      const count = part.count
      const suffixes = [part.suffix]
      i++
      while (i < parts.length && parts[i].type === "all-items" && (parts[i] as { type: "all-items"; count: number; suffix: string }).count === count) {
        suffixes.push((parts[i] as { type: "all-items"; count: number; suffix: string }).suffix)
        i++
      }
      labels.push(`all ${count} items ${joinOrderSummarySuffixes(suffixes)}`)
    } else {
      labels.push(part.text)
      i++
    }
  }
  return labels
}

function joinOrderSummaryParts(intro: string, parts: OrderSummaryPart[]): string {
  const partLabels = collapseOrderSummaryParts(parts)
  if (partLabels.length === 0) return `${intro}see the items below.`

  let text = intro
  partLabels.forEach((part, i) => {
    if (i > 0) {
      text += i === partLabels.length - 1 ? ", and " : ", "
    }
    text += part
  })
  return `${text}.`
}

function buildOrderSummaryIntro(order: Order): string {
  const total = parseFloat(order.totalPriceSet.shopMoney.amount)
  const refundedAmount = order.totalRefundedSet?.shopMoney?.amount
    ? parseFloat(order.totalRefundedSet.shopMoney.amount)
    : 0
  const placedDate = new Date(order.createdAt).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  })
  const n = order.totalUnits

  let intro = `To summarise, this order was placed on ${placedDate} for £${total.toFixed(2)} (${n} item${n !== 1 ? "s" : ""}`
  if (refundedAmount > 0) intro += `, £${refundedAmount.toFixed(2)} refunded`
  intro += "), "
  return intro
}

function summaryCountPhrase(count: number, total: number, singular: string, plural: string, allLabel?: string): string {
  if (count === total && allLabel) return allLabel.replace("{n}", String(count))
  if (count === 1) return singular
  return plural.replace("{n}", String(count))
}

type OrderPageSummary = { fullText: string }

type ZeroEligibilitySkip = {
  notShipped: boolean
  inTransit: boolean
  windowExpired: boolean
  finalSale: boolean
  other: boolean
  completed: boolean
  refunded: boolean
  requested: boolean
  inProgress: boolean
  declined: boolean
}

type IneligibleReason = { count: number; because: string }

function firstIneligibleBreakdownPhrase(count: number, because: string): string {
  if (because.startsWith("they have "))  return `${count} have ${because.slice(10)}`
  if (because.startsWith("they're "))    return `${count} are ${because.slice(7)}`
  if (because.startsWith("they've "))    return `${count} have ${because.slice(7)}`
  if (because.startsWith("they can't ")) return `${count} can't ${because.slice(11)}`
  if (because.startsWith("it has "))     return `${count} has ${because.slice(7)}`
  if (because.startsWith("it's "))       return `${count} is ${because.slice(5)}`
  if (because.startsWith("it can't "))   return `${count} can't ${because.slice(9)}`
  return `${count} ${because}`
}

function joinIneligibleReasonClauses(reasons: IneligibleReason[]): string {
  if (reasons.length === 0) return ""
  if (reasons.length === 1) {
    const { count, because } = reasons[0]
    return count === 1
      ? `1 item is ineligible for return because ${because}`
      : `${count} items are ineligible for return because ${because}`
  }

  // Multiple reasons: "N items are ineligible — X have A, Y have B, and Z have C"
  const total = reasons.reduce((sum, r) => sum + r.count, 0)
  const segments = reasons.map(r => firstIneligibleBreakdownPhrase(r.count, r.because))
  const segmentStr = segments.length === 2
    ? `${segments[0]} and ${segments[1]}`
    : `${segments.slice(0, -1).join(", ")}, and ${segments[segments.length - 1]}`
  const head = total === 1 ? `1 item is ineligible for return` : `${total} items are ineligible for return`
  return `${head} — ${segmentStr}`
}

function buildZeroEligibilityExplanation(params: {
  n: number
  delivered: number
  inTransit: number
  notShipped: number
  requested: number
  inProgress: number
  completed: number
  refunded: number
  windowExpired: number
  finalSale: number
  other: number
}): { parts: OrderSummaryPart[]; skip: ZeroEligibilitySkip } {
  const {
    n, delivered, inTransit, notShipped, requested, inProgress,
    completed, refunded, windowExpired, finalSale, other,
  } = params

  const skip: ZeroEligibilitySkip = {
    notShipped: false,
    inTransit: false,
    windowExpired: false,
    finalSale: false,
    other: false,
    completed: false,
    refunded: false,
    requested: false,
    inProgress: false,
    declined: false,
  }
  const parts: OrderSummaryPart[] = []
  const waitingTotal = inTransit + notShipped

  if (notShipped === n && inTransit === 0) {
    parts.push({
      type: "text",
      text: n === 1
        ? "the item is ineligible for return because it has not yet shipped"
        : `all ${n} items are ineligible for return because they have not yet shipped`,
    })
    skip.notShipped = true
    skip.inTransit = true
    return { parts, skip }
  }

  if (inTransit === n && notShipped === 0) {
    parts.push({
      type: "text",
      text: n === 1
        ? "the item is ineligible for return because it has not yet been delivered"
        : `all ${n} items are ineligible for return because they have not yet been delivered`,
    })
    skip.inTransit = true
    return { parts, skip }
  }

  if (waitingTotal === n && delivered === 0) {
    parts.push({
      type: "text",
      text: n === 1
        ? "the item is ineligible for return because it has not yet been delivered"
        : `all ${n} items are ineligible for return because they have not yet been delivered`,
    })
    skip.notShipped = true
    skip.inTransit = true
    return { parts, skip }
  }

  if (completed === n && refunded === 0) {
    parts.push({
      type: "text",
      text: n === 1 ? "the item has already been returned" : "everything has already been returned",
    })
    skip.completed = true
    return { parts, skip }
  }

  if (refunded === n && completed === 0) {
    parts.push({
      type: "text",
      text: n === 1 ? "the item has already been refunded" : "everything has already been refunded",
    })
    skip.refunded = true
    return { parts, skip }
  }

  if (completed + refunded >= n && completed > 0 && refunded > 0) {
    parts.push({
      type: "text",
      text: n === 1
        ? "the item has already been returned and refunded"
        : "everything has already been returned or refunded",
    })
    skip.completed = true
    skip.refunded = true
    return { parts, skip }
  }

  if (windowExpired === n) {
    parts.push(
      n === 1
        ? { type: "text", text: "returns aren't available because the item is past the return window" }
        : { type: "all-items", count: n, suffix: "are past the return window, so returns aren't available" },
    )
    skip.windowExpired = true
    return { parts, skip }
  }

  if (finalSale === n) {
    parts.push(
      n === 1
        ? { type: "text", text: "returns aren't available because the item is final sale" }
        : { type: "all-items", count: n, suffix: "are final sale, so returns aren't available" },
    )
    skip.finalSale = true
    return { parts, skip }
  }

  if (delivered > 0 && waitingTotal > 0) {
    parts.push({
      type: "text",
      text: waitingTotal === 1
        ? "1 item is ineligible for return because it has not yet been delivered"
        : `${waitingTotal} items are ineligible for return because they have not yet been delivered`,
    })
    skip.notShipped = true
    skip.inTransit = true
    return { parts, skip }
  }

  if (delivered > 0 && windowExpired > 0 && windowExpired >= delivered) {
    parts.push({
      type: "text",
      text: delivered === 1
        ? "the delivered item is past the return window, so returns aren't available"
        : `the ${delivered} delivered items are past the return window, so returns aren't available`,
    })
    skip.windowExpired = true
    return { parts, skip }
  }

  if (windowExpired > 0) {
    parts.push(
      orderSummaryPartFromCount(
        windowExpired,
        n,
        "returns aren't available because the item is past the return window",
        "returns aren't available because {n} items are past the return window",
        "are past the return window, so returns aren't available",
      ),
    )
    skip.windowExpired = true
    return { parts, skip }
  }

  if (finalSale > 0) {
    parts.push(
      orderSummaryPartFromCount(
        finalSale,
        n,
        "returns aren't available because the item is final sale",
        "returns aren't available because {n} items are final sale",
        "are final sale, so returns aren't available",
      ),
    )
    skip.finalSale = true
    return { parts, skip }
  }

  if (other > 0) {
    parts.push(
      orderSummaryPartFromCount(
        other,
        n,
        "the item isn't eligible for return",
        "{n} items aren't eligible for return",
        "aren't eligible for return",
      ),
    )
    skip.other = true
    return { parts, skip }
  }

  parts.push({
    type: "text",
    text: n === 1 ? "the item is ineligible for return" : "nothing is eligible for return right now",
  })
  return { parts, skip }
}

function buildOrderPageSummary(order: Order): OrderPageSummary {
  const intro = buildOrderSummaryIntro(order)
  const n = order.totalUnits

  if (order.cancelledAt) {
    return { fullText: `${intro}it was cancelled and returns aren't available.` }
  }

  const totalEligibleUnits = order.processedItems
    .filter(i => i.returnStatus === "Eligible" && i.eligibleQuantity > 0)
    .reduce((s, i) => s + i.eligibleQuantity, 0)

  const ineligibleItems = buildIneligibleDisplayItems(order)
  const buckets = ineligibleBucketCounts(ineligibleItems)

  const delivered = order.deliveredCount
  const inTransit = buckets.in_transit || 0
  const notShipped = (buckets.not_shipped || 0) + (buckets.preparing || 0)
  const requested = buckets.requested || 0
  const inProgress = buckets.in_progress || 0
  const declined = buckets.declined || 0
  const completed = buckets.completed || 0
  const refunded = buckets.refunded || 0
  const windowExpired = buckets.window || 0
  const finalSale = buckets.final_sale || 0
  const other = buckets.other || 0

  const partLabels: OrderSummaryPart[] = []
  let zeroSkip: ZeroEligibilitySkip = {
    notShipped: false,
    inTransit: false,
    windowExpired: false,
    finalSale: false,
    other: false,
    completed: false,
    refunded: false,
    requested: false,
    inProgress: false,
    declined: false,
  }

  const mergeDeliveredEligible = delivered > 0 && totalEligibleUnits > 0 && delivered === totalEligibleUnits

  // If all delivered items will be explained individually by return records below,
  // don't also say "N delivered" — that would double-count the same items.
  // e.g. "9 delivered" + "9 ineligible — 3 in progress, 1 declined, 5 returned" = 18 apparent items from 13.
  const projectedReturnReasonCount = requested + inProgress + declined + completed + refunded + windowExpired + finalSale + other
  const allDeliveredExplained = totalEligibleUnits + projectedReturnReasonCount >= delivered

  if (mergeDeliveredEligible) {
    partLabels.push(
      orderSummaryPartFromCount(
        delivered,
        n,
        "1 item has been delivered and is eligible for return",
        "{n} items have been delivered and are eligible for return",
        "have been delivered and are eligible for return",
      ),
    )
  } else {
    // Show "N delivered" only when it adds context not already covered by eligible/ineligible counts
    if (delivered > 0 && (totalEligibleUnits > 0 || !allDeliveredExplained)) {
      partLabels.push(
        orderSummaryPartFromCount(
          delivered,
          n,
          "1 item has been delivered",
          "{n} items have been delivered",
          "have been delivered",
        ),
      )
    }
    if (totalEligibleUnits > 0) {
      partLabels.push(
        totalEligibleUnits === n
          ? (n === 1
            ? { type: "text", text: "the item is eligible for return" }
            : { type: "all-items", count: n, suffix: "are eligible for return" })
          : { type: "text", text: `${totalEligibleUnits} items are eligible for return` },
      )
    } else {
      const zeroEligibility = buildZeroEligibilityExplanation({
        n,
        delivered,
        inTransit,
        notShipped,
        requested,
        inProgress,
        completed,
        refunded,
        windowExpired,
        finalSale,
        other,
      })
      partLabels.push(...zeroEligibility.parts)
      zeroSkip = zeroEligibility.skip
    }
  }
  const ineligibleReasons: IneligibleReason[] = []
  if (notShipped > 0 && !zeroSkip.notShipped) ineligibleReasons.push({
    count: notShipped,
    because: notShipped === 1 ? "it has not yet shipped" : "they have not yet shipped",
  })
  if (inTransit > 0 && !zeroSkip.inTransit) ineligibleReasons.push({
    count: inTransit,
    because: inTransit === 1 ? "it has not yet been delivered" : "they have not yet been delivered",
  })
  if (requested > 0 && !zeroSkip.requested) ineligibleReasons.push({
    count: requested,
    because: requested === 1 ? "it has a pending return" : "they have pending returns",
  })
  if (inProgress > 0 && !zeroSkip.inProgress) ineligibleReasons.push({
    count: inProgress,
    because: inProgress === 1 ? "it has a return in progress" : "they have returns in progress",
  })
  if (declined > 0 && !zeroSkip.declined) ineligibleReasons.push({
    count: declined,
    because: declined === 1 ? "it has a declined return" : "they have declined returns",
  })
  if (completed > 0 && !zeroSkip.completed) {
    ineligibleReasons.push({
      count: completed,
      because: completed === 1 ? "it's already been returned" : "they've already been returned",
    })
  }
  if (refunded > 0 && !zeroSkip.refunded) {
    ineligibleReasons.push({
      count: refunded,
      because: refunded === 1 ? "it's already been refunded" : "they've already been refunded",
    })
  }
  if (windowExpired > 0 && !zeroSkip.windowExpired) ineligibleReasons.push({
    count: windowExpired,
    because: windowExpired === 1 ? "it's past the return window" : "they're past the return window",
  })
  if (finalSale > 0 && !zeroSkip.finalSale) ineligibleReasons.push({
    count: finalSale,
    because: finalSale === 1 ? "it's final sale" : "they're final sale",
  })
  if (other > 0 && !zeroSkip.other) ineligibleReasons.push({
    count: other,
    because: other === 1 ? "it can't be returned" : "they can't be returned",
  })
  if (ineligibleReasons.length > 0) {
    partLabels.push({ type: "text", text: joinIneligibleReasonClauses(ineligibleReasons) })
  }

  return { fullText: joinOrderSummaryParts(intro, partLabels) }
}

function OrderPageSummaryStrip({ order }: { order: Order }) {
  const summary = useMemo(() => buildOrderPageSummary(order), [order])
  const scrollRef = useRef<HTMLDivElement>(null)
  const [scrollHints, setScrollHints] = useState({ left: false, right: false, overflow: false })

  const updateScrollHints = useCallback(() => {
    const el = scrollRef.current
    if (!el) return
    const { scrollLeft, scrollWidth, clientWidth } = el
    const overflow = scrollWidth - clientWidth > 2
    setScrollHints({
      left: overflow && scrollLeft > 2,
      right: overflow && scrollLeft + clientWidth < scrollWidth - 2,
      overflow,
    })
  }, [])

  useLayoutEffect(() => {
    updateScrollHints()
    const el = scrollRef.current
    if (!el) return
    el.addEventListener("scroll", updateScrollHints, { passive: true })
    const observer = new ResizeObserver(updateScrollHints)
    observer.observe(el)
    return () => {
      el.removeEventListener("scroll", updateScrollHints)
      observer.disconnect()
    }
  }, [summary.fullText, updateScrollHints])

  useEffect(() => {
    const el = scrollRef.current
    if (!el || !scrollHints.overflow) return
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return

    let raf = 0
    let direction = 1
    let paused = false
    let pauseUntil = performance.now() + 2500
    const speed = 0.45

    const step = (now: number) => {
      if (!paused && now >= pauseUntil) {
        const max = el.scrollWidth - el.clientWidth
        if (max > 0) {
          el.scrollLeft = Math.min(max, Math.max(0, el.scrollLeft + direction * speed))
          if (el.scrollLeft >= max - 1) {
            direction = -1
            pauseUntil = now + 1800
          } else if (el.scrollLeft <= 1) {
            direction = 1
            pauseUntil = now + 2500
          }
        }
      }
      raf = requestAnimationFrame(step)
    }

    raf = requestAnimationFrame(step)

    const pause = () => { paused = true }
    const resume = () => { paused = false }
    el.addEventListener("mouseenter", pause)
    el.addEventListener("mouseleave", resume)
    el.addEventListener("touchstart", pause, { passive: true })
    el.addEventListener("touchend", resume, { passive: true })
    el.addEventListener("touchcancel", resume, { passive: true })

    return () => {
      cancelAnimationFrame(raf)
      el.removeEventListener("mouseenter", pause)
      el.removeEventListener("mouseleave", resume)
      el.removeEventListener("touchstart", pause)
      el.removeEventListener("touchend", resume)
      el.removeEventListener("touchcancel", resume)
    }
  }, [scrollHints.overflow, summary.fullText])

  const scrollMask = useMemo((): React.CSSProperties | undefined => {
    const fade = "3rem"
    if (scrollHints.left && scrollHints.right) {
      const mask = `linear-gradient(to right, transparent, black ${fade}, black calc(100% - ${fade}), transparent)`
      return { WebkitMaskImage: mask, maskImage: mask }
    }
    if (scrollHints.right) {
      const mask = `linear-gradient(to right, black calc(100% - ${fade}), transparent)`
      return { WebkitMaskImage: mask, maskImage: mask }
    }
    if (scrollHints.left) {
      const mask = `linear-gradient(to right, transparent, black ${fade})`
      return { WebkitMaskImage: mask, maskImage: mask }
    }
    return undefined
  }, [scrollHints])

  return (
    <div className="shrink-0 border-b border-border bg-muted/20 px-4 py-3">
      <div className="flex min-w-0 items-center gap-2">
        <Info className="size-3.5 shrink-0 text-foreground" aria-hidden />
        <div className="relative min-w-0 flex-1">
          <div
            ref={scrollRef}
            style={scrollMask}
            tabIndex={scrollHints.overflow ? 0 : undefined}
            className={cn(
              "overflow-x-auto scrollbar-none [-webkit-overflow-scrolling:touch]",
              scrollHints.overflow && "focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:ring-offset-1 rounded-sm",
            )}
          >
            <p className={cn(
              "whitespace-nowrap text-xs font-medium leading-snug text-foreground",
              scrollHints.right && "pr-8",
              scrollHints.left && "pl-4",
            )}>
              {summary.fullText}
            </p>
          </div>
          {scrollHints.left && (
            <div
              className="pointer-events-none absolute inset-y-0 left-0 flex w-10 items-center bg-linear-to-r from-white/95 via-white/60 to-transparent dark:from-background/95 dark:via-background/60 pl-0.5"
              aria-hidden
            >
              <ChevronRight className="size-3 rotate-180 text-foreground/55" strokeWidth={2} />
            </div>
          )}
          {scrollHints.right && (
            <div
              className="pointer-events-none absolute inset-y-0 right-0 flex w-10 items-center justify-end bg-linear-to-l from-white/95 via-white/60 to-transparent dark:from-background/95 dark:via-background/60 pr-0.5"
              aria-hidden
            >
              <ChevronRight className="size-3 text-foreground/55" strokeWidth={2} />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function StatusPill({ order }: { order: Order }) {
  const { cancelledAt } = order
  if (cancelledAt) return (
    <span className="inline-flex items-center gap-1.5 text-xs font-medium bg-red-50 text-red-700 border border-red-200 px-2.5 py-1 rounded-full shrink-0">
      <span className="size-1.5 rounded-full bg-red-500" />Cancelled
    </span>
  )
  const seg = getOrderStatusSegment(order)
  if (!seg) return null
  const borders: Record<string, string> = {
    "text-green-700":  "border-green-200",
    "text-amber-700":  "border-amber-200",
    "text-blue-700":   "border-blue-200",
    "text-indigo-700": "border-indigo-200",
    "text-rose-700":   "border-rose-200",
    "text-zinc-600":   "border-zinc-200",
  }
  return (
    <span className={cn("inline-flex items-center text-xs font-medium border px-2.5 py-1 rounded-full shrink-0 bg-card", seg.text, borders[seg.text] || "border-zinc-200")}>
      {seg.label}
    </span>
  )
}

function getStatusIcon(orderStatus: string): LucideIcon {
  switch (orderStatus) {
    case "Delivered":            return CheckCircle2
    case "Partially delivered":  return Package
    case "On its way":
    case "Partially dispatched":
    case "Out for delivery":
    case "Attempted delivery":   return Truck
    default:                     return Clock
  }
}

function getOrderHeaderStatusIcon(order: Order): { icon: LucideIcon; color: string; label: string } | null {
  if (order.cancelledAt) {
    return { icon: XCircle, color: "text-red-600", label: "Cancelled" }
  }
  const seg = getOrderStatusSegment(order)
  if (!seg) return null
  switch (order.orderStatus) {
    case "Delivered":
      return { icon: CheckCircle2, color: "text-green-700", label: seg.label }
    case "Partially delivered":
      return { icon: Package, color: "text-amber-600", label: seg.label }
    case "On its way":
    case "Partially dispatched":
      return { icon: Truck, color: "text-slate-600", label: seg.label }
    default:
      return { icon: Clock, color: "text-zinc-900", label: seg.label }
  }
}

function OrderHeaderStatusIcon({ order }: { order: Order }) {
  const meta = getOrderHeaderStatusIcon(order)
  if (!meta) return null
  const { icon: Icon, color, label } = meta
  return (
    <span className="inline-flex items-center gap-1.5 shrink-0 text-sm font-bold leading-none">
      <Icon className={cn("size-3.5 shrink-0", color)} aria-hidden />
      <span className="text-foreground">{label}</span>
    </span>
  )
}

// ─── Order header stat strip — design variants (1–20, try one at a time) ─────
const HEADER_STAT_DESIGN = 6 as number

type HeaderBadgesProps = {
  order: Order
  totalEligibleUnits: number
  totalIneligibleUnits: number
  ineligibleItems: DisplayItem[]
  hasBothTabs: boolean
  fullyIneligible: boolean
  hasEligible: boolean
  activeTab: "eligible" | "ineligible"
  ineligibleStatusFilter: string[]
  onTabChange: (tab: "eligible" | "ineligible") => void
  onIneligibleFilter: (filter: ReturnStatus[]) => void
}

function HeaderStrip({ children }: { children: React.ReactNode }) {
  return (
    <div className="inline-flex items-stretch self-stretch shrink-0 border-l border-border bg-card -my-3.5 -mr-5">
      {children}
    </div>
  )
}

function HeaderStatusCell({ order }: { order: Order }) {
  const status = getOrderStatusSegment(order)
  if (!status) return null
  const Icon = getStatusIcon(order.orderStatus)
  return (
    <div className="inline-flex items-center gap-1.5 px-4 border-l border-border">
      <Icon className={cn("size-3.5 shrink-0", status.text)} aria-hidden />
      <span className={cn("text-xs font-medium whitespace-nowrap", status.text)}>{status.label}</span>
    </div>
  )
}

/** Design 1 — iOS segmented control with sliding thumb */
function HeaderDesign01({
  order,
  totalEligibleUnits,
  totalIneligibleUnits,
  hasBothTabs,
  fullyIneligible,
  hasEligible,
  activeTab,
  onTabChange,
}: HeaderBadgesProps) {
  return (
    <HeaderStrip>
      <div className="inline-flex items-center px-3">
        {hasBothTabs ? (
          <div className="relative inline-flex rounded-lg bg-muted p-1">
            <button
              type="button"
              onClick={() => onTabChange("eligible")}
              className={cn(
                "relative z-10 px-3 py-1.5 text-xs font-medium rounded-md transition-colors min-w-28 text-center",
                activeTab === "eligible" ? "text-foreground" : "text-muted-foreground hover:text-foreground",
              )}
            >
              {activeTab === "eligible" && (
                <motion.span
                  layoutId="header-seg-thumb"
                  className="absolute inset-0 bg-card rounded-md shadow-xs -z-10"
                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
                />
              )}
              <span className="tabular-nums font-semibold text-green-700">{totalEligibleUnits}</span>
              <span className="text-muted-foreground"> ready</span>
            </button>
            <button
              type="button"
              onClick={() => onTabChange("ineligible")}
              className={cn(
                "relative z-10 px-3 py-1.5 text-xs font-medium rounded-md transition-colors min-w-28 text-center",
                activeTab === "ineligible" ? "text-foreground" : "text-muted-foreground hover:text-foreground",
              )}
            >
              {activeTab === "ineligible" && (
                <motion.span
                  layoutId="header-seg-thumb"
                  className="absolute inset-0 bg-card rounded-md shadow-xs -z-10"
                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
                />
              )}
              <span className="tabular-nums font-semibold text-[var(--brand)]">{totalIneligibleUnits}</span>
              <span className="text-muted-foreground"> blocked</span>
            </button>
          </div>
        ) : fullyIneligible ? (
          <span className="text-xs font-medium px-1 py-1.5">
            <span className="tabular-nums font-semibold text-[var(--brand)]">{totalIneligibleUnits}</span>
            <span className="text-muted-foreground"> not eligible</span>
          </span>
        ) : hasEligible ? (
          <span className="text-xs font-medium px-1 py-1.5">
            <span className="tabular-nums font-semibold text-green-700">{totalEligibleUnits}</span>
            <span className="text-muted-foreground"> ready to return</span>
          </span>
        ) : null}
      </div>
      <HeaderStatusCell order={order} />
    </HeaderStrip>
  )
}

/** Design 2 — vertical stat column (stacked rows, icon + label) */
function HeaderDesign02({
  order,
  totalEligibleUnits,
  totalIneligibleUnits,
  hasBothTabs,
  fullyIneligible,
  hasEligible,
  activeTab,
  onTabChange,
}: HeaderBadgesProps) {
  const status = getOrderStatusSegment(order)
  const StatusIcon = status ? getStatusIcon(order.orderStatus) : Truck

  const rowBase = "flex items-center gap-2 px-3 py-1.5 text-left w-full transition-colors"
  const rowActive = "bg-muted"
  const rowIdle = "hover:bg-muted/60"

  return (
    <HeaderStrip>
      <div className="flex flex-col justify-center divide-y divide-border min-w-38">
        {hasBothTabs && (
          <>
            <button
              type="button"
              onClick={() => onTabChange("eligible")}
              className={cn(rowBase, activeTab === "eligible" ? rowActive : rowIdle, activeTab !== "eligible" && "opacity-60")}
            >
              <CheckCircle2 className="size-3.5 shrink-0 text-green-700" aria-hidden />
              <span className="text-xs leading-tight">
                <span className="font-semibold tabular-nums text-green-700">{totalEligibleUnits}</span>
                <span className="text-muted-foreground"> ready</span>
              </span>
            </button>
            <button
              type="button"
              onClick={() => onTabChange("ineligible")}
              className={cn(rowBase, activeTab === "ineligible" ? rowActive : rowIdle, activeTab !== "ineligible" && "opacity-60")}
            >
              <XCircle className="size-3.5 shrink-0 text-[var(--brand)]" aria-hidden />
              <span className="text-xs leading-tight">
                <span className="font-semibold tabular-nums text-[var(--brand)]">{totalIneligibleUnits}</span>
                <span className="text-muted-foreground"> blocked</span>
              </span>
            </button>
          </>
        )}
        {fullyIneligible && (
          <div className={cn(rowBase, rowActive)}>
            <XCircle className="size-3.5 shrink-0 text-[var(--brand)]" aria-hidden />
            <span className="text-xs leading-tight">
              <span className="font-semibold tabular-nums text-[var(--brand)]">{totalIneligibleUnits}</span>
              <span className="text-muted-foreground"> not eligible</span>
            </span>
          </div>
        )}
        {hasEligible && !hasBothTabs && (
          <div className={cn(rowBase, rowActive)}>
            <CheckCircle2 className="size-3.5 shrink-0 text-green-700" aria-hidden />
            <span className="text-xs leading-tight">
              <span className="font-semibold tabular-nums text-green-700">{totalEligibleUnits}</span>
              <span className="text-muted-foreground"> ready</span>
            </span>
          </div>
        )}
        {status && (
          <div className={cn(rowBase, hasBothTabs && "cursor-default")}>
            <StatusIcon className={cn("size-3.5 shrink-0", status.text)} aria-hidden />
            <span className={cn("text-xs font-medium leading-tight", status.text)}>{status.label}</span>
          </div>
        )}
      </div>
    </HeaderStrip>
  )
}

/** Design 3 — stats inline in meta line; status pill only on the right */
function HeaderMetaStats({
  totalEligibleUnits,
  totalIneligibleUnits,
  hasBothTabs,
  fullyIneligible,
  hasEligible,
  activeTab,
  onTabChange,
}: Pick<HeaderBadgesProps, "totalEligibleUnits" | "totalIneligibleUnits" | "hasBothTabs" | "fullyIneligible" | "hasEligible" | "activeTab" | "onTabChange">) {
  const link = (active: boolean) => cn(
    "tabular-nums hover:underline",
    active ? "font-semibold" : "font-medium opacity-70",
  )

  if (hasBothTabs) {
    return (
      <>
        {" · "}
        <button type="button" onClick={() => onTabChange("eligible")} className={cn(link(activeTab === "eligible"), "text-green-700")}>
          {totalEligibleUnits} ready
        </button>
        {" · "}
        <button type="button" onClick={() => onTabChange("ineligible")} className={cn(link(activeTab === "ineligible"), "text-[var(--brand)]")}>
          {totalIneligibleUnits} blocked
        </button>
      </>
    )
  }
  if (fullyIneligible) {
    return (
      <>
        {" · "}
        <span className="text-[var(--brand)] font-medium tabular-nums">{totalIneligibleUnits} not eligible</span>
      </>
    )
  }
  if (hasEligible) {
    return (
      <>
        {" · "}
        <span className="text-green-700 font-medium tabular-nums">{totalEligibleUnits} ready to return</span>
      </>
    )
  }
  return null
}

function HeaderDesign03({ order }: Pick<HeaderBadgesProps, "order">) {
  return <StatusPill order={order} />
}

/** Design 4 — row 1: order + status pill; row 2: full-width tab bar */
function HeaderDesign04TabBar({
  totalEligibleUnits,
  totalIneligibleUnits,
  hasBothTabs,
  fullyIneligible,
  hasEligible,
  activeTab,
  onTabChange,
}: HeaderBadgesProps) {
  if (hasBothTabs) {
    const tab = (t: "eligible" | "ineligible", label: string, count: number, accent: string) => (
      <button
        type="button"
        onClick={() => onTabChange(t)}
        className={cn(
          "flex-1 py-2.5 text-sm font-medium relative transition-colors",
          activeTab === t ? "text-foreground font-semibold bg-card" : "text-muted-foreground bg-muted/40 hover:bg-muted/55",
        )}
      >
        {label} ({count})
        {activeTab === t && <span className={cn("absolute bottom-0 left-0 right-0 h-0.5", accent)} />}
      </button>
    )
    return (
      <div className="flex border-b bg-muted/40">
        {tab("eligible", "Eligible", totalEligibleUnits, "bg-green-600")}
        <div className="w-px bg-border self-stretch" aria-hidden />
        {tab("ineligible", "Ineligible", totalIneligibleUnits, "bg-[var(--brand)]")}
      </div>
    )
  }
  if (fullyIneligible || hasEligible) {
    const count = fullyIneligible ? totalIneligibleUnits : totalEligibleUnits
    const label = fullyIneligible ? "Ineligible" : "Eligible"
    const color = fullyIneligible ? "text-[var(--brand)]" : "text-green-700"
    return (
      <div className="border-b bg-card px-5 py-2.5 text-sm font-semibold">
        {label}{" "}
        <span className={cn("tabular-nums", color)}>({count})</span>
      </div>
    )
  }
  return null
}

function HeaderDesign04({ order }: Pick<HeaderBadgesProps, "order">) {
  return <StatusPill order={order} />
}

function HeaderIconTab({
  icon: Icon,
  count,
  tooltip,
  textColor,
  active,
  onClick,
}: {
  icon: LucideIcon
  count: number
  tooltip: string
  textColor: string
  active?: boolean
  onClick?: () => void
}) {
  const inner = (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1 px-3 h-full bg-card transition-colors",
        active ? "bg-muted" : "opacity-50 hover:opacity-100 hover:bg-muted/80",
      )}
    >
      <Icon className={cn("size-3.5 shrink-0", textColor)} aria-hidden />
      <span className={cn("text-sm font-semibold tabular-nums", textColor)}>{count}</span>
    </button>
  )
  return (
    <Tooltip>
      <TooltipTrigger asChild>{inner}</TooltipTrigger>
      <TooltipContent side="bottom" sideOffset={4}>{tooltip}</TooltipContent>
    </Tooltip>
  )
}

/** Design 5 — icon + count only; full label in tooltip */
function HeaderDesign05({
  order,
  totalEligibleUnits,
  totalIneligibleUnits,
  hasBothTabs,
  fullyIneligible,
  hasEligible,
  activeTab,
  onTabChange,
}: HeaderBadgesProps) {
  const status = getOrderStatusSegment(order)
  const StatusIcon = status ? getStatusIcon(order.orderStatus) : Truck

  return (
    <HeaderStrip>
      <div className="inline-flex items-stretch divide-x divide-border">
        {hasBothTabs && (
          <>
            <HeaderIconTab
              icon={CheckCircle2}
              count={totalEligibleUnits}
              tooltip={`${totalEligibleUnits} ready to return`}
              textColor="text-green-700"
              active={activeTab === "eligible"}
              onClick={() => onTabChange("eligible")}
            />
            <HeaderIconTab
              icon={XCircle}
              count={totalIneligibleUnits}
              tooltip={`${totalIneligibleUnits} not eligible`}
              textColor="text-[var(--brand)]"
              active={activeTab === "ineligible"}
              onClick={() => onTabChange("ineligible")}
            />
          </>
        )}
        {fullyIneligible && (
          <HeaderIconTab
            icon={XCircle}
            count={totalIneligibleUnits}
            tooltip={`${totalIneligibleUnits} not eligible`}
            textColor="text-[var(--brand)]"
            active
          />
        )}
        {hasEligible && !hasBothTabs && (
          <HeaderIconTab
            icon={CheckCircle2}
            count={totalEligibleUnits}
            tooltip={`${totalEligibleUnits} ready to return`}
            textColor="text-green-700"
            active
          />
        )}
      </div>
      {status && (
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="inline-flex items-center justify-center px-3 h-full bg-card cursor-default">
              <StatusIcon className={cn("size-3.5", status.text)} aria-label={status.label} />
            </span>
          </TooltipTrigger>
          <TooltipContent side="bottom" sideOffset={4}>{status.label}</TooltipContent>
        </Tooltip>
      )}
    </HeaderStrip>
  )
}

function HeaderHeroCell({
  count,
  caption,
  textColor,
  active,
  title,
  onClick,
}: {
  count: number
  caption: string
  textColor: string
  active?: boolean
  title?: string
  onClick?: () => void
}) {
  const cls = cn(
    "inline-flex flex-col items-center justify-center gap-0 px-3 sm:px-4 min-w-13 shrink-0 h-full bg-card transition-colors",
    onClick && "cursor-pointer hover:bg-muted/80",
    active ? "bg-muted" : onClick && "opacity-55",
  )
  const content = (
    <>
      <span className={cn("text-xl font-bold tabular-nums leading-none", textColor)}>{count}</span>
      <span className="text-[9px] uppercase tracking-wide text-muted-foreground leading-none mt-1 whitespace-nowrap">{caption}</span>
    </>
  )
  if (onClick) return <button type="button" className={cls} title={title} onClick={onClick}>{content}</button>
  return <span className={cls} title={title}>{content}</span>
}

/** Design 6 — hero blocks per ineligible category */
function HeaderDesign06({
  totalEligibleUnits,
  ineligibleItems,
  activeTab,
  ineligibleStatusFilter,
  onTabChange,
  onIneligibleFilter,
}: HeaderBadgesProps) {
  const blocks = useMemo(
    () => computeHeaderStatBlocks(totalEligibleUnits, ineligibleItems),
    [totalEligibleUnits, ineligibleItems],
  )

  const navigate = (block: HeaderStatBlock) => {
    onTabChange(block.tab)
    onIneligibleFilter(block.statusFilter)
  }

  const isBlockActive = (block: HeaderStatBlock) => {
    if (block.tab === "eligible") {
      return activeTab === "eligible" && ineligibleStatusFilter.length === 0
    }
    if (activeTab !== "ineligible") return false
    if (block.statusFilter.length === 0) return ineligibleStatusFilter.length === 0
    return statusFiltersMatch(ineligibleStatusFilter, block.statusFilter)
  }

  return (
    <HeaderStrip>
      <div className="inline-flex items-stretch divide-x divide-border overflow-x-auto max-w-[min(100vw-2rem,32rem)]">
        {blocks.map(block => (
          <HeaderHeroCell
            key={block.id}
            count={block.count}
            caption={block.caption}
            textColor={block.textColor}
            title={block.title}
            active={isBlockActive(block)}
            onClick={() => navigate(block)}
          />
        ))}
      </div>
    </HeaderStrip>
  )
}

function OrderHeaderBadges(props: HeaderBadgesProps) {
  switch (HEADER_STAT_DESIGN) {
    case 1: return <HeaderDesign01 {...props} />
    case 2: return <HeaderDesign02 {...props} />
    case 3: return <HeaderDesign03 order={props.order} />
    case 4: return <HeaderDesign04 order={props.order} />
    case 5: return <HeaderDesign05 {...props} />
    case 6: return <HeaderDesign06 {...props} />
    default: return <HeaderDesign01 {...props} />
  }
}

// ─── Order Status Badges ─────────────────────────────────────────────────────
function OrderStatusBadges({ order, deliveryDate }: { order: Order; deliveryDate?: string | null }) {
  const { orderStatus, cancelledAt, totalUnits } = order
  const fmt = (d: string) => new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })

  if (cancelledAt) {
    return <span className="text-xs text-red-600">Cancelled {fmt(cancelledAt)}</span>
  }

  const headline = getOrderFulfillmentHeadline(order)
  const breakdown = getOrderFulfillmentBreakdown(order)
  const primary = (() => {
    if (orderStatus === "Delivered" && deliveryDate) {
      return <span className="text-xs text-green-600">Delivered {fmt(deliveryDate)}</span>
    }
    switch (orderStatus) {
      case "Delivered":            return <span className="text-xs text-green-600">{headline}</span>
      case "Partially delivered":  return <span className="text-xs text-amber-600">{headline}</span>
      case "On its way":
      case "Partially dispatched":
      case "Out for delivery":     return <span className="text-xs text-blue-600">{headline}</span>
      case "Attempted delivery":   return <span className="text-xs text-rose-600">{headline}</span>
      case "Confirmed":            return <span className="text-xs text-muted-foreground">{headline}</span>
      default:                     return <span className="text-xs text-muted-foreground">{headline}</span>
    }
  })()

  const showStats = totalUnits > 0 && orderStatus !== "Delivered" && orderStatus !== "Confirmed" && orderStatus !== "Cancelled" && orderStatus !== "Attempted delivery" && orderStatus !== "Out for delivery"

  return (
    <div className="flex flex-col gap-1">
      {primary}
      {showStats && breakdown && <span className="text-[11px] leading-none text-muted-foreground">{breakdown}</span>}
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

// Shopify sometimes appends its own placeholder text ("Decline reason") one
// or more times onto the END of an otherwise-real decline note — e.g.
// "because we don't accept returns of final sale items. Decline
// reasonDecline reasonDecline reason." Strip that trailing junk so the real
// sentence in front of it survives intact, instead of showing the raw
// concatenated mess to customers.
function stripTrailingDeclineReasonJunk(note: string): string {
  return note.replace(/(\s*decline\s*reason\.?\s*)+$/i, "").trim()
}

function isGenericDeclineNote(note: string): boolean {
  const t = note.trim()
  if (!t || /^decline reason\.?$/i.test(t)) return true
  if (/^n\/?a$/i.test(t)) return true
  // Catch repeated/concatenated "Decline reason" strings from Shopify
  if (/^(decline\s*reason\.?\s*)+$/i.test(t)) return true
  // Short opaque notes (e.g. "tet") aren't useful as group headers.
  if (t.length < 12 && !/\s/.test(t) && !/[.!?]/.test(t)) return true
  return false
}

const DEFAULT_DECLINE_FALLBACK = "Your return request was declined."

function resolveDeclineMessage(message: string): string {
  const cleaned = stripTrailingDeclineReasonJunk(message)
  return isGenericDeclineNote(cleaned) ? DEFAULT_DECLINE_FALLBACK : cleaned
}

function isPermanentDeclineReason(reason?: string): boolean {
  return reason === "RETURN_PERIOD_ENDED" || reason === "RETURN_WINDOW_EXPIRED" || reason === "FINAL_SALE"
}

function hasRetryableDecline(entries: { declineReason?: string }[]): boolean {
  return entries.some(e => !isPermanentDeclineReason(e.declineReason))
}

function groupDeclinedEntries(entries: { quantity: number; message: string }[]) {
  const map = new Map<string, number>()
  for (const e of entries) {
    const msg = resolveDeclineMessage(e.message)
    map.set(msg, (map.get(msg) || 0) + e.quantity)
  }
  return [...map.entries()].map(([message, quantity]) => ({ message, quantity }))
}

function buildIneligibleDisplayItems(order: Order): DisplayItem[] {
  const result: DisplayItem[] = []

  for (const item of order.processedItems) {
    const isFullyEligible =
      item.returnStatus === "Eligible" && item.eligibleQuantity >= item.quantity
    if (isFullyEligible) continue

    const isPartiallyEligible =
      item.returnStatus === "Eligible" && item.eligibleQuantity > 0

    // Only allocate ineligible units — eligible qty never appears in this table.
    let remaining = isPartiallyEligible
      ? Math.max(0, item.quantity - item.eligibleQuantity)
      : item.quantity

    const take = (qty: number) => {
      const n = Math.min(Math.max(0, qty), remaining)
      remaining -= n
      return n
    }

    const requestedQty = take(item.requestedReturnQuantity)
    if (requestedQty > 0) {
      result.push({
        ...item,
        returnStatus: "returnRequested",
        returnReason: "",
        splitQty: requestedQty,
        splitKey: `${item.id}-requested`,
      })
    }

    const openQty = take(item.openReturnQuantity)
    if (openQty > 0) {
      result.push({
        ...item,
        returnStatus: "returnInProgress",
        returnReason: "",
        splitQty: openQty,
        splitKey: `${item.id}-open`,
      })
    }

    const completedQty = take(item.completedReturnQuantity)
    if (completedQty > 0) {
      result.push({
        ...item,
        returnStatus: "returnCompleted",
        returnReason: "",
        splitQty: completedQty,
        splitKey: `${item.id}-completed`,
      })
    }

    if (item.declinedReturnEntries.length > 0) {
      const declinedToShow = isPartiallyEligible
        ? item.declinedReturnEntries.filter(e => isPermanentDeclineReason(e.declineReason))
        : item.declinedReturnEntries
      const grouped = groupDeclinedEntries(declinedToShow)
      grouped.forEach((entry, i) => {
        const declinedQty = take(entry.quantity)
        if (declinedQty <= 0) return
        result.push({
          ...item,
          returnStatus: "returnDeclined",
          returnReason: entry.message,
          splitQty: declinedQty,
          splitKey: `${item.id}-declined-${i}`,
          declinedReturnEntries: [{ quantity: declinedQty, message: entry.message }],
        })
      })
    }

    const directRefundQty = take(item.refundedQuantity || 0)
    if (directRefundQty > 0) {
      result.push({
        ...item,
        returnStatus: "returnCompleted",
        refundStatus: "refunded",
        // No accompanying Return record exists for this quantity (it was already
        // claimed by the requested/open/completed/declined pushes above), so this
        // is strictly a direct refund. Say so explicitly rather than letting
        // getIneligibleGroupMessage fall back to the generic "already returned"
        // copy used for genuine completed returns.
        returnReason: "This item has already been refunded.",
        splitQty: directRefundQty,
        splitKey: `${item.id}-refunded`,
      })
    }

    if (isPartiallyEligible && remaining > 0) {
      const attemptedQty = item.attemptedDeliveryQuantity ?? 0
      const attemptedSplitQty = take(Math.min(remaining, attemptedQty))
      if (attemptedSplitQty > 0) {
        result.push({
          ...item,
          returnStatus: "notReturnable", notReturnableReason: "notDelivered", shippingStage: "attemptedDelivery",
          returnReason: "",
          splitQty: attemptedSplitQty,
          splitKey: `${item.id}-remainder-attempted`,
        })
      }

      const ofdQty = item.outForDeliveryQuantity ?? 0
      const ofdSplitQty = take(Math.min(remaining, ofdQty))
      if (ofdSplitQty > 0) {
        result.push({
          ...item,
          returnStatus: "notReturnable", notReturnableReason: "notDelivered", shippingStage: "outForDelivery",
          returnReason: "",
          splitQty: ofdSplitQty,
          splitKey: `${item.id}-remainder-ofd`,
        })
      }

      const inTransitQty = item.inTransitQuantity ?? 0
      const inTransitSplitQty = take(Math.min(remaining, inTransitQty))
      if (inTransitSplitQty > 0) {
        result.push({
          ...item,
          returnStatus: "notReturnable", notReturnableReason: "notDelivered", shippingStage: "onItsWay",
          returnReason: "",
          splitQty: inTransitSplitQty,
          splitKey: `${item.id}-remainder-transit`,
        })
      }
      if (remaining > 0) {
        const stillPending = !!(item.pendingQuantity && item.pendingQuantity > 0)
        result.push({
          ...item,
          returnStatus: "notReturnable",
          notReturnableReason: stillPending ? "notDelivered" : "other",
          shippingStage: stillPending ? "confirmed" : null,
          returnReason: "",
          splitQty: remaining,
          splitKey: `${item.id}-remainder-pending`,
        })
      }
    } else if (remaining > 0) {
      result.push({
        ...item,
        splitQty: remaining,
        splitKey: `${item.id}-remainder`,
      })
    }
  }

  return result
}

/** Dev-only: catch double-counting when eligible + ineligible splits ≠ order units. */
function assertOrderUnitAccounting(
  order: Order,
  eligibleUnits: number,
  ineligibleUnits: number,
  ineligibleItems: DisplayItem[],
) {
  if (process.env.NODE_ENV !== "development") return

  const accounted = eligibleUnits + ineligibleUnits
  if (accounted === order.totalUnits) return

  const lineMismatches = order.processedItems
    .map(item => {
      const lineIneligible = ineligibleItems
        .filter(i => i.id === item.id)
        .reduce((s, i) => s + (i.splitQty ?? i.quantity), 0)
      const lineEligible =
        item.returnStatus === "Eligible" && item.eligibleQuantity > 0 ? item.eligibleQuantity : 0
      const lineAccounted = lineEligible + lineIneligible
      if (lineAccounted === item.quantity) return null
      return {
        lineItemId: item.id,
        title: item.title,
        variant: item.variant?.title ?? null,
        quantity: item.quantity,
        eligible: lineEligible,
        ineligible: lineIneligible,
        accounted: lineAccounted,
        delta: item.quantity - lineAccounted,
        requested: item.requestedReturnQuantity,
        open: item.openReturnQuantity,
        completed: item.completedReturnQuantity,
        declined: item.declinedReturnQuantity,
        refunded: item.refundedQuantity,
      }
    })
    .filter(Boolean)

  console.warn(
    `[iBlaze Returns] Unit accounting mismatch on ${order.name}: ` +
      `${eligibleUnits} eligible + ${ineligibleUnits} ineligible = ${accounted}, expected ${order.totalUnits}.`,
    { lineMismatches },
  )
}

function formatDeclinedReasonText(entries: { quantity: number; message: string }[]): string {
  const grouped = groupDeclinedEntries(entries)
  if (grouped.length === 1) return grouped[0].message
  return grouped.map(e => `${e.quantity}× ${e.message}`).join("\n")
}

function ItemReasonText({ item, align = "start" }: { item: LineItem; align?: "start" | "end" }) {
  const textCls = cn(
    "text-[11px] text-muted-foreground leading-snug wrap-break-word",
    align === "start" && "mt-1 pr-1",
    align === "end" && "text-right"
  )
  const listCls = cn("space-y-1 list-none", align === "start" && "mt-1 pr-1", align === "end" && "text-right")

  if (item.returnStatus === "returnDeclined" && item.declinedReturnEntries.length > 0) {
    const grouped = groupDeclinedEntries(item.declinedReturnEntries)
    if (grouped.length === 1) {
      return <p className={textCls}>{grouped[0].message}</p>
    }
    return (
      <ul className={listCls}>
        {grouped.map(({ message, quantity }, i) => (
          <li key={i} className={cn(textCls, "flex gap-1.5 min-w-0", align === "end" && "justify-end")}>
            <span className="shrink-0 tabular-nums font-medium">{quantity}×</span>
            <span className="wrap-break-word min-w-0">{message}</span>
          </li>
        ))}
      </ul>
    )
  }

  if (!item.returnReason?.trim()) return null
  return <p className={textCls}>{item.returnReason}</p>
}

function getIneligibleGroupKey(item: LineItem, order: Order, returnWindowDays: number): string {
  if (item.returnStatus === "returnDeclined") {
    return `declined:${item.returnReason || ""}`
  }
  if (item.returnStatus === "notReturnable" && item.notReturnableReason === "outsideWindow") {
    const closed = formatReturnWindowClosedForItem(item, order, returnWindowDays) ?? "unknown"
    return `window:${closed}`
  }
  if (item.returnStatus === "notReturnable" && item.notReturnableReason === "notDelivered") {
    return `notDelivered:${item.shippingStage ?? "confirmed"}`
  }
  // Include refundStatus so a direct-refund-with-no-return row (returnStatus:
  // "returnCompleted", refundStatus: "refunded") never silently merges with a
  // genuinely-completed-return row that later also got refunded.
  return `${item.returnStatus}:${item.notReturnableReason ?? ""}:${item.refundStatus ?? ""}`
}

function ineligibleTableColSpan(cols: { variant: boolean; qty: boolean; total: boolean }) {
  return 1 + (cols.variant ? 1 : 0) + (cols.qty ? 1 : 0) + (cols.total ? 1 : 0)
}

const INELIGIBLE_STATUS_ORDER: Partial<Record<ReturnStatus, number>> = {
  "returnRequested": 0,
  "returnInProgress": 1,
  "returnDeclined": 2,
  "returnCanceled": 3,
  "returnCompleted": 4,
  "notReturnable": 5,
  "Cancelled": 6,
}

function compareIneligibleItems(a: DisplayItem, b: DisplayItem, order: Order, returnWindowDays: number) {
  const orderA = INELIGIBLE_STATUS_ORDER[a.returnStatus] ?? 99
  const orderB = INELIGIBLE_STATUS_ORDER[b.returnStatus] ?? 99
  if (orderA !== orderB) return orderA - orderB
  const keyCmp = getIneligibleGroupKey(a, order, returnWindowDays).localeCompare(getIneligibleGroupKey(b, order, returnWindowDays))
  if (keyCmp !== 0) return keyCmp
  const titleCmp = a.title.localeCompare(b.title)
  if (titleCmp !== 0) return titleCmp
  return (a.splitKey ?? a.id).localeCompare(b.splitKey ?? b.id)
}

function formatGroupCount(rows: DisplayItem[]) {
  const units = rows.reduce((s, i) => s + (i.splitQty ?? i.quantity), 0)
  if (rows.length === 1) return `${units} unit${units !== 1 ? "s" : ""}`
  return `${rows.length} lines · ${units} units`
}

function getStatusStyle(status: ReturnStatus, styles: ReturnLifecycleStyles): ReturnLifecycleStyle {
  return styles[status as Exclude<ReturnStatus, "Eligible" | "Cancelled">] ?? styles.notReturnable
}

function getIneligibleCoarseLabel(status: ReturnStatus, styles: ReturnLifecycleStyles): string {
  return getStatusStyle(status, styles).label
}

// More descriptive titles for the mobile group accordion (distinct from the
// coarse labels used in the filter dropdown).
function getIneligibleAccordionTitle(status: ReturnStatus, styles: ReturnLifecycleStyles): string {
  return getStatusStyle(status, styles).heading
}

function getReturnStatusIcon(status: ReturnStatus, styles: ReturnLifecycleStyles): { icon: React.ElementType; color: string; label: string } {
  const style = getStatusStyle(status, styles)
  return { icon: getIneligibleStatusIconComponent(style.icon), color: style.color, label: style.label }
}

/** One customer-facing sentence per group — Sidekick-approved copy, no redundant label + sub-line. */
function fillMessagePlaceholders(template: string, tokens: Record<string, string>): string {
  return Object.entries(tokens).reduce((s, [key, value]) => s.split(`{${key}}`).join(value), template)
}

function getIneligibleGroupMessage(item: LineItem, order: Order, returnWindowDays: number, messages: ReturnLifecycleMessages, groupItems?: LineItem[]): string {
  const days = String(returnWindowDays)
  switch (item.returnStatus) {
    case "notReturnable": {
      if (item.notReturnableReason === "notDelivered") {
        const stage = item.shippingStage ?? "confirmed"
        const key = SHIPPING_STAGE_MESSAGE_KEY[stage]
        return fillMessagePlaceholders(messages[key], { days })
      }
      if (item.notReturnableReason === "outsideWindow") {
        const closed = formatReturnWindowClosedForItem(item, order, returnWindowDays, groupItems)
        return closed
          ? fillMessagePlaceholders(messages.outsideWindow, { closedDate: closed })
          : messages.outsideWindowNoDate
      }
      if (item.notReturnableReason === "finalSale") return messages.finalSale
      return messages.otherNotReturnable
    }
    case "returnRequested":
      return messages.returnRequested
    case "returnInProgress":
      return messages.returnInProgress
    case "returnDeclined":
      return resolveDeclineMessage(item.returnReason || "Your return request was declined.")
    case "returnCanceled":
      return messages.returnCanceled
    case "returnCompleted":
      // Genuine completed returns push returnReason: "" and fall through to the
      // generic copy. Direct refunds with no Return record (see the
      // directRefundQty push above) carry a specific, correct sentence — prefer
      // it when present.
      return item.returnReason || messages.returnCompleted
    default:
      return messages.otherNotReturnable
  }
}

function getIneligibleFilterOptions(items: DisplayItem[], styles: ReturnLifecycleStyles): { label: string; statuses: ReturnStatus[] }[] {
  const groups = new Map<string, ReturnStatus[]>()
  for (const item of items) {
    const label = getIneligibleCoarseLabel(item.returnStatus, styles)
    const existing = groups.get(label) ?? []
    if (!existing.includes(item.returnStatus)) existing.push(item.returnStatus)
    groups.set(label, existing)
  }
  return Array.from(groups.entries()).map(([label, statuses]) => ({ label, statuses }))
}

/**
 * The mobile accordion's header is a fixed descriptive title
 * (getIneligibleAccordionTitle) while the body is a merchant-editable
 * message (Settings > Table & search > Status messages) — the two are
 * independent strings that often say the same thing. Detected dynamically
 * (not hardcoded per-status) so it keeps working if a merchant edits a
 * message to newly overlap with, or diverge from, its title.
 * Returns null when the message adds nothing beyond the title.
 */
function dedupeAccordionContent(title: string, message: string): string | null {
  const normalize = (s: string) => s.trim().replace(/[.!]+$/, "").toLowerCase()
  if (normalize(message) === normalize(title)) return null
  if (message.toLowerCase().startsWith(title.toLowerCase())) {
    const rest = message.slice(title.length).replace(/^[.!]+\s*/, "")
    return rest.length > 0 ? rest : null
  }
  return message
}

function IneligibleGroupSummary({ item, order, groupItems, count, returnWindowDays, returnLifecycleMessages, returnLifecycleStyles, refundStatusLabels }: { item: LineItem; order: Order; groupItems?: LineItem[]; count: string; returnWindowDays: number; returnLifecycleMessages: ReturnLifecycleMessages; returnLifecycleStyles: ReturnLifecycleStyles; refundStatusLabels: RefundStatusLabels }) {
  const refundLabel = item.refundStatus && item.refundStatus !== "notRefunded" ? refundStatusLabels[item.refundStatus] : ""
  const { icon: Icon, color } = getReturnStatusIcon(item.returnStatus, returnLifecycleStyles)
  // color is a merchant-set hex (inline style) or "" (default theme color,
  // via the text-foreground class) — never both, so dark mode still works
  // for merchants who never touch this.
  const iconColorProps = color ? { style: { color } } : { className: "text-foreground" }
  const message = getIneligibleGroupMessage(item, order, returnWindowDays, returnLifecycleMessages, groupItems)
  const title = getIneligibleAccordionTitle(item.returnStatus, returnLifecycleStyles)
  const content = dedupeAccordionContent(title, message)
  const [open, setOpen] = useState(false)

  return (
    <>
      {/* Desktop: full message inline + count on the right. Padding lives here
          (parent cell is p-0) so the mobile content panel can go edge-to-edge. */}
      <div className="hidden min-[1025px]:flex items-center justify-between gap-x-4 py-3 pl-5 pr-4">
        <p className="my-0 min-w-0 flex-1 text-[11px] leading-snug text-muted-foreground wrap-break-word">
          <Icon className={cn("mr-1 inline size-3 shrink-0 align-[-0.15em]", iconColorProps.className)} style={iconColorProps.style} aria-hidden />
          {message}
        </p>
        <span className="flex items-center gap-1.5 shrink-0">
          {refundLabel && <span className="text-[10px] font-medium text-muted-foreground">{refundLabel}</span>}
          <span className="text-[10px] font-medium leading-snug text-muted-foreground tabular-nums">{count}</span>
        </span>
      </div>

      {/* Mobile: collapsible — descriptive title + count far right (muted title row);
          expanded message is a full-width edge-to-edge white panel. When the
          message adds nothing beyond the title (content === null), it's a
          static row instead — no chevron, nothing to expand. */}
      <div className="min-[1025px]:hidden">
        {content === null ? (
          <div className="flex items-center gap-1.5 w-full py-3 pl-5 pr-4">
            <Icon className={cn("inline size-3 shrink-0", iconColorProps.className)} style={iconColorProps.style} aria-hidden />
            <span className="min-w-0 truncate text-[11px] font-medium text-muted-foreground">{title}</span>
            <span className="ml-auto flex items-center gap-1.5 shrink-0">
              {refundLabel && <span className="text-[10px] font-medium text-muted-foreground">{refundLabel}</span>}
              <span className="text-[10px] font-medium text-muted-foreground tabular-nums">{count}</span>
            </span>
          </div>
        ) : (
          <>
            <button
              type="button"
              onClick={() => setOpen(o => !o)}
              aria-expanded={open}
              className="flex items-center gap-1.5 text-left w-full py-3 pl-5 pr-4"
            >
              <Icon className={cn("inline size-3 shrink-0", iconColorProps.className)} style={iconColorProps.style} aria-hidden />
              <span className="min-w-0 truncate text-[11px] font-medium text-muted-foreground">{title}</span>
              <ChevronDown className={cn("size-3 shrink-0 text-muted-foreground transition-transform duration-200", open && "rotate-180")} aria-hidden />
              <span className="ml-auto flex items-center gap-1.5 shrink-0">
                {refundLabel && <span className="text-[10px] font-medium text-muted-foreground">{refundLabel}</span>}
                <span className="text-[10px] font-medium text-muted-foreground tabular-nums">{count}</span>
              </span>
            </button>
            <div
              className={cn(
                "grid overflow-hidden transition-[grid-template-rows] duration-250 ease-in-out",
                open ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
              )}
            >
              <div className="min-h-0">
                <p className="border-t border-border bg-card px-5 py-2.5 text-[11px] leading-snug text-muted-foreground wrap-break-word">
                  {content}
                </p>
              </div>
            </div>
          </>
        )}
      </div>
    </>
  )
}

// FIX: object-cover so images sit flush against the border with no gap
function ProductImagePlaceholder({ iconClassName }: { iconClassName?: string }) {
  return (
    <div className="flex h-full w-full items-center justify-center bg-muted text-muted-foreground">
      <Package className={cn("size-4 shrink-0", iconClassName)} aria-hidden />
    </div>
  )
}

function ProductThumb({ item, linkEnabled = true }: { item: LineItem; linkEnabled?: boolean }) {
  const image = (
    <div className="size-10 rounded-md overflow-hidden bg-card border border-border hover:border-foreground transition-colors">
      {item.image?.url
        ? <img src={item.image.url} alt={item.title} className="w-full h-full object-cover" />
        : <ProductImagePlaceholder />}
    </div>
  )
  if (!linkEnabled) return <div className="shrink-0">{image}</div>
  return (
    <a href={pUrl(item.productHandle)} target="_blank" rel="noopener noreferrer" className="shrink-0">
      {image}
    </a>
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
    <div className="divide-y divide-border">
      {shipmentItems.map((item, i) => {
        const itemPrice  = item.unitPrice ?? 0
        const hasVariant = item.variant?.title && item.variant.title !== "Default Title"
        return (
          <div key={i} className={cn("flex items-center gap-3 py-3", className)}>
            <a href={pUrl(item.productHandle)} target="_blank" rel="noopener noreferrer" className="shrink-0">
              <div className="size-9 rounded-md overflow-hidden bg-card border border-border hover:border-foreground transition-colors">
                {item.image?.url
                  ? <img src={item.image.url} alt={item.title} className="w-full h-full object-cover" />
                  : <ProductImagePlaceholder iconClassName="size-3.5" />}
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
const DEFAULT_POLICY_CATEGORIES = [
  { title: "Vape Kits & Mods",       desc: "30-day refund period. 30-day warranty from delivery." },
  { title: "Batteries & Chargers",    desc: "60-day battery warranty. 30-day charger warranty." },
  { title: "E-Liquids & Disposables", desc: "Must remain sealed and unopened. No returns on opened liquids." },
  { title: "Tanks & Clearomisers",    desc: "7-day Dead On Arrival window — report faults within 7 days." },
]
const DEFAULT_POLICY_FOOTER_NOTE = "Return postage is at your expense. Tracked service required. Refunds within 5–10 business days."

function HygienePolicyList({
  className,
  itemPx = "px-6",
  bodyMode = "categories",
  categories = DEFAULT_POLICY_CATEGORIES,
  bodyText,
  footerNoteEnabled = true,
  footerNote = DEFAULT_POLICY_FOOTER_NOTE,
}: {
  className?: string
  itemPx?: string
  bodyMode?: "categories" | "text"
  categories?: { title: string; desc: string }[]
  bodyText?: string
  footerNoteEnabled?: boolean
  footerNote?: string
}) {
  return (
    <div className={cn("divide-y divide-border", className)}>
      {bodyMode === "text" ? (
        <PolicyHtml html={bodyText ?? ""} className={cn("py-3", itemPx)} />
      ) : (
        categories.map(p => (
          <div key={p.title} className={cn("py-3", itemPx)}>
            <p className="font-medium text-sm">{p.title}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{p.desc}</p>
          </div>
        ))
      )}
      {footerNoteEnabled && footerNote && <p className={cn("text-xs text-muted-foreground py-3", itemPx)}>{footerNote}</p>}
    </div>
  )
}

// ─── Shipment Items Modal ─────────────────────────────────────────────────────
function ShipmentItemsModal({ shipment, order, idx }: { shipment: Shipment; order: Order; idx: number }) {
  const isDesktop = useMediaQuery("(min-width: 768px)")

  const totalUnits    = shipment.items.reduce((a, c) => a + c.quantity, 0)
  const isDelivered   = shipment.displayStatus === "DELIVERED"
  const deliveredDate = shipment.deliveredAt ? new Date(shipment.deliveredAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : null
  const title         = `Shipment ${idx + 1}`
  const subtitle      = `${isDelivered && deliveredDate ? `Delivered ${deliveredDate}` : "On its way"} · ${totalUnits} unit${totalUnits !== 1 ? "s" : ""}`

  const trigger = (
    <button className="flex items-center gap-1 text-xs font-medium text-muted-foreground bg-muted px-2 py-1 rounded-md border border-dashed shrink-0 hover:bg-muted/80 hover:border-border transition-colors cursor-pointer">
      <Package className="size-3.5" />{totalUnits} units
    </button>
  )

  if (isDesktop) {
    return (
      <Dialog>
        <DialogTrigger asChild>{trigger}</DialogTrigger>
        <DialogContent className="sm:max-w-[425px] gap-0 p-0 overflow-hidden">
          <DialogHeader className="px-6 pt-6 pb-4 border-b border-border">
            <DialogTitle className="flex items-center gap-2"><Truck className="size-4" /> {title}</DialogTitle>
            <DialogDescription>{subtitle}</DialogDescription>
          </DialogHeader>
          <div className="overflow-y-auto overflow-x-hidden max-h-[60vh] styled-scroll">
            <div className="pb-4">
              <ShipmentItemList shipment={shipment} order={order} className="px-6" />
            </div>
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
          <DrawerTitle className="flex items-center gap-2"><Truck className="size-4" /> {title}</DrawerTitle>
          <DrawerDescription>{subtitle}</DrawerDescription>
        </DrawerHeader>
        <Separator />
        <div className="overflow-y-auto overflow-x-hidden max-h-[60vh] pb-4 styled-scroll">
          <ShipmentItemList shipment={shipment} order={order} className="px-4" />
        </div>
      </DrawerContent>
    </Drawer>
  )
}

// ─── Hygiene Policy Modal ─────────────────────────────────────────────────────
function HygienePolicy({
  onAccept,
  onDecline,
  compact = false,
  link = false,
  heading = "iBlaze Returns Policy",
  subheading = "Review our returns policy before selecting items to return.",
  lastUpdated,
  bodyMode,
  categories,
  bodyText,
  footerNoteEnabled,
  footerNote,
  acceptedMessage = "Policy accepted",
  declinedMessage = "Policy declined",
  presentation = "dialog",
  externalUrl = "",
  reviewButtonLabel = "Review & Accept",
}: {
  onAccept: () => void
  onDecline: () => void
  compact?: boolean
  link?: boolean
  heading?: string
  subheading?: string
  lastUpdated?: string
  bodyMode?: "categories" | "text"
  categories?: { title: string; desc: string }[]
  bodyText?: string
  footerNoteEnabled?: boolean
  footerNote?: string
  acceptedMessage?: string
  declinedMessage?: string
  presentation?: "dialog" | "externalLink"
  externalUrl?: string
  reviewButtonLabel?: string
}) {
  const useExternal = presentation === "externalLink" && !!externalUrl
  const isDesktop = useMediaQuery("(min-width: 768px)")
  const buttonText = (reviewButtonLabel || "Review & Accept").trim() || "Review & Accept"

  const triggerClassName = link
    ? "h-auto shrink-0 gap-0.5 px-2 py-1 text-xs font-medium leading-snug text-muted-foreground hover:text-foreground"
    : compact
      ? "h-7 px-2 text-xs shrink-0"
      : "bg-[var(--brand)] hover:bg-[var(--brand)]/90 text-white shrink-0"

  // External policy: open the merchant URL in a new tab — no dialog, and
  // do not dismiss the policy bar (that strip stays available as a permanent link).
  if (useExternal) {
    return (
      <Button
        asChild
        variant={link ? "ghost" : compact ? "outline" : "default"}
        size="sm"
        className={triggerClassName}
      >
        <a
          href={externalUrl}
          target="_blank"
          rel="noopener noreferrer"
        >
          {buttonText}
          {link ? <ChevronRight className="size-3.5 shrink-0" /> : <ExternalLink className="size-3.5 shrink-0" />}
        </a>
      </Button>
    )
  }

  const trigger = link
    ? (
      <Button
        variant="ghost"
        size="sm"
        className={triggerClassName}
      >
        {buttonText}
        <ChevronRight className="size-3.5 shrink-0" />
      </Button>
    )
    : compact
      ? <Button size="sm" variant="outline" className={triggerClassName}>{buttonText}</Button>
      : <Button size="sm" className={triggerClassName}>{buttonText}</Button>

  if (isDesktop) {
    return (
      <Dialog>
        <DialogTrigger asChild>{trigger}</DialogTrigger>
        <DialogContent className="sm:max-w-[425px] gap-0 p-0 overflow-hidden">
          <DialogHeader className="px-6 pt-6 pb-4 border-b border-border">
            <DialogTitle className="flex items-center gap-2"><ShieldCheck className="size-4 text-[var(--brand)]" /> {heading}</DialogTitle>
            <DialogDescription>{subheading}</DialogDescription>
            {lastUpdated && <p className="text-xs text-muted-foreground">Last updated: {lastUpdated}</p>}
          </DialogHeader>
          <div className="overflow-y-auto overflow-x-hidden max-h-[50vh] styled-scroll px-6 py-4">
            <HygienePolicyList itemPx="px-0" bodyMode={bodyMode} categories={categories} bodyText={bodyText} footerNoteEnabled={footerNoteEnabled} footerNote={footerNote} />
          </div>
          <div className="flex gap-2 px-6 pb-6 pt-4">
            <DialogClose asChild>
              <Button className="flex-1 bg-[var(--brand)] hover:bg-[var(--brand)]/90 text-white" onClick={() => { onAccept(); portalToast.success(acceptedMessage) }}><CheckCircle2 className="size-4" /> I Accept</Button>
            </DialogClose>
            <DialogClose asChild>
              <Button variant="outline" className="flex-1" onClick={() => { onDecline(); portalToast.warning(declinedMessage) }}>Decline</Button>
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
          <DrawerTitle className="flex items-center gap-2"><ShieldCheck className="size-4 text-[var(--brand)]" /> {heading}</DrawerTitle>
          <DrawerDescription>{subheading}</DrawerDescription>
          {lastUpdated && <p className="text-xs text-muted-foreground">Last updated: {lastUpdated}</p>}
        </DrawerHeader>
        <Separator />
        <div className="overflow-y-auto overflow-x-hidden max-h-[45vh] styled-scroll px-4 py-3">
          <HygienePolicyList itemPx="px-0" bodyMode={bodyMode} categories={categories} bodyText={bodyText} footerNoteEnabled={footerNoteEnabled} footerNote={footerNote} />
        </div>
        <DrawerFooter className="pt-2">
          <div className="flex gap-2">
            <DrawerClose asChild>
              <Button className="flex-1 bg-[var(--brand)] hover:bg-[var(--brand)]/90 text-white" onClick={() => { onAccept(); portalToast.success(acceptedMessage) }}><CheckCircle2 className="size-4" /> I Accept</Button>
            </DrawerClose>
            <DrawerClose asChild>
              <Button variant="outline" className="flex-1" onClick={() => { onDecline(); portalToast.warning(declinedMessage) }}>Decline</Button>
            </DrawerClose>
          </div>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  )
}

function orderGlowClass(order: Order): string {
  if (order.cancelledAt) return "hover:border-red-300 hover:shadow-[0_0_0_3px_rgba(239,68,68,0.1),0_2px_10px_rgba(239,68,68,0.08)]"
  switch (order.orderStatus) {
    case "Delivered":            return "hover:border-green-300 hover:shadow-[0_0_0_3px_rgba(34,197,94,0.1),0_2px_10px_rgba(34,197,94,0.08)]"
    case "Partially delivered":  return "hover:border-amber-300 hover:shadow-[0_0_0_3px_rgba(245,158,11,0.1),0_2px_10px_rgba(245,158,11,0.08)]"
    case "On its way":
    case "Partially dispatched": return "hover:border-blue-300 hover:shadow-[0_0_0_3px_rgba(59,130,246,0.1),0_2px_10px_rgba(59,130,246,0.08)]"
    case "Confirmed":            return "hover:border-zinc-400 hover:shadow-[0_0_0_3px_rgba(161,161,170,0.15),0_2px_10px_rgba(161,161,170,0.1)]"
    default:                     return "hover:border-zinc-300 hover:shadow-xs"
  }
}

function StatusLabel({ order }: { order: Order }) {
  const { orderStatus, cancelledAt, deliveredCount, dispatchedCount, confirmedCount, notDispatchedCount } = order
  const fmt = (d: string) => new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })
  const deliveryDate = order.latestDelivery || order.earliestDelivery
  const breakdown = getOrderFulfillmentBreakdown(order)

  if (cancelledAt) return (
    <span className="text-[10px] font-medium text-red-600 shrink-0 inline-flex items-center gap-1">
      <XCircle className="size-3 shrink-0" aria-hidden />
      Cancelled {fmt(cancelledAt)}
    </span>
  )
  if (breakdown) {
    const notYetShipped = confirmedCount + notDispatchedCount
    const coloured = [
      deliveredCount > 0 && (
        <span key="d" className="inline-flex items-center gap-0.5 text-green-600">
          <CheckCircle2 className="size-3 shrink-0" aria-hidden />
          {deliveredCount} delivered
        </span>
      ),
      dispatchedCount > 0 && (
        <span key="s" className="inline-flex items-center gap-0.5 text-slate-600">
          <Truck className="size-3 shrink-0" aria-hidden />
          {dispatchedCount} on its way
        </span>
      ),
      notYetShipped > 0 && (
        <span key="p" className="inline-flex items-center gap-0.5 text-zinc-900">
          <Clock className="size-3 shrink-0" aria-hidden />
          {notYetShipped} not yet shipped
        </span>
      ),
    ].filter(Boolean)
    return (
      <span className="text-[10px] font-medium shrink-0 flex items-center gap-0.5">
        {coloured.map((el, i) => (
          <React.Fragment key={i}>{i > 0 && <span className="text-muted-foreground"> · </span>}{el}</React.Fragment>
        ))}
      </span>
    )
  }

  const isOnItsWay = orderStatus === "On its way" || orderStatus === "Partially dispatched"
  const earliestDispatch = isOnItsWay
    ? order.shipments.filter(s => s.shippedAt).map(s => s.shippedAt!).sort()[0]
    : null

  const meta = getOrderHeaderStatusIcon(order)
  const Icon = meta?.icon ?? Clock
  const isDispatchedDate = isOnItsWay && earliestDispatch
  const color = isDispatchedDate ? "text-zinc-900" : (meta?.color ?? "text-muted-foreground")

  const label = orderStatus === "Delivered" && deliveryDate
    ? `Delivered ${fmt(deliveryDate)}`
    : isDispatchedDate
    ? `Dispatched ${fmt(earliestDispatch)}`
    : orderStatus === "Partially dispatched"
    ? "On its way"
    : orderStatus

  return (
    <span className={cn("text-[10px] font-medium shrink-0 inline-flex items-center gap-1", color)}>
      <Icon className="size-3 shrink-0" aria-hidden />
      {label}
    </span>
  )
}

function OrderCard({ order, onClick, index = 0 }: { order: Order; onClick: () => void; index?: number }) {
  const allUniqueImages = order.processedItems.map(i => i.image?.url).filter((u, i, a) => u && a.indexOf(u) === i) as string[]
  const uniqueImages = allUniqueImages.slice(0, 3)
  const extra = allUniqueImages.length - uniqueImages.length
  const total = parseFloat(order.totalPriceSet.shopMoney.amount)
  const fmt = (d: string) => new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })
  const deliveryDate = order.latestDelivery || order.earliestDelivery


  const cancelled = !!order.cancelledAt
  return (
    <div className={cn("h-full w-full", cancelled && "opacity-50")}>
    <motion.button
      onClick={cancelled ? undefined : onClick}
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28, delay: Math.min(index * 0.055, 0.4), ease: [0.25, 0.1, 0.25, 1] }}
      className={cn(
        "group w-full h-full text-left bg-card border rounded-xl transition-[border-color,box-shadow] duration-150 focus:outline-hidden focus-visible:ring-0 flex flex-col overflow-hidden",
        cancelled ? "border-border cursor-not-allowed" : cn("border-border", orderGlowClass(order))
      )}
    >
      {/* Info section */}
      <div className="flex-1 px-4 pt-4 pb-3 flex flex-col gap-1.5">
        <div className="flex items-start justify-between gap-2">
          <p className={cn("font-semibold text-sm truncate", !cancelled && "group-hover:underline")}>{order.name}</p>
          <p className="font-semibold text-sm shrink-0">£{total.toFixed(2)}</p>
        </div>
        <p className="text-xs text-muted-foreground">Ordered {fmt(order.createdAt)} &bull; {order.totalUnits} item{order.totalUnits !== 1 ? "s" : ""}</p>
      </div>
      {/* Images footer */}
      <div className="w-full px-4 py-2.5 border-t border-border bg-muted/60 flex items-center gap-1.5 shrink-0">
        <div className="flex items-center flex-1 min-w-0">
          <div className="flex -space-x-2">
            {uniqueImages.length > 0 ? uniqueImages.map((url, i) => (
              <div key={i} className="w-8 h-8 rounded-md border-2 border-muted dark:border-border bg-card overflow-hidden shadow-xs shrink-0">
                <img src={url} alt="" className="w-full h-full object-cover" />
              </div>
            )) : (
              <div className="w-8 h-8 rounded-md border-2 border-muted dark:border-border bg-card overflow-hidden shadow-xs shrink-0">
                <ProductImagePlaceholder iconClassName="size-3" />
              </div>
            )}
          </div>
          {extra > 0 && (
            <span className="text-[10px] font-medium text-muted-foreground ml-1.5">+{extra}</span>
          )}
        </div>
        <StatusLabel order={order} />
      </div>
    </motion.button>
    </div>
  )
}

function OrderRow({ order, onClick }: { order: Order; onClick: () => void }) {
  const images = order.processedItems.map(i => i.image?.url).filter(Boolean).slice(0, 3) as string[]
  const total  = parseFloat(order.totalPriceSet.shopMoney.amount)
  const date   = new Date(order.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })

  const cancelled = !!order.cancelledAt
  return (
    <button
      onClick={cancelled ? undefined : onClick}
      className={cn(
        "w-full px-5 py-3.5 flex items-center gap-4 transition-colors text-left group border-b border-border last:border-0 focus:outline-hidden focus-visible:ring-0",
        cancelled ? "opacity-60 cursor-not-allowed" : "hover:bg-muted/50"
      )}
    >
      <div className="flex -space-x-2 w-[92px] shrink-0">
        {images.length > 0 ? images.map((url, i) => (
          <div key={i} className="size-9 rounded-md border-2 border-card dark:border-border bg-card overflow-hidden shadow-xs shrink-0">
            <img src={url} alt="" className="w-full h-full object-cover" />
          </div>
        )) : (
          <div className="size-9 rounded-md border-2 border-card dark:border-border bg-card overflow-hidden shadow-xs shrink-0">
            <ProductImagePlaceholder iconClassName="size-3.5" />
          </div>
        )}
        {images.length > 0 && Array.from({ length: 3 - images.length }).map((_, i) => (
          <div key={`empty-${i}`} className="size-9 rounded-md border-2 border-muted dark:border-border bg-muted shrink-0" />
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

// ─── Review-before-submit variant — switch "A" (dialog) or "B" (inline) ───────
const RETURN_REVIEW_VARIANT: "A" | "B" = "B"

// ─── Order Detail ─────────────────────────────────────────────────────────────
type OrderDetailBranding = {
  supportEmail: string
  requirePolicyAcceptance: boolean
  returnReviewEnabled: boolean
  policyHeading: string
  policySubheading: string
  policyLastUpdated: string
  policyBodyMode: "categories" | "text"
  policyCategories: { title: string; desc: string }[]
  policyBodyText: string
  policyFooterNoteEnabled: boolean
  policyFooterNote: string
  policyAcceptedMessage: string
  policyDeclinedMessage: string
  policyPresentation: "dialog" | "externalLink"
  policyExternalUrl: string
  policyReviewButtonLabel: string
  tableSearchEnabled: boolean
  tableSearchPlaceholder: string
  tableColumnsButtonEnabled: boolean
  tableFilterButtonEnabled: boolean
  tablePageSizeEnabled: boolean
  shipmentCardsEnabled: boolean
  productImageLinksEnabled: boolean
  statusFilterEnabled: boolean
  ineligibleMessageEnabled: boolean
  eligibleLabel: string
  ineligibleLabel: string
  returnLifecycleMessages: ReturnLifecycleMessages
  returnLifecycleStyles: ReturnLifecycleStyles
  refundStatusLabels: RefundStatusLabels
}

function OrderDetail({
  order,
  onBack,
  returnWindowDays,
  branding,
}: {
  order: Order
  onBack: () => void
  returnWindowDays: number
  branding: OrderDetailBranding
}) {
  const {
    supportEmail, requirePolicyAcceptance, returnReviewEnabled, policyHeading, policySubheading, policyLastUpdated,
    policyBodyMode, policyCategories, policyBodyText, policyFooterNoteEnabled, policyFooterNote,
    policyAcceptedMessage, policyDeclinedMessage, policyPresentation, policyExternalUrl,
    policyReviewButtonLabel,
    tableSearchEnabled, tableSearchPlaceholder,
    tableColumnsButtonEnabled, tableFilterButtonEnabled, tablePageSizeEnabled, shipmentCardsEnabled,
    productImageLinksEnabled, statusFilterEnabled, ineligibleMessageEnabled,
    eligibleLabel, ineligibleLabel, returnLifecycleMessages, returnLifecycleStyles, refundStatusLabels,
  } = branding
  const isExternalPolicy = policyPresentation === "externalLink" && !!policyExternalUrl
  // External policy is a permanent link strip — selection is not gated on accept.
  // Dialog mode still requires an explicit accept before items can be selected.
  const [policyAccepted, setPolicyAccepted] = useState(!requirePolicyAcceptance || isExternalPolicy)
  const [selectedItems, setSelectedItems]   = useState<Record<string, { selected: boolean; quantity: number; reason: string; description: string }>>({})
  const [submitting, setSubmitting]   = useState(false)
  const [submitted, setSubmitted]     = useState(false)
  const [submittedInTransit, setSubmittedInTransit] = useState(false)
  const [showReview, setShowReview] = useState(false)
  const [searchQuery, setSearchQuery]         = useState("")
  const [pageSize, setPageSize]               = useState("10")
  const [currentPage, setCurrentPage]         = useState(1)
  const [ineligibleStatusFilter, setIneligibleStatusFilter] = useState<ReturnStatus[]>([])
  const [colsVisible, setColsVisible] = useState({ variant: true, qty: true, total: true })

  const rawOrderId     = order.id.split("/").pop()
  // account.iblazevape.co.uk is iBlaze's own single-tenant customer login —
  // meaningless for App Proxy customers (guest or logged into their store,
  // not that system). Shopify's own order.statusPageUrl works for anyone.
  const orderStatusUrl = isAppsReturnsPortal() && order.statusPageUrl
    ? order.statusPageUrl
    : `https://account.iblazevape.co.uk/orders/${rawOrderId}`
  const total          = parseFloat(order.totalPriceSet.shopMoney.amount)
  const orderAvgPrice  = order.totalUnits > 0 ? total / order.totalUnits : 0
  const refundedAmount = order.totalRefundedSet?.shopMoney?.amount ? parseFloat(order.totalRefundedSet.shopMoney.amount) : 0

  const eligibleItems = useMemo(() =>
    order.processedItems.filter(i => i.returnStatus === "Eligible" && i.eligibleQuantity > 0),
    [order]
  )

  const ineligibleItems = useMemo(() => buildIneligibleDisplayItems(order), [order])

  const hasEligible          = eligibleItems.length > 0 && !order.cancelledAt
  const totalEligibleUnits   = eligibleItems.reduce((s, i) => s + i.eligibleQuantity, 0)
  const totalIneligibleUnits = ineligibleItems.reduce((s, i) => s + (i.splitQty ?? i.quantity), 0)
  const hasBothTabs          = eligibleItems.length > 0 && ineligibleItems.length > 0
  const fullyIneligible      = ineligibleItems.length > 0 && eligibleItems.length === 0

  useEffect(() => {
    assertOrderUnitAccounting(order, totalEligibleUnits, totalIneligibleUnits, ineligibleItems)
  }, [order, totalEligibleUnits, totalIneligibleUnits, ineligibleItems])

  const ineligibleFilterGroupCount = useMemo(
    () => new Set(ineligibleItems.map(i => getIneligibleCoarseLabel(i.returnStatus, returnLifecycleStyles))).size,
    [ineligibleItems, returnLifecycleStyles],
  )
  const showIneligibleFilter = ineligibleFilterGroupCount > 1

  const orderSummary = useMemo(
    () => summarizeOrderMessage(order, totalEligibleUnits, ineligibleItems),
    [order, totalEligibleUnits, ineligibleItems]
  )

  const fullOrderSummary = useMemo(
    () => buildFullSummaryText(order, totalEligibleUnits, ineligibleItems),
    [order, totalEligibleUnits, ineligibleItems]
  )

  const narrativeParagraph = useMemo(
    () => buildNarrativeParagraph(order, totalEligibleUnits, ineligibleItems, returnWindowDays),
    [order, totalEligibleUnits, ineligibleItems, returnWindowDays]
  )

  const matchesSearch = (item: LineItem) => {
    if (!searchQuery) return true
    const q = searchQuery.toLowerCase()
    return item.title.toLowerCase().includes(q) || (item.variant?.title || "").toLowerCase().includes(q)
  }

  const filteredEligible   = useMemo(() => eligibleItems.filter(matchesSearch), [eligibleItems, searchQuery])
  const filteredIneligible = useMemo(() =>
    ineligibleItems
      .filter(item => {
        if (!matchesSearch(item)) return false
        if (ineligibleStatusFilter.length > 0 && !ineligibleStatusFilter.includes(item.returnStatus)) return false
        return true
      })
      .sort((a, b) => compareIneligibleItems(a, b, order, returnWindowDays)),
  [ineligibleItems, searchQuery, ineligibleStatusFilter, order, returnWindowDays])

  // FIX: default to whichever tab actually has items; reset when order changes
  const [activeTab, setActiveTab] = useState<"eligible" | "ineligible">(
    () => eligibleItems.length > 0 ? "eligible" : "ineligible"
  )
  useEffect(() => {
    setActiveTab(eligibleItems.length > 0 ? "eligible" : "ineligible")
  }, [order.id])

  const currentData   = (activeTab === "eligible" ? filteredEligible : filteredIneligible) as DisplayItem[]
  const size          = pageSize === "all" ? Math.max(currentData.length, 1) : parseInt(pageSize)
  const totalPages    = Math.ceil(currentData.length / size) || 1
  const paginatedData = currentData.slice((currentPage - 1) * size, currentPage * size)

  useEffect(() => { setCurrentPage(1) }, [activeTab, searchQuery, pageSize, ineligibleStatusFilter])
  useEffect(() => { setIneligibleStatusFilter([]) }, [order.id])

  // Whether the item-table toolbar bar has anything to actually show — every
  // piece inside it (tab selector, search, filter, columns, page size) is
  // independently conditional, and with everything disabled/hidden the bar
  // itself must not render at all (it was showing as an empty bordered strip).
  const showToolbarTabSelector = (statusFilterEnabled && hasBothTabs && HEADER_STAT_DESIGN !== 4)
    || (!fullyIneligible && HEADER_STAT_DESIGN !== 4 && HEADER_STAT_DESIGN !== 6)
  const showToolbarFilter = tableFilterButtonEnabled && activeTab === "ineligible" && showIneligibleFilter
  const hasAnyToolbarControl = showToolbarTabSelector || tableSearchEnabled || showToolbarFilter || tableColumnsButtonEnabled || tablePageSizeEnabled

  const selectedCount   = Object.values(selectedItems).filter(v => v.selected).length
  const estimatedRefund = Object.entries(selectedItems).filter(([, v]) => v.selected).reduce((sum, [id, v]) => {
    const item = order.processedItems.find(i => i.id === id)
    return sum + (item ? (item.unitPrice ?? orderAvgPrice) * v.quantity : 0)
  }, 0)

  const canSubmit = selectedCount > 0 && policyAccepted && Object.entries(selectedItems)
    .filter(([, v]) => v.selected)
    .every(([, v]) => v.reason && (v.reason !== "OTHER" || v.description.trim().length > 0))

  const reviewItems = useMemo(() =>
    Object.entries(selectedItems)
      .filter(([, v]) => v.selected)
      .map(([id, v]) => {
        const item = order.processedItems.find(i => i.id === id)!
        return {
          id,
          item,
          quantity: v.quantity,
          reason: RETURN_REASONS.find(r => r.value === v.reason)?.label ?? v.reason,
          description: v.description,
          subtotal: (item?.unitPrice ?? orderAvgPrice) * v.quantity,
        }
      }),
    [selectedItems, order.processedItems, orderAvgPrice],
  )

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
    const hadInTransit = items.some(({ lineItemId }) => {
      const item = order.processedItems.find(i => i.id === lineItemId)
      return Boolean(item && (item.inTransitQuantity ?? 0) > 0)
    })
    setSubmitting(true)
    if (DEMO_MODE) {
      // Simulate the success path without hitting Shopify or redirecting away
      await new Promise(resolve => setTimeout(resolve, 800))
      setSubmittedInTransit(hadInTransit)
      setSubmitted(true)
      setSubmitting(false)
      return
    }
    try {
      const res = await fetch("/api/submit-return", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ orderId: rawOrderId, items }) })
      const result = await res.json()
      if (result.success) {
        setSubmittedInTransit(hadInTransit)
        setSubmitted(true)
        setTimeout(() => { window.location.href = orderStatusUrl }, 3000)
      } else if (res.status === 401) {
        portalToast.error("Session expired", { description: "Please log in again to submit your return." })
        setTimeout(() => { window.location.href = isAppsReturnsPortal() ? "/apps/returns" : "/" }, 1500)
      } else if (result.code === "ELIGIBILITY_CHANGED") {
        portalToast.error("Eligibility changed", { description: "Some items are no longer eligible. Refreshing your order..." })
        setTimeout(() => window.location.reload(), 2000)
      } else {
        portalToast.error("Submission failed", { description: result.error || "Something went wrong." })
      }
    } catch { portalToast.error("Network error", { description: "Please check your connection." }) }
    finally { setSubmitting(false) }
  }

  if (submitted) {
    return (
      <div className="max-w-md mx-auto py-20 text-center space-y-4 px-4">
        <div className="size-16 bg-green-50 rounded-full flex items-center justify-center mx-auto"><CheckCircle2 className="size-8 text-green-500" /></div>
        <h2 className="text-xl font-semibold">Return Requested</h2>
        {submittedInTransit ? (
          <>
            <p className="text-muted-foreground text-sm">
              We&apos;ve received your request. We&apos;ll review it after delivery is confirmed.
            </p>
            {supportEmail && (
              <p className="text-muted-foreground text-xs">
                If there&apos;s a delivery issue, please contact us at{" "}
                <a href={`mailto:${supportEmail}`} className="text-foreground underline underline-offset-2">{supportEmail}</a>.
              </p>
            )}
          </>
        ) : (
          <p className="text-muted-foreground text-sm">We&apos;ve sent you a confirmation email. Our team will review your return and be in touch.</p>
        )}
      </div>
    )
  }

  return (
    <>
      {/* FIX: pad the bottom when there's no sticky footer (all-ineligible orders),
           so the table doesn't slam flush against the viewport edge. When the
           footer IS shown (hasEligible), pb-9 creates the visible gap between the
           table card and the sticky footer on both mobile and desktop. */}
      <div className={cn("flex flex-col gap-4 px-4 pt-4", !hasEligible ? "pb-4" : "pb-9")}>
        <Button
          variant="ghost"
          size="sm"
          onClick={isGuestOrderContext() ? lookupAnotherOrder : onBack}
          className="-ml-2 text-muted-foreground hover:text-foreground w-fit"
        >
          <ArrowLeft className="size-4" /> {isGuestOrderContext() ? "Return another order" : "Back to Orders"}
        </Button>

        {order.eligibilitySource === "fallback" && !order.cancelledAt && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-900">
            Return eligibility could not be loaded from Shopify. Counts below are based on shipping status only and may not match what you can actually return. Try refreshing the page or logging in again.
          </div>
        )}

        {/* ── Shipments & tracking ── */}
        {shipmentCardsEnabled && !order.cancelledAt && order.shipments && order.shipments.length > 0 && (
          <div>
            <div className="overflow-x-auto">
              <div className="flex gap-3 snap-x">
                {order.shipments.map((shipment, idx) => {
                  const isDelivered   = shipment.displayStatus === "DELIVERED"
                  const fmt = (d: string) => new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })
                  const deliveredDate = shipment.deliveredAt ? fmt(shipment.deliveredAt) : null
                  const shippedDate   = shipment.shippedAt   ? fmt(shipment.shippedAt)   : null
                  const cardCls = cn("snap-start border rounded-lg p-4 bg-card shadow-xs flex flex-col gap-3", order.shipments.length === 1 ? "w-full" : "w-[85vw] shrink-0 sm:shrink sm:flex-1 sm:w-auto sm:min-w-[260px]")
                  return (
                    <div key={shipment.id} className={cardCls}>
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2.5">
                          <div className={cn("p-1.5 rounded-md", isDelivered ? "bg-green-50 text-green-600" : "bg-muted text-muted-foreground")}><Truck className="size-4" /></div>
                          <div>
                            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Shipment {idx + 1}</p>
                            <p className="text-sm font-medium">{isDelivered ? "Delivered" : "On its way"}{deliveredDate && <span className="text-muted-foreground font-normal"> · {deliveredDate}</span>}</p>
                            {shippedDate && <p className="text-[11px] text-muted-foreground mt-0.5">Dispatched {shippedDate}</p>}
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
                                ? <a href={track.url} target="_blank" rel="noopener noreferrer" className="text-foreground font-medium hover:underline inline-flex items-center gap-1 text-xs">{track.number} <ExternalLink className="size-3" /></a>
                                : <span className="font-medium text-foreground text-xs">{track.number}</span>}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        )}

        {/* ── Option B: inline review card — same table layout (Product, Variant, Qty, Total)
             used for order-item selection, so the review step matches it exactly ── */}
        {returnReviewEnabled && RETURN_REVIEW_VARIANT === "B" && showReview && (
          <Card className={cn(C, "overflow-hidden")}>
            <div className="px-5 py-4 border-b bg-muted/20 flex items-center gap-2">
              <CheckCircle2 className="size-4 text-foreground" />
              <span className="text-sm font-semibold">Review your return</span>
              <span className="text-xs text-muted-foreground ml-auto">{selectedCount} item{selectedCount !== 1 ? "s" : ""}</span>
            </div>
            <div className="overflow-y-auto max-h-[55vh]">
              <Table>
                <TableHeader className="bg-background">
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="pl-5">Product</TableHead>
                    <TableHead className="hidden min-[1025px]:table-cell">Variant</TableHead>
                    <TableHead className="text-center hidden min-[1025px]:table-cell">Qty</TableHead>
                    <TableHead className="text-right pr-4">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reviewItems.map(({ id, item, quantity, reason, description, subtotal }) => (
                    <TableRow key={id}>
                      <TableCell className="pl-5 py-3">
                        <div className="flex items-center gap-3">
                          {item?.image?.url
                            ? <img src={item.image.url} alt={item.title} className="size-10 rounded-md object-cover shrink-0 border" />
                            : <div className="size-10 rounded-md border bg-muted shrink-0" />}
                          <div className="min-w-0">
                            <p className="font-medium text-sm truncate max-w-[160px] min-[1025px]:max-w-[200px]">{item?.title}</p>
                            <span className="min-[1025px]:hidden text-[11px] text-muted-foreground block truncate max-w-[140px]">
                              {quantity}×{item?.variant?.title && item.variant.title !== "Default Title" ? ` ${item.variant.title}` : ""}
                            </span>
                            <span className="text-[11px] text-muted-foreground block truncate max-w-[200px]">
                              {reason}{description ? ` · "${description}"` : ""}
                            </span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="py-3 text-sm hidden min-[1025px]:table-cell">
                        {item?.variant?.title && item.variant.title !== "Default Title" ? item.variant.title : <span className="text-muted-foreground">—</span>}
                      </TableCell>
                      <TableCell className="py-3 text-sm text-center tabular-nums hidden min-[1025px]:table-cell">{quantity}</TableCell>
                      <TableCell className="text-right pr-4 py-3 font-semibold text-sm tabular-nums">£{subtotal.toFixed(2)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <div className="px-5 py-3 border-t">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Estimated refund</p>
              <p className="text-lg font-bold text-foreground">£{estimatedRefund.toFixed(2)}</p>
            </div>
          </Card>
        )}

        {/* ── Unified order + items card ── */}
        <Card className={cn(C, "overflow-hidden flex flex-col", order.cancelledAt && "border-red-200", returnReviewEnabled && RETURN_REVIEW_VARIANT === "B" && showReview && "hidden")}>
          {/* Cancelled accent stripe */}
          {order.cancelledAt && <div className="h-1 bg-red-400 w-full" />}

          {/* ── Order header ── */}
          {!order.cancelledAt && HEADER_STAT_DESIGN === 4 ? (
            <>
              <HeaderDesign04TabBar
                order={order}
                totalEligibleUnits={totalEligibleUnits}
                totalIneligibleUnits={totalIneligibleUnits}
                ineligibleItems={ineligibleItems}
                hasBothTabs={hasBothTabs}
                fullyIneligible={fullyIneligible}
                hasEligible={hasEligible}
                activeTab={activeTab}
                ineligibleStatusFilter={ineligibleStatusFilter}
                onTabChange={(t) => { setActiveTab(t); setCurrentPage(1) }}
                onIneligibleFilter={(filter) => { setIneligibleStatusFilter(filter); setCurrentPage(1) }}
              />
            </>
          ) : HEADER_STAT_DESIGN !== 6 ? (
          <div className={cn(
            "px-5 py-3.5 border-b flex items-center gap-4",
            order.cancelledAt ? "bg-red-50/40" : "bg-muted/20",
            "justify-between",
          )}>
            <div className="min-w-0">
              {order.cancelledAt && (
                <p className="text-sm font-semibold text-foreground leading-tight mb-1">Cancelled</p>
              )}
              <p className="text-xs text-muted-foreground tabular-nums leading-normal">
                Placed {new Date(order.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}{" "}
                with {order.totalUnits} item{order.totalUnits !== 1 ? "s" : ""} for £{total.toFixed(2)}
                {refundedAmount > 0 && ` (£${refundedAmount.toFixed(2)} refunded)`}
                {HEADER_STAT_DESIGN === 3 && !order.cancelledAt && (
                  <HeaderMetaStats
                    totalEligibleUnits={totalEligibleUnits}
                    totalIneligibleUnits={totalIneligibleUnits}
                    hasBothTabs={hasBothTabs}
                    fullyIneligible={fullyIneligible}
                    hasEligible={hasEligible}
                    activeTab={activeTab}
                    onTabChange={(t) => { setActiveTab(t); setCurrentPage(1) }}
                  />
                )}
              </p>
              {order.cancelledAt && (
                <p className="text-xs text-red-600 mt-1">No items were dispatched — returns are not applicable.</p>
              )}
            </div>
            {order.cancelledAt ? (
              <StatusPill order={order} />
            ) : (
              <OrderHeaderBadges
                order={order}
                totalEligibleUnits={totalEligibleUnits}
                totalIneligibleUnits={totalIneligibleUnits}
                ineligibleItems={ineligibleItems}
                hasBothTabs={hasBothTabs}
                fullyIneligible={fullyIneligible}
                hasEligible={hasEligible}
                activeTab={activeTab}
                ineligibleStatusFilter={ineligibleStatusFilter}
                onTabChange={(t) => { setActiveTab(t); setCurrentPage(1) }}
                onIneligibleFilter={(filter) => { setIneligibleStatusFilter(filter); setCurrentPage(1) }}
              />
            )}
          </div>
          ) : null}

          {!order.cancelledAt && orderSummary.text && HEADER_STAT_DESIGN !== 6 && (
            <div className="border-b bg-blue-50/50 dark:bg-blue-950/40 flex items-center gap-2 py-2.5 px-5">
              <Info className="size-3.5 text-[#004085] dark:text-blue-300 shrink-0" aria-hidden />
              <p className="text-xs font-medium leading-snug text-[#004085] dark:text-blue-200 tabular-nums min-w-0">
                {orderSummary.text}
              </p>
            </div>
          )}

          {!order.cancelledAt && (
            <>
            {hasEligible && requirePolicyAcceptance && (isExternalPolicy || !policyAccepted) && (
              <div className="flex items-center justify-between gap-3 border-b bg-muted/20 px-3 py-2.5">
                <div className="flex min-w-0 items-center gap-2 overflow-hidden">
                  {isExternalPolicy ? (
                    <Info className="size-3.5 shrink-0 text-foreground" aria-hidden />
                  ) : (
                    <Lock className="size-3.5 shrink-0 text-foreground" aria-hidden />
                  )}
                  <span className="truncate text-xs font-medium leading-snug text-foreground">
                    {policySubheading || "Review our returns policy before selecting items to return."}
                  </span>
                </div>
                <HygienePolicy
                  link
                  onAccept={() => setPolicyAccepted(true)}
                  onDecline={() => setPolicyAccepted(false)}
                  heading={policyHeading}
                  subheading={policySubheading}
                  lastUpdated={policyLastUpdated}
                  bodyMode={policyBodyMode}
                  categories={policyCategories}
                  bodyText={policyBodyText}
                  footerNoteEnabled={policyFooterNoteEnabled}
                  footerNote={policyFooterNote}
                  acceptedMessage={policyAcceptedMessage}
                  declinedMessage={policyDeclinedMessage}
                  presentation={policyPresentation}
                  externalUrl={policyExternalUrl}
                  reviewButtonLabel={policyReviewButtonLabel}
                />
              </div>
            )}
            {hasAnyToolbarControl && (
            <div className="border-b bg-card px-3 py-2.5">
              {/* Desktop: single row — tab + search + filter + columns + show */}
              <div className="hidden min-[1025px]:flex items-center gap-2">
                {statusFilterEnabled && hasBothTabs && HEADER_STAT_DESIGN !== 4 ? (
                  <Select value={activeTab} onValueChange={(v) => { setActiveTab(v as "eligible" | "ineligible"); setCurrentPage(1) }}>
                    <SelectTrigger className="w-fit min-w-[120px] max-w-[260px] h-8 bg-transparent text-sm"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="eligible">{eligibleLabel} ({totalEligibleUnits})</SelectItem>
                      <SelectItem value="ineligible">{ineligibleLabel} ({totalIneligibleUnits})</SelectItem>
                    </SelectContent>
                  </Select>
                ) : !fullyIneligible && HEADER_STAT_DESIGN !== 4 && HEADER_STAT_DESIGN !== 6 ? (
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-foreground">{eligibleLabel}</span>
                    <CountBadge value={totalEligibleUnits} variant="green" />
                  </div>
                ) : null}
                {tableSearchEnabled && (
                  <div className="relative flex-1">
                    <Search className="absolute left-2.5 top-2 h-4 w-4 text-muted-foreground" />
                    <Input placeholder={tableSearchPlaceholder} value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-9 bg-transparent text-sm h-8" />
                  </div>
                )}
                {/* ml-auto here (not on each control) pushes this whole group to the
                    right edge when search is disabled — with search enabled its
                    flex-1 already consumes the space, so this has no visible effect. */}
                <div className="flex items-center gap-2 ml-auto">
                {showToolbarFilter && (
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="h-8 gap-1.5 text-sm shrink-0 px-3 bg-transparent">
                        <SlidersHorizontal className="size-3" />
                        Filter
                        {ineligibleStatusFilter.length > 0 && <span className="rounded-full bg-foreground text-background text-[10px] font-bold px-1.5 leading-5">{ineligibleStatusFilter.length}</span>}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-52 p-2" align="end">
                      <div className="flex flex-col gap-0.5">
                        {getIneligibleFilterOptions(ineligibleItems, returnLifecycleStyles).map(({ label, statuses }) => (
                          <label key={label} className="flex items-center gap-2.5 px-2 py-1.5 rounded-md hover:bg-muted cursor-pointer text-sm">
                            <Checkbox
                              checked={statuses.every(s => ineligibleStatusFilter.includes(s))}
                              onCheckedChange={c => setIneligibleStatusFilter(p =>
                                c ? [...p, ...statuses.filter(s => !p.includes(s))]
                                  : p.filter(s => !statuses.includes(s)),
                              )}
                            />
                            {label}
                          </label>
                        ))}
                        {ineligibleStatusFilter.length > 0 && (
                          <>
                            <Separator className="my-1 -mx-2 w-auto" />
                            <button onClick={() => setIneligibleStatusFilter([])} className="text-xs text-muted-foreground hover:text-foreground px-2 py-1 text-left w-full rounded-md hover:bg-muted">Clear filters</button>
                          </>
                        )}
                      </div>
                    </PopoverContent>
                  </Popover>
                )}
                {tableColumnsButtonEnabled && (
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="h-8 gap-1.5 text-sm shrink-0 px-3 bg-transparent hover:bg-transparent hover:text-foreground">
                        <Columns2 className="size-3" />
                        Columns
                        {Object.values(colsVisible).filter(v => !v).length > 0 && (
                          <span className="rounded-full bg-foreground text-background text-[10px] font-bold px-1.5 leading-5">
                            {Object.values(colsVisible).filter(v => !v).length}
                          </span>
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-44 p-2" align="end">
                      <div className="flex flex-col gap-0.5">
                        {([["variant", "Variant"], ["qty", "Quantity"], ["total", "Total"]] as const).map(([key, label]) => (
                          <label key={key} className="flex items-center gap-2.5 px-2 py-1.5 rounded-md hover:bg-muted cursor-pointer text-sm">
                            <Checkbox
                              checked={colsVisible[key]}
                              onCheckedChange={c => setColsVisible(p => ({ ...p, [key]: !!c }))}
                            />
                            {label}
                          </label>
                        ))}
                        {Object.values(colsVisible).some(v => !v) && (
                          <>
                            <Separator className="my-1 -mx-2 w-auto" />
                            <button onClick={() => setColsVisible({ variant: true, qty: true, total: true })} className="text-xs text-muted-foreground hover:text-foreground px-2 py-1 text-left w-full rounded-md hover:bg-muted">Reset columns</button>
                          </>
                        )}
                      </div>
                    </PopoverContent>
                  </Popover>
                )}
                {tablePageSizeEnabled && (
                  <Select value={pageSize} onValueChange={setPageSize}>
                    <SelectTrigger size="sm" className="w-[100px] bg-transparent text-sm shrink-0"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="5">Show 5</SelectItem>
                      <SelectItem value="10">Show 10</SelectItem>
                      <SelectItem value="25">Show 25</SelectItem>
                      <SelectItem value="all">Show All</SelectItem>
                    </SelectContent>
                  </Select>
                )}
                </div>
              </div>

              {/* Mobile: search + filter icon (ineligible only) + show */}
              <div className="flex min-[1025px]:hidden items-center gap-2">
                {tableSearchEnabled && (
                  <div className="relative flex-1">
                    <Search className="absolute left-2.5 top-2 h-4 w-4 text-muted-foreground" />
                    <Input placeholder={tableSearchPlaceholder} value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-9 bg-transparent text-sm h-8" />
                  </div>
                )}
                <div className="flex items-center gap-2 ml-auto">
                {showToolbarFilter && (
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" size="icon" className="h-8 w-8 shrink-0 bg-transparent">
                        <SlidersHorizontal className="size-3.5" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-52 p-2" align="end">
                      <div className="flex flex-col gap-0.5">
                        {getIneligibleFilterOptions(ineligibleItems, returnLifecycleStyles).map(({ label, statuses }) => (
                          <label key={label} className="flex items-center gap-2.5 px-2 py-1.5 rounded-md hover:bg-muted cursor-pointer text-sm">
                            <Checkbox
                              checked={statuses.every(s => ineligibleStatusFilter.includes(s))}
                              onCheckedChange={c => setIneligibleStatusFilter(p =>
                                c ? [...p, ...statuses.filter(s => !p.includes(s))]
                                  : p.filter(s => !statuses.includes(s)),
                              )}
                            />
                            {label}
                          </label>
                        ))}
                        {ineligibleStatusFilter.length > 0 && (
                          <>
                            <Separator className="my-1 -mx-2 w-auto" />
                            <button onClick={() => setIneligibleStatusFilter([])} className="text-xs text-muted-foreground hover:text-foreground px-2 py-1 text-left w-full rounded-md hover:bg-muted">Clear filters</button>
                          </>
                        )}
                      </div>
                    </PopoverContent>
                  </Popover>
                )}
                {tablePageSizeEnabled && (
                  <Select value={pageSize} onValueChange={setPageSize}>
                    <SelectTrigger size="sm" className="w-[100px] bg-transparent text-sm shrink-0"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="5">Show 5</SelectItem>
                      <SelectItem value="10">Show 10</SelectItem>
                      <SelectItem value="25">Show 25</SelectItem>
                      <SelectItem value="all">Show All</SelectItem>
                    </SelectContent>
                  </Select>
                )}
                </div>
              </div>
            </div>
            )}

            {/* ── Mobile: label when only one tab (no tab bar needed) ── */}
            {!hasBothTabs && !fullyIneligible && HEADER_STAT_DESIGN !== 4 && HEADER_STAT_DESIGN !== 6 && (
              <div className="min-[1025px]:hidden px-4 py-2.5 border-b flex items-center justify-between">
                <span className="text-sm font-semibold text-foreground">{eligibleLabel}</span>
                <CountBadge value={totalEligibleUnits} variant="green" />
              </div>
            )}

            {/* ── Mobile tab bar — edge-to-edge, flush separator ── */}
            {statusFilterEnabled && hasBothTabs && HEADER_STAT_DESIGN !== 4 && (
              <div className="min-[1025px]:hidden flex border-b">
                <button
                  type="button"
                  className={cn(
                    "flex-1 py-2.5 text-sm font-medium relative transition-colors",
                    activeTab === "eligible" ? "text-foreground font-semibold" : "text-muted-foreground"
                  )}
                  onClick={() => { setActiveTab("eligible"); setCurrentPage(1) }}
                >
                  {eligibleLabel} ({totalEligibleUnits})
                  {activeTab === "eligible" && <span className="absolute bottom-0 left-0 right-0 h-px bg-foreground" />}
                </button>
                <div className="w-px bg-border self-stretch" />
                <button
                  type="button"
                  className={cn(
                    "flex-1 py-2.5 text-sm font-medium relative transition-colors",
                    activeTab === "ineligible" ? "text-foreground font-semibold" : "text-muted-foreground"
                  )}
                  onClick={() => { setActiveTab("ineligible"); setCurrentPage(1) }}
                >
                  {ineligibleLabel} ({totalIneligibleUnits})
                  {activeTab === "ineligible" && <span className="absolute bottom-0 left-0 right-0 h-px bg-foreground" />}
                </button>
              </div>
            )}

            {activeTab === "ineligible" && ineligibleMessageEnabled && (
              <div className="border-b px-5 py-2.5 text-[11px] leading-snug text-muted-foreground bg-muted/10">
                These items can&apos;t be selected here.{" "}
                <a
                  href={orderStatusUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium text-foreground underline underline-offset-2"
                >
                  View return progress on your order
                </a>
              </div>
            )}

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
                    {colsVisible.variant && <TableHead className="hidden min-[1025px]:table-cell">Variant</TableHead>}
                    {colsVisible.qty && <TableHead className="text-center hidden min-[1025px]:table-cell">Qty</TableHead>}
                    {colsVisible.total && <TableHead className="text-right pr-4">Total</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedData.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={
                          (activeTab === "eligible" ? 1 : 0) +
                          ineligibleTableColSpan(colsVisible)
                        }
                        className="h-24 text-center text-muted-foreground"
                      >
                        No items found.
                      </TableCell>
                    </TableRow>
                  ) : paginatedData.map((item, rowIdx) => {
                    const displayQty = activeTab === "eligible" ? item.eligibleQuantity : (item.splitQty ?? item.quantity)
                    const sel        = selectedItems[item.id]
                    const isLocked   = !policyAccepted && activeTab === "eligible"
                    const itemPrice  = item.unitPrice ?? orderAvgPrice
                    const groupKey   = activeTab === "ineligible" ? getIneligibleGroupKey(item, order, returnWindowDays) : ""
                    const showGroupHeader = activeTab === "ineligible" && (
                      rowIdx === 0 || getIneligibleGroupKey(paginatedData[rowIdx - 1], order, returnWindowDays) !== groupKey
                    )
                    const groupRows = activeTab === "ineligible"
                      ? filteredIneligible.filter(i => getIneligibleGroupKey(i, order, returnWindowDays) === groupKey)
                      : []

                    return (
                      <React.Fragment key={`${item.id}-${rowIdx}`}>
                        {showGroupHeader && (
                          <TableRow className="bg-muted/80 hover:bg-muted/80 border-b border-border/60">
                            <TableCell colSpan={ineligibleTableColSpan(colsVisible)} className="p-0 whitespace-normal">
                              <IneligibleGroupSummary item={item} order={order} groupItems={groupRows} count={formatGroupCount(groupRows)} returnWindowDays={returnWindowDays} returnLifecycleMessages={returnLifecycleMessages} returnLifecycleStyles={returnLifecycleStyles} refundStatusLabels={refundStatusLabels} />
                            </TableCell>
                          </TableRow>
                        )}
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
                              <ProductThumb item={item} linkEnabled={productImageLinksEnabled} />
                              <div className="min-w-0">
                                <a href={pUrl(item.productHandle)} target="_blank" rel="noopener noreferrer" className="font-medium text-sm hover:underline truncate block max-w-[160px] min-[1025px]:max-w-[200px]">{item.title}</a>
                                <span className="min-[1025px]:hidden text-[11px] text-muted-foreground block truncate max-w-[140px]">
                                  {displayQty}×{item.variant?.title && item.variant.title !== "Default Title" ? ` ${item.variant.title}` : ""}
                                </span>
                                <span className="text-[11px] text-muted-foreground">
                                  £{itemPrice.toFixed(2)} each{activeTab === "eligible" && (() => { const d = daysLeftToReturn(item.lineDeliveredAt, returnWindowDays); return d !== null ? <ReturnWindowBadge days={d} /> : null })()}
                                </span>
                                {activeTab === "eligible" && hasRetryableDecline(item.declinedReturnEntries) && (item.inTransitQuantity ?? 0) > 0 && (
                                  <p className="text-[11px] text-blue-600 leading-snug mt-0.5">
                                    Still in transit — try again once it has been delivered.
                                  </p>
                                )}
                              </div>
                            </div>
                          </TableCell>
                          {colsVisible.variant && (
                            <TableCell className="py-3 text-sm hidden min-[1025px]:table-cell">
                              {item.variant?.title && item.variant.title !== "Default Title" ? item.variant.title : <span className="text-muted-foreground">—</span>}
                            </TableCell>
                          )}
                          {colsVisible.qty && <TableCell className="py-3 text-sm text-center tabular-nums hidden min-[1025px]:table-cell">{displayQty}</TableCell>}
                          {colsVisible.total && <TableCell className="text-right pr-4 py-3 font-semibold text-sm tabular-nums">£{(itemPrice * (activeTab === "eligible" ? (sel?.quantity || item.eligibleQuantity) : displayQty)).toFixed(2)}</TableCell>}
                        </TableRow>

                        {sel?.selected && activeTab === "eligible" && (<>
                          <TableRow className="bg-white hover:bg-white border-b-0">
                            {/* ── Mobile: full-width stacked form ── */}
                            <TableCell
                              colSpan={2 + (colsVisible.qty ? 1 : 0) + (colsVisible.total ? 1 : 0)}
                              className="pb-3 pt-2 px-3 min-[1025px]:hidden"
                            >
                              <div className="flex flex-col gap-2.5">
                                <div className="flex items-end gap-2">
                                  <div className="w-1/2">
                                    <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground block mb-1">Return Qty</label>
                                    <Select value={String(sel.quantity)} onValueChange={v => setSelectedItems(p => ({ ...p, [item.id]: { ...p[item.id], quantity: parseInt(v) } }))}>
                                      <SelectTrigger className="h-8 text-sm w-full"><SelectValue /></SelectTrigger>
                                      <SelectContent>{Array.from({ length: item.eligibleQuantity }, (_, i) => (<SelectItem key={i + 1} value={String(i + 1)}>{i + 1}</SelectItem>))}</SelectContent>
                                    </Select>
                                  </div>
                                  <div className="w-1/2">
                                    <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground block mb-1">Reason</label>
                                    <Select value={sel.reason} onValueChange={v => setSelectedItems(p => ({ ...p, [item.id]: { ...p[item.id], reason: v } }))}>
                                      <SelectTrigger className="h-8 text-sm w-full"><SelectValue placeholder="Select..." /></SelectTrigger>
                                      <SelectContent>{RETURN_REASONS.map(r => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}</SelectContent>
                                    </Select>
                                  </div>
                                </div>
                                <div>
                                  <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground block mb-1">
                                    {sel.reason === "OTHER" ? <>Notes <span className="text-destructive">*</span></> : "Notes (optional)"}
                                  </label>
                                  <Textarea value={sel.description} onChange={e => setSelectedItems(p => ({ ...p, [item.id]: { ...p[item.id], description: e.target.value } }))} placeholder={sel.reason === "OTHER" ? "Describe your reason (required)..." : "Any additional info..."} className="text-sm resize-none" rows={2} />
                                </div>
                              </div>
                            </TableCell>

                            {/* ── Desktop row 1: Return Qty + Reason in their own cells ── */}
                            <TableCell className="pl-4 pr-0 pb-2 pt-3 hidden min-[1025px]:table-cell" />
                            <TableCell className="pl-3 pb-2 pt-3 hidden min-[1025px]:table-cell">
                              <div>
                                <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground block mb-1">Return Qty</label>
                                <Select value={String(sel.quantity)} onValueChange={v => setSelectedItems(p => ({ ...p, [item.id]: { ...p[item.id], quantity: parseInt(v) } }))}>
                                  <SelectTrigger className="h-8 text-sm w-24"><SelectValue /></SelectTrigger>
                                  <SelectContent>{Array.from({ length: item.eligibleQuantity }, (_, i) => (<SelectItem key={i + 1} value={String(i + 1)}>{i + 1}</SelectItem>))}</SelectContent>
                                </Select>
                              </div>
                            </TableCell>
                            {colsVisible.variant && (
                              <TableCell className="pb-2 pt-3 hidden min-[1025px]:table-cell">
                                <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground block mb-1">Reason</label>
                                <Select value={sel.reason} onValueChange={v => setSelectedItems(p => ({ ...p, [item.id]: { ...p[item.id], reason: v } }))}>
                                  <SelectTrigger className="h-8 text-sm bg-card"><SelectValue placeholder="Select..." /></SelectTrigger>
                                  <SelectContent>{RETURN_REASONS.map(r => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}</SelectContent>
                                </Select>
                              </TableCell>
                            )}
                            {(colsVisible.qty || colsVisible.total) && (
                              <TableCell colSpan={(colsVisible.qty ? 1 : 0) + (colsVisible.total ? 1 : 0)} className="pb-2 pt-3 hidden min-[1025px]:table-cell" />
                            )}
                          </TableRow>
                          <TableRow className="bg-white hover:bg-white hidden min-[1025px]:table-row">
                            <TableCell className="pl-4 pr-0 pt-0 pb-3" />
                            <TableCell colSpan={99} className="pl-3 pr-4 pt-0 pb-3">
                              <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground block mb-1">
                                {sel.reason === "OTHER" ? <>Notes <span className="text-destructive">*</span></> : "Notes (optional)"}
                              </label>
                              <Textarea value={sel.description} onChange={e => setSelectedItems(p => ({ ...p, [item.id]: { ...p[item.id], description: e.target.value } }))} placeholder={sel.reason === "OTHER" ? "Describe your reason (required)..." : "Any additional info..."} className="text-sm resize-none" rows={2} />
                            </TableCell>
                          </TableRow>
                        </>)}
                      </React.Fragment>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
            {pageSize !== "all" && currentData.length > size && (
              <div className="px-4 py-2 border-t flex items-center justify-between text-xs text-muted-foreground">
                <span>Showing {Math.min((currentPage - 1) * size + 1, currentData.length)}–{Math.min(currentPage * size, currentData.length)} of {currentData.length} entries</span>
                <div className="flex items-center gap-1.5">
                  <Button variant="outline" size="sm" className="h-7 px-2.5 text-xs" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}>Previous</Button>
                  <Button variant="outline" size="sm" className="h-7 px-2.5 text-xs" onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage >= totalPages}>Next</Button>
                </div>
              </div>
            )}
            </>
          )}
        </Card>

      </div>

      {/* ── Sticky footer — same horizontal inset as the table card (px-4 wrapper above) ── */}
      <AnimatePresence>
      {hasEligible && !order.cancelledAt && activeTab === "eligible" && (
        <motion.div
          className="sticky bottom-4 z-48 mx-4 border border-border rounded-xl bg-background shadow-[0_2px_12px_rgba(0,0,0,0.08)]"
          style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 16 }}
          transition={{ duration: 0.22, ease: [0.25, 0.1, 0.25, 1] }}
        >
          <div
            className="px-3 sm:px-4 py-2 sm:py-2.5 flex items-center justify-between gap-2"
            style={{ paddingRight: "max(0.75rem, env(safe-area-inset-right))" }}
          >
            <div className="flex items-center gap-2 sm:gap-3 min-w-0">
              <div className="shrink-0">
                <p className="text-[9px] sm:text-[10px] uppercase tracking-wider text-muted-foreground font-semibold leading-none mb-0.5">Selected</p>
                <p className="text-xs sm:text-sm font-semibold leading-tight">{selectedCount} item{selectedCount !== 1 ? "s" : ""}</p>
              </div>
              <Separator orientation="vertical" className="h-6 shrink-0" />
              <div className="shrink-0">
                <p className="text-[9px] sm:text-[10px] uppercase tracking-wider text-muted-foreground font-semibold leading-none mb-0.5">Refund</p>
                <p className="text-xs sm:text-sm font-bold text-[var(--brand)] leading-tight">£{estimatedRefund.toFixed(2)}</p>
              </div>
              {!policyAccepted && (
                <div className="hidden lg:flex items-center gap-1.5 text-xs text-muted-foreground shrink-0">
                  <Lock className="size-3.5 shrink-0" /><span>Accept policy to continue</span>
                </div>
              )}
            </div>
            <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
              <Button variant="ghost" size="sm" onClick={onBack} className="text-muted-foreground hidden min-[1025px]:inline-flex">Cancel</Button>
              {/* Option B: when in review mode the footer shows Confirm instead */}
              {returnReviewEnabled && RETURN_REVIEW_VARIANT === "B" && showReview ? (
                <>
                  <Button variant="outline" size="sm" onClick={() => setShowReview(false)} className="text-xs">Back</Button>
                  <Button size="sm" className="bg-[var(--brand)] hover:bg-[var(--brand)]/90 text-white disabled:opacity-50 text-xs font-bold" disabled={submitting} onClick={submitReturn}>
                    {submitting ? <Spinner className="size-3.5" /> : <><CheckCircle2 className="size-3.5" /><span className="hidden min-[1025px]:inline ml-1">Confirm return</span></>}
                  </Button>
                </>
              ) : (
                <Button size="sm" className="bg-[var(--brand)] hover:bg-[var(--brand)]/90 text-white disabled:opacity-50 text-xs font-bold"
                  disabled={!canSubmit || submitting}
                  onClick={returnReviewEnabled ? () => setShowReview(true) : submitReturn}
                >
                  {submitting
                    ? <><Spinner className="size-3.5" /><span className="hidden min-[1025px]:inline ml-1">Submitting...</span></>
                    : returnReviewEnabled
                      ? <><RotateCcw className="size-3.5" /><span className="hidden min-[1025px]:inline ml-1">Review return</span></>
                      : <><CheckCircle2 className="size-3.5" /><span className="hidden min-[1025px]:inline ml-1">Submit return</span></>}
                </Button>
              )}
            </div>
          </div>
        </motion.div>
      )}
      </AnimatePresence>

      {/* ── Option A: confirmation dialog ── */}
      {returnReviewEnabled && RETURN_REVIEW_VARIANT === "A" && (
        <Dialog open={showReview} onOpenChange={setShowReview}>
          <DialogContent className="max-w-md sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Review your return</DialogTitle>
              <DialogDescription>Check the items below before confirming your request.</DialogDescription>
            </DialogHeader>
            <div className="divide-y max-h-[50vh] overflow-y-auto -mx-6 px-6">
              {reviewItems.map(({ id, item, quantity, reason, description, subtotal }) => (
                <div key={id} className="flex items-start gap-3 py-3">
                  {item?.image?.url && (
                    <img src={item.image.url} alt={item.title} className="size-12 rounded-md object-cover shrink-0 border" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium leading-tight">{item?.title}</p>
                    {item?.variant?.title && item.variant.title !== "Default Title" && (
                      <p className="text-xs text-muted-foreground">{item.variant.title}</p>
                    )}
                    <p className="text-xs text-muted-foreground mt-0.5">Qty {quantity} · {reason}</p>
                    {description && <p className="text-xs text-muted-foreground italic mt-0.5">"{description}"</p>}
                  </div>
                  <p className="text-sm font-semibold tabular-nums shrink-0">£{subtotal.toFixed(2)}</p>
                </div>
              ))}
            </div>
            <div className="flex items-center justify-between pt-3 border-t">
              <div>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Estimated refund</p>
                <p className="text-xl font-bold text-[var(--brand)]">£{estimatedRefund.toFixed(2)}</p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setShowReview(false)}>Back</Button>
                <Button size="sm" className="bg-[var(--brand)] hover:bg-[var(--brand)]/90 text-white text-xs" disabled={submitting}
                  onClick={() => { setShowReview(false); submitReturn() }}
                >
                  {submitting ? <Spinner className="size-3.5" /> : "Confirm return"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  )
}

// Demo mode: the public /demo page renders this exact component against
// canned data (/api/demo-orders) with no auth, so the demo is pixel-identical
// to the production portal. Module-level so nested components (OrderDetail's
// submitReturn) can see it without threading a prop through every layer.
let DEMO_MODE = false

export default function DashboardClient({
  demo = false,
  /** Shown blurred behind Authenticating while a guest order is still loading
   * (avoids a blank white flash between Find your order and the order page). */
  authPlaceholder,
}: {
  demo?: boolean
  authPlaceholder?: React.ReactNode
} = {}) {
  DEMO_MODE = demo
  return (
    <SidebarLayoutProvider>
      <Suspense>
        <DashboardClientInner authPlaceholder={authPlaceholder} />
      </Suspense>
    </SidebarLayoutProvider>
  )
}


function DashboardClientInner({ authPlaceholder }: { authPlaceholder?: React.ReactNode }) {
  const searchParams = useSearchParams()
  const { applyMerchantDefault } = useSidebarLayout()
  const [data, setData]                   = useState<OrdersData | null>(null)
  const [loading, setLoading]             = useState(true)
  const [loadingMore, setLoadingMore]     = useState(false)
  const [hasNextPage, setHasNextPage]     = useState(false)
  const [endCursor, setEndCursor]         = useState<string | null>(null)
  const [error, setError]                 = useState<string | null>(null)
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  const [view, setView]                   = useState<"grid" | "list">("grid")
  const [search, setSearch]               = useState("")
  const [statusFilter, setStatusFilter]   = useState<string[]>([])
  const [activeSection, setActiveSection] = useState("#orders")
  const [branding, setBranding] = useState<TenantBranding>({
    name: "", logoUrl: "", logoHeight: 32, accentColor: "#000000", storefrontUrl: "", supportEmail: "",
    requirePolicyAcceptance: true, returnReviewEnabled: true, storeLinkEnabled: true, storeLinkLabel: "Store",
    orderStatusLinkEnabled: true, orderStatusLinkLabel: "Order Status",
    policyHeading: "iBlaze Returns Policy", policySubheading: "Review our returns policy before selecting items to return.",
    policyLastUpdated: "",
    policyBodyMode: "categories", policyCategories: DEFAULT_POLICY_CATEGORIES, policyBodyText: "",
    policyFooterNoteEnabled: true, policyFooterNote: DEFAULT_POLICY_FOOTER_NOTE,
    policyAcceptedMessage: "Policy accepted", policyDeclinedMessage: "Policy declined",
    sidebarLinks: [], sidebarNote: "", sidebarLayoutSwitcherEnabled: true, defaultSidebarLayout: "inset",
    sidebarEnabled: true, lookupSidebarEnabled: true,
    headerSearchEnabled: true, headerSearchPlaceholder: "Search orders...",
    tableSearchEnabled: true, tableSearchPlaceholder: "Search product or variant...",
    tableColumnsButtonEnabled: true, tableFilterButtonEnabled: true, tablePageSizeEnabled: true,
    shipmentCardsEnabled: true, productImageLinksEnabled: true, sidebarSubmenusExpandedByDefault: true,
    guestBackgroundStyle: "none",
    guestLookupLayout: "split",
    guestLookupHeadline: "Return your order with ease",
    guestLookupSubtext: "Look up your order in seconds — no account needed.",
    guestLookupHeroUrl: "",
    guestLookupBrandDisplay: "logo",
    guestLookupLogoUrl: "",
    guestLookupOverlayOpacity: 40,
    guestLookupOverlayBlur: 0,
    guestLookupSnakeBorder: true,
    guestLookupSideStyle: "image",
    guestLookupGradientFrom: "#0f172a",
    guestLookupGradientTo: "#334155",
    defaultOrderView: "grid", sidebarDefaultOpenOnDesktop: getCachedSidebarDefaultOpen() ?? true, statusFilterEnabled: true,
    ineligibleMessageEnabled: true, sidebarAvatarEnabled: true, headerAvatarEnabled: true,
    eligibleLabel: "Eligible", ineligibleLabel: "Ineligible",
    returnLifecycleMessages: DEFAULT_TENANT_FIELDS.branding.returnLifecycleMessages,
    returnLifecycleStyles: DEFAULT_TENANT_FIELDS.branding.returnLifecycleStyles,
    refundStatusLabels: DEFAULT_TENANT_FIELDS.branding.refundStatusLabels,
    alwaysShowGuestLookup: false,
    guestLookupEnabled: true,
    loggedInLookupRequirePostcode: false,
    policyPresentation: "dialog",
    policyExternalUrl: "",
    policyReviewButtonLabel: "Review & Accept",
    toastPosition: "top-right",
    portalCustomScript: "",
  })
  // False until accentColor holds a real (cached or fetched) tenant value —
  // the "#000000" placeholder above is a type-safe default, not a real
  // color, and must never be painted as if it were one.
  const [accentColorReady, setAccentColorReady] = useState(false)
  const sentinelRef = React.useRef<HTMLDivElement | null>(null)
  const ordersScrollRef = React.useRef<HTMLDivElement | null>(null)
  const loadingMoreRef = React.useRef(false)
  const hasNextPageRef = React.useRef(false)
  const endCursorRef = React.useRef<string | null>(null)

  // Runs before paint (not after, like a plain useEffect would) so a cached
  // accent color from a previous visit is applied before the user ever sees
  // the neutral default — same reasoning as SidebarLayoutProvider's cookie
  // read, just via useLayoutEffect since this one needs to beat first paint.
  useLayoutEffect(() => {
    const cached = getCachedAccentColor()
    const fromCss =
      typeof document !== "undefined"
        ? document.documentElement.style.getPropertyValue("--brand").trim()
        : ""
    const seed = cached || fromCss
    if (seed) {
      setBranding((b) => ({ ...b, accentColor: seed }))
      setAccentColorReady(true)
    }
  }, [])

  useEffect(() => {
    loadingMoreRef.current = loadingMore
  }, [loadingMore])

  useEffect(() => {
    hasNextPageRef.current = hasNextPage
  }, [hasNextPage])

  useEffect(() => {
    endCursorRef.current = endCursor
  }, [endCursor])

  useEffect(() => {
    let cancelled = false
    const url = DEMO_MODE ? "/api/demo-orders" : "/api/get-orders"

    // A rapid page reload can catch the backend mid-throttle (Shopify Admin
    // API rate limiting under repeated requests) or a slow upstream call
    // timing out — both transient. One quiet retry clears most of these
    // before showing the customer an error.
    async function load(attempt: number): Promise<void> {
      try {
        const res = await fetch(url, { cache: "no-store" })
        const d = await res.json()
        if (cancelled) return
        if (d.error) { setError(d.error); return }
        setData(d)
        setHasNextPage(d.hasNextPage ?? false)
        setEndCursor(d.endCursor ?? null)
      } catch {
        if (cancelled) return
        if (attempt === 0) {
          await new Promise(r => setTimeout(r, 1000))
          if (!cancelled) return load(1)
          return
        }
        setError("Failed to load orders.")
      }
    }

    load(0).finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    if (DEMO_MODE) return
    fetch("/api/branding", { cache: "no-store" })
      .then(r => r.json())
      .then(d => {
        if (d.branding) {
          setBranding(d.branding)
          applyMerchantDefault(
            d.branding.defaultSidebarLayout,
            d.branding.sidebarEnabled && d.branding.sidebarLayoutSwitcherEnabled,
          )
          if (d.branding.defaultOrderView) setView(d.branding.defaultOrderView)
          if (d.branding.accentColor) {
            setCachedAccentColor(d.branding.accentColor)
            setAccentColorReady(true)
          }
          if (typeof d.branding.sidebarDefaultOpenOnDesktop === "boolean") {
            setCachedSidebarDefaultOpen(d.branding.sidebarDefaultOpenOnDesktop)
          }
          if (d.branding.toastPosition) {
            setPortalToastPosition(d.branding.toastPosition)
          }
        }
      })
      .catch(() => {})
  }, [applyMerchantDefault])

  // Auto-select an order when ?order=<numericId> is in the URL (e.g. from Shopify
  // extension), or when a guest just verified exactly one order via the App
  // Proxy guest lookup form (they only ever have the one order to see).
  // useLayoutEffect so guest handoff can reveal the order page without a
  // paint of the empty "My Orders" list behind the authenticating blur.
  const autoOrderId = searchParams.get("order") ?? getGuestOrderId()
  useLayoutEffect(() => {
    if (!data || !autoOrderId) return
    const match = data.orders.find(o =>
      o.id.split("/").pop() === autoOrderId ||
      o.name === `#${autoOrderId}`
    )
    if (match) {
      setSelectedOrder(match)
      setActiveSection("#orders")
      // Remove the param so refreshing or navigating back doesn't re-trigger
      window.history.replaceState({}, "", window.location.pathname)
    }
  }, [data, autoOrderId])

  const showOrdersList = !selectedOrder

  const loadMore = React.useCallback(() => {
    if (loadingMoreRef.current || !hasNextPageRef.current || !endCursorRef.current) return
    loadingMoreRef.current = true
    setLoadingMore(true)
    const cursor = endCursorRef.current
    fetch(`/api/get-orders?after=${encodeURIComponent(cursor)}`, { cache: "no-store" })
      .then(r => r.json())
      .then(d => {
        if (d.error) {
          setError(d.error)
          return
        }
        setData(prev => prev ? { ...prev, orders: [...prev.orders, ...d.orders] } : d)
        setHasNextPage(d.hasNextPage ?? false)
        setEndCursor(d.endCursor ?? null)
      })
      .catch(() => setError("Failed to load more orders."))
      .finally(() => {
        loadingMoreRef.current = false
        setLoadingMore(false)
      })
  }, [])

  const tryLoadNearEnd = React.useCallback((root: HTMLDivElement | null) => {
    if (!root || loadingMoreRef.current || !hasNextPageRef.current || !endCursorRef.current) return
    const remaining = root.scrollHeight - root.scrollTop - root.clientHeight
    if (remaining <= 480) loadMore()
  }, [loadMore])

  // Infinite scroll — attach when the orders list is mounted (after AnimatePresence transitions)
  useEffect(() => {
    if (!showOrdersList || loading || !hasNextPage) return

    let root: HTMLDivElement | null = null
    let sentinel: HTMLDivElement | null = null
    let raf = 0
    let observer: IntersectionObserver | null = null

    const onScroll = () => tryLoadNearEnd(root)

    const bind = () => {
      root = ordersScrollRef.current
      sentinel = sentinelRef.current
      if (!root || !sentinel) {
        raf = requestAnimationFrame(bind)
        return
      }
      root.addEventListener("scroll", onScroll, { passive: true })
      observer = new IntersectionObserver(
        ([entry]) => { if (entry.isIntersecting) loadMore() },
        { root, rootMargin: "400px", threshold: 0 },
      )
      observer.observe(sentinel)
      tryLoadNearEnd(root)
    }

    bind()

    return () => {
      cancelAnimationFrame(raf)
      root?.removeEventListener("scroll", onScroll)
      observer?.disconnect()
    }
  }, [loadMore, tryLoadNearEnd, showOrdersList, loading, hasNextPage, data?.orders.length, view])

  // After each page load, re-check in case the list still doesn't fill the viewport
  useEffect(() => {
    if (!showOrdersList || loading || loadingMore || !hasNextPage) return
    let raf = 0
    const check = () => {
      const root = ordersScrollRef.current
      if (!root) {
        raf = requestAnimationFrame(check)
        return
      }
      tryLoadNearEnd(root)
    }
    raf = requestAnimationFrame(check)
    return () => cancelAnimationFrame(raf)
  }, [tryLoadNearEnd, showOrdersList, loading, loadingMore, hasNextPage, data?.orders.length, view])

  const filteredOrders = (data?.orders || []).filter(o => {
    const matchesSearch = o.name.toLowerCase().includes(search.toLowerCase())
    const matchesStatus = statusFilter.length === 0 || statusFilter.includes(o.orderStatus)
    return matchesSearch && matchesStatus
  })
  const showOrdersToolbar = !loading && filteredOrders.length > 0

  const user = { name: data?.firstName || "Customer", email: data?.email || "" }
  const orderHeaderStatus = selectedOrder ? getOrderHeaderStatusIcon(selectedOrder) : null
  const guestOrderContext = isGuestOrderContext()
  // Destination content isn't ready yet (orders still fetching, or guest
  // order not selected). Hide the sidebar in that window so it can't flash
  // expanded then snap shut once branding arrives.
  const awaitingDestination = loading || (guestOrderContext && !selectedOrder)

  const portalContent = (
    <PortalShell
      user={user}
      onNavigate={s => { setActiveSection(s); setSelectedOrder(null) }}
      activeSection={activeSection}
      accentColor={branding.accentColor}
      showSidebar={branding.sidebarEnabled && !awaitingDestination}
      branding={{
        name: branding.name, logoUrl: branding.logoUrl, logoHeight: branding.logoHeight, storefrontUrl: branding.storefrontUrl,
        sidebarLinks: branding.sidebarLinks, sidebarNote: branding.sidebarNote,
        sidebarSubmenusExpandedByDefault: branding.sidebarSubmenusExpandedByDefault,
      }}
      sidebarAvatarEnabled={branding.sidebarAvatarEnabled}
      headerAvatarEnabled={branding.headerAvatarEnabled}
      sidebarDefaultOpenOnDesktop={branding.sidebarDefaultOpenOnDesktop}
      headerProps={{
        title: selectedOrder ? getOrderPageHeaderTitle(selectedOrder) : "My Orders",
        titleIcon: orderHeaderStatus ? { icon: orderHeaderStatus.icon } : undefined,
        search,
        onSearch: setSearch,
        showSearch: !selectedOrder,
        firstName: data?.firstName,
        email: data?.email,
        orderStatusUrl: selectedOrder ? (isAppsReturnsPortal() && selectedOrder.statusPageUrl ? selectedOrder.statusPageUrl : `https://account.iblazevape.co.uk/orders/${selectedOrder.id.split("/").pop()}`) : undefined,
        storefrontUrl: branding.storefrontUrl || undefined,
        storeLinkEnabled: branding.storeLinkEnabled,
        storeLinkLabel: branding.storeLinkLabel,
        orderStatusLinkEnabled: branding.orderStatusLinkEnabled,
        orderStatusLinkLabel: branding.orderStatusLinkLabel,
        searchEnabled: branding.headerSearchEnabled,
        searchPlaceholder: branding.headerSearchPlaceholder,
      }}
    >
        {selectedOrder && <StickyOrderSummaryStrip key={selectedOrder.id} order={selectedOrder} returnWindowDays={data?.returnWindowDays ?? 30} />}
        <div className="flex flex-1 min-h-0 min-w-0 overflow-hidden">
        <AnimatePresence mode="wait" initial={false}>
        {selectedOrder ? (
          <motion.div
            key="detail"
            className="flex-1 min-h-0 overflow-y-auto styled-scroll"
            style={{ paddingBottom: "1rem", scrollbarGutter: "stable" }}
            initial={{ opacity: 0, x: 18 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 18 }}
            transition={{ duration: 0.22, ease: [0.25, 0.1, 0.25, 1] }}
          >
            <OrderDetail
              order={selectedOrder}
              onBack={() => setSelectedOrder(null)}
              returnWindowDays={data?.returnWindowDays ?? 30}
              branding={branding}
            />
          </motion.div>
        ) : (
          <motion.div
            key="list"
            ref={ordersScrollRef}
            className="flex-1 min-h-0 overflow-y-auto styled-scroll"
            style={{ padding: "1rem", scrollbarGutter: "stable" }}
            initial={{ opacity: 0, x: -18 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -18 }}
            transition={{ duration: 0.22, ease: [0.25, 0.1, 0.25, 1] }}
          >
          <div className="flex flex-col gap-4 pb-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold">{data?.firstName ? `Hi, ${data.firstName} 👋` : "Your Recent Orders"}</h2>
                <p className="text-sm text-muted-foreground mt-0.5">
                  {filteredOrders.length} of {data?.orders.length ?? 0} order{(data?.orders.length ?? 0) !== 1 ? "s" : ""} shown
                  {hasNextPage ? " · scroll for older orders" : ""}
                </p>
              </div>
              {showOrdersToolbar && (
              <div className="flex items-center gap-2">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="sm" className="h-8 gap-1.5 text-sm bg-white hover:bg-white dark:bg-white dark:hover:bg-white">
                      <SlidersHorizontal className="size-3.5" />
                      Status
                      {statusFilter.length > 0 && (
                        <span className="rounded-full bg-foreground text-background text-[10px] font-bold px-1.5 leading-5">{statusFilter.length}</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-52 p-2" align="end">
                    <div className="flex flex-col">
                      {STATUS_FILTERS.map(status => (
                        <label key={status} className="flex items-center gap-2.5 px-2 py-1.5 rounded-md hover:bg-muted cursor-pointer text-sm">
                          <Checkbox
                            checked={statusFilter.includes(status)}
                            onCheckedChange={checked => setStatusFilter(prev => checked ? [...prev, status] : prev.filter(s => s !== status))}
                          />
                          {status}
                        </label>
                      ))}
                      {statusFilter.length > 0 && (
                        <>
                          <Separator className="my-1.5 -mx-2 w-auto" />
                          <button onClick={() => setStatusFilter([])} className="text-xs text-muted-foreground hover:text-foreground px-2 py-1 text-left w-full rounded-md hover:bg-muted">
                            Clear filters
                          </button>
                        </>
                      )}
                    </div>
                  </PopoverContent>
                </Popover>
                <div className="flex items-center gap-0.5 h-8 bg-white border border-border rounded-lg px-0.5">
                  <Button variant="ghost" size="icon" className={cn("size-7", view === "grid" && "bg-muted shadow-xs")} onClick={() => setView("grid")}><LayoutGrid className="size-4" /></Button>
                  <Button variant="ghost" size="icon" className={cn("size-7", view === "list" && "bg-muted shadow-xs")} onClick={() => setView("list")}><List className="size-4" /></Button>
                </div>
              </div>
              )}
            </div>

            {error && (
              <div className="flex items-center gap-3 p-4 rounded-xl bg-destructive/10 text-sm text-destructive border border-destructive/20">
                <ShoppingBag className="size-5 shrink-0" />{error}
              </div>
            )}

            {view === "grid" && !loading && filteredOrders.length === 0 ? (
              <div className="text-center py-20 rounded-xl border border-border bg-card">
                <ShoppingBag className="size-12 text-muted-foreground/30 mx-auto mb-4" />
                <p className="font-medium text-muted-foreground">
                  {search || statusFilter.length > 0 ? "No orders match your search" : "No orders found"}
                </p>
                {(search || statusFilter.length > 0) && (
                  <p className="text-sm text-muted-foreground mt-1">Try adjusting your search or filters</p>
                )}
              </div>
            ) : view === "grid" && (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                {filteredOrders.map((o, i) => <OrderCard key={o.id} order={o} index={i} onClick={() => setSelectedOrder(o)} />)}
              </div>
            )}

            {view === "list" && !loading && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25, ease: [0.25, 0.1, 0.25, 1] }}
              >
                <Card className={cn(C, "overflow-hidden")}>
                  <CardContent className="p-0">
                    {filteredOrders.length === 0
                      ? (
                        <div className="text-center py-20">
                          <ShoppingBag className="size-12 text-muted-foreground/30 mx-auto mb-4" />
                          <p className="font-medium text-muted-foreground">
                            {search || statusFilter.length > 0 ? "No orders match your search" : "No orders found"}
                          </p>
                          {(search || statusFilter.length > 0) && (
                            <p className="text-sm text-muted-foreground mt-1">Try adjusting your search or filters</p>
                          )}
                        </div>
                      )
                      : filteredOrders.map(o => <OrderRow key={o.id} order={o} onClick={() => setSelectedOrder(o)} />)}
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {hasNextPage && (
              <div
                ref={sentinelRef}
                className="flex min-h-12 items-center justify-center py-4"
                aria-hidden={!loadingMore}
                aria-busy={loadingMore}
              >
                {loadingMore && (
                  <Spinner className="size-4 text-muted-foreground" aria-label="Loading more orders" />
                )}
              </div>
            )}
          </div>
          </motion.div>
        )}
        </AnimatePresence>
        </div>
    </PortalShell>
  )

  // After guest lookup selects the searched order, hold Authenticating a
  // beat so that order page (not Find your order / empty My Orders) is
  // what’s visible behind the blur before it lifts.
  const [guestOrderReveal, setGuestOrderReveal] = useState(false)
  useEffect(() => {
    if (!guestOrderContext || !selectedOrder || loading) {
      setGuestOrderReveal(false)
      return
    }
    const t = window.setTimeout(() => setGuestOrderReveal(true), 320)
    return () => window.clearTimeout(t)
  }, [guestOrderContext, selectedOrder, loading])

  const showAuthOverlay =
    awaitingDestination ||
    (guestOrderContext && !!selectedOrder && !guestOrderReveal)

  if (showAuthOverlay) {
    // Backdrop priority for guest lookup:
    //  1. Searched order page once selected (destination)
    //  2. Else the previous Find your order screen (authPlaceholder) — not white
    //  3. Else plain portal (logged-in loading)
    const backdrop = selectedOrder
      ? portalContent
      : (guestOrderContext && authPlaceholder)
        ? authPlaceholder
        : portalContent
    return (
      <div className="relative overflow-hidden" style={{ height: "100dvh", width: "100vw" }}>
        <PortalCustomScripts html={branding.portalCustomScript} />
        <div className="pointer-events-none select-none blur-xs brightness-95 h-full w-full absolute inset-0">
          {backdrop}
        </div>
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-background/40 backdrop-blur-xs">
            <Card className="w-full max-w-xs mx-4 shadow-xl">
              <div className="flex flex-col items-center justify-center gap-3 py-8 px-6">
                {/* Driven directly from branding.accentColor state (not the
                    --brand CSS var, which isn't set this early) — seeded from
                    a cached value on mount (see the useLayoutEffect above) so
                    repeat visits are branded immediately. A true first-ever
                    visit has no cache yet, so it falls back to a neutral gray
                    instead of flashing the wrong color. */}
                <div
                  className={cn("size-10 rounded-full flex items-center justify-center", !accentColorReady && "bg-muted")}
                  style={accentColorReady ? { backgroundColor: `${branding.accentColor}1a` } : undefined}
                >
                  <Spinner className={cn("size-5", !accentColorReady && "text-muted-foreground")} style={accentColorReady ? { color: branding.accentColor } : undefined} />
                </div>
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

  return (
    <>
      <PortalCustomScripts html={branding.portalCustomScript} />
      {portalContent}
    </>
  )
}
