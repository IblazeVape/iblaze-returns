# Not-Returnable Status Split Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Split the single `notReturnable` return-lifecycle status into `awaitingDelivery` ("still coming") and `returnWindowClosed` ("permanently done"), so the filter dropdown and status badges stop conflating two situations that mean opposite things for whether an item will ever become returnable.

**Architecture:** Every place that currently assigns `returnStatus = "notReturnable"` already carries the information needed to know which of the two new statuses it should become — either `notReturnableReason === "notDelivered"` (→ `awaitingDelivery`, keeping `shippingStage`) or `notReturnableReason` was `"outsideWindow" | "finalSale" | "other"` (→ `returnWindowClosed`, with a renamed-and-narrowed `closedReason` field). This is a pure relabeling task across the same files touched by the parent epic (commits `adef0ce..1233b18`).

**Tech Stack:** Same as the parent epic — Next.js App Router, TypeScript, Redis (Upstash), Vitest. No new dependencies.

## Global Constraints

- Builds directly on `docs/superpowers/specs/2026-07-20-not-returnable-status-split-design.md` and the already-shipped parent epic. All of the parent epic's constraints still apply (no new eligibility business logic, order-level `Cancelled` and `Eligible` untouched, `returnDeclined`'s dynamic decline-reason resolution untouched, the direct-refund-only fix from the parent epic's final review untouched).
- The other 5 statuses (`returnRequested`, `returnInProgress`, `returnDeclined`, `returnCanceled`, `returnCompleted`) are NOT touched — no renaming, no message changes, no logic changes.
- `app/api/app/branding/route.ts` requires ZERO code changes for this plan — confirmed by direct inspection, it has no hardcoded status-name references anywhere; it validates/wires whatever keys `RETURN_LIFECYCLE_STATUSES` and `RETURN_LIFECYCLE_MESSAGE_KEYS` contain generically. Task 3 ends with a verification-only step confirming this, not a code change.
- `components/dashboard-client.tsx`'s `computeHeaderStatBlocks` function is dead code in the live app (confirmed in the parent epic's final review: gated behind `HEADER_STAT_DESIGN === 4 ? ... : HEADER_STAT_DESIGN !== 6 ? ... : null`, and the live value is 6, so the whole block always evaluates to `null`). Its 6 `statusFilter: ["notReturnable"]` references still need updating to keep the file compiling, but this has zero live UX impact — do not spend extra design effort on which of the two new statuses each dead block "should" logically get; a reasonable mapping is provided in Task 6 and that's sufficient.
- `lib/tenant-defaults.ts`'s `NotReturnableReason`/`NOT_RETURNABLE_REASONS` exports are re-exported from `lib/tenant.ts` but not actually imported/consumed anywhere else in the codebase (confirmed via repo-wide grep) — safe to rename to `ReturnClosedReason`/`RETURN_CLOSED_REASONS` with no other call-site impact beyond the re-export itself.
- No automated migration of existing per-status Settings customization for the old `notReturnable` entry — same reasoning as the parent epic (single real tenant, low-cost manual re-entry, not worth building a migration heuristic for).

---

### Task 1: `lib/tenant-defaults.ts` — types and defaults

**Files:**
- Modify: `lib/tenant-defaults.ts`

**Interfaces:**
- Produces: `ReturnLifecycleStatus` (7 values), `RETURN_LIFECYCLE_STATUSES` (7-entry array), `ReturnClosedReason` (renamed from `NotReturnableReason`, narrowed to 3 values), `RETURN_CLOSED_REASONS` (renamed from `NOT_RETURNABLE_REASONS`), updated `DEFAULT_TENANT_FIELDS.branding.returnLifecycleStyles` (7 keys).

- [ ] **Step 1: Update the `ReturnLifecycleStatus` type and `RETURN_LIFECYCLE_STATUSES` const**

Find:
```ts
/** The 6-value return lifecycle status for a non-Eligible line item — maps
 * directly onto Shopify's own Return.status values (REQUESTED, OPEN,
 * DECLINED, CANCELED, CLOSED), plus "notReturnable" for items that never
 * reached the Return object at all (not yet delivered, final sale, past
 * the window, or any other ineligibility reason Shopify reports). */
export type ReturnLifecycleStatus =
  | "notReturnable"
  | "returnRequested"
  | "returnInProgress"
  | "returnDeclined"
  | "returnCanceled"
  | "returnCompleted";

export const RETURN_LIFECYCLE_STATUSES: ReturnLifecycleStatus[] = [
  "notReturnable", "returnRequested", "returnInProgress",
  "returnDeclined", "returnCanceled", "returnCompleted",
];
```
Replace with:
```ts
/** The 7-value return lifecycle status for a non-Eligible line item — maps
 * directly onto Shopify's own Return.status values (REQUESTED, OPEN,
 * DECLINED, CANCELED, CLOSED), plus two statuses for items that never
 * reached the Return object at all: "awaitingDelivery" (still coming —
 * nothing wrong, just hasn't arrived) and "returnWindowClosed"
 * (permanently done — outside the window, final sale, or any other
 * ineligibility reason Shopify reports). Split from a single "notReturnable"
 * status because that one status made a capability claim ("can't be
 * returned") that was true of every row in the ineligible table, so it
 * couldn't distinguish anything in the filter dropdown — unlike these two,
 * which make different process claims (still pending vs. permanently
 * closed). */
export type ReturnLifecycleStatus =
  | "awaitingDelivery"
  | "returnWindowClosed"
  | "returnRequested"
  | "returnInProgress"
  | "returnDeclined"
  | "returnCanceled"
  | "returnCompleted";

export const RETURN_LIFECYCLE_STATUSES: ReturnLifecycleStatus[] = [
  "awaitingDelivery", "returnWindowClosed", "returnRequested",
  "returnInProgress", "returnDeclined", "returnCanceled", "returnCompleted",
];
```

- [ ] **Step 2: Rename and narrow `NotReturnableReason` to `ReturnClosedReason`**

Find:
```ts
/** Why a "notReturnable" item can't be returned — maps onto Shopify's
 * NonReturnableReason enum (UNFULFILLED, RETURN_WINDOW_EXPIRED, FINAL_SALE,
 * OTHER — RETURNED is excluded here because that case maps directly to
 * returnCompleted, not to a "not returnable" reason). */
export type NotReturnableReason = "notDelivered" | "outsideWindow" | "finalSale" | "other";

export const NOT_RETURNABLE_REASONS: NotReturnableReason[] = [
  "notDelivered", "outsideWindow", "finalSale", "other",
];
```
Replace with:
```ts
/** Why a "returnWindowClosed" item can't be returned — maps onto a subset
 * of Shopify's NonReturnableReason enum (RETURN_WINDOW_EXPIRED, FINAL_SALE,
 * OTHER). UNFULFILLED is excluded here because that case now maps to the
 * "awaitingDelivery" status instead of a reason under this one; RETURNED is
 * excluded because that case maps directly to returnCompleted. */
export type ReturnClosedReason = "outsideWindow" | "finalSale" | "other";

export const RETURN_CLOSED_REASONS: ReturnClosedReason[] = [
  "outsideWindow", "finalSale", "other",
];
```

- [ ] **Step 3: Update the `ReturnLifecycleMessages` doc comment (no field changes)**

Find:
```ts
/**
 * Customer-facing sentences. shipping* fields apply when status is
 * "notReturnable" and reason is "notDelivered" — the lifecycle status and
 * reason are the same for all four, but the sentence still needs to say
 * which shipping stage it's at. outsideWindow/finalSale/otherNotReturnable
 * apply when reason is outsideWindow/finalSale/other respectively.
 * returnDeclined has no field here — it uses the real Shopify decline
 * reason text, resolved dynamically in components/dashboard-client.tsx.
 * Supports {days} (merchant's return window) and {closedDate}
 * (outsideWindow only) placeholder tokens.
 */
```
Replace with:
```ts
/**
 * Customer-facing sentences. shipping* fields apply when status is
 * "awaitingDelivery" — the sentence still needs to say which shipping
 * stage it's at. outsideWindow/finalSale/otherNotReturnable apply when
 * status is "returnWindowClosed", dispatched on the item's closedReason.
 * returnDeclined has no field here — it uses the real Shopify decline
 * reason text, resolved dynamically in components/dashboard-client.tsx.
 * Supports {days} (merchant's return window) and {closedDate}
 * (outsideWindow only) placeholder tokens.
 */
```
(The `ReturnLifecycleMessages` type itself — the 12 field names — is unchanged. Do not edit the type body, only this comment.)

- [ ] **Step 4: Replace the `returnLifecycleStyles` default block**

Find:
```ts
    returnLifecycleStyles: {
      notReturnable:    { label: "Not returnable",     heading: "Not returnable",                       icon: "Lock",         color: "" },
      returnRequested:  { label: "Return requested",   heading: "We've received your return request",   icon: "Eye",          color: "" },
      returnInProgress: { label: "Return in progress", heading: "Your return is in progress",            icon: "RotateCcw",    color: "" },
      returnDeclined:   { label: "Return declined",    heading: "Your return request was declined",      icon: "CircleX",      color: "" },
      returnCanceled:   { label: "Return canceled",    heading: "This return was canceled",              icon: "XCircle",      color: "" },
      returnCompleted:  { label: "Return completed",   heading: "This return is complete",               icon: "CheckCircle2", color: "" },
    },
```
Replace with:
```ts
    returnLifecycleStyles: {
      awaitingDelivery:   { label: "Awaiting delivery",    heading: "Awaiting delivery",                     icon: "Truck",        color: "" },
      returnWindowClosed: { label: "Return window closed", heading: "Return window closed",                  icon: "Lock",         color: "" },
      returnRequested:    { label: "Return requested",     heading: "We've received your return request",   icon: "Eye",          color: "" },
      returnInProgress:   { label: "Return in progress",   heading: "Your return is in progress",            icon: "RotateCcw",    color: "" },
      returnDeclined:     { label: "Return declined",      heading: "Your return request was declined",      icon: "CircleX",      color: "" },
      returnCanceled:     { label: "Return canceled",      heading: "This return was canceled",              icon: "XCircle",      color: "" },
      returnCompleted:    { label: "Return completed",     heading: "This return is complete",               icon: "CheckCircle2", color: "" },
    },
```
(`returnLifecycleMessages` and `refundStatusLabels` default blocks are unchanged — do not edit them.)

- [ ] **Step 5: Verify**

Run: `npx tsc --noEmit`
Expected: errors ONLY in files still referencing the old `ReturnLifecycleStatus`/`NotReturnableReason` shapes (every other file touched by this plan) — zero errors originating from `lib/tenant-defaults.ts` itself.

- [ ] **Step 6: Commit**

```bash
git add lib/tenant-defaults.ts
git commit -m "feat: split notReturnable into awaitingDelivery and returnWindowClosed"
```

---

### Task 2: `lib/tenant.ts` — re-export rename

**Files:**
- Modify: `lib/tenant.ts`

**Interfaces:**
- Consumes: `ReturnClosedReason` from Task 1.
- Produces: `ReturnClosedReason` re-exported from `@/lib/tenant` (was `NotReturnableReason`).

- [ ] **Step 1: Update the import and export lines**

Find:
```ts
import {
  DEFAULT_TENANT_FIELDS, type PolicyCategory, type SidebarLink, type SidebarLayout, type TenantBranding,
  type ReturnLifecycleStatus, type ReturnLifecycleStyle, type ReturnLifecycleStyles, type ReturnLifecycleMessages,
  type NotReturnableReason, type RefundStatus, type RefundStatusLabels,
} from "@/lib/tenant-defaults";

export type {
  PolicyCategory, SidebarLink, SidebarLayout, TenantBranding,
  ReturnLifecycleStatus, ReturnLifecycleStyle, ReturnLifecycleStyles, ReturnLifecycleMessages,
  NotReturnableReason, RefundStatus, RefundStatusLabels,
};
```
Replace with:
```ts
import {
  DEFAULT_TENANT_FIELDS, type PolicyCategory, type SidebarLink, type SidebarLayout, type TenantBranding,
  type ReturnLifecycleStatus, type ReturnLifecycleStyle, type ReturnLifecycleStyles, type ReturnLifecycleMessages,
  type ReturnClosedReason, type RefundStatus, type RefundStatusLabels,
} from "@/lib/tenant-defaults";

export type {
  PolicyCategory, SidebarLink, SidebarLayout, TenantBranding,
  ReturnLifecycleStatus, ReturnLifecycleStyle, ReturnLifecycleStyles, ReturnLifecycleMessages,
  ReturnClosedReason, RefundStatus, RefundStatusLabels,
};
```

- [ ] **Step 2: Verify**

Run: `npx tsc --noEmit`
Expected: no NEW errors introduced by this file.

- [ ] **Step 3: Commit**

```bash
git add lib/tenant.ts
git commit -m "feat: re-export ReturnClosedReason from lib/tenant"
```

---

### Task 3: `lib/branding-validation.ts` — mirror types, and confirm `branding/route.ts` needs no changes

**Files:**
- Modify: `lib/branding-validation.ts`

**Interfaces:**
- Produces: `ReturnLifecycleStatusInput` (7 values), `RETURN_LIFECYCLE_STATUSES` (7-entry array, local to this file — not imported from `tenant-defaults.ts`).

- [ ] **Step 1: Update the type and const**

Find:
```ts
export type ReturnLifecycleStatusInput =
  | "notReturnable" | "returnRequested" | "returnInProgress"
  | "returnDeclined" | "returnCanceled" | "returnCompleted";

export const RETURN_LIFECYCLE_STATUSES: ReturnLifecycleStatusInput[] = [
  "notReturnable", "returnRequested", "returnInProgress",
  "returnDeclined", "returnCanceled", "returnCompleted",
];
```
Replace with:
```ts
export type ReturnLifecycleStatusInput =
  | "awaitingDelivery" | "returnWindowClosed" | "returnRequested" | "returnInProgress"
  | "returnDeclined" | "returnCanceled" | "returnCompleted";

export const RETURN_LIFECYCLE_STATUSES: ReturnLifecycleStatusInput[] = [
  "awaitingDelivery", "returnWindowClosed", "returnRequested", "returnInProgress",
  "returnDeclined", "returnCanceled", "returnCompleted",
];
```
(`ReturnLifecycleMessagesInput`, `ReturnLifecycleStyleInput`, `ReturnLifecycleStylesInput`, `RefundStatusInput`, `RefundStatusLabelsInput`, and the validation function body are unchanged — they already reference `RETURN_LIFECYCLE_STATUSES` generically, so a 7-entry array flows through automatically.)

- [ ] **Step 2: Verify this file compiles clean**

Run: `npx tsc --noEmit`
Expected: zero errors originating from `lib/branding-validation.ts`.

- [ ] **Step 3: Confirm `app/api/app/branding/route.ts` needs no changes**

Run: `grep -n "notReturnable" app/api/app/branding/route.ts`
Expected: no matches (this file has no hardcoded status-name references — it validates/wires whatever `RETURN_LIFECYCLE_STATUSES` and `RETURN_LIFECYCLE_MESSAGE_KEYS` contain).

Run: `npx tsc --noEmit`
Expected: zero errors from `app/api/app/branding/route.ts` (it should already be picking up the 7-value type transparently). If this step shows an error in this file, stop and investigate before proceeding — it would mean the file has an undocumented hardcoded reference this plan missed.

- [ ] **Step 4: Commit**

```bash
git add lib/branding-validation.ts
git commit -m "feat: split notReturnable into awaitingDelivery/returnWindowClosed in branding validation"
```

---

### Task 4: `app/api/get-orders/route.ts` + `lib/get-orders-status.ts` — eligibility computation split

**Files:**
- Modify: `lib/get-orders-status.ts`
- Modify: `app/api/get-orders/route.ts`

**Interfaces:**
- Produces: `statusFromUndeliveredDelivery` now returns `{ returnStatus: string; closedReason: ReturnClosedReason | null; shippingStage: ShippingStage | null; returnReason: string }` (was `notReturnableReason: string`). New export `ReturnClosedReason` type from `lib/get-orders-status.ts` (local to this module, mirrors the one in `tenant-defaults.ts` — this codebase's established pattern already duplicates `ShippingStage` this way rather than sharing one definition across the client/server boundary).
- API response per line item gains `closedReason` in place of `notReturnableReason`; `returnStatus` values change from `"notReturnable"` to `"awaitingDelivery"` or `"returnWindowClosed"` depending on context.

- [ ] **Step 1: Update `lib/get-orders-status.ts`**

Find:
```ts
export type ShippingStage = "confirmed" | "onItsWay" | "outForDelivery" | "attemptedDelivery";
```
Replace with:
```ts
export type ShippingStage = "confirmed" | "onItsWay" | "outForDelivery" | "attemptedDelivery";
export type ReturnClosedReason = "outsideWindow" | "finalSale" | "other";
```

Find:
```ts
export function statusFromUndeliveredDelivery(
  delivery: {
    inTransitQty: number;
    outForDeliveryQty: number;
    attemptedDeliveryQty: number;
    confirmedQty: number;
    earliestShippedAt: Date | null;
  },
  now: Date,
  returnWindowDays: number,
): { returnStatus: string; notReturnableReason: string; shippingStage: ShippingStage | null; returnReason: string } {
  const isInTransit = delivery.attemptedDeliveryQty > 0 || delivery.outForDeliveryQty > 0 || delivery.inTransitQty > 0;

  if (isInTransit && delivery.earliestShippedAt) {
    const daysSinceShipped = (now.getTime() - delivery.earliestShippedAt.getTime()) / (1000 * 60 * 60 * 24);
    if (daysSinceShipped > returnWindowDays) {
      return {
        returnStatus: "notReturnable",
        notReturnableReason: "outsideWindow",
        shippingStage: null,
        returnReason: formatReturnWindowExpiredReason(delivery.earliestShippedAt, returnWindowDays),
      };
    }
  }

  const stage: ShippingStage =
    delivery.attemptedDeliveryQty > 0 ? "attemptedDelivery"
    : delivery.outForDeliveryQty > 0 ? "outForDelivery"
    : delivery.inTransitQty > 0 ? "onItsWay"
    : "confirmed";

  return {
    returnStatus: "notReturnable",
    notReturnableReason: "notDelivered",
    shippingStage: stage,
    returnReason: SHIPPING_STAGE_REASON[stage],
  };
}
```
Replace with:
```ts
export function statusFromUndeliveredDelivery(
  delivery: {
    inTransitQty: number;
    outForDeliveryQty: number;
    attemptedDeliveryQty: number;
    confirmedQty: number;
    earliestShippedAt: Date | null;
  },
  now: Date,
  returnWindowDays: number,
): { returnStatus: string; closedReason: ReturnClosedReason | null; shippingStage: ShippingStage | null; returnReason: string } {
  const isInTransit = delivery.attemptedDeliveryQty > 0 || delivery.outForDeliveryQty > 0 || delivery.inTransitQty > 0;

  if (isInTransit && delivery.earliestShippedAt) {
    const daysSinceShipped = (now.getTime() - delivery.earliestShippedAt.getTime()) / (1000 * 60 * 60 * 24);
    if (daysSinceShipped > returnWindowDays) {
      return {
        returnStatus: "returnWindowClosed",
        closedReason: "outsideWindow",
        shippingStage: null,
        returnReason: formatReturnWindowExpiredReason(delivery.earliestShippedAt, returnWindowDays),
      };
    }
  }

  const stage: ShippingStage =
    delivery.attemptedDeliveryQty > 0 ? "attemptedDelivery"
    : delivery.outForDeliveryQty > 0 ? "outForDelivery"
    : delivery.inTransitQty > 0 ? "onItsWay"
    : "confirmed";

  return {
    returnStatus: "awaitingDelivery",
    closedReason: null,
    shippingStage: stage,
    returnReason: SHIPPING_STAGE_REASON[stage],
  };
}
```

- [ ] **Step 2: Update the local variable declaration in `app/api/get-orders/route.ts`**

Find:
```ts
        let returnStatus: string;
        let returnReason: string;
        let notReturnableReason: string | null = null;
        let shippingStage: ShippingStage | null = null;
        let effectiveEligibleQty = effectiveEligibleWindowed;
```
Replace with:
```ts
        let returnStatus: string;
        let returnReason: string;
        let closedReason: string | null = null;
        let shippingStage: ShippingStage | null = null;
        let effectiveEligibleQty = effectiveEligibleWindowed;
```

- [ ] **Step 3: Update the shipping-shortcut branch**

Find:
```ts
        } else if (shopifySlotEligible > 0 && delivery.attemptedDeliveryQty > 0) {
          returnStatus = "notReturnable"; notReturnableReason = "notDelivered"; shippingStage = "attemptedDelivery";
          returnReason = SHIPPING_STAGE_REASON.attemptedDelivery;
        } else if (shopifySlotEligible > 0 && delivery.outForDeliveryQty > 0) {
          returnStatus = "notReturnable"; notReturnableReason = "notDelivered"; shippingStage = "outForDelivery";
          returnReason = SHIPPING_STAGE_REASON.outForDelivery;
        } else if (shopifySlotEligible > 0 && delivery.inTransitQty > 0) {
          returnStatus = "notReturnable"; notReturnableReason = "notDelivered"; shippingStage = "onItsWay";
          returnReason = SHIPPING_STAGE_REASON.onItsWay;
```
Replace with:
```ts
        } else if (shopifySlotEligible > 0 && delivery.attemptedDeliveryQty > 0) {
          returnStatus = "awaitingDelivery"; shippingStage = "attemptedDelivery";
          returnReason = SHIPPING_STAGE_REASON.attemptedDelivery;
        } else if (shopifySlotEligible > 0 && delivery.outForDeliveryQty > 0) {
          returnStatus = "awaitingDelivery"; shippingStage = "outForDelivery";
          returnReason = SHIPPING_STAGE_REASON.outForDelivery;
        } else if (shopifySlotEligible > 0 && delivery.inTransitQty > 0) {
          returnStatus = "awaitingDelivery"; shippingStage = "onItsWay";
          returnReason = SHIPPING_STAGE_REASON.onItsWay;
```

- [ ] **Step 4: Update the `ri.nonReturnableItems` branch**

Find:
```ts
            if (reasonCodes.includes("UNFULFILLED")) {
              // Item confirmed as unfulfilled — delivery state takes precedence
              const undelivered = statusFromUndeliveredDelivery(delivery, now, returnWindowDays);
              returnStatus = undelivered.returnStatus;
              notReturnableReason = undelivered.notReturnableReason;
              shippingStage = undelivered.shippingStage;
              returnReason = undelivered.returnReason;
            } else if (reasonCodes.includes("RETURN_WINDOW_EXPIRED")) {
              // Window can't be expired before delivery — guard against Shopify API edge cases
              if (delivery.deliveredQty <= 0) {
                const undelivered = statusFromUndeliveredDelivery(delivery, now, returnWindowDays);
                returnStatus = undelivered.returnStatus;
                notReturnableReason = undelivered.notReturnableReason;
                shippingStage = undelivered.shippingStage;
                returnReason = undelivered.returnReason;
              } else {
                returnStatus = "notReturnable"; notReturnableReason = "outsideWindow";
                returnReason = formatReturnWindowExpiredReason(delivery.latestDeliveredAt, returnWindowDays);
              }
            } else if (reasonCodes.includes("FINAL_SALE")) {
              returnStatus = "notReturnable"; notReturnableReason = "finalSale";
              returnReason = "This item is marked as final sale and cannot be returned.";
            } else if (reasonCodes.includes("RETURNED")) {
              // Sidekick guidance: RETURNED ≠ refunded.
              // This is an eligibility signal only — quantity splits use Return records.
              returnStatus = "returnCompleted";
              returnReason = "This item has already been returned.";
            } else {
              // Unknown reason code — generic copy; logged above
              returnStatus = "notReturnable"; notReturnableReason = "other";
              returnReason = "This item is not eligible for return.";
            }
```
Replace with:
```ts
            if (reasonCodes.includes("UNFULFILLED")) {
              // Item confirmed as unfulfilled — delivery state takes precedence
              const undelivered = statusFromUndeliveredDelivery(delivery, now, returnWindowDays);
              returnStatus = undelivered.returnStatus;
              closedReason = undelivered.closedReason;
              shippingStage = undelivered.shippingStage;
              returnReason = undelivered.returnReason;
            } else if (reasonCodes.includes("RETURN_WINDOW_EXPIRED")) {
              // Window can't be expired before delivery — guard against Shopify API edge cases
              if (delivery.deliveredQty <= 0) {
                const undelivered = statusFromUndeliveredDelivery(delivery, now, returnWindowDays);
                returnStatus = undelivered.returnStatus;
                closedReason = undelivered.closedReason;
                shippingStage = undelivered.shippingStage;
                returnReason = undelivered.returnReason;
              } else {
                returnStatus = "returnWindowClosed"; closedReason = "outsideWindow";
                returnReason = formatReturnWindowExpiredReason(delivery.latestDeliveredAt, returnWindowDays);
              }
            } else if (reasonCodes.includes("FINAL_SALE")) {
              returnStatus = "returnWindowClosed"; closedReason = "finalSale";
              returnReason = "This item is marked as final sale and cannot be returned.";
            } else if (reasonCodes.includes("RETURNED")) {
              // Sidekick guidance: RETURNED ≠ refunded.
              // This is an eligibility signal only — quantity splits use Return records.
              returnStatus = "returnCompleted";
              returnReason = "This item has already been returned.";
            } else {
              // Unknown reason code — generic copy; logged above
              returnStatus = "returnWindowClosed"; closedReason = "other";
              returnReason = "This item is not eligible for return.";
            }
```

- [ ] **Step 5: Update the zeroed-out-item branch (delivered-but-expired case)**

Find:
```ts
              if (daysSince > returnWindowDays) {
                returnStatus = "notReturnable"; notReturnableReason = "outsideWindow";
                returnReason = formatReturnWindowExpiredReason(delivery.latestDeliveredAt, returnWindowDays);
              } else {
                returnStatus = "Eligible";
                returnReason = "";
                effectiveEligibleQty = deliveredAvailable;
              }
            } else {
              const undelivered2 = statusFromUndeliveredDelivery(delivery, now, returnWindowDays);
              returnStatus = undelivered2.returnStatus;
              notReturnableReason = undelivered2.notReturnableReason;
              shippingStage = undelivered2.shippingStage;
              returnReason = undelivered2.returnReason;
            }
```
Replace with:
```ts
              if (daysSince > returnWindowDays) {
                returnStatus = "returnWindowClosed"; closedReason = "outsideWindow";
                returnReason = formatReturnWindowExpiredReason(delivery.latestDeliveredAt, returnWindowDays);
              } else {
                returnStatus = "Eligible";
                returnReason = "";
                effectiveEligibleQty = deliveredAvailable;
              }
            } else {
              const undelivered2 = statusFromUndeliveredDelivery(delivery, now, returnWindowDays);
              returnStatus = undelivered2.returnStatus;
              closedReason = undelivered2.closedReason;
              shippingStage = undelivered2.shippingStage;
              returnReason = undelivered2.returnReason;
            }
```

- [ ] **Step 6: Update the manual-fallback branch**

Find:
```ts
          } else if (effectiveEligible > 0) {
            if (delivery.latestDeliveredAt) {
              const daysSince = (now.getTime() - delivery.latestDeliveredAt.getTime()) / (1000 * 60 * 60 * 24);
              if (daysSince > returnWindowDays) {
                returnStatus = "notReturnable"; notReturnableReason = "outsideWindow";
                returnReason = formatReturnWindowExpiredReason(delivery.latestDeliveredAt, returnWindowDays);
              } else {
                returnStatus = "Eligible";
                returnReason = "";
              }
            } else {
              returnStatus = "Eligible";
              returnReason = "";
            }
          } else {
            const undelivered3 = statusFromUndeliveredDelivery(delivery, now, returnWindowDays);
            returnStatus = undelivered3.returnStatus;
            notReturnableReason = undelivered3.notReturnableReason;
            shippingStage = undelivered3.shippingStage;
            returnReason = undelivered3.returnReason;
          }
```
Replace with:
```ts
          } else if (effectiveEligible > 0) {
            if (delivery.latestDeliveredAt) {
              const daysSince = (now.getTime() - delivery.latestDeliveredAt.getTime()) / (1000 * 60 * 60 * 24);
              if (daysSince > returnWindowDays) {
                returnStatus = "returnWindowClosed"; closedReason = "outsideWindow";
                returnReason = formatReturnWindowExpiredReason(delivery.latestDeliveredAt, returnWindowDays);
              } else {
                returnStatus = "Eligible";
                returnReason = "";
              }
            } else {
              returnStatus = "Eligible";
              returnReason = "";
            }
          } else {
            const undelivered3 = statusFromUndeliveredDelivery(delivery, now, returnWindowDays);
            returnStatus = undelivered3.returnStatus;
            closedReason = undelivered3.closedReason;
            shippingStage = undelivered3.shippingStage;
            returnReason = undelivered3.returnReason;
          }
```

- [ ] **Step 7: Update the response object field**

Find:
```ts
          returnStatus,
          returnReason,
          notReturnableReason,
          shippingStage,
          refundStatus,
```
Replace with:
```ts
          returnStatus,
          returnReason,
          closedReason,
          shippingStage,
          refundStatus,
```

- [ ] **Step 8: Verify with grep and tsc**

Run: `grep -n 'returnStatus = "notReturnable"\|notReturnableReason' app/api/get-orders/route.ts lib/get-orders-status.ts`
Expected: no matches — every assignment and every field reference has been renamed.

Run: `npx tsc --noEmit`
Expected: zero errors from `app/api/get-orders/route.ts` or `lib/get-orders-status.ts` themselves; remaining errors confined to `components/dashboard-client.tsx`, `components/app-settings/settings-form.tsx`, and the 3 test files (not yet updated).

- [ ] **Step 9: Commit**

```bash
git add app/api/get-orders/route.ts lib/get-orders-status.ts
git commit -m "feat: split notReturnable eligibility computation into awaitingDelivery/returnWindowClosed"
```

---

### Task 5: `components/dashboard-client.tsx` — types and `buildIneligibleDisplayItems`

**Files:**
- Modify: `components/dashboard-client.tsx`

**Interfaces:**
- Consumes: nothing new from earlier tasks in this plan (this file doesn't import `ReturnClosedReason`/`ShippingStage` from `lib/get-orders-status.ts` or `lib/tenant-defaults.ts` — it defines its own local copies, matching the codebase's existing pattern of duplicating these small types between the server-side eligibility module and the client component).
- Produces: updated `ReturnStatus` (7 values), new local `ReturnClosedReason` type, `LineItem.closedReason` (renamed from `notReturnableReason`, narrowed), a `buildIneligibleDisplayItems` that assigns the new 2-status split consistently with Task 4's output.

- [ ] **Step 1: Update the `ReturnStatus` type and add the local `ReturnClosedReason` type**

Find:
```ts
type ReturnStatus =
  | "Eligible" | "Cancelled"
  | "notReturnable" | "returnRequested" | "returnInProgress"
  | "returnDeclined" | "returnCanceled" | "returnCompleted"

type ShippingStage = "confirmed" | "onItsWay" | "outForDelivery" | "attemptedDelivery"
```
Replace with:
```ts
type ReturnStatus =
  | "Eligible" | "Cancelled"
  | "awaitingDelivery" | "returnWindowClosed" | "returnRequested" | "returnInProgress"
  | "returnDeclined" | "returnCanceled" | "returnCompleted"

type ShippingStage = "confirmed" | "onItsWay" | "outForDelivery" | "attemptedDelivery"
type ReturnClosedReason = "outsideWindow" | "finalSale" | "other"
```

- [ ] **Step 2: Rename and narrow the `LineItem` field**

Find:
```ts
  returnStatus: ReturnStatus
  returnReason?: string
  notReturnableReason?: "notDelivered" | "outsideWindow" | "finalSale" | "other" | null
  shippingStage?: ShippingStage | null
  refundStatus?: "notRefunded" | "partiallyRefunded" | "refunded"
```
Replace with:
```ts
  returnStatus: ReturnStatus
  returnReason?: string
  closedReason?: ReturnClosedReason | null
  shippingStage?: ShippingStage | null
  refundStatus?: "notRefunded" | "partiallyRefunded" | "refunded"
```

- [ ] **Step 3: Update the 3 shipping-stage pushes in `buildIneligibleDisplayItems`**

Find:
```ts
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
```
Replace with:
```ts
      const attemptedQty = item.attemptedDeliveryQuantity ?? 0
      const attemptedSplitQty = take(Math.min(remaining, attemptedQty))
      if (attemptedSplitQty > 0) {
        result.push({
          ...item,
          returnStatus: "awaitingDelivery", shippingStage: "attemptedDelivery",
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
          returnStatus: "awaitingDelivery", shippingStage: "outForDelivery",
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
          returnStatus: "awaitingDelivery", shippingStage: "onItsWay",
          returnReason: "",
          splitQty: inTransitSplitQty,
          splitKey: `${item.id}-remainder-transit`,
        })
      }
      if (remaining > 0) {
        const stillPending = !!(item.pendingQuantity && item.pendingQuantity > 0)
        result.push({
          ...item,
          returnStatus: stillPending ? "awaitingDelivery" : "returnWindowClosed",
          shippingStage: stillPending ? "confirmed" : null,
          closedReason: stillPending ? null : "other",
          returnReason: "",
          splitQty: remaining,
          splitKey: `${item.id}-remainder-pending`,
        })
      }
```

- [ ] **Step 4: Verify partial progress**

Run: `grep -n 'returnStatus: "notReturnable"\|notReturnableReason' components/dashboard-client.tsx`
Expected: matches remain (the label/heading/icon/message functions and `computeHeaderStatBlocks` are Task 6's job) — but NONE should remain inside `buildIneligibleDisplayItems` specifically. Confirm by checking the line numbers reported are all outside the range of that function.

- [ ] **Step 5: Commit**

```bash
git add components/dashboard-client.tsx
git commit -m "feat: split notReturnable into awaitingDelivery/returnWindowClosed in buildIneligibleDisplayItems"
```

(`tsc --noEmit` will still show errors elsewhere in this same file — expected, Task 6 continues in it.)

---

### Task 6: `components/dashboard-client.tsx` — label/heading/icon/message/grouping functions

**Files:**
- Modify: `components/dashboard-client.tsx`

**Interfaces:**
- Consumes: the `LineItem.closedReason` field and `ReturnStatus`/`ReturnClosedReason` types from Task 5.
- Produces: `ineligibleBucketCounts`, `getIneligibleGroupKey`, `getStatusStyle`, `getIneligibleGroupMessage`, `INELIGIBLE_STATUS_ORDER`, `buildNarrativeParagraph`'s `expiredItems` filter, and `computeHeaderStatBlocks`'s `statusFilter` arrays all updated to the 7-status split. This completes the file — it should be fully `tsc`-clean at the end of this task.

- [ ] **Step 1: Update `ineligibleBucketCounts`**

Find:
```ts
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
```
Replace with:
```ts
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
      case "awaitingDelivery":
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
      case "returnWindowClosed":
        switch (item.closedReason) {
          case "outsideWindow":
            add("window", q)
            break
          case "finalSale":
            add("final_sale", q)
            break
          default:
            add("other", q)
        }
        break
      default:
        add("other", q)
    }
```

- [ ] **Step 2: Update `computeHeaderStatBlocks`'s `statusFilter` arrays (dead code — see Global Constraints — but must stay type-valid)**

Find:
```ts
    { id: "in_transit", count: buckets.in_transit || 0, caption: "awaiting", textColor: "text-blue-600", statusFilter: ["notReturnable"], title: "Awaiting delivery — returnable once delivered" },
    { id: "attempted", count: buckets.attempted_delivery || 0, caption: "attempted", textColor: "text-rose-600", statusFilter: ["notReturnable"], title: "Delivery attempted — action may be needed" },
    { id: "out_for_delivery", count: buckets.out_for_delivery || 0, caption: "out for delivery", textColor: "text-blue-600", statusFilter: ["notReturnable"], title: "Out for delivery today" },
    { id: "not_shipped", count: buckets.not_shipped || 0, caption: "not shipped", textColor: "text-zinc-600", statusFilter: ["notReturnable"], title: "Not dispatched yet" },
    { id: "window", count: buckets.window || 0, caption: "expired", textColor: "text-zinc-500", statusFilter: ["notReturnable"], title: "Past return window" },
```
Replace with:
```ts
    { id: "in_transit", count: buckets.in_transit || 0, caption: "awaiting", textColor: "text-blue-600", statusFilter: ["awaitingDelivery"], title: "Awaiting delivery — returnable once delivered" },
    { id: "attempted", count: buckets.attempted_delivery || 0, caption: "attempted", textColor: "text-rose-600", statusFilter: ["awaitingDelivery"], title: "Delivery attempted — action may be needed" },
    { id: "out_for_delivery", count: buckets.out_for_delivery || 0, caption: "out for delivery", textColor: "text-blue-600", statusFilter: ["awaitingDelivery"], title: "Out for delivery today" },
    { id: "not_shipped", count: buckets.not_shipped || 0, caption: "not shipped", textColor: "text-zinc-600", statusFilter: ["awaitingDelivery"], title: "Not dispatched yet" },
    { id: "window", count: buckets.window || 0, caption: "expired", textColor: "text-zinc-500", statusFilter: ["returnWindowClosed"], title: "Past return window" },
```

Find:
```ts
    { id: "final_sale", count: buckets.final_sale || 0, caption: "final sale", textColor: "text-zinc-500", statusFilter: ["notReturnable"], title: "Final sale — not returnable" },
```
Replace with:
```ts
    { id: "final_sale", count: buckets.final_sale || 0, caption: "final sale", textColor: "text-zinc-500", statusFilter: ["returnWindowClosed"], title: "Final sale — not returnable" },
```

- [ ] **Step 3: Update `buildNarrativeParagraph`'s `expiredItems` filter**

Find:
```ts
  const expiredItems  = ineligibleItems.filter(i => i.returnStatus === "notReturnable" && i.notReturnableReason === "outsideWindow")
```
Replace with:
```ts
  const expiredItems  = ineligibleItems.filter(i => i.returnStatus === "returnWindowClosed" && i.closedReason === "outsideWindow")
```

- [ ] **Step 4: Update `getIneligibleGroupKey`**

Find:
```ts
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
```
Replace with:
```ts
function getIneligibleGroupKey(item: LineItem, order: Order, returnWindowDays: number): string {
  if (item.returnStatus === "returnDeclined") {
    return `declined:${item.returnReason || ""}`
  }
  if (item.returnStatus === "returnWindowClosed" && item.closedReason === "outsideWindow") {
    const closed = formatReturnWindowClosedForItem(item, order, returnWindowDays) ?? "unknown"
    return `window:${closed}`
  }
  if (item.returnStatus === "awaitingDelivery") {
    return `awaitingDelivery:${item.shippingStage ?? "confirmed"}`
  }
  // Include refundStatus so a direct-refund-with-no-return row (returnStatus:
  // "returnCompleted", refundStatus: "refunded") never silently merges with a
  // genuinely-completed-return row that later also got refunded.
  return `${item.returnStatus}:${item.closedReason ?? ""}:${item.refundStatus ?? ""}`
}
```

- [ ] **Step 5: Update `INELIGIBLE_STATUS_ORDER`**

Find:
```ts
const INELIGIBLE_STATUS_ORDER: Partial<Record<ReturnStatus, number>> = {
  "returnRequested": 0,
  "returnInProgress": 1,
  "returnDeclined": 2,
  "returnCanceled": 3,
  "returnCompleted": 4,
  "notReturnable": 5,
  "Cancelled": 6,
}
```
Replace with:
```ts
const INELIGIBLE_STATUS_ORDER: Partial<Record<ReturnStatus, number>> = {
  "returnRequested": 0,
  "returnInProgress": 1,
  "returnDeclined": 2,
  "returnCanceled": 3,
  "returnCompleted": 4,
  "awaitingDelivery": 5,
  "returnWindowClosed": 6,
  "Cancelled": 7,
}
```

- [ ] **Step 6: Update `getStatusStyle`'s fallback**

Find:
```ts
function getStatusStyle(status: ReturnStatus, styles: ReturnLifecycleStyles): ReturnLifecycleStyle {
  return styles[status as Exclude<ReturnStatus, "Eligible" | "Cancelled">] ?? styles.notReturnable
}
```
Replace with:
```ts
function getStatusStyle(status: ReturnStatus, styles: ReturnLifecycleStyles): ReturnLifecycleStyle {
  return styles[status as Exclude<ReturnStatus, "Eligible" | "Cancelled">] ?? styles.returnWindowClosed
}
```

- [ ] **Step 7: Update `getIneligibleGroupMessage`**

Find:
```ts
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
```
Replace with:
```ts
function getIneligibleGroupMessage(item: LineItem, order: Order, returnWindowDays: number, messages: ReturnLifecycleMessages, groupItems?: LineItem[]): string {
  const days = String(returnWindowDays)
  switch (item.returnStatus) {
    case "awaitingDelivery": {
      const stage = item.shippingStage ?? "confirmed"
      const key = SHIPPING_STAGE_MESSAGE_KEY[stage]
      return fillMessagePlaceholders(messages[key], { days })
    }
    case "returnWindowClosed": {
      if (item.closedReason === "outsideWindow") {
        const closed = formatReturnWindowClosedForItem(item, order, returnWindowDays, groupItems)
        return closed
          ? fillMessagePlaceholders(messages.outsideWindow, { closedDate: closed })
          : messages.outsideWindowNoDate
      }
      if (item.closedReason === "finalSale") return messages.finalSale
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
```

- [ ] **Step 8: Full verify — this file should now be completely clean**

Run: `grep -n 'notReturnable\|notReturnableReason' components/dashboard-client.tsx`
Expected: no matches anywhere in the file.

Run: `npx tsc --noEmit`
Expected: zero errors from `components/dashboard-client.tsx`; remaining errors confined to `components/app-settings/settings-form.tsx` and the 3 test files (Tasks 7-8, not yet done).

- [ ] **Step 9: Commit**

```bash
git add components/dashboard-client.tsx
git commit -m "feat: split notReturnable into awaitingDelivery/returnWindowClosed in label/message/grouping functions"
```

---

### Task 7: `components/app-settings/settings-form.tsx` — reshape Settings UI

**Files:**
- Modify: `components/app-settings/settings-form.tsx`

**Interfaces:**
- Consumes: `ReturnLifecycleStatusInput` (7 values) from Task 3.
- Produces: `RETURN_STATUS_CARDS` grows to 7 entries; the "Return status" section shows 7 cards; the standalone "Not returnable reasons" section is removed, its 8 sentence fields redistributed under the two new cards.

- [ ] **Step 1: Update `RETURN_STATUS_CARDS` and its doc comment**

Find:
```ts
/** RETURN_STATUS_CARDS drives the "Return status" section (6 cards, each with
 * label/heading/icon/color, plus a per-status sentence for returnRequested,
 * returnInProgress, returnCanceled, and returnCompleted). returnDeclined has no
 * sentence field here since its text comes from the real Shopify decline reason,
 * not a static template. notReturnable's sentences live in a separate "Not
 * returnable reasons" section below (not per-card) since multiple reasons
 * (final sale, outside window, not yet delivered) can apply under that one status.
 */
const RETURN_STATUS_CARDS: { key: ReturnLifecycleStatusInput; name: string }[] = [
  { key: "notReturnable", name: "Not returnable" },
  { key: "returnRequested", name: "Return requested" },
  { key: "returnInProgress", name: "Return in progress" },
  { key: "returnDeclined", name: "Return declined" },
  { key: "returnCanceled", name: "Return canceled" },
  { key: "returnCompleted", name: "Return completed" },
]
```
Replace with:
```ts
/** RETURN_STATUS_CARDS drives the "Return status" section (7 cards, each with
 * label/heading/icon/color, plus a per-status sentence for returnRequested,
 * returnInProgress, returnCanceled, and returnCompleted). returnDeclined has no
 * sentence field here since its text comes from the real Shopify decline reason,
 * not a static template. awaitingDelivery's 4 shipping-stage sentences and
 * returnWindowClosed's 4 reason sentences are nested directly under their own
 * cards (not a separate section), since each has multiple sentences under one
 * status.
 */
const RETURN_STATUS_CARDS: { key: ReturnLifecycleStatusInput; name: string }[] = [
  { key: "awaitingDelivery", name: "Awaiting delivery" },
  { key: "returnWindowClosed", name: "Return window closed" },
  { key: "returnRequested", name: "Return requested" },
  { key: "returnInProgress", name: "Return in progress" },
  { key: "returnDeclined", name: "Return declined" },
  { key: "returnCanceled", name: "Return canceled" },
  { key: "returnCompleted", name: "Return completed" },
]
```

- [ ] **Step 2: Replace the `notReturnable` per-card content with two new per-card sentence blocks, and remove the standalone "Not returnable reasons" section**

Find:
```tsx
                          {key === "notReturnable" && (
                            <s-paragraph tone="subdued">
                              This status covers several reasons (not yet delivered, final sale, outside the return
                              window, or other) — edit each reason's sentence in "Not returnable reasons" below.
                            </s-paragraph>
                          )}
                        </>
                      )}
                    </s-stack>
                  </s-box>
                )
              })}
              {errors.returnLifecycleMessages && <s-paragraph tone="critical">{errors.returnLifecycleMessages}</s-paragraph>}
              {errors.returnLifecycleStyles && <s-paragraph tone="critical">{errors.returnLifecycleStyles}</s-paragraph>}
            </s-stack>
          </s-section>

          <s-section heading="Not returnable reasons">
            <s-stack direction="block" gap="base">
              <s-text color="subdued">
                The specific sentence shown under the "Not returnable" badge, depending on why the item can't be
                returned right now.
              </s-text>
              <s-text-area label="Not yet shipped" value={form.returnLifecycleMessages.shippingConfirmed} rows={2}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setReturnLifecycleMessage("shippingConfirmed", e.target.value)}></s-text-area>
              <s-text-area label="On its way" value={form.returnLifecycleMessages.shippingOnItsWay} rows={2}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setReturnLifecycleMessage("shippingOnItsWay", e.target.value)}></s-text-area>
              <s-text-area label="Out for delivery" value={form.returnLifecycleMessages.shippingOutForDelivery} rows={2}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setReturnLifecycleMessage("shippingOutForDelivery", e.target.value)}></s-text-area>
              <s-text-area label="Attempted delivery" value={form.returnLifecycleMessages.shippingAttemptedDelivery} rows={2}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setReturnLifecycleMessage("shippingAttemptedDelivery", e.target.value)}></s-text-area>
              <s-text-area label="Outside the return window (with a closed date)" value={form.returnLifecycleMessages.outsideWindow} rows={2}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setReturnLifecycleMessage("outsideWindow", e.target.value)}></s-text-area>
              <s-text-area label="Outside the return window (no closed date available)" value={form.returnLifecycleMessages.outsideWindowNoDate} rows={2}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setReturnLifecycleMessage("outsideWindowNoDate", e.target.value)}></s-text-area>
              <s-text-area label="Final sale" value={form.returnLifecycleMessages.finalSale} rows={2}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setReturnLifecycleMessage("finalSale", e.target.value)}></s-text-area>
              <s-text-area label="Other" value={form.returnLifecycleMessages.otherNotReturnable} rows={2}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setReturnLifecycleMessage("otherNotReturnable", e.target.value)}></s-text-area>
            </s-stack>
          </s-section>
```
Replace with:
```tsx
                          {key === "awaitingDelivery" && (
                            <>
                              <s-text-area label="Not yet shipped" value={form.returnLifecycleMessages.shippingConfirmed} rows={2}
                                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setReturnLifecycleMessage("shippingConfirmed", e.target.value)}></s-text-area>
                              <s-text-area label="On its way" value={form.returnLifecycleMessages.shippingOnItsWay} rows={2}
                                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setReturnLifecycleMessage("shippingOnItsWay", e.target.value)}></s-text-area>
                              <s-text-area label="Out for delivery" value={form.returnLifecycleMessages.shippingOutForDelivery} rows={2}
                                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setReturnLifecycleMessage("shippingOutForDelivery", e.target.value)}></s-text-area>
                              <s-text-area label="Attempted delivery" value={form.returnLifecycleMessages.shippingAttemptedDelivery} rows={2}
                                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setReturnLifecycleMessage("shippingAttemptedDelivery", e.target.value)}></s-text-area>
                            </>
                          )}
                          {key === "returnWindowClosed" && (
                            <>
                              <s-text-area label="Outside the return window (with a closed date)" value={form.returnLifecycleMessages.outsideWindow} rows={2}
                                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setReturnLifecycleMessage("outsideWindow", e.target.value)}></s-text-area>
                              <s-text-area label="Outside the return window (no closed date available)" value={form.returnLifecycleMessages.outsideWindowNoDate} rows={2}
                                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setReturnLifecycleMessage("outsideWindowNoDate", e.target.value)}></s-text-area>
                              <s-text-area label="Final sale" value={form.returnLifecycleMessages.finalSale} rows={2}
                                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setReturnLifecycleMessage("finalSale", e.target.value)}></s-text-area>
                              <s-text-area label="Other" value={form.returnLifecycleMessages.otherNotReturnable} rows={2}
                                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setReturnLifecycleMessage("otherNotReturnable", e.target.value)}></s-text-area>
                            </>
                          )}
                        </>
                      )}
                    </s-stack>
                  </s-box>
                )
              })}
              {errors.returnLifecycleMessages && <s-paragraph tone="critical">{errors.returnLifecycleMessages}</s-paragraph>}
              {errors.returnLifecycleStyles && <s-paragraph tone="critical">{errors.returnLifecycleStyles}</s-paragraph>}
            </s-stack>
          </s-section>
```

- [ ] **Step 3: Verify**

Run: `grep -n "notReturnable\|Not returnable reasons" components/app-settings/settings-form.tsx`
Expected: no matches.

Run: `npx tsc --noEmit`
Expected: zero errors from `components/app-settings/settings-form.tsx`; remaining errors confined to the 3 test files (Task 9, not yet done).

- [ ] **Step 4: Commit**

```bash
git add components/app-settings/settings-form.tsx
git commit -m "feat: reshape Settings statuses UI for the awaitingDelivery/returnWindowClosed split"
```

---

### Task 8: `app/api/demo-orders/route.ts` — update demo fixture data

**Files:**
- Modify: `app/api/demo-orders/route.ts`

**Interfaces:**
- Consumes: nothing typed (this file has no static type dependency on the shared types, same as the parent epic's Task 9 — confirmed no import of `ReturnStatus`/`LineItem`).

- [ ] **Step 1: Replace every `notDelivered` occurrence**

Do 3 whole-file replace-all passes (each string below appears more than once — use "replace all" so every occurrence is caught in one pass, not just the first):

Replace-all pass 1 — appears at lines 88, 133, and 354 (3 occurrences):
```ts
returnStatus: "notReturnable", notReturnableReason: "notDelivered", shippingStage: "confirmed", returnReason: "We're preparing these items for shipping."
```
becomes:
```ts
returnStatus: "awaitingDelivery", shippingStage: "confirmed", returnReason: "We're preparing these items for shipping."
```

Replace-all pass 2 — appears at lines 110 and 111 (2 occurrences):
```ts
returnStatus: "notReturnable", notReturnableReason: "notDelivered", shippingStage: "onItsWay", returnReason: "These items are on their way."
```
becomes:
```ts
returnStatus: "awaitingDelivery", shippingStage: "onItsWay", returnReason: "These items are on their way."
```

Then these two single-occurrence lines:

Find (line 288):
```ts
returnStatus: "notReturnable", notReturnableReason: "notDelivered", shippingStage: "outForDelivery", returnReason: "These items are out for delivery today."
```
Replace with:
```ts
returnStatus: "awaitingDelivery", shippingStage: "outForDelivery", returnReason: "These items are out for delivery today."
```

Find (line 310):
```ts
returnStatus: "notReturnable", notReturnableReason: "notDelivered", shippingStage: "attemptedDelivery", returnReason: "A delivery attempt was made for these items. You'll be able to request a return once they've been delivered."
```
Replace with:
```ts
returnStatus: "awaitingDelivery", shippingStage: "attemptedDelivery", returnReason: "A delivery attempt was made for these items. You'll be able to request a return once they've been delivered."
```

- [ ] **Step 2: Replace every `outsideWindow` occurrence**

Replace-all pass — appears at lines 197, 198, 220, and 374 (4 occurrences):
```ts
returnStatus: "notReturnable", notReturnableReason: "outsideWindow", returnReason: "The return window has expired for these items."
```
becomes:
```ts
returnStatus: "returnWindowClosed", closedReason: "outsideWindow", returnReason: "The return window has expired for these items."
```

- [ ] **Step 3: Verify**

Run: `grep -n "notReturnable" app/api/demo-orders/route.ts`
Expected: no matches.

- [ ] **Step 4: Manual smoke check**

Run: `npm run dev &`, then `sleep 4 && curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3000/demo`, then kill the dev server.
Expected: `200`.

- [ ] **Step 5: Commit**

```bash
git add app/api/demo-orders/route.ts
git commit -m "feat: update demo fixture data for the awaitingDelivery/returnWindowClosed split"
```

---

### Task 9: Test fixture and assertion updates

**Files:**
- Modify: `lib/__tests__/branding-validation.test.ts`
- Modify: `lib/__tests__/tenant.test.ts`
- Modify: `lib/__tests__/get-orders-status-mapping.test.ts`

**Interfaces:**
- Consumes: `ReturnClosedReason` from `lib/get-orders-status.ts` (Task 4), the 7-value `ReturnLifecycleStatus`/`ReturnLifecycleStatusInput` from Tasks 1 and 3.

- [ ] **Step 1: `lib/__tests__/branding-validation.test.ts` — update the `VALID` fixture**

Find:
```ts
  returnLifecycleStyles: {
    notReturnable:    { label: "Not returnable",     heading: "Not returnable",                     icon: "Lock",         color: "" },
    returnRequested:  { label: "Return requested",   heading: "We've received your return request", icon: "Eye",          color: "" },
    returnInProgress: { label: "Return in progress", heading: "Your return is in progress",          icon: "RotateCcw",    color: "" },
    returnDeclined:   { label: "Return declined",    heading: "Your return request was declined",    icon: "CircleX",      color: "" },
    returnCanceled:   { label: "Return canceled",    heading: "This return was canceled",             icon: "XCircle",      color: "" },
    returnCompleted:  { label: "Return completed",   heading: "This return is complete",              icon: "CheckCircle2", color: "" },
  },
```
Replace with:
```ts
  returnLifecycleStyles: {
    awaitingDelivery:   { label: "Awaiting delivery",    heading: "Awaiting delivery",                   icon: "Truck",        color: "" },
    returnWindowClosed: { label: "Return window closed", heading: "Return window closed",                icon: "Lock",         color: "" },
    returnRequested:    { label: "Return requested",     heading: "We've received your return request", icon: "Eye",          color: "" },
    returnInProgress:   { label: "Return in progress",   heading: "Your return is in progress",          icon: "RotateCcw",    color: "" },
    returnDeclined:     { label: "Return declined",      heading: "Your return request was declined",    icon: "CircleX",      color: "" },
    returnCanceled:     { label: "Return canceled",      heading: "This return was canceled",             icon: "XCircle",      color: "" },
    returnCompleted:    { label: "Return completed",     heading: "This return is complete",              icon: "CheckCircle2", color: "" },
  },
```
(`returnLifecycleMessages` fixture block below it is unchanged — do not edit.)

- [ ] **Step 2: `lib/__tests__/tenant.test.ts` — update the "defaults" test assertion**

Find:
```ts
    expect(t?.branding.returnLifecycleStyles.notReturnable.label).toBe("Not returnable");
```
Replace with:
```ts
    expect(t?.branding.returnLifecycleStyles.awaitingDelivery.label).toBe("Awaiting delivery");
    expect(t?.branding.returnLifecycleStyles.returnWindowClosed.label).toBe("Return window closed");
```

- [ ] **Step 3: `lib/__tests__/tenant.test.ts` — update the round-trip fixture**

Find:
```ts
        returnLifecycleStyles: {
          notReturnable:    { label: "Window closed",      heading: "Window expired",           icon: "Lock",         color: "#4F46E5" },
          returnRequested:  { label: "Requested",          heading: "Return requested",         icon: "Eye",          color: "" },
          returnInProgress: { label: "In progress",        heading: "In progress",              icon: "RotateCcw",    color: "" },
          returnDeclined:   { label: "Declined",           heading: "Declined",                 icon: "CircleX",      color: "" },
          returnCanceled:   { label: "Canceled",           heading: "Canceled",                 icon: "XCircle",      color: "" },
          returnCompleted:  { label: "Returned",           heading: "Returned",                 icon: "CheckCircle2", color: "" },
        },
```
Replace with:
```ts
        returnLifecycleStyles: {
          awaitingDelivery:   { label: "Still coming",       heading: "Still coming",             icon: "Truck",        color: "" },
          returnWindowClosed: { label: "Window closed",      heading: "Window expired",           icon: "Lock",         color: "#4F46E5" },
          returnRequested:    { label: "Requested",          heading: "Return requested",         icon: "Eye",          color: "" },
          returnInProgress:   { label: "In progress",        heading: "In progress",              icon: "RotateCcw",    color: "" },
          returnDeclined:     { label: "Declined",           heading: "Declined",                 icon: "CircleX",      color: "" },
          returnCanceled:     { label: "Canceled",           heading: "Canceled",                 icon: "XCircle",      color: "" },
          returnCompleted:    { label: "Returned",           heading: "Returned",                 icon: "CheckCircle2", color: "" },
        },
```

- [ ] **Step 4: `lib/__tests__/tenant.test.ts` — update the round-trip assertion**

Find:
```ts
    expect(t?.branding.returnLifecycleStyles.notReturnable).toEqual({ label: "Window closed", heading: "Window expired", icon: "Lock", color: "#4F46E5" });
```
Replace with:
```ts
    expect(t?.branding.returnLifecycleStyles.returnWindowClosed).toEqual({ label: "Window closed", heading: "Window expired", icon: "Lock", color: "#4F46E5" });
    expect(t?.branding.returnLifecycleStyles.awaitingDelivery).toEqual({ label: "Still coming", heading: "Still coming", icon: "Truck", color: "" });
```

- [ ] **Step 5: `lib/__tests__/get-orders-status-mapping.test.ts` — update all assertions**

Find:
```ts
import { statusFromUndeliveredDelivery, SHIPPING_STAGE_REASON } from "@/lib/get-orders-status";

const baseDelivery = {
  inTransitQty: 0, outForDeliveryQty: 0, attemptedDeliveryQty: 0, confirmedQty: 0, earliestShippedAt: null as Date | null,
};

describe("statusFromUndeliveredDelivery", () => {
  const now = new Date("2026-07-19T00:00:00Z");

  it("returns notReturnable/notDelivered/confirmed when nothing has shipped", () => {
    const result = statusFromUndeliveredDelivery(baseDelivery, now, 30);
    expect(result.returnStatus).toBe("notReturnable");
    expect(result.notReturnableReason).toBe("notDelivered");
    expect(result.shippingStage).toBe("confirmed");
    expect(result.returnReason).toBe(SHIPPING_STAGE_REASON.confirmed);
  });

  it("returns notDelivered/onItsWay when in transit", () => {
    const result = statusFromUndeliveredDelivery({ ...baseDelivery, inTransitQty: 1 }, now, 30);
    expect(result.shippingStage).toBe("onItsWay");
  });

  it("returns notDelivered/outForDelivery, taking priority over inTransit", () => {
    const result = statusFromUndeliveredDelivery({ ...baseDelivery, inTransitQty: 1, outForDeliveryQty: 1 }, now, 30);
    expect(result.shippingStage).toBe("outForDelivery");
  });

  it("returns notDelivered/attemptedDelivery, taking priority over the others", () => {
    const result = statusFromUndeliveredDelivery(
      { ...baseDelivery, inTransitQty: 1, outForDeliveryQty: 1, attemptedDeliveryQty: 1 }, now, 30
    );
    expect(result.shippingStage).toBe("attemptedDelivery");
  });

  it("returns outsideWindow (not notDelivered) when in transit longer than the return window", () => {
    const shippedLongAgo = new Date("2026-06-01T00:00:00Z"); // 48 days before `now`
    const result = statusFromUndeliveredDelivery(
      { ...baseDelivery, inTransitQty: 1, earliestShippedAt: shippedLongAgo }, now, 30
    );
    expect(result.returnStatus).toBe("notReturnable");
    expect(result.notReturnableReason).toBe("outsideWindow");
    expect(result.shippingStage).toBe(null);
  });

  it("does not apply the window-expired check to a not-yet-shipped item", () => {
    const result = statusFromUndeliveredDelivery(baseDelivery, now, 30);
    expect(result.notReturnableReason).toBe("notDelivered");
  });
});
```
Replace with:
```ts
import { statusFromUndeliveredDelivery, SHIPPING_STAGE_REASON } from "@/lib/get-orders-status";

const baseDelivery = {
  inTransitQty: 0, outForDeliveryQty: 0, attemptedDeliveryQty: 0, confirmedQty: 0, earliestShippedAt: null as Date | null,
};

describe("statusFromUndeliveredDelivery", () => {
  const now = new Date("2026-07-19T00:00:00Z");

  it("returns awaitingDelivery/confirmed when nothing has shipped", () => {
    const result = statusFromUndeliveredDelivery(baseDelivery, now, 30);
    expect(result.returnStatus).toBe("awaitingDelivery");
    expect(result.closedReason).toBe(null);
    expect(result.shippingStage).toBe("confirmed");
    expect(result.returnReason).toBe(SHIPPING_STAGE_REASON.confirmed);
  });

  it("returns awaitingDelivery/onItsWay when in transit", () => {
    const result = statusFromUndeliveredDelivery({ ...baseDelivery, inTransitQty: 1 }, now, 30);
    expect(result.returnStatus).toBe("awaitingDelivery");
    expect(result.shippingStage).toBe("onItsWay");
  });

  it("returns awaitingDelivery/outForDelivery, taking priority over inTransit", () => {
    const result = statusFromUndeliveredDelivery({ ...baseDelivery, inTransitQty: 1, outForDeliveryQty: 1 }, now, 30);
    expect(result.shippingStage).toBe("outForDelivery");
  });

  it("returns awaitingDelivery/attemptedDelivery, taking priority over the others", () => {
    const result = statusFromUndeliveredDelivery(
      { ...baseDelivery, inTransitQty: 1, outForDeliveryQty: 1, attemptedDeliveryQty: 1 }, now, 30
    );
    expect(result.shippingStage).toBe("attemptedDelivery");
  });

  it("returns returnWindowClosed/outsideWindow (not awaitingDelivery) when in transit longer than the return window", () => {
    const shippedLongAgo = new Date("2026-06-01T00:00:00Z"); // 48 days before `now`
    const result = statusFromUndeliveredDelivery(
      { ...baseDelivery, inTransitQty: 1, earliestShippedAt: shippedLongAgo }, now, 30
    );
    expect(result.returnStatus).toBe("returnWindowClosed");
    expect(result.closedReason).toBe("outsideWindow");
    expect(result.shippingStage).toBe(null);
  });

  it("does not apply the window-expired check to a not-yet-shipped item", () => {
    const result = statusFromUndeliveredDelivery(baseDelivery, now, 30);
    expect(result.returnStatus).toBe("awaitingDelivery");
    expect(result.closedReason).toBe(null);
  });
});
```

- [ ] **Step 6: Run all tests**

Run: `npx vitest run`
Expected: all tests pass — same total count as before this plan (113), since no tests were added or removed, only updated.

Run: `npx tsc --noEmit`
Expected: zero errors, repo-wide.

- [ ] **Step 7: Commit**

```bash
git add lib/__tests__/branding-validation.test.ts lib/__tests__/tenant.test.ts lib/__tests__/get-orders-status-mapping.test.ts
git commit -m "test: update fixtures for the awaitingDelivery/returnWindowClosed split"
```

---

### Task 10: Full verify, deploy, ship

**Files:** none (verification only)

- [ ] **Step 1: Full verify cycle**

```bash
npx tsc --noEmit
```
Expected: zero errors.

```bash
npx vitest run
```
Expected: all 113 tests pass.

```bash
rm -rf .next && npm run build
```
Expected: build succeeds, no new warnings beyond the existing Redis-env warnings already present in this project's builds.

- [ ] **Step 2: Manual smoke check**

Run: `npm run dev &`, open the merchant Settings page locally, confirm the "Return status" section shows exactly 7 cards ("Awaiting delivery" and "Return window closed" first, then the 5 unchanged ones) and there's no separate "Not returnable reasons" section anymore. Open an order in the customer portal (via `/demo`) with a mix of not-yet-shipped and expired-window items and confirm the filter button shows "Awaiting delivery" and "Return window closed" as two separate checkboxes, and the mobile accordion renders correctly for both. Kill the dev server after.

- [ ] **Step 3: Deploy**

```bash
npx shopify app deploy --allow-updates
```
Expected: "New version released to users."

- [ ] **Step 4: Push**

```bash
git push origin main
```

- [ ] **Step 5: Flag the manual migration note to the user**

Same as the parent epic: any status label/heading/icon/color/message the user had customized on the old single "Not returnable" card has reset to the new "Awaiting delivery"/"Return window closed" defaults. Tell them to re-check Settings → Returns → Return status after this deploy.
