# Return Status Simplification — Design

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement the plan derived from this spec.

**Goal:** Replace the flat 14-value `ReturnStatus` used for ineligible line items with three independent, composable facts — a 6-value return lifecycle status, a 3-value refund status, and a reason (for non-returnable items) — so the model matches Shopify's own `ReturnStatus`/`ReturnDeclineReason`/`NonReturnableReason` enums instead of an app-invented flat taxonomy.

**Architecture:** The eligibility computation in `app/api/get-orders/route.ts` currently collapses fulfillment state, Shopify return state, refund state, and eligibility rules into one `returnStatus` string per line item. It will instead output three fields per line item — `returnStatus` (6 values), `notReturnableReason` (+ a shipping-stage sub-detail used only for sentence selection), and `refundStatus` (3 values) — computed from the exact same underlying Shopify signals it already reads. `components/dashboard-client.tsx`'s label/heading/icon/message/filter functions are rewritten to key off the new fields. Settings customization (`components/app-settings/settings-form.tsx`) reshapes from 14 status cards to 6 lifecycle cards + 1 reasons section + 1 refund-labels section.

**Tech Stack:** Next.js App Router, TypeScript, Redis (Upstash) for tenant storage, Vitest for tests. No new dependencies.

## Global Constraints

- Order-level cancellation (`order.cancelledAt`, rendered as line-item `returnStatus === "Cancelled"` today) is NOT part of this model and is unaffected by this work — it keeps its current separate handling everywhere it appears.
- The "Eligible" branch of the existing `ReturnStatus` type (used for returnable items, separate from all 14 ineligible values) is NOT part of this work and is unaffected.
- `eligibleLabel` / `ineligibleLabel` (the tab-level Settings fields) are NOT part of this work and are unaffected.
- Guest lookup, custom domains, and all other features discussed but not part of this status model are explicitly out of scope.
- Every new default sentence must avoid invented carrier-style operational copy (e.g. "please rebook or collect") in favor of Shopify-aligned return-eligibility framing, per the exact replacement text specified in Section 5 below.
- The one real tenant currently using the old 14-key `ineligibleStatusStyles`/`ineligibleStatusMessages` shape (iblazevape.co.uk, in production) must not lose any customization it has made that has an unambiguous mapping to the new shape — see Section 7 (Migration).

---

## Section 1 — New Types

Add to `lib/tenant-defaults.ts`, replacing the existing `IneligibleStatusKey` / `IneligibleStatusStyle` / `IneligibleStatusStyles` / `IneligibleStatusMessages` types entirely (not additively — this is a breaking reshape of those three types):

```ts
/** The 6-value return lifecycle status for a non-Eligible line item — maps
 * directly onto Shopify's own Return.status values (REQUESTED, OPEN,
 * DECLINED, CANCELED, CLOSED), plus "Not returnable" for items that never
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
 * OTHER — RETURNED is excluded here because that case now maps directly to
 * returnCompleted, not to a "not returnable" reason). */
export type NotReturnableReason = "notDelivered" | "outsideWindow" | "finalSale" | "other";

export const NOT_RETURNABLE_REASONS: NotReturnableReason[] = [
  "notDelivered", "outsideWindow", "finalSale", "other",
];

/** Independent refund fact — can coexist with ANY return lifecycle status,
 * including a line item that was refunded directly with no return ever
 * created (Shopify allows this; see Section 3). */
export type RefundStatus = "notRefunded" | "partiallyRefunded" | "refunded";

/** Filter/badge label, mobile accordion heading, icon, and color for one
 * return lifecycle status. Same shape as before, now keyed by 6 values
 * instead of 14. `color` is a hex value or "" (empty = the portal's
 * default theme-aware text color). */
export type ReturnLifecycleStyle = { label: string; heading: string; icon: string; color: string };
export type ReturnLifecycleStyles = Record<ReturnLifecycleStatus, ReturnLifecycleStyle>;

/**
 * Customer-facing sentences. Two groups:
 *  - One sentence per non-"notDelivered" reason (finalSale, outsideWindow
 *    with/without a computable closed date, other).
 *  - One sentence per SHIPPING STAGE under "notDelivered" — the lifecycle
 *    status and reason are both just "notReturnable"/"notDelivered" for
 *    all four of these, but the sentence still needs to say which stage
 *    it's at (this is Option A: fewer badges, same sentence granularity).
 *  - One sentence each for returnRequested, returnInProgress,
 *    returnCompleted (returnDeclined uses the real Shopify decline reason
 *    text, unchanged from today — no static sentence here).
 *  - One sentence for returnCanceled.
 * Supports {days} (merchant's return window) and {closedDate} (outsideWindow
 * only) placeholder tokens, same as today.
 */
export type ReturnLifecycleMessages = {
  // "notReturnable" + "notDelivered" reason, by shipping stage:
  shippingConfirmed: string;
  shippingOnItsWay: string;
  shippingOutForDelivery: string;
  shippingAttemptedDelivery: string;
  // "notReturnable" + other reasons:
  outsideWindow: string;
  outsideWindowNoDate: string;
  finalSale: string;
  otherNotReturnable: string;
  // other lifecycle statuses:
  returnRequested: string;
  returnInProgress: string;
  returnCanceled: string;
  returnCompleted: string;
};

/** Refund status has no icon/color/heading — it's always shown as a small
 * supporting fact next to the lifecycle status, never as its own badge. */
export type RefundStatusLabels = Record<RefundStatus, string>;
```

`TenantBranding` gains/loses fields:
- **Remove:** `ineligibleStatusStyles: IneligibleStatusStyles`, `ineligibleStatusMessages: IneligibleStatusMessages`
- **Add:** `returnLifecycleStyles: ReturnLifecycleStyles`, `returnLifecycleMessages: ReturnLifecycleMessages`, `refundStatusLabels: RefundStatusLabels`

### Defaults (`DEFAULT_TENANT_FIELDS.branding`)

```ts
returnLifecycleStyles: {
  notReturnable:   { label: "Not returnable",     heading: "Not returnable",           icon: "Lock",       color: "" },
  returnRequested: { label: "Return requested",   heading: "We've received your return request", icon: "Eye",  color: "" },
  returnInProgress:{ label: "Return in progress", heading: "Your return is in progress", icon: "RotateCcw", color: "" },
  returnDeclined:  { label: "Return declined",    heading: "Your return request was declined", icon: "CircleX", color: "" },
  returnCanceled:  { label: "Return canceled",    heading: "This return was canceled", icon: "XCircle",   color: "" },
  returnCompleted: { label: "Return completed",   heading: "This return is complete",  icon: "CheckCircle2", color: "" },
},
returnLifecycleMessages: {
  shippingConfirmed:        "We're preparing these items for shipping. Your return window starts on delivery and closes {days} days later.",
  shippingOnItsWay:         "These items are on their way. Your return window starts on delivery and closes {days} days later.",
  shippingOutForDelivery:   "These items are out for delivery today. Your return window starts on delivery and closes {days} days later.",
  shippingAttemptedDelivery:"A delivery attempt was made for these items. You'll be able to request a return once they've been delivered.",
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

Note: `shippingAttemptedDelivery` is the specific copy fix agreed on — replaces today's "Please rebook or collect — your return window starts once delivered." with "You'll be able to request a return once they've been delivered." (drops the carrier-support-style instruction, keeps it framed as return eligibility).

`notRefunded` label is `""` deliberately — a line item that hasn't been refunded shows no refund fact at all in the UI (nothing to say), whereas `partiallyRefunded`/`refunded` do show supporting text.

## Section 2 — `lib/branding-validation.ts` mirror

Mirror all of the above as `*Input` types (same pattern as the current `IneligibleStatusStylesInput`/`IneligibleStatusMessagesInput`), add to `BrandingInput`, remove the old two fields. Validation:
- Every `returnLifecycleStyles[key].label` and `.heading` non-empty, `label` ≤ 30 chars (reuse `STORE_LINK_LABEL_MAX_LENGTH`), `heading` ≤ 100 chars (reuse `POLICY_HEADING_MAX_LENGTH`).
- Every `returnLifecycleStyles[key].color` blank or valid hex (reuse `HEX_COLOR_RE`).
- Every `returnLifecycleMessages` value non-empty, ≤ 300 chars (reuse `POLICY_FOOTER_NOTE_MAX_LENGTH`).
- `refundStatusLabels.notRefunded` may be empty (that's its default); `partiallyRefunded`/`refunded` must be non-empty, ≤ 30 chars.

## Section 3 — `app/api/get-orders/route.ts` (eligibility computation)

This is the highest-risk file to change — it's the core business logic deciding what a customer can/can't return.

**Current shape (per line item, ~line 627 onward):** one `returnStatus: string` + one `returnReason: string`, decided by a long if/else chain reading `order.cancelledAt`, `effectiveEligibleWindowed`, `delivery.*`, and `ri.nonReturnableItems[item.id]` (`reasonCode` values: `UNFULFILLED`, `RETURN_WINDOW_EXPIRED`, `FINAL_SALE`, `RETURNED`, unrecognized/`OTHER`).

**New shape:** three fields — `returnStatus: ReturnLifecycleStatus`, `notReturnableReason: NotReturnableReason | null` (+ a `shippingStage: "confirmed" | "onItsWay" | "outForDelivery" | "attemptedDelivery" | null` used only to pick the right `shipping*` sentence when `notReturnableReason === "notDelivered"`), and `refundStatus: RefundStatus`.

Mapping from the existing branches (exact 1:1, no new business logic — this is a relabeling of existing decisions, not new eligibility rules):

| Existing branch (today) | New `returnStatus` | New `notReturnableReason` | New `shippingStage` |
|---|---|---|---|
| `reasonCodes.includes("UNFULFILLED")` → `statusFromUndeliveredDelivery(...)` (produces Confirmed/On its way/Out for delivery/Attempted delivery) | `notReturnable` | `notDelivered` | whichever of the 4 `statusFromUndeliveredDelivery` already returns, renamed |
| `reasonCodes.includes("RETURN_WINDOW_EXPIRED")` (delivered case) → `"Passed the return window"` | `notReturnable` | `outsideWindow` | `null` |
| `reasonCodes.includes("FINAL_SALE")` → `"Final sale"` | `notReturnable` | `finalSale` | `null` |
| `reasonCodes.includes("RETURNED")` → `"Returned"` | `returnCompleted` | `null` | `null` |
| unrecognized code → `"Not eligible"` | `notReturnable` | `other` | `null` |
| Return object exists, `bestReturn.status === "DECLINED"` (today: `"Return declined"`) | `returnDeclined` | `null` | `null` |
| `bestReturn.status === "REQUESTED"` (today: `"Return requested"`) | `returnRequested` | `null` | `null` |
| `bestReturn.status === "OPEN"` (today: `"Return in progress"`) | `returnInProgress` | `null` | `null` |
| `bestReturn.status === "CANCELED"` (today: `"Return cancelled"`) | `returnCanceled` | `null` | `null` |
| `bestReturn.status === "CLOSED"` (today: `"Returned"`) | `returnCompleted` | `null` | `null` |

**Refund** (today: a separate `DisplayItem` with `returnStatus: "Refunded"`, built from `item.refundedQuantity`): becomes `refundStatus` computed independently for every line item — `refunded` if `item.refundedQuantity >= item.quantity` for the relevant split, `partiallyRefunded` if `0 < item.refundedQuantity < item.quantity`, else `notRefunded`. The existing `directRefundQty` branch in `buildIneligibleDisplayItems` (dashboard-client.tsx, not this file) that creates a standalone "Refunded" row is removed — instead, refund quantity that doesn't correspond to any other tracked lifecycle status produces a row with `returnStatus: null` (no lifecycle status at all) and `refundStatus: "refunded"`, per Section 4's row-rendering rule.

Order-level `"Cancelled"` (today, `order.cancelledAt` branch at line 631) is unchanged — stays a separate concept, not part of `ReturnLifecycleStatus`.

## Section 4 — `components/dashboard-client.tsx`

**`DisplayItem` / `LineItem` types:** `returnStatus: ReturnStatus` (today) becomes `returnStatus: ReturnLifecycleStatus | null` (null only for the standalone-refund edge case above) + `notReturnableReason: NotReturnableReason | null` + `shippingStage: ShippingStage | null` + `refundStatus: RefundStatus`.

**Functions rewritten** (same responsibilities, new key):
- `getIneligibleCoarseLabel(status, styles)` → keys off `ReturnLifecycleStatus` directly (6 entries in the lookup instead of 14 — no more `STATUS_STYLE_KEY_MAP` grouping table needed, since it's already a direct 1:1 now).
- `getIneligibleAccordionTitle(status, styles)` → same simplification.
- `getReturnStatusIcon(status, styles)` → same simplification.
- `getIneligibleGroupMessage(item, order, returnWindowDays, messages)` → when `item.returnStatus === "notReturnable"`, branches on `item.notReturnableReason` (and `item.shippingStage` when reason is `notDelivered`) to pick the right sentence from the 8 `notReturnable`-family message fields; other statuses map 1:1 to their single message field as before. `returnDeclined` keeps today's dynamic decline-reason resolution unchanged (`resolveDeclineMessage`, `DEFAULT_DECLINE_FALLBACK` — untouched by this spec).
- `getIneligibleFilterOptions(items, styles)` → unchanged logic, now groups by 6 possible labels instead of up to 11.
- `getIneligibleGroupKey(item, order, returnWindowDays)` → groups by `returnStatus` + `notReturnableReason` + `shippingStage` (so e.g. two different shipping-stage items don't get merged into one row, even though they'd share the same "Not returnable" badge) + refund status where relevant.
- **New:** a small refund-fact renderer — in `IneligibleGroupSummary`, when `item.refundStatus !== "notRefunded"`, render `refundStatusLabels[item.refundStatus]` as a small trailing fact next to the count (both desktop row and mobile accordion header), matching the existing count's visual weight (muted, small text) rather than a new badge/icon.
- **Row with no lifecycle status** (the standalone-refund edge case): `getIneligibleCoarseLabel`/`getIneligibleAccordionTitle`/`getReturnStatusIcon` fall back to rendering the refund fact as the primary label/heading when `item.returnStatus === null` (e.g. label = "Refunded", using the refund icon/color if set, or a neutral default icon if not — reuse `BadgeCheck` from today's Refunded icon default).

**Dead code removed as part of this work** (found during the earlier investigation, unrelated to the split but touched by this refactor): `buildNarrativeOrderSummary` and its `narrativeSummary` call site in `OrderDetail` — computed but never rendered. Confirm removal doesn't affect any other consumer (checked: none) before deleting.

**`OrderDetailBranding` type** and its destructuring: `ineligibleStatusMessages`/`ineligibleStatusStyles` fields renamed to `returnLifecycleMessages`/`returnLifecycleStyles`, `refundStatusLabels` added.

## Section 5 — Settings (`components/app-settings/settings-form.tsx`)

Replace the current "Statuses" section (14 collapsible cards) with three sections under the `returns` tab:

1. **"Return status"** — 6 collapsible cards (same per-card shape as today: label, heading, icon, color), one per `ReturnLifecycleStatus`.
2. **"Not returnable reasons"** — a flat list (no collapse needed, only 4 logical groups) of sentence fields: Final sale, Outside the return window (+ no-date variant), Other, and a "Not delivered yet" sub-group with the 4 shipping-stage sentences.
3. **"Refund"** — 2 text fields (`partiallyRefunded`, `refunded` labels; `notRefunded` has no field since it's always blank/hidden).

`TAB_FIELDS.returns` gains `returnLifecycleStyles`, `returnLifecycleMessages`, `refundStatusLabels`, loses `ineligibleStatusStyles`, `ineligibleStatusMessages`.

`openStatusKey` state (added in the accordion-single-open fix) is retyped from `IneligibleStatusKeyInput` to `ReturnLifecycleStatus`.

## Section 6 — `app/api/app/branding/route.ts`

Same wiring pattern as today's `isIneligibleStatusMessages`/`isIneligibleStatusStyles` type guards — replace with guards for the new 3 fields, remove the old 2.

## Section 7 — Migration (existing tenant data)

`iblazevape.co.uk` is the one real tenant with data in the old shape today. `getTenant` (lib/tenant.ts) already merges stored branding with `DEFAULT_TENANT_FIELDS.branding` for any missing keys (confirmed by the existing "merges old branding JSON with new field defaults" test) — so simply removing the old fields and adding the new ones means the real tenant transparently falls back to new defaults for everything, silently dropping any customization they'd made to the old 14-status labels/messages.

Given this tenant's actual customization is unknown without inspecting production Redis, and the mapping from 14 old keys to 6 new ones is not always 1:1 (e.g. 4 old style entries collapse into 1 new "notReturnable" entry — which of the 4 old labels should "win"?), automatic migration is not safe to fully automate. Approach: **no automatic migration** — the real tenant's custom labels/messages reset to new defaults on deploy, same as any brand-new tenant. Before deploying, check whether this tenant has actually customized any of the 14 status cards (via the merchant-admin Settings UI or a direct Redis read); if so, flag the specific customized values back to the user so they can manually re-enter equivalent text in the new 6-card + reasons UI post-deploy. This is a one-time, one-tenant, low-cost manual step — not worth building a heuristic auto-migration for a single tenant.

## Section 8 — Testing

- `lib/__tests__/branding-validation.test.ts`, `lib/__tests__/tenant.test.ts`: fixtures updated to the new 3-field shape (replacing the old 2-field fixtures), same coverage pattern as today (valid input accepted, empty label/heading/message rejected, invalid hex rejected).
- New test file `lib/__tests__/status-icons.test.ts` — unaffected (icon lookup helper, no shape change).
- New focused tests for the `get-orders/route.ts` mapping table in Section 3 — for each of the 10 old branches, assert the new 3-field output matches the mapping table exactly. This is the highest-value test coverage in this spec, since it's a straight relabeling with real risk of a copy-paste mismatch.
- Existing `dashboard-stats.test.ts`, `returns-management.test.ts` — check for any fixture data using old `returnStatus` string literals (e.g. `"Passed the return window"`) that need updating to the new values.

## Out of scope (explicitly)

- Rewriting sentence *content* beyond the one agreed copy fix (`shippingAttemptedDelivery`) — all other sentences carry over verbatim, just reorganized under fewer top-level entries.
- Any change to `eligibleLabel`/`ineligibleLabel`, guest lookup, custom domains, or any other feature discussed in this session that isn't part of this status model.
- Building an automated migration tool for the one real tenant's existing customizations (Section 7 covers the manual approach instead).
- Icons/colors for individual "Not returnable" reasons or shipping stages — those stay as plain text under the single "Not returnable" badge's icon/color (Option A).
