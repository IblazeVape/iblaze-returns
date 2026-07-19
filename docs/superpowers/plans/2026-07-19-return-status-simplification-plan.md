# Return Status Simplification Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the flat 14-value `ReturnStatus` for ineligible line items with a 6-value `ReturnLifecycleStatus`, an independent `NotReturnableReason`, and an independent `RefundStatus`, matching Shopify's own `Return`/`NonReturnableReason` enums.

**Architecture:** Three layers change together: (1) the shared type/defaults in `lib/tenant-defaults.ts` and its validation mirror in `lib/branding-validation.ts`, (2) the eligibility computation in `app/api/get-orders/route.ts` — which has **two independent places** deciding an item's status (its own 4-branch chain, AND `dashboard-client.tsx`'s `buildIneligibleDisplayItems`, which re-derives its own sub-statuses for partially-eligible line items) — both must agree on the new model, (3) the Settings customization UI reshapes from 14 cards to 6 + a reasons list + a refund-labels list.

**Tech Stack:** Next.js App Router, TypeScript, Redis (Upstash), Vitest. No new dependencies.

## Global Constraints

- Order-level cancellation (`order.cancelledAt` → line-item `returnStatus === "Cancelled"`) is NOT part of this model — every place it appears keeps its current separate handling, untouched.
- The `"Eligible"` branch of the existing `ReturnStatus` union is NOT part of this work.
- `eligibleLabel` / `ineligibleLabel` (tab-level Settings fields) are NOT part of this work.
- No new eligibility business logic — every status/reason/refund value assigned must be a straight relabeling of a decision the code already makes today. If a task appears to require a NEW eligibility rule (not just a rename), stop and flag it rather than inventing one.
- The `shippingAttemptedDelivery` sentence changes wording (dropping "Please rebook or collect") everywhere it appears — there are 3 occurrences across `get-orders/route.ts` and `dashboard-client.tsx`; all 3 must change to the same new text (see Task 5, Task 6).
- The `"Return declined"` reason-text resolution logic (the `note`/`declineReason` fallback chain at `get-orders/route.ts:443-460` and `:655-660`, and `resolveDeclineMessage`/`isGenericDeclineNote`/`stripTrailingDeclineReasonJunk` in `dashboard-client.tsx`) is UNCHANGED by this plan — only the status label wrapping it (`"Return declined"` → `"returnDeclined"`) is renamed.
- `app/api/demo-orders/route.ts` (marketing `/demo` page fixture data) is NOT statically typed against the shared `ReturnStatus`/`LineItem` types (confirmed: no import of either) — it will NOT produce a TypeScript error if left unmigrated, but WILL render broken/blank status text on the live `/demo` page if left unmigrated. It must be updated for the demo page to keep working, not for `tsc` to pass.
- `lib/__tests__/dashboard-stats.test.ts` and `lib/__tests__/returns-management.test.ts` do NOT reference `returnStatus` (confirmed via grep) — they are NOT touched by this plan.
- Tasks 1-4 are independently verifiable (`tsc`/`vitest` pass standalone). Tasks 5-8 form one interdependent chain — `app/api/get-orders/route.ts`, `components/dashboard-client.tsx`, and `components/app-settings/settings-form.tsx` all reference the same renamed types, so `tsc --noEmit` will NOT pass until Task 8 is complete. Task 9 (`app/api/demo-orders/route.ts`) is untyped against these types (see below) and doesn't affect this chain. Each of Tasks 5-7 still ends with whatever local check is possible, with the full `tsc` pass expected clean at the end of Task 8, and the full `tsc`/`vitest`/`build` cycle run again (final) at Task 12.

---

### Task 1: New types and defaults in `lib/tenant-defaults.ts`

**Files:**
- Modify: `lib/tenant-defaults.ts`

**Interfaces:**
- Produces: `ReturnLifecycleStatus`, `RETURN_LIFECYCLE_STATUSES`, `NotReturnableReason`, `NOT_RETURNABLE_REASONS`, `RefundStatus`, `ReturnLifecycleStyle`, `ReturnLifecycleStyles`, `ReturnLifecycleMessages`, `RefundStatusLabels` (all exported types/consts), and updates `TenantBranding` + `DEFAULT_TENANT_FIELDS.branding` to use them.

- [ ] **Step 1: Read the current file to confirm line ranges**

Run: `grep -n "IneligibleStatusKey\|IneligibleStatusStyle\|IneligibleStatusMessages\|ineligibleStatusStyles\|ineligibleStatusMessages" lib/tenant-defaults.ts`

Confirm the type block (`IneligibleStatusMessages` through `IneligibleStatusStyles`) and the two `TenantBranding` fields and their two default blocks are where expected before editing.

- [ ] **Step 2: Replace the type block**

In `lib/tenant-defaults.ts`, replace the entire block from `export type IneligibleStatusMessages = {` through `export type IneligibleStatusStyles = Record<IneligibleStatusKey, IneligibleStatusStyle>;` with:

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

/** Why a "notReturnable" item can't be returned — maps onto Shopify's
 * NonReturnableReason enum (UNFULFILLED, RETURN_WINDOW_EXPIRED, FINAL_SALE,
 * OTHER — RETURNED is excluded here because that case maps directly to
 * returnCompleted, not to a "not returnable" reason). */
export type NotReturnableReason = "notDelivered" | "outsideWindow" | "finalSale" | "other";

export const NOT_RETURNABLE_REASONS: NotReturnableReason[] = [
  "notDelivered", "outsideWindow", "finalSale", "other",
];

/** Independent refund fact — can coexist with ANY return lifecycle status,
 * including a line item refunded directly with no return ever created. */
export type RefundStatus = "notRefunded" | "partiallyRefunded" | "refunded";

/** Filter/badge label, mobile accordion heading, icon, and color for one
 * return lifecycle status. `color` is a hex value or "" (empty = the
 * portal's default theme-aware text color). */
export type ReturnLifecycleStyle = { label: string; heading: string; icon: string; color: string };
export type ReturnLifecycleStyles = Record<ReturnLifecycleStatus, ReturnLifecycleStyle>;

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
export type ReturnLifecycleMessages = {
  shippingConfirmed: string;
  shippingOnItsWay: string;
  shippingOutForDelivery: string;
  shippingAttemptedDelivery: string;
  outsideWindow: string;
  outsideWindowNoDate: string;
  finalSale: string;
  otherNotReturnable: string;
  returnRequested: string;
  returnInProgress: string;
  returnCanceled: string;
  returnCompleted: string;
};

/** No icon/color/heading — refund is always shown as a small supporting
 * fact next to the lifecycle status, never as its own badge.
 * notRefunded's label is deliberately blank in the defaults below: a line
 * item that hasn't been refunded shows no refund fact at all. */
export type RefundStatusLabels = Record<RefundStatus, string>;
```

- [ ] **Step 3: Update `TenantBranding`**

Find (near the end of the `TenantBranding` type):
```ts
  ineligibleStatusMessages: IneligibleStatusMessages;
  ineligibleStatusStyles: IneligibleStatusStyles;
  alwaysShowGuestLookup: boolean;
```
Replace with:
```ts
  returnLifecycleStyles: ReturnLifecycleStyles;
  returnLifecycleMessages: ReturnLifecycleMessages;
  refundStatusLabels: RefundStatusLabels;
  alwaysShowGuestLookup: boolean;
```

- [ ] **Step 4: Replace the two default blocks**

Find the `ineligibleStatusMessages: { ... }` and `ineligibleStatusStyles: { ... }` blocks inside `DEFAULT_TENANT_FIELDS.branding` (they sit right before `alwaysShowGuestLookup: false,`). Replace both with:

```ts
    returnLifecycleStyles: {
      notReturnable:    { label: "Not returnable",     heading: "Not returnable",                       icon: "Lock",         color: "" },
      returnRequested:  { label: "Return requested",   heading: "We've received your return request",   icon: "Eye",          color: "" },
      returnInProgress: { label: "Return in progress", heading: "Your return is in progress",            icon: "RotateCcw",    color: "" },
      returnDeclined:   { label: "Return declined",    heading: "Your return request was declined",      icon: "CircleX",      color: "" },
      returnCanceled:   { label: "Return canceled",    heading: "This return was canceled",              icon: "XCircle",      color: "" },
      returnCompleted:  { label: "Return completed",   heading: "This return is complete",               icon: "CheckCircle2", color: "" },
    },
    returnLifecycleMessages: {
      shippingConfirmed:         "We're preparing these items for shipping. Your return window starts on delivery and closes {days} days later.",
      shippingOnItsWay:          "These items are on their way. Your return window starts on delivery and closes {days} days later.",
      shippingOutForDelivery:    "These items are out for delivery today. Your return window starts on delivery and closes {days} days later.",
      shippingAttemptedDelivery: "A delivery attempt was made for these items. You'll be able to request a return once they've been delivered.",
      outsideWindow:             "The return window has expired for these items. It closed on {closedDate}.",
      outsideWindowNoDate:       "The return window has expired for these items.",
      finalSale:                 "This item is marked as final sale and cannot be returned.",
      otherNotReturnable:        "These items aren't eligible for return.",
      returnRequested:           "We've received your return request.",
      returnInProgress:          "Your return is in progress.",
      returnCanceled:            "This return request was canceled.",
      returnCompleted:           "These items have already been returned.",
    },
    refundStatusLabels: {
      notRefunded: "",
      partiallyRefunded: "Partially refunded",
      refunded: "Refunded",
    },
```

- [ ] **Step 5: Verify**

Run: `npx tsc --noEmit`
Expected: errors ONLY in files that reference `IneligibleStatusMessages`/`IneligibleStatusStyles`/`IneligibleStatusKey`/`ineligibleStatusMessages`/`ineligibleStatusStyles` — this is expected until Tasks 2-9 update every consumer. Confirm no error originates from `lib/tenant-defaults.ts` itself.

- [ ] **Step 6: Commit**

```bash
git add lib/tenant-defaults.ts
git commit -m "feat: replace 14-status branding shape with 6-status lifecycle model"
```

---

### Task 2: Update `lib/tenant.ts` re-exports

**Files:**
- Modify: `lib/tenant.ts`

**Interfaces:**
- Consumes: `ReturnLifecycleStatus`, `ReturnLifecycleStyle`, `ReturnLifecycleStyles`, `ReturnLifecycleMessages`, `NotReturnableReason`, `RefundStatus`, `RefundStatusLabels` from Task 1.
- Produces: same types, re-exported from `@/lib/tenant` (the path every consumer imports from, not `tenant-defaults` directly).

- [ ] **Step 1: Read current re-export line**

Run: `grep -n "IneligibleStatus" lib/tenant.ts`

- [ ] **Step 2: Replace the import and export lines**

Find:
```ts
import { DEFAULT_TENANT_FIELDS, type PolicyCategory, type SidebarLink, type SidebarLayout, type TenantBranding, type IneligibleStatusMessages, type IneligibleStatusKey, type IneligibleStatusStyle, type IneligibleStatusStyles } from "@/lib/tenant-defaults";

export type { PolicyCategory, SidebarLink, SidebarLayout, TenantBranding, IneligibleStatusMessages, IneligibleStatusKey, IneligibleStatusStyle, IneligibleStatusStyles };
```
Replace with:
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

- [ ] **Step 3: Verify**

Run: `npx tsc --noEmit`
Expected: no NEW errors introduced by this file; remaining errors still confined to consumers not yet updated.

- [ ] **Step 4: Commit**

```bash
git add lib/tenant.ts
git commit -m "feat: re-export return lifecycle types from lib/tenant"
```

---

### Task 3: `lib/branding-validation.ts` mirror + validation

**Files:**
- Modify: `lib/branding-validation.ts`

**Interfaces:**
- Consumes: nothing from earlier tasks (this file defines its own parallel `*Input` types, same pattern as today's `IneligibleStatusMessagesInput`/`IneligibleStatusStylesInput`).
- Produces: `ReturnLifecycleStatusInput` (reuse the same literal union, no need for a separate `Input` type name since it's just a string union — call it `ReturnLifecycleStatus` directly, imported nowhere, just a local literal type), `ReturnLifecycleStyleInput`, `ReturnLifecycleStylesInput`, `ReturnLifecycleMessagesInput`, `RefundStatusLabelsInput`, `RETURN_LIFECYCLE_STATUSES` (exported const array of the 6 keys, used by `app/api/app/branding/route.ts` in Task 4).

- [ ] **Step 1: Read current shape**

Run: `grep -n "IneligibleStatus\|INELIGIBLE_STATUS" lib/branding-validation.ts`

- [ ] **Step 2: Replace the type block**

Replace the entire block from `export type IneligibleStatusMessagesInput = {` through `export const INELIGIBLE_STATUS_KEYS: IneligibleStatusKeyInput[] = [` `...` `];` with:

```ts
export type ReturnLifecycleStatusInput =
  | "notReturnable" | "returnRequested" | "returnInProgress"
  | "returnDeclined" | "returnCanceled" | "returnCompleted";

export const RETURN_LIFECYCLE_STATUSES: ReturnLifecycleStatusInput[] = [
  "notReturnable", "returnRequested", "returnInProgress",
  "returnDeclined", "returnCanceled", "returnCompleted",
];

export type ReturnLifecycleStyleInput = { label: string; heading: string; icon: string; color: string };
export type ReturnLifecycleStylesInput = Record<ReturnLifecycleStatusInput, ReturnLifecycleStyleInput>;

export type ReturnLifecycleMessagesInput = {
  shippingConfirmed: string;
  shippingOnItsWay: string;
  shippingOutForDelivery: string;
  shippingAttemptedDelivery: string;
  outsideWindow: string;
  outsideWindowNoDate: string;
  finalSale: string;
  otherNotReturnable: string;
  returnRequested: string;
  returnInProgress: string;
  returnCanceled: string;
  returnCompleted: string;
};

export type RefundStatusInput = "notRefunded" | "partiallyRefunded" | "refunded";
export type RefundStatusLabelsInput = Record<RefundStatusInput, string>;
```

- [ ] **Step 3: Update `BrandingInput`**

Find:
```ts
  ineligibleStatusMessages: IneligibleStatusMessagesInput;
  ineligibleStatusStyles: IneligibleStatusStylesInput;
  alwaysShowGuestLookup: boolean;
```
Replace with:
```ts
  returnLifecycleStyles: ReturnLifecycleStylesInput;
  returnLifecycleMessages: ReturnLifecycleMessagesInput;
  refundStatusLabels: RefundStatusLabelsInput;
  alwaysShowGuestLookup: boolean;
```

- [ ] **Step 4: Replace validation blocks**

Find the two validation blocks (the `{ const messages = Object.values(input.ineligibleStatusMessages); ... }` block and the `{ const styles = INELIGIBLE_STATUS_KEYS.map(...); ... }` block). Replace both with:

```ts
  {
    const messages = Object.values(input.returnLifecycleMessages);
    if (messages.some((m) => !m.trim())) {
      errors.returnLifecycleMessages = "Every message must have some text — none can be empty.";
    } else if (messages.some((m) => m.length > POLICY_FOOTER_NOTE_MAX_LENGTH)) {
      errors.returnLifecycleMessages = `Each message must be ${POLICY_FOOTER_NOTE_MAX_LENGTH} characters or fewer.`;
    }
  }
  {
    const styles = RETURN_LIFECYCLE_STATUSES.map((k) => input.returnLifecycleStyles[k]);
    if (styles.some((s) => !s.label.trim() || !s.heading.trim())) {
      errors.returnLifecycleStyles = "Every status needs both a label and a heading.";
    } else if (styles.some((s) => s.label.length > STORE_LINK_LABEL_MAX_LENGTH || s.heading.length > POLICY_HEADING_MAX_LENGTH)) {
      errors.returnLifecycleStyles = `Labels must be ${STORE_LINK_LABEL_MAX_LENGTH} characters or fewer, headings ${POLICY_HEADING_MAX_LENGTH} or fewer.`;
    } else if (styles.some((s) => s.color && !HEX_COLOR_RE.test(s.color))) {
      errors.returnLifecycleStyles = "Each color must be blank or a hex color like #4F46E5.";
    }
  }
  {
    const { partiallyRefunded, refunded } = input.refundStatusLabels;
    if (!partiallyRefunded.trim() || !refunded.trim()) {
      errors.refundStatusLabels = "The 'partially refunded' and 'refunded' labels can't be empty.";
    } else if (partiallyRefunded.length > STORE_LINK_LABEL_MAX_LENGTH || refunded.length > STORE_LINK_LABEL_MAX_LENGTH) {
      errors.refundStatusLabels = `Labels must be ${STORE_LINK_LABEL_MAX_LENGTH} characters or fewer.`;
    }
  }
```

- [ ] **Step 5: Verify**

Run: `npx tsc --noEmit`
Expected: no errors originating from `lib/branding-validation.ts` itself; remaining errors confined to `app/api/app/branding/route.ts`, `components/dashboard-client.tsx`, `components/app-settings/settings-form.tsx` (not yet updated).

- [ ] **Step 6: Commit**

```bash
git add lib/branding-validation.ts
git commit -m "feat: validate the new return lifecycle/refund branding shape"
```

---

### Task 4: `app/api/app/branding/route.ts` wiring

**Files:**
- Modify: `app/api/app/branding/route.ts`

**Interfaces:**
- Consumes: `RETURN_LIFECYCLE_STATUSES`, `ReturnLifecycleStylesInput`, `ReturnLifecycleMessagesInput`, `RefundStatusLabelsInput` from Task 3 (`@/lib/branding-validation`).
- Produces: PUT `/api/app/branding` accepts and persists `returnLifecycleStyles`, `returnLifecycleMessages`, `refundStatusLabels` in place of the old two fields.

- [ ] **Step 1: Replace imports and type guards**

Find:
```ts
import {
  validateBrandingInput,
  INELIGIBLE_STATUS_KEYS,
  type BrandingInput,
  type PolicyCategoryInput,
  type SidebarLinkInput,
  type IneligibleStatusMessagesInput,
  type IneligibleStatusStylesInput,
} from "@/lib/branding-validation";
```
Replace with:
```ts
import {
  validateBrandingInput,
  RETURN_LIFECYCLE_STATUSES,
  type BrandingInput,
  type PolicyCategoryInput,
  type SidebarLinkInput,
  type ReturnLifecycleMessagesInput,
  type ReturnLifecycleStylesInput,
  type RefundStatusLabelsInput,
} from "@/lib/branding-validation";
```

Find:
```ts
const INELIGIBLE_STATUS_MESSAGE_KEYS = [
  "confirmed", "onItsWay", "outForDelivery", "attemptedDelivery", "windowExpired", "windowExpiredNoDate",
  "returnRequested", "returnInProgress", "returned", "refunded", "returnCancelled", "cancelled", "notEligible",
] as const;
```
Replace with:
```ts
const RETURN_LIFECYCLE_MESSAGE_KEYS = [
  "shippingConfirmed", "shippingOnItsWay", "shippingOutForDelivery", "shippingAttemptedDelivery",
  "outsideWindow", "outsideWindowNoDate", "finalSale", "otherNotReturnable",
  "returnRequested", "returnInProgress", "returnCanceled", "returnCompleted",
] as const;

const REFUND_STATUS_KEYS = ["notRefunded", "partiallyRefunded", "refunded"] as const;
```

Find:
```ts
function isIneligibleStatusMessages(value: unknown): value is IneligibleStatusMessagesInput {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  return INELIGIBLE_STATUS_MESSAGE_KEYS.every((key) => typeof v[key] === "string");
}

function isIneligibleStatusStyles(value: unknown): value is IneligibleStatusStylesInput {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  return INELIGIBLE_STATUS_KEYS.every((key) => {
    const s = v[key] as Record<string, unknown> | undefined;
    return s && typeof s === "object"
      && typeof s.label === "string" && typeof s.heading === "string"
      && typeof s.icon === "string" && typeof s.color === "string";
  });
}
```
Replace with:
```ts
function isReturnLifecycleMessages(value: unknown): value is ReturnLifecycleMessagesInput {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  return RETURN_LIFECYCLE_MESSAGE_KEYS.every((key) => typeof v[key] === "string");
}

function isReturnLifecycleStyles(value: unknown): value is ReturnLifecycleStylesInput {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  return RETURN_LIFECYCLE_STATUSES.every((key) => {
    const s = v[key] as Record<string, unknown> | undefined;
    return s && typeof s === "object"
      && typeof s.label === "string" && typeof s.heading === "string"
      && typeof s.icon === "string" && typeof s.color === "string";
  });
}

function isRefundStatusLabels(value: unknown): value is RefundStatusLabelsInput {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  return REFUND_STATUS_KEYS.every((key) => typeof v[key] === "string");
}
```

- [ ] **Step 2: Update the `input` construction**

Find:
```ts
    ineligibleStatusMessages: isIneligibleStatusMessages(body.ineligibleStatusMessages)
      ? body.ineligibleStatusMessages
      : existing.branding.ineligibleStatusMessages,
    ineligibleStatusStyles: isIneligibleStatusStyles(body.ineligibleStatusStyles)
      ? body.ineligibleStatusStyles
      : existing.branding.ineligibleStatusStyles,
    alwaysShowGuestLookup:
```
Replace with:
```ts
    returnLifecycleMessages: isReturnLifecycleMessages(body.returnLifecycleMessages)
      ? body.returnLifecycleMessages
      : existing.branding.returnLifecycleMessages,
    returnLifecycleStyles: isReturnLifecycleStyles(body.returnLifecycleStyles)
      ? body.returnLifecycleStyles
      : existing.branding.returnLifecycleStyles,
    refundStatusLabels: isRefundStatusLabels(body.refundStatusLabels)
      ? body.refundStatusLabels
      : existing.branding.refundStatusLabels,
    alwaysShowGuestLookup:
```

- [ ] **Step 3: Update the `setTenant` branding object**

Find:
```ts
      ineligibleStatusMessages: input.ineligibleStatusMessages,
      ineligibleStatusStyles: input.ineligibleStatusStyles,
      alwaysShowGuestLookup: input.alwaysShowGuestLookup,
```
Replace with:
```ts
      returnLifecycleMessages: input.returnLifecycleMessages,
      returnLifecycleStyles: input.returnLifecycleStyles,
      refundStatusLabels: input.refundStatusLabels,
      alwaysShowGuestLookup: input.alwaysShowGuestLookup,
```

- [ ] **Step 4: Verify**

Run: `npx tsc --noEmit`
Expected: no errors from `app/api/app/branding/route.ts`; remaining errors confined to `components/dashboard-client.tsx` and `components/app-settings/settings-form.tsx`.

- [ ] **Step 5: Commit**

```bash
git add app/api/app/branding/route.ts
git commit -m "feat: wire return lifecycle/refund branding through the API route"
```

---

### Task 5: `app/api/get-orders/route.ts` — eligibility computation rework

**Files:**
- Modify: `app/api/get-orders/route.ts`

**Interfaces:**
- Produces: each line item in the API response gains `notReturnableReason: "notDelivered" | "outsideWindow" | "finalSale" | "other" | null`, `shippingStage: "confirmed" | "onItsWay" | "outForDelivery" | "attemptedDelivery" | null`, `refundStatus: "notRefunded" | "partiallyRefunded" | "refunded"`. `returnStatus` changes from the old 14-value string union to: `"Eligible" | "Cancelled" | "notReturnable" | "returnRequested" | "returnInProgress" | "returnDeclined" | "returnCanceled" | "returnCompleted"` (Eligible/Cancelled unchanged, the other 6 are the new lifecycle values). `returnReason` keeps its existing meaning (customer-facing sentence) but its VALUE now comes from the new sentence set for `notReturnable` items.
- Consumes: nothing new — this task only relabels existing branches, no new inputs.

This is the highest-risk task — it's a straight relabeling of an existing 4-branch decision tree (Global Constraints: no new eligibility logic). Work through each branch in order, changing only the assigned string values.

- [ ] **Step 1: Add a shared helper for shipping-stage sentence lookup**

Just above `function statusFromUndeliveredDelivery(` (around line 902), add:

```ts
type ShippingStage = "confirmed" | "onItsWay" | "outForDelivery" | "attemptedDelivery";

const SHIPPING_STAGE_REASON: Record<ShippingStage, string> = {
  confirmed: "We're preparing your items for shipping.",
  onItsWay: "Your parcel is on its way. Your return window starts once it's delivered.",
  outForDelivery: "Your parcel is out for delivery today. Your return window starts once it's delivered.",
  attemptedDelivery: "A delivery attempt was made for your parcel. You'll be able to request a return once it's been delivered.",
};
```

- [ ] **Step 2: Rewrite `statusFromUndeliveredDelivery`**

Replace the full function body (currently returns `{ returnStatus: string; returnReason: string }` with old status names) with:

```ts
function statusFromUndeliveredDelivery(
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

- [ ] **Step 3: Rewrite the main branch chain (lines ~627-779)**

Change the local variable declarations (line 627-629):
```ts
        let returnStatus: string;
        let returnReason: string;
        let effectiveEligibleQty = effectiveEligibleWindowed;
```
to:
```ts
        let returnStatus: string;
        let returnReason: string;
        let notReturnableReason: string | null = null;
        let shippingStage: ShippingStage | null = null;
        let effectiveEligibleQty = effectiveEligibleWindowed;
```

Change the shipping-shortcut branch (lines 639-647):
```ts
        } else if (shopifySlotEligible > 0 && delivery.attemptedDeliveryQty > 0) {
          returnStatus = "Attempted delivery";
          returnReason = "A delivery attempt was made. Please rebook or collect your parcel — your return window starts once it's delivered.";
        } else if (shopifySlotEligible > 0 && delivery.outForDeliveryQty > 0) {
          returnStatus = "Out for delivery";
          returnReason = "Your parcel is out for delivery today. Your return window starts once it's delivered.";
        } else if (shopifySlotEligible > 0 && delivery.inTransitQty > 0) {
          returnStatus = "On its way";
          returnReason = "Your parcel is on its way. Your return window starts once it's delivered.";

        } else if (bestReturn && Math.max(0, item.quantity - reservedQty) <= 0) {
```
to:
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

        } else if (bestReturn && Math.max(0, item.quantity - reservedQty) <= 0) {
```

Change the Return-record `statusMap` branch (lines 649-665):
```ts
          const statusMap: Record<string, string> = {
            REQUESTED: "Return requested", OPEN: "Return in progress", CLOSED: "Returned", DECLINED: "Return declined", CANCELED: "Return cancelled — please contact us",
          };
          returnStatus = statusMap[bestReturn.status] || "Return in progress";
```
to:
```ts
          const statusMap: Record<string, string> = {
            REQUESTED: "returnRequested", OPEN: "returnInProgress", CLOSED: "returnCompleted", DECLINED: "returnDeclined", CANCELED: "returnCanceled",
          };
          returnStatus = statusMap[bestReturn.status] || "returnInProgress";
```
(the rest of that branch, lines 655-665, is the decline-reason resolution — leave unchanged per Global Constraints.)

Change the `ri.nonReturnableItems` branch (lines 687-714):
```ts
            if (reasonCodes.includes("UNFULFILLED")) {
              // Item confirmed as unfulfilled — delivery state takes precedence
              const undelivered = statusFromUndeliveredDelivery(delivery, now, returnWindowDays);
              returnStatus = undelivered.returnStatus;
              returnReason = undelivered.returnReason;
            } else if (reasonCodes.includes("RETURN_WINDOW_EXPIRED")) {
              // Window can't be expired before delivery — guard against Shopify API edge cases
              if (delivery.deliveredQty <= 0) {
                const undelivered = statusFromUndeliveredDelivery(delivery, now, returnWindowDays);
                returnStatus = undelivered.returnStatus;
                returnReason = undelivered.returnReason;
              } else {
                returnStatus = "Passed the return window";
                returnReason = formatReturnWindowExpiredReason(delivery.latestDeliveredAt, returnWindowDays);
              }
            } else if (reasonCodes.includes("FINAL_SALE")) {
              returnStatus = "Final sale";
              returnReason = "This item is marked as final sale and cannot be returned.";
            } else if (reasonCodes.includes("RETURNED")) {
              // Sidekick guidance: RETURNED ≠ refunded.
              // This is an eligibility signal only — quantity splits use Return records.
              returnStatus = "Returned";
              returnReason = "This item has already been returned.";
            } else {
              // Unknown reason code — generic copy; logged above
              returnStatus = "Not eligible";
              returnReason = "This item is not eligible for return.";
            }
```
to:
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

Change the zeroed-out-item branch (lines 715-746):
```ts
            if (delivery.deliveredQty > 0 && slotAvailable <= 0) {
              // Delivered but all quantity accounted for by refunds or return records
              const isDirectRefund = refQty > 0 && completedQty === 0 && openQty === 0;
              returnStatus = isDirectRefund ? "Refunded" : "Returned";
              returnReason = isDirectRefund
                ? "This item has already been refunded."
                : "This item has already been returned.";
            } else if (delivery.deliveredQty > 0) {
              // Delivered but Shopify doesn't list it in either returnable or non-returnable.
              // Common with Admin API fallback: returnableFulfillments omits expired items.
              // Use delivery date to determine correct status rather than falling through
              // to statusFromUndeliveredDelivery which would incorrectly show "Confirmed".
              const daysSince = delivery.latestDeliveredAt
                ? (now.getTime() - delivery.latestDeliveredAt.getTime()) / (1000 * 60 * 60 * 24)
                : Infinity;
              if (daysSince > returnWindowDays) {
                returnStatus = "Passed the return window";
                returnReason = formatReturnWindowExpiredReason(delivery.latestDeliveredAt, returnWindowDays);
              } else {
                returnStatus = "Eligible";
                returnReason = "";
                effectiveEligibleQty = deliveredAvailable;
              }
            } else {
              const undelivered2 = statusFromUndeliveredDelivery(delivery, now, returnWindowDays);
              returnStatus = undelivered2.returnStatus;
              returnReason = undelivered2.returnReason;
            }
```
to:
```ts
            if (delivery.deliveredQty > 0 && slotAvailable <= 0) {
              // Delivered but all quantity accounted for by refunds or return records.
              // This is a DIRECT refund with no Return record — the lifecycle status
              // itself is "not applicable" (see get-orders API contract note below);
              // returnCompleted is used as the closest-fit lifecycle status when a
              // refund happened but no return record exists, with refundStatus (set
              // below, outside this if-chain) carrying the actual refund fact.
              const isDirectRefund = refQty > 0 && completedQty === 0 && openQty === 0;
              returnStatus = isDirectRefund ? "returnCompleted" : "returnCompleted";
              returnReason = isDirectRefund
                ? "This item has already been refunded."
                : "This item has already been returned.";
            } else if (delivery.deliveredQty > 0) {
              // Delivered but Shopify doesn't list it in either returnable or non-returnable.
              // Common with Admin API fallback: returnableFulfillments omits expired items.
              // Use delivery date to determine correct status rather than falling through
              // to statusFromUndeliveredDelivery which would incorrectly show "Confirmed".
              const daysSince = delivery.latestDeliveredAt
                ? (now.getTime() - delivery.latestDeliveredAt.getTime()) / (1000 * 60 * 60 * 24)
                : Infinity;
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

Change the manual-fallback branch (lines 749-778). Find:
```ts
        } else {
          // ── Priority 4: Manual fallback (Customer Account API unavailable) ─
          if (bestReturn) {
            const statusMap: Record<string, string> = {
              REQUESTED: "Return requested", OPEN: "Return in progress", CLOSED: "Returned", DECLINED: "Return declined", CANCELED: "Return cancelled — please contact us",
            };
            returnStatus = statusMap[bestReturn.status] || "Return in progress";
            returnReason = "You have an active or completed return for this item.";
          } else if (Math.max(0, item.quantity - reservedQty) <= 0) {
            returnStatus = "Refunded";
            returnReason = "This item has already been fully refunded.";
          } else if (effectiveEligible > 0) {
            if (delivery.latestDeliveredAt) {
              const daysSince = (now.getTime() - delivery.latestDeliveredAt.getTime()) / (1000 * 60 * 60 * 24);
              if (daysSince > returnWindowDays) {
                returnStatus = "Passed the return window";
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
            returnReason = undelivered3.returnReason;
          }
        }
```
Replace with:
```ts
        } else {
          // ── Priority 4: Manual fallback (Customer Account API unavailable) ─
          if (bestReturn) {
            const statusMap: Record<string, string> = {
              REQUESTED: "returnRequested", OPEN: "returnInProgress", CLOSED: "returnCompleted", DECLINED: "returnDeclined", CANCELED: "returnCanceled",
            };
            returnStatus = statusMap[bestReturn.status] || "returnInProgress";
            returnReason = "You have an active or completed return for this item.";
          } else if (Math.max(0, item.quantity - reservedQty) <= 0) {
            returnStatus = "returnCompleted";
            returnReason = "This item has already been fully refunded.";
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
        }
```

- [ ] **Step 4: Add `refundStatus` computation and include the 3 new fields in the response**

Just before the `return { ...item, ... }` object (around line 781), add:

```ts
        const refundStatus: string =
          refQty <= 0 ? "notRefunded"
          : refQty >= item.quantity ? "refunded"
          : "partiallyRefunded";
```

In the returned object, find:
```ts
          returnStatus,
          returnReason,
```
Replace with:
```ts
          returnStatus,
          returnReason,
          notReturnableReason,
          shippingStage,
          refundStatus,
```

- [ ] **Step 5: Sanity-check the mapping with a standalone script**

Since this file isn't unit-tested directly, verify by reading the fully edited branch chain once more end-to-end (`sed -n '625,800p' app/api/get-orders/route.ts`) and confirming every `returnStatus =` assignment is one of: `"Eligible"`, `"Cancelled"`, `"notReturnable"`, `"returnRequested"`, `"returnInProgress"`, `"returnDeclined"`, `"returnCanceled"`, `"returnCompleted"` — no old-format string (e.g. `"Passed the return window"`, `"Final sale"`, `"On its way"`) should remain anywhere in the file.

Run: `grep -n '"Passed the return window"\|"Final sale"\|"Not eligible"\|"On its way"\|"Out for delivery"\|"Attempted delivery"\|"Return requested"\|"Return in progress"\|"Return declined"\|"Return cancelled\|"Returned"\|"Refunded"' app/api/get-orders/route.ts`
Expected: no matches (every old-format literal has been replaced).

- [ ] **Step 6: Commit**

```bash
git add app/api/get-orders/route.ts
git commit -m "feat: rework eligibility computation for the 6-status lifecycle model"
```

(Note: `tsc --noEmit` will still show errors from `components/dashboard-client.tsx` at this point — expected, not a regression from this task. Do not attempt to fix dashboard-client.tsx errors here; that's Task 6.)

---

### Task 6: `components/dashboard-client.tsx` — types + `buildIneligibleDisplayItems` rework

**Files:**
- Modify: `components/dashboard-client.tsx`

**Interfaces:**
- Consumes: `ReturnLifecycleStatus`, `ReturnLifecycleStyles`, `ReturnLifecycleMessages`, `NotReturnableReason`, `RefundStatus`, `RefundStatusLabels` from `@/lib/tenant` (Task 2). `notReturnableReason`, `shippingStage`, `refundStatus` fields on the API response from Task 5.
- Produces: updated `ReturnStatus`, `LineItem`, `DisplayItem` types; a rewritten `buildIneligibleDisplayItems` that assigns the new 3-field model consistently with what `get-orders/route.ts` now produces, eliminating the duplicated shipping-stage sentence text.

- [ ] **Step 1: Update the import and the `ReturnStatus` type and `LineItem` interface**

Find:
```ts
import type { TenantBranding, IneligibleStatusMessages, IneligibleStatusKey, IneligibleStatusStyle, IneligibleStatusStyles } from "@/lib/tenant"
```
Replace with:
```ts
import type { TenantBranding, ReturnLifecycleStyle, ReturnLifecycleStyles, ReturnLifecycleMessages, RefundStatusLabels } from "@/lib/tenant"
```

Find (lines 38-43):
```ts
type ReturnStatus =
  | "Eligible" | "Confirmed" | "On its way" | "Out for delivery" | "Attempted delivery"
  | "Passed the return window" | "Returned" | "Refunded"
  | "Return requested" | "Return in progress"
  | "Return declined" | "Return cancelled" | "Cancelled"
  | "Final sale" | "Not eligible"
```
Replace with:
```ts
type ReturnStatus =
  | "Eligible" | "Cancelled"
  | "notReturnable" | "returnRequested" | "returnInProgress"
  | "returnDeclined" | "returnCanceled" | "returnCompleted"

type ShippingStage = "confirmed" | "onItsWay" | "outForDelivery" | "attemptedDelivery"
```

Find (in `interface LineItem`):
```ts
  returnStatus: ReturnStatus
  returnReason?: string
```
Replace with:
```ts
  returnStatus: ReturnStatus
  returnReason?: string
  notReturnableReason?: "notDelivered" | "outsideWindow" | "finalSale" | "other" | null
  shippingStage?: ShippingStage | null
  refundStatus?: "notRefunded" | "partiallyRefunded" | "refunded"
```

- [ ] **Step 2: Add a shared shipping-stage sentence lookup, replacing the 2 duplicated inline copies**

Near the top of the file, after the `ReturnStatus`/`LineItem` type block, add:

```ts
const SHIPPING_STAGE_MESSAGE_KEY: Record<ShippingStage, keyof ReturnLifecycleMessages> = {
  confirmed: "shippingConfirmed",
  onItsWay: "shippingOnItsWay",
  outForDelivery: "shippingOutForDelivery",
  attemptedDelivery: "shippingAttemptedDelivery",
}
```

(`ReturnLifecycleMessages` is already imported by Step 1 above.)

- [ ] **Step 3: Rewrite `buildIneligibleDisplayItems`**

Replace the two hardcoded shipping-stage push blocks (currently lines ~2411-2445, the `attemptedQty`/`ofdQty`/`inTransitQty` splits with inline `returnReason` strings) so they use `item.shippingStage`/`item.notReturnableReason` from the API response instead of re-deriving their own text. Since this function only receives the AGGREGATE `item` (which for a partially-eligible item has ONE overall `shippingStage`, not per-bucket), and the existing code already buckets by `attemptedDeliveryQuantity`/`outForDeliveryQuantity`/`inTransitQuantity` quantity fields (which `get-orders/route.ts` still populates, unchanged), keep the quantity-bucketing logic exactly as-is but replace the `returnStatus`/`returnReason` VALUES:

Find:
```ts
      const attemptedQty = item.attemptedDeliveryQuantity ?? 0
      const attemptedSplitQty = take(Math.min(remaining, attemptedQty))
      if (attemptedSplitQty > 0) {
        result.push({
          ...item,
          returnStatus: "Attempted delivery",
          returnReason: "A delivery attempt was made. Please rebook or collect your parcel — your return window starts once it's delivered.",
          splitQty: attemptedSplitQty,
          splitKey: `${item.id}-remainder-attempted`,
        })
      }

      const ofdQty = item.outForDeliveryQuantity ?? 0
      const ofdSplitQty = take(Math.min(remaining, ofdQty))
      if (ofdSplitQty > 0) {
        result.push({
          ...item,
          returnStatus: "Out for delivery",
          returnReason: "Your parcel is out for delivery today. Your return window starts once it's delivered.",
          splitQty: ofdSplitQty,
          splitKey: `${item.id}-remainder-ofd`,
        })
      }

      const inTransitQty = item.inTransitQuantity ?? 0
      const inTransitSplitQty = take(Math.min(remaining, inTransitQty))
      if (inTransitSplitQty > 0) {
        result.push({
          ...item,
          returnStatus: "On its way",
          returnReason: "Your parcel is on its way. Your return window starts once it's delivered.",
          splitQty: inTransitSplitQty,
          splitKey: `${item.id}-remainder-transit`,
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
```
(`returnReason` is set to `""` here rather than duplicating text a third time — `getIneligibleGroupMessage`, rewritten in Task 7, resolves the actual sentence from `notReturnableReason`/`shippingStage` at render time, same pattern already used for the `Return requested`/`Return in progress`/`Returned` splits a few lines above this block, which already push `returnReason: ""`.)

Find the other 4 hardcoded status assignments in the same function and update the string values only (reason text stays `""`, matching the existing pattern for those 4):
```ts
        returnStatus: "Return requested",
```
→
```ts
        returnStatus: "returnRequested",
```
```ts
        returnStatus: "Return in progress",
```
→
```ts
        returnStatus: "returnInProgress",
```
```ts
        returnStatus: "Returned",
```
→
```ts
        returnStatus: "returnCompleted",
```
```ts
        returnStatus: "Return declined",
```
→
```ts
        returnStatus: "returnDeclined",
```
(leave `returnReason: entry.message` on the declined push as-is — unchanged per Global Constraints.)

Find:
```ts
    const directRefundQty = take(item.refundedQuantity || 0)
    if (directRefundQty > 0) {
      result.push({
        ...item,
        returnStatus: "Refunded",
        returnReason: "",
        splitQty: directRefundQty,
        splitKey: `${item.id}-refunded`,
      })
    }
```
Replace with:
```ts
    const directRefundQty = take(item.refundedQuantity || 0)
    if (directRefundQty > 0) {
      result.push({
        ...item,
        returnStatus: "returnCompleted",
        refundStatus: "refunded",
        returnReason: "",
        splitQty: directRefundQty,
        splitKey: `${item.id}-refunded`,
      })
    }
```

Find the final pending-remainder push:
```ts
      if (remaining > 0) {
        result.push({
          ...item,
          returnStatus: "Confirmed",
          returnReason: item.pendingQuantity && item.pendingQuantity > 0
            ? "This item hasn't been dispatched yet — check back once it ships."
            : "This item is not eligible for return.",
          splitQty: remaining,
          splitKey: `${item.id}-remainder-pending`,
        })
      }
```
Replace with:
```ts
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

- [ ] **Step 4: Verify partial progress with grep**

Run: `grep -n 'returnStatus: "Attempted delivery"\|returnStatus: "Out for delivery"\|returnStatus: "On its way"\|returnStatus: "Return requested"\|returnStatus: "Return in progress"\|returnStatus: "Returned"\|returnStatus: "Return declined"\|returnStatus: "Refunded"\|returnStatus: "Confirmed"' components/dashboard-client.tsx`
Expected: no matches within `buildIneligibleDisplayItems` (there may still be matches elsewhere in the file — those are addressed in Task 7).

- [ ] **Step 5: Commit**

```bash
git add components/dashboard-client.tsx
git commit -m "feat: rework buildIneligibleDisplayItems for the 6-status lifecycle model"
```

(Expect `tsc --noEmit` to still show errors elsewhere in this same file — Task 7 continues in the same file, not yet complete.)

---

### Task 7: `components/dashboard-client.tsx` — label/heading/icon/message functions + refund rendering + dead code removal

**Files:**
- Modify: `components/dashboard-client.tsx`

**Interfaces:**
- Consumes: `ReturnLifecycleStyles`, `ReturnLifecycleMessages`, `RefundStatusLabels` (Task 1/2), the new `LineItem` fields from Task 6.
- Produces: `getIneligibleCoarseLabel`, `getIneligibleAccordionTitle`, `getReturnStatusIcon`, `getIneligibleGroupMessage`, `getIneligibleFilterOptions`, `getIneligibleGroupKey` all rewritten to key off the new 6-value `ReturnStatus` directly (no more `STATUS_STYLE_KEY_MAP` grouping table — it's already 1:1). `IneligibleGroupSummary` renders a refund fact. `buildNarrativeOrderSummary` (dead code, confirmed unused) removed.

- [ ] **Step 1: Confirm the import (already updated in Task 6, Step 1)**

Run: `grep -n "^import type { TenantBranding" components/dashboard-client.tsx`
Expected: `import type { TenantBranding, ReturnLifecycleStyle, ReturnLifecycleStyles, ReturnLifecycleMessages, RefundStatusLabels } from "@/lib/tenant"` — Task 6 already made this change since `ReturnLifecycleMessages` was needed there first. Nothing to edit in this step.

- [ ] **Step 2: Replace `STATUS_STYLE_KEY_MAP` + `getStatusStyle` + the 3 label/heading/icon functions**

Find (the whole block from `const STATUS_STYLE_KEY_MAP` through the end of `getReturnStatusIcon`):
```ts
const STATUS_STYLE_KEY_MAP: Record<Exclude<ReturnStatus, "Eligible">, IneligibleStatusKey> = {
  ...
}

function getStatusStyle(status: ReturnStatus, styles: IneligibleStatusStyles): IneligibleStatusStyle {
  return styles[STATUS_STYLE_KEY_MAP[status as Exclude<ReturnStatus, "Eligible">]] ?? styles.notEligible
}

function getIneligibleCoarseLabel(status: ReturnStatus, styles: IneligibleStatusStyles): string {
  return getStatusStyle(status, styles).label
}

function getIneligibleAccordionTitle(status: ReturnStatus, styles: IneligibleStatusStyles): string {
  return getStatusStyle(status, styles).heading
}

function getReturnStatusIcon(status: ReturnStatus, styles: IneligibleStatusStyles): { icon: React.ElementType; color: string; label: string } {
  const style = getStatusStyle(status, styles)
  return { icon: getIneligibleStatusIconComponent(style.icon), color: style.color, label: style.label }
}
```
Replace with:
```ts
function getStatusStyle(status: ReturnStatus, styles: ReturnLifecycleStyles): ReturnLifecycleStyle {
  return styles[status as Exclude<ReturnStatus, "Eligible" | "Cancelled">] ?? styles.notReturnable
}

function getIneligibleCoarseLabel(status: ReturnStatus, styles: ReturnLifecycleStyles): string {
  return getStatusStyle(status, styles).label
}

function getIneligibleAccordionTitle(status: ReturnStatus, styles: ReturnLifecycleStyles): string {
  return getStatusStyle(status, styles).heading
}

function getReturnStatusIcon(status: ReturnStatus, styles: ReturnLifecycleStyles): { icon: React.ElementType; color: string; label: string } {
  const style = getStatusStyle(status, styles)
  return { icon: getIneligibleStatusIconComponent(style.icon), color: style.color, label: style.label }
}
```

- [ ] **Step 3: Rewrite `getIneligibleGroupMessage`**

Find the function signature and body (`function getIneligibleGroupMessage(item: LineItem, order: Order, returnWindowDays: number, messages: IneligibleStatusMessages, groupItems?: LineItem[]): string { ... }`) and replace its ENTIRE body with:

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
      return messages.returnCompleted
    default:
      return messages.otherNotReturnable
  }
}
```

(Update the type signature of the function to accept `messages: ReturnLifecycleMessages` in place of `messages: IneligibleStatusMessages`.)

- [ ] **Step 4: Rewrite `getIneligibleFilterOptions` and `getIneligibleGroupKey` signatures**

Change every `styles: IneligibleStatusStyles` parameter type (in `getIneligibleFilterOptions`) to `styles: ReturnLifecycleStyles` — no logic changes needed, the function body already just calls `getIneligibleCoarseLabel`.

In `getIneligibleGroupKey`, find:
```ts
function getIneligibleGroupKey(item: LineItem, order: Order, returnWindowDays: number): string {
  if (item.returnStatus === "Return declined") {
    // item.returnReason is already resolved (real Shopify reason, or the
    // merchant's declined fallback) by buildIneligibleDisplayItems — no
    // need to re-resolve it here.
    return `declined:${item.returnReason || ""}`
  }
  if (item.returnStatus === "Passed the return window") {
    const closed = formatReturnWindowClosedForItem(item, order, returnWindowDays) ?? "unknown"
    return `window:${closed}`
  }
  return `${item.returnStatus}`
}
```
Replace with:
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
  return `${item.returnStatus}:${item.notReturnableReason ?? ""}`
}
```

- [ ] **Step 5: Update `IneligibleGroupSummary` for the refund fact**

Find the function signature:
```ts
function IneligibleGroupSummary({ item, order, groupItems, count, returnWindowDays, ineligibleStatusMessages, ineligibleStatusStyles }: { item: LineItem; order: Order; groupItems?: LineItem[]; count: string; returnWindowDays: number; ineligibleStatusMessages: IneligibleStatusMessages; ineligibleStatusStyles: IneligibleStatusStyles }) {
```
Replace with:
```ts
function IneligibleGroupSummary({ item, order, groupItems, count, returnWindowDays, returnLifecycleMessages, returnLifecycleStyles, refundStatusLabels }: { item: LineItem; order: Order; groupItems?: LineItem[]; count: string; returnWindowDays: number; returnLifecycleMessages: ReturnLifecycleMessages; returnLifecycleStyles: ReturnLifecycleStyles; refundStatusLabels: RefundStatusLabels }) {
  const refundLabel = item.refundStatus && item.refundStatus !== "notRefunded" ? refundStatusLabels[item.refundStatus] : ""
```

Update every use of `ineligibleStatusMessages`/`ineligibleStatusStyles` inside this function body to `returnLifecycleMessages`/`returnLifecycleStyles`.

Find the `count` span in the desktop row:
```tsx
        <span className="text-[10px] font-medium leading-snug text-muted-foreground shrink-0 tabular-nums">{count}</span>
      </div>

      {/* Mobile: collapsible
```
Replace with:
```tsx
        <span className="flex items-center gap-1.5 shrink-0">
          {refundLabel && <span className="text-[10px] font-medium text-muted-foreground">{refundLabel}</span>}
          <span className="text-[10px] font-medium leading-snug text-muted-foreground tabular-nums">{count}</span>
        </span>
      </div>

      {/* Mobile: collapsible
```

Apply the same `{refundLabel && ...}` + count wrap to the two mobile `count` spans (the static-row case and the button case) — same pattern, small enough to not need a shared component given there are only 3 occurrences total.

- [ ] **Step 6: Update the `OrderDetailBranding` type and destructuring**

Find:
```ts
  eligibleLabel: string
  ineligibleLabel: string
  ineligibleStatusMessages: IneligibleStatusMessages
  ineligibleStatusStyles: IneligibleStatusStyles
}
```
Replace with:
```ts
  eligibleLabel: string
  ineligibleLabel: string
  returnLifecycleMessages: ReturnLifecycleMessages
  returnLifecycleStyles: ReturnLifecycleStyles
  refundStatusLabels: RefundStatusLabels
}
```

Find:
```ts
    eligibleLabel, ineligibleLabel, ineligibleStatusMessages, ineligibleStatusStyles,
  } = branding
```
Replace with:
```ts
    eligibleLabel, ineligibleLabel, returnLifecycleMessages, returnLifecycleStyles, refundStatusLabels,
  } = branding
```

- [ ] **Step 7: Update every call site referencing the renamed variables**

Run: `grep -n "ineligibleStatusMessages\|ineligibleStatusStyles" components/dashboard-client.tsx`

For each remaining match (the `buildNarrativeOrderSummary` call, `ineligibleFilterGroupCount` memo, `getIneligibleFilterOptions` calls ×2, the `<IneligibleGroupSummary .../>` JSX call, and the default `branding` `useState` initializer), rename `ineligibleStatusMessages` → `returnLifecycleMessages` and `ineligibleStatusStyles` → `returnLifecycleStyles`, and add `refundStatusLabels={refundStatusLabels}` to the `<IneligibleGroupSummary>` JSX call.

For the default `branding` `useState` initializer, find:
```ts
    ineligibleStatusMessages: DEFAULT_TENANT_FIELDS.branding.ineligibleStatusMessages,
    ineligibleStatusStyles: DEFAULT_TENANT_FIELDS.branding.ineligibleStatusStyles,
```
Replace with:
```ts
    returnLifecycleMessages: DEFAULT_TENANT_FIELDS.branding.returnLifecycleMessages,
    returnLifecycleStyles: DEFAULT_TENANT_FIELDS.branding.returnLifecycleStyles,
    refundStatusLabels: DEFAULT_TENANT_FIELDS.branding.refundStatusLabels,
```

- [ ] **Step 8: Remove dead code — `buildNarrativeOrderSummary`**

Run: `grep -n "narrativeSummary\|buildNarrativeOrderSummary\|NarrativeGroup\|NarrativeOrderSummary" components/dashboard-client.tsx`

Confirm (as found during spec research) that `narrativeSummary` (the `useMemo` calling `buildNarrativeOrderSummary`) has no other reference anywhere in its render output. Delete:
- The `narrativeSummary` `useMemo` block in `OrderDetail`.
- The `buildNarrativeOrderSummary` function definition.
- The `NarrativeGroup` and `NarrativeOrderSummary` type definitions (if they have no other consumer — re-check with the same grep after removing the function).

- [ ] **Step 9: Full verify (all of Tasks 5-7 together)**

Run: `npx tsc --noEmit`
Expected: zero errors, OR errors confined only to `components/app-settings/settings-form.tsx` (Task 8, not yet done) and `app/api/demo-orders/route.ts` (Task 9 — will not actually error since it's untyped, per Global Constraints, but double check).

- [ ] **Step 10: Commit**

```bash
git add components/dashboard-client.tsx
git commit -m "feat: rewrite status label/heading/icon/message functions for the 6-status model"
```

---

### Task 8: `components/app-settings/settings-form.tsx` — reshape Settings UI

**Files:**
- Modify: `components/app-settings/settings-form.tsx`

**Interfaces:**
- Consumes: `ReturnLifecycleStatusInput`, `ReturnLifecycleStyleInput`, `RETURN_LIFECYCLE_STATUSES` from `@/lib/branding-validation` (Task 3).
- Produces: replaces the 14-card "Statuses" section with a 6-card "Return status" section, a "Not returnable reasons" section, and a "Refund" section.

- [ ] **Step 1: Update imports**

Find:
```ts
import { validateBrandingInput, type BrandingInput, type PolicyCategoryInput, type SidebarLinkInput, type SidebarSubLinkInput, type IneligibleStatusMessagesInput, type IneligibleStatusKeyInput, type IneligibleStatusStyleInput } from "@/lib/branding-validation"
```
Replace with:
```ts
import { validateBrandingInput, RETURN_LIFECYCLE_STATUSES, type BrandingInput, type PolicyCategoryInput, type SidebarLinkInput, type SidebarSubLinkInput, type ReturnLifecycleMessagesInput, type ReturnLifecycleStatusInput, type ReturnLifecycleStyleInput } from "@/lib/branding-validation"
```

- [ ] **Step 2: Replace `STATUS_CARDS`**

Find:
```ts
const STATUS_CARDS: { key: IneligibleStatusKeyInput; name: string }[] = [
  { key: "confirmed", name: "Confirmed" },
  ...
  { key: "notEligible", name: "Not eligible" },
]
```
Replace with:
```ts
const RETURN_STATUS_CARDS: { key: ReturnLifecycleStatusInput; name: string }[] = [
  { key: "notReturnable", name: "Not returnable" },
  { key: "returnRequested", name: "Return requested" },
  { key: "returnInProgress", name: "Return in progress" },
  { key: "returnDeclined", name: "Return declined" },
  { key: "returnCanceled", name: "Return canceled" },
  { key: "returnCompleted", name: "Return completed" },
]
```

- [ ] **Step 3: Update `openStatusKey` state and `setStatusStyle`/`setIneligibleMessage` helpers**

Find:
```ts
  const [openStatusKey, setOpenStatusKey] = useState<IneligibleStatusKeyInput | null>(null)
  function toggleStatusOpen(key: IneligibleStatusKeyInput) {
```
Replace with:
```ts
  const [openStatusKey, setOpenStatusKey] = useState<ReturnLifecycleStatusInput | null>(null)
  function toggleStatusOpen(key: ReturnLifecycleStatusInput) {
```

Find:
```ts
  function setIneligibleMessage<K extends keyof IneligibleStatusMessagesInput>(key: K, value: string) {
    setForm((f) => ({ ...f, ineligibleStatusMessages: { ...f.ineligibleStatusMessages, [key]: value } }))
  }

  function setStatusStyle<K extends keyof IneligibleStatusStyleInput>(statusKey: IneligibleStatusKeyInput, field: K, value: IneligibleStatusStyleInput[K]) {
    setForm((f) => ({
      ...f,
      ineligibleStatusStyles: {
        ...f.ineligibleStatusStyles,
        [statusKey]: { ...f.ineligibleStatusStyles[statusKey], [field]: value },
      },
    }))
  }
```
Replace with:
```ts
  function setReturnLifecycleMessage<K extends keyof ReturnLifecycleMessagesInput>(key: K, value: string) {
    setForm((f) => ({ ...f, returnLifecycleMessages: { ...f.returnLifecycleMessages, [key]: value } }))
  }

  function setStatusStyle<K extends keyof ReturnLifecycleStyleInput>(statusKey: ReturnLifecycleStatusInput, field: K, value: ReturnLifecycleStyleInput[K]) {
    setForm((f) => ({
      ...f,
      returnLifecycleStyles: {
        ...f.returnLifecycleStyles,
        [statusKey]: { ...f.returnLifecycleStyles[statusKey], [field]: value },
      },
    }))
  }

  function setRefundStatusLabel(key: "partiallyRefunded" | "refunded", value: string) {
    setForm((f) => ({ ...f, refundStatusLabels: { ...f.refundStatusLabels, [key]: value } }))
  }
```

- [ ] **Step 4: Replace the "Statuses" section JSX**

Find the entire `<s-section heading="Statuses">...</s-section>` block. Replace with three sections:

```tsx
          <s-section heading="Return status">
            <s-stack direction="block" gap="base">
              <s-text color="subdued">
                The label, mobile heading, icon, and color shown for each stage of a return. Use {"{days}"} for the
                return window length.
              </s-text>
              {RETURN_STATUS_CARDS.map(({ key, name }) => {
                const isOpen = openStatusKey === key
                const style = form.returnLifecycleStyles[key]
                return (
                  <s-box key={key} padding="base" border="base" borderRadius="base">
                    <s-stack direction="block" gap="small">
                      <s-stack direction="inline" gap="small-300" alignItems="center">
                        <s-button onClick={() => toggleStatusOpen(key)}>{isOpen ? "Collapse" : "Expand"}</s-button>
                        <s-text>{name} — "{style.label}"</s-text>
                      </s-stack>
                      {isOpen && (
                        <>
                          <s-text-field
                            label="Filter/badge label"
                            value={style.label}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setStatusStyle(key, "label", e.target.value)}
                          ></s-text-field>
                          <s-text-field
                            label="Mobile accordion heading"
                            value={style.heading}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setStatusStyle(key, "heading", e.target.value)}
                          ></s-text-field>
                          <s-select
                            label="Icon"
                            value={style.icon}
                            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setStatusStyle(key, "icon", e.target.value)}
                          >
                            {STATUS_ICON_NAMES.map((iconName) => (
                              <s-option key={iconName} value={iconName}>{iconName}</s-option>
                            ))}
                          </s-select>
                          <s-text-field
                            label="Color (optional — leave blank for the portal's default color)"
                            value={style.color}
                            placeholder="#4F46E5"
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setStatusStyle(key, "color", e.target.value)}
                          ></s-text-field>
                          {key === "returnRequested" && (
                            <s-text-area label="Sentence" value={form.returnLifecycleMessages.returnRequested} rows={2}
                              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setReturnLifecycleMessage("returnRequested", e.target.value)}></s-text-area>
                          )}
                          {key === "returnInProgress" && (
                            <s-text-area label="Sentence" value={form.returnLifecycleMessages.returnInProgress} rows={2}
                              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setReturnLifecycleMessage("returnInProgress", e.target.value)}></s-text-area>
                          )}
                          {key === "returnDeclined" && (
                            <s-paragraph tone="subdued">
                              This status shows the actual decline reason from Shopify, verbatim — not a fixed
                              sentence, so there's no message to edit here.
                            </s-paragraph>
                          )}
                          {key === "returnCanceled" && (
                            <s-text-area label="Sentence" value={form.returnLifecycleMessages.returnCanceled} rows={2}
                              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setReturnLifecycleMessage("returnCanceled", e.target.value)}></s-text-area>
                          )}
                          {key === "returnCompleted" && (
                            <s-text-area label="Sentence" value={form.returnLifecycleMessages.returnCompleted} rows={2}
                              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setReturnLifecycleMessage("returnCompleted", e.target.value)}></s-text-area>
                          )}
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

          <s-section heading="Refund">
            <s-stack direction="block" gap="base">
              <s-text color="subdued">
                Shown as a small extra fact next to the return status, when applicable. No label is shown when
                nothing has been refunded.
              </s-text>
              <s-text-field label="Partially refunded" value={form.refundStatusLabels.partiallyRefunded}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setRefundStatusLabel("partiallyRefunded", e.target.value)}></s-text-field>
              <s-text-field label="Refunded" value={form.refundStatusLabels.refunded}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setRefundStatusLabel("refunded", e.target.value)}></s-text-field>
              {errors.refundStatusLabels && <s-paragraph tone="critical">{errors.refundStatusLabels}</s-paragraph>}
            </s-stack>
          </s-section>
```

- [ ] **Step 5: Update `TAB_FIELDS.table`**

Find:
```ts
    "productImageLinksEnabled", "ineligibleStatusMessages", "ineligibleStatusStyles",
```
Replace with:
```ts
    "productImageLinksEnabled", "returnLifecycleMessages", "returnLifecycleStyles", "refundStatusLabels",
```

- [ ] **Step 6: Verify**

Run: `npx tsc --noEmit`
Expected: zero errors (this is the last file in the interdependent chain from Task 5-8's Global Constraints note).

- [ ] **Step 7: Commit**

```bash
git add components/app-settings/settings-form.tsx
git commit -m "feat: reshape Settings statuses UI to 6 cards + reasons + refund"
```

---

### Task 9: `app/api/demo-orders/route.ts` — update demo fixture data

**Files:**
- Modify: `app/api/demo-orders/route.ts`

**Interfaces:**
- Consumes: nothing typed (per Global Constraints, this file has no static type dependency) — purely a data-value update so the `/demo` marketing page renders correctly against the new lookup functions.

- [ ] **Step 1: Map old string literals to new ones**

Run: `grep -n 'returnStatus: "' app/api/demo-orders/route.ts`

For every line, replace the `returnStatus`/`returnReason` pair per this mapping (add `notReturnableReason`/`shippingStage`/`refundStatus` fields where relevant, matching the property names added to `LineItem` in Task 6):

| Old | New |
|---|---|
| `returnStatus: "Confirmed", returnReason: "This item hasn't been dispatched yet — check back once it ships."` | `returnStatus: "notReturnable", notReturnableReason: "notDelivered", shippingStage: "confirmed", returnReason: "We're preparing these items for shipping."` |
| `returnStatus: "On its way", returnReason: "Your parcel is on its way. Your return window starts once it's delivered."` | `returnStatus: "notReturnable", notReturnableReason: "notDelivered", shippingStage: "onItsWay", returnReason: "These items are on their way."` |
| `returnStatus: "On its way", returnReason: "Your parcel is out for delivery. Your return window starts once it's delivered."` (line 288) | `returnStatus: "notReturnable", notReturnableReason: "notDelivered", shippingStage: "outForDelivery", returnReason: "These items are out for delivery today."` |
| `returnStatus: "On its way", returnReason: "A delivery attempt was made — check with the courier for redelivery."` (line 310) | `returnStatus: "notReturnable", notReturnableReason: "notDelivered", shippingStage: "attemptedDelivery", returnReason: "A delivery attempt was made for these items. You'll be able to request a return once they've been delivered."` |
| `returnStatus: "Passed the return window", returnReason: "The 30-day return window closed on this item."` | `returnStatus: "notReturnable", notReturnableReason: "outsideWindow", returnReason: "The return window has expired for these items."` |
| `returnStatus: "Cancelled"` (order-level cancellation, line 177/396) | leave exactly as-is — `"Cancelled"` is unchanged per Global Constraints |
| `returnStatus: "Eligible"` | leave exactly as-is |

- [ ] **Step 2: Verify visually**

Since this route has no automated test, verify manually:

Run: `npm run dev &` then in a browser visit `http://localhost:3000/demo`, open a few orders showing previously-"On its way"/"Confirmed"/"Passed the return window" items, and confirm the ineligible table renders a status badge and readable sentence (not blank/undefined) for each.

Kill the dev server after checking (`kill %1` or close the terminal job).

- [ ] **Step 3: Commit**

```bash
git add app/api/demo-orders/route.ts
git commit -m "feat: update demo fixture data for the 6-status lifecycle model"
```

---

### Task 10: Test fixture updates

**Files:**
- Modify: `lib/__tests__/branding-validation.test.ts`
- Modify: `lib/__tests__/tenant.test.ts`

**Interfaces:**
- Consumes: the new types from Tasks 1-3.

- [ ] **Step 1: `lib/__tests__/branding-validation.test.ts`**

Replace the `ineligibleStatusMessages: {...}` and `ineligibleStatusStyles: {...}` blocks in the `VALID` fixture with the new shape (reuse the exact default values from Task 1, Step 4):

```ts
  returnLifecycleStyles: {
    notReturnable:    { label: "Not returnable",     heading: "Not returnable",                     icon: "Lock",         color: "" },
    returnRequested:  { label: "Return requested",   heading: "We've received your return request", icon: "Eye",          color: "" },
    returnInProgress: { label: "Return in progress", heading: "Your return is in progress",          icon: "RotateCcw",    color: "" },
    returnDeclined:   { label: "Return declined",    heading: "Your return request was declined",    icon: "CircleX",      color: "" },
    returnCanceled:   { label: "Return canceled",    heading: "This return was canceled",             icon: "XCircle",      color: "" },
    returnCompleted:  { label: "Return completed",   heading: "This return is complete",              icon: "CheckCircle2", color: "" },
  },
  returnLifecycleMessages: {
    shippingConfirmed:         "We're preparing these items for shipping.",
    shippingOnItsWay:          "These items are on their way.",
    shippingOutForDelivery:    "These items are out for delivery today.",
    shippingAttemptedDelivery: "A delivery attempt was made for these items.",
    outsideWindow:              "The return window has expired for these items. It closed on {closedDate}.",
    outsideWindowNoDate:        "The return window has expired for these items.",
    finalSale:                  "This item is marked as final sale and cannot be returned.",
    otherNotReturnable:         "These items aren't eligible for return.",
    returnRequested:            "We've received your return request.",
    returnInProgress:           "Your return is in progress.",
    returnCanceled:             "This return request was canceled.",
    returnCompleted:            "These items have already been returned.",
  },
  refundStatusLabels: {
    notRefunded: "",
    partiallyRefunded: "Partially refunded",
    refunded: "Refunded",
  },
```

Update the existing validation-error tests that reference `ineligibleStatusMessages`/`ineligibleStatusStyles` (find via `grep -n "ineligibleStatus" lib/__tests__/branding-validation.test.ts`) to use `returnLifecycleMessages`/`returnLifecycleStyles` and the new key names (e.g. `returned` → `returnCompleted`). Add one new test:

```ts
  it("rejects empty refund status labels", () => {
    const result = validateBrandingInput({
      ...VALID,
      refundStatusLabels: { ...VALID.refundStatusLabels, refunded: "" },
    });
    expect(result.valid).toBe(false);
    expect(result.errors.refundStatusLabels).toBeDefined();
  });
```

- [ ] **Step 2: `lib/__tests__/tenant.test.ts`**

Update the "defaults" test's assertions (find via `grep -n "ineligibleStatus" lib/__tests__/tenant.test.ts`):
```ts
    expect(t?.branding.ineligibleStatusStyles.confirmed.label).toBe("Not yet shipped");
    expect(t?.branding.ineligibleStatusStyles.returnDeclined.icon).toBe("CircleX");
```
Replace with:
```ts
    expect(t?.branding.returnLifecycleStyles.notReturnable.label).toBe("Not returnable");
    expect(t?.branding.returnLifecycleStyles.returnDeclined.icon).toBe("CircleX");
    expect(t?.branding.refundStatusLabels.notRefunded).toBe("");
```

Update the round-trip test's `branding: {...}` fixture (the `ineligibleStatusMessages`/`ineligibleStatusStyles` blocks) with the new shape, same pattern as Step 1's `VALID` fixture, using different sample values than the defaults (to prove round-tripping, matching the file's existing convention — check the existing block for the pattern of using distinct test values like `"Preparing for shipping."` rather than copying real defaults verbatim).

Update the assertion for `ineligibleStatusStyles.passedReturnWindow`:
```ts
    expect(t?.branding.ineligibleStatusStyles.passedReturnWindow).toEqual({ label: "Window closed", heading: "Window expired", icon: "Lock", color: "#4F46E5" });
```
to reference `returnLifecycleStyles.notReturnable` instead (the closest equivalent key in the new shape), keeping the same test values.

- [ ] **Step 3: Verify**

Run: `npx vitest run`
Expected: all tests pass (should be back to the same total count as before this plan, ± the 1 new refund-label test added in Step 1).

- [ ] **Step 4: Commit**

```bash
git add lib/__tests__/branding-validation.test.ts lib/__tests__/tenant.test.ts
git commit -m "test: update fixtures for the 6-status lifecycle model"
```

---

### Task 11: Focused tests for the `get-orders/route.ts` mapping

**Files:**
- Create: `lib/__tests__/get-orders-status-mapping.test.ts`

**Interfaces:**
- Consumes: `statusFromUndeliveredDelivery` from `app/api/get-orders/route.ts` — this function is not currently exported. Export it (add `export` to its declaration) as part of this task, since it's the highest-value, most self-contained piece of the mapping logic to unit test directly (the rest of the branch chain lives inline in the route handler and isn't easily unit-testable without a full request mock — covered instead by the manual `/demo` page check in Task 9 and the code-reading verification in Task 5, Step 5).

- [ ] **Step 1: Export `statusFromUndeliveredDelivery` and `SHIPPING_STAGE_REASON`**

In `app/api/get-orders/route.ts`, find:
```ts
function statusFromUndeliveredDelivery(
```
Change to:
```ts
export function statusFromUndeliveredDelivery(
```

Find:
```ts
const SHIPPING_STAGE_REASON: Record<ShippingStage, string> = {
```
Change to:
```ts
export const SHIPPING_STAGE_REASON: Record<ShippingStage, string> = {
```
Also add `export` to the `type ShippingStage = ...` declaration just above it.

- [ ] **Step 2: Write the test file**

```ts
import { describe, it, expect, vi } from "vitest";

vi.mock("@/lib/auth", () => ({ validateSession: vi.fn(), parseCookies: vi.fn() }));
vi.mock("@/lib/apps-returns-session", () => ({ validateAppsReturnsSession: vi.fn(), APPS_RETURNS_COOKIE_NAME: "x" }));
vi.mock("@/lib/shopify", () => ({ shopifyAdmin: vi.fn(), shopifyAdminRest: vi.fn() }));
vi.mock("@/lib/customerAccount", () => ({ getOrderReturnInfo: vi.fn() }));
vi.mock("@/lib/returnEligibility", () => ({
  getAdminReturnableInfo: vi.fn(), fetchRemainingLineItems: vi.fn(),
  fetchRemainingReturns: vi.fn(), fetchRemainingFulfillmentLineItems: vi.fn(),
}));
vi.mock("@/lib/request-shop", () => ({ getRequestShop: vi.fn() }));
vi.mock("@/lib/cors", () => ({ withCors: (r: unknown) => r, corsPreflight: vi.fn() }));
vi.mock("@/lib/tenant", () => ({ getTenant: vi.fn() }));

import { statusFromUndeliveredDelivery, SHIPPING_STAGE_REASON } from "@/app/api/get-orders/route";

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

- [ ] **Step 3: Run and verify**

Run: `npx vitest run lib/__tests__/get-orders-status-mapping.test.ts -v`
Expected: all 6 tests pass.

- [ ] **Step 4: Commit**

```bash
git add app/api/get-orders/route.ts lib/__tests__/get-orders-status-mapping.test.ts
git commit -m "test: cover the shipping-stage status mapping in get-orders"
```

---

### Task 12: Full verify, deploy, ship

**Files:** none (verification only)

- [ ] **Step 1: Full verify cycle**

```bash
npx tsc --noEmit
```
Expected: zero errors.

```bash
npx vitest run
```
Expected: all tests pass.

```bash
rm -rf .next && npm run build
```
Expected: build succeeds, no new warnings beyond the existing Redis-env warnings already present in this project's builds.

- [ ] **Step 2: Manual smoke check**

Run: `npm run dev &`, open the merchant Settings page locally, confirm the "Return status" section shows exactly 6 cards, "Not returnable reasons" shows 8 sentence fields, "Refund" shows 2 fields — and that saving doesn't error. Open an order in the customer portal with a mix of statuses (via `/demo`, from Task 9) and confirm the filter button shows at most 6 checkboxes and the mobile accordion renders without a blank/undefined header or sentence anywhere. Kill the dev server after.

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

Per spec Section 7: tell the user that any status label/heading/icon/color/message they'd previously customized on the old 14-status Settings page has reset to the new 6-status defaults, and that they should re-check Settings → Returns → Return status / Not returnable reasons / Refund after this deploy and re-enter anything they'd customized before.
