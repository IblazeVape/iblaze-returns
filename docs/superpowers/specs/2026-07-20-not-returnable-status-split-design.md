# Not-Returnable Status Split — Design

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement the plan derived from this spec.

**Goal:** Split the single `notReturnable` return-lifecycle status (from the return-status-simplification epic shipped in commit `1233b18`) into two statuses — `awaitingDelivery` ("still coming, nothing's wrong") and `returnWindowClosed` ("permanently done, nothing pending") — so the filter dropdown and status badges stop conflating "hasn't happened yet" with "will never happen," which was confusing because both currently sit under one umbrella label that reads like a verdict rather than a status.

**Architecture:** This is a pure re-bucketing of data that already exists, not new business logic. Every code path that currently assigns `returnStatus = "notReturnable"` already carries enough information (`notReturnableReason`, `shippingStage`) to know which of the two new statuses it should become instead. The 12 customizable sentences barely change — they move from being organized under one Settings card + a flat "reasons" section to being split under two Settings cards.

**Tech Stack:** Same as the parent epic — Next.js App Router, TypeScript, Redis (Upstash), Vitest. No new dependencies.

## Global Constraints

- This spec builds directly on `docs/superpowers/specs/2026-07-19-return-status-simplification-design.md` and its implementation (`docs/superpowers/plans/2026-07-19-return-status-simplification-plan.md`, commits `adef0ce..1233b18`). All constraints from that spec still apply (no new eligibility business logic, order-level `Cancelled` and the `Eligible` branch untouched, `returnDeclined`'s dynamic decline-reason resolution untouched).
- The other 5 statuses (`returnRequested`, `returnInProgress`, `returnDeclined`, `returnCanceled`, `returnCompleted`) are NOT touched by this spec — no renaming, no re-bucketing, no message changes.
- The direct-refund-only fix from the parent epic's final review (commit `1233b18` — a refunded-with-no-return item shows `returnCompleted` + a correct `returnReason` + `refundStatus: "refunded"`) is unaffected by this split; it has nothing to do with `notReturnable`.
- Every new status assignment must be a straight relabeling of an existing decision — every place that currently sets `notReturnableReason` already determines exactly which of the two new statuses applies (`notDelivered` → `awaitingDelivery`; `outsideWindow`/`finalSale`/`other` → `returnWindowClosed`). No new conditionals beyond that mapping.
- The Settings customization data (label/heading/icon/color/sentences) for the old single `notReturnable` status has no clean 1:1 mapping to two new statuses — same situation as the parent epic's Section 7 (migration): no automated migration, defaults apply to both new statuses, any existing customization is lost and must be manually re-entered post-deploy. This is acceptable per the same reasoning as the parent epic (single real tenant, low-cost manual step).

---

## Data model

```ts
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

export type ShippingStage = "confirmed" | "onItsWay" | "outForDelivery" | "attemptedDelivery"; // unchanged

/** Only meaningful when status = returnWindowClosed. Replaces the old
 * NotReturnableReason type — "notDelivered" is removed since that case is
 * now its own full status (awaitingDelivery) rather than a reason. */
export type ReturnClosedReason = "outsideWindow" | "finalSale" | "other";
```

`ReturnLifecycleMessages` keeps the exact same 12 fields as today — no renaming:

```ts
export type ReturnLifecycleMessages = {
  shippingConfirmed: string;         // awaitingDelivery
  shippingOnItsWay: string;          // awaitingDelivery
  shippingOutForDelivery: string;    // awaitingDelivery
  shippingAttemptedDelivery: string; // awaitingDelivery
  outsideWindow: string;             // returnWindowClosed
  outsideWindowNoDate: string;       // returnWindowClosed
  finalSale: string;                 // returnWindowClosed
  otherNotReturnable: string;        // returnWindowClosed
  returnRequested: string;           // unchanged
  returnInProgress: string;          // unchanged
  returnCanceled: string;            // unchanged
  returnCompleted: string;           // unchanged
};
```

`ReturnLifecycleStyles` becomes `Record<ReturnLifecycleStatus, ReturnLifecycleStyle>` with 7 keys instead of 6 — `notReturnable`'s single style entry is replaced by two: `awaitingDelivery` and `returnWindowClosed`, each with its own label/heading/icon/color.

### Defaults for the two new style entries

```ts
awaitingDelivery:   { label: "Awaiting delivery",    heading: "Awaiting delivery",     icon: "Truck", color: "" },
returnWindowClosed: { label: "Return window closed", heading: "Return window closed",  icon: "Lock",  color: "" },
```

(The removed `notReturnable` entry's old defaults — label "Not returnable", icon "Lock" — are dropped; `returnWindowClosed` inherits the "Lock" icon since it's the closer semantic match of the two.)

## Code changes

### `app/api/get-orders/route.ts`

Every branch that currently does:
```ts
returnStatus = "notReturnable"; notReturnableReason = "notDelivered"; shippingStage = <stage>;
```
becomes:
```ts
returnStatus = "awaitingDelivery"; shippingStage = <stage>;
```

Every branch that currently does:
```ts
returnStatus = "notReturnable"; notReturnableReason = "outsideWindow" | "finalSale" | "other";
```
becomes:
```ts
returnStatus = "returnWindowClosed"; closedReason = "outsideWindow" | "finalSale" | "other";
```

(Field renamed from `notReturnableReason` to `closedReason` to reflect its narrower scope — only meaningful for one status now, not four reasons under one umbrella status.)

This applies to all 4 branches identified in the parent epic's plan (`statusFromUndeliveredDelivery`, the shipping-shortcut branch, the `ri.nonReturnableItems` branch, the zeroed-out-item branch, the manual-fallback branch) — same call sites as before, just emitting one of two statuses instead of one status + a reason field.

### `components/dashboard-client.tsx`

- `ReturnStatus` type: 7 values instead of 6 (drop `notReturnable`, add `awaitingDelivery` + `returnWindowClosed`).
- `LineItem`/`DisplayItem`: `notReturnableReason` field renamed to `closedReason`, narrowed to the 3-value `ReturnClosedReason` type, `| null` still allowed (only set when `returnStatus === "returnWindowClosed"`).
- `buildIneligibleDisplayItems`: the 3 shipping-stage push blocks (attempted/out-for-delivery/in-transit) change `returnStatus: "notReturnable", notReturnableReason: "notDelivered", shippingStage: X` to `returnStatus: "awaitingDelivery", shippingStage: X`. The final pending-remainder push's `stillPending` branch does the same for its "still shipping" case; its "other" case becomes `returnStatus: "returnWindowClosed", closedReason: "other"`.
- `getIneligibleGroupMessage`: the `case "notReturnable":` branch splits into `case "awaitingDelivery":` (dispatches on `shippingStage` via `SHIPPING_STAGE_MESSAGE_KEY`, unchanged logic) and `case "returnWindowClosed":` (dispatches on `closedReason`, unchanged logic minus the now-removed `notDelivered` branch).
- `getIneligibleGroupKey`: the `notReturnable`-specific branches (window-closed-date grouping, shipping-stage grouping) split to match the new statuses — `awaitingDelivery` groups by `shippingStage`, `returnWindowClosed` groups by `closedReason` (+ closed date for the `outsideWindow` case, unchanged).
- `getIneligibleCoarseLabel`/`getIneligibleAccordionTitle`/`getReturnStatusIcon`/`getStatusStyle`: no logic change needed — they already index `styles[status]` directly, which now just resolves to one of 7 keys instead of 6.

### `components/app-settings/settings-form.tsx`

- `RETURN_STATUS_CARDS` grows from 6 to 7 entries: replace the single `{ key: "notReturnable", name: "Not returnable" }` with `{ key: "awaitingDelivery", name: "Awaiting delivery" }` and `{ key: "returnWindowClosed", name: "Return window closed" }`.
- The "Awaiting delivery" card's sentence sub-fields: the 4 shipping sentences (previously shown in the separate "Not returnable reasons" section, now nested under this card — same pattern already used for other multi-sentence statuses like `passedReturnWindow` was in the original 14-status design).
- The "Return window closed" card's sentence sub-fields: outside-window (with/without date), final sale, other.
- The standalone "Not returnable reasons" section is removed entirely — its 8 fields redistribute into the two cards above.

### `lib/tenant-defaults.ts`, `lib/branding-validation.ts`, `app/api/app/branding/route.ts`

Same mechanical pattern as the parent epic's Tasks 1, 3, 4 — type/const list grows from 6 to 7 status keys, `NotReturnableReason` type renamed/narrowed to `ReturnClosedReason` (3 values instead of 4), validation logic unchanged in shape (still checks every style has a non-empty label/heading and valid-or-blank color, every message is non-empty and within length).

### `app/api/demo-orders/route.ts`

The demo fixture items currently using `returnStatus: "notReturnable"` with `notReturnableReason: "notDelivered"` become `returnStatus: "awaitingDelivery"`; those using `notReturnableReason: "outsideWindow"` become `returnStatus: "returnWindowClosed", closedReason: "outsideWindow"`.

## Testing

- `lib/__tests__/branding-validation.test.ts`, `lib/__tests__/tenant.test.ts`: fixtures updated for the 7-key shape (same pattern as the parent epic's Task 10).
- `lib/__tests__/get-orders-status-mapping.test.ts`: the existing `statusFromUndeliveredDelivery` tests updated — assertions currently checking `result.returnStatus === "notReturnable"` change to `"awaitingDelivery"`; the "outsideWindow" test case changes to `"returnWindowClosed"` + `closedReason: "outsideWindow"`.

## Out of scope

- No changes to the 5 untouched lifecycle statuses.
- No changes to the direct-refund-only fix from the parent epic.
- No automated migration of existing per-status Settings customizations for the old `notReturnable` entry (same reasoning as the parent epic).
- The delivery-gating settings toggle discussed earlier in this conversation (whether to require actual delivery vs. just Shopify's native "fulfilled" gate) is explicitly NOT part of this spec — flagged as a separate future feature if wanted.
