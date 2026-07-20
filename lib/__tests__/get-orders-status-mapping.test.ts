import { describe, it, expect } from "vitest";

// statusFromUndeliveredDelivery and SHIPPING_STAGE_REASON live in
// lib/get-orders-status.ts rather than being exported directly from
// app/api/get-orders/route.ts: Next.js's generated route type-checking
// (.next/types/**/route.ts) only permits route.ts files to export the
// recognized handler/config names (GET, POST, dynamic, runtime, etc.) —
// any other export fails `tsc --noEmit` against the generated
// checkFields<Diff<...>> constraint. route.ts imports this logic from
// lib/get-orders-status.ts, which is what we test directly here — no
// module mocking of the route's other dependencies is needed.
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
