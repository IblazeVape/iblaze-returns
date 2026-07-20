// Shipping-stage status mapping used by app/api/get-orders/route.ts.
//
// Pulled into its own module (rather than exported directly from route.ts)
// because Next.js's generated route type-checking (.next/types/**/route.ts)
// only permits route.ts files to export the recognized handler/config names
// (GET, POST, dynamic, runtime, etc.) — any other export fails `tsc --noEmit`
// against the generated checkFields<Diff<...>> constraint. Keeping this logic
// here lets it be unit tested directly while route.ts stays a valid route file.

export type ShippingStage = "confirmed" | "onItsWay" | "outForDelivery" | "attemptedDelivery";

export const SHIPPING_STAGE_REASON: Record<ShippingStage, string> = {
  confirmed: "We're preparing your items for shipping.",
  onItsWay: "Your parcel is on its way. Your return window starts once it's delivered.",
  outForDelivery: "Your parcel is out for delivery today. Your return window starts once it's delivered.",
  attemptedDelivery: "A delivery attempt was made for your parcel. You'll be able to request a return once it's been delivered.",
};

export function formatReturnWindowExpiredReason(deliveredAt: Date | null, returnWindowDays: number): string {
  if (!deliveredAt) return "The return window has expired for this item.";
  const closed = new Date(deliveredAt.getTime() + returnWindowDays * 24 * 60 * 60 * 1000);
  const closedLabel = closed.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
  return `The return window closed on ${closedLabel}.`;
}

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
