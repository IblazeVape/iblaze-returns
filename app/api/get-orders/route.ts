import { NextRequest, NextResponse } from "next/server";
import { validateSession } from "@/lib/auth";
import { shopifyAdmin } from "@/lib/shopify";

export async function GET(request: NextRequest) {
  try {
    const cookieHeader = request.headers.get("cookie");
    const session = validateSession(cookieHeader);
    if (!session.valid) {
      return NextResponse.json({ error: "Session missing. Please log in." }, { status: 401 });
    }
    const { email: sessionEmail } = session;

    const data = await shopifyAdmin(`
      query GetOrders($query: String!) {
        customers(first: 1, query: $query) {
          edges {
            node {
              firstName
              email
              orders(first: 20, sortKey: CREATED_AT, reverse: true) {
                edges {
                  node {
                    id name createdAt cancelledAt displayFulfillmentStatus displayFinancialStatus
                    totalPriceSet { shopMoney { amount currencyCode } }
                    totalRefundedSet { shopMoney { amount } }
                    refunds {
                      refundLineItems(first: 50) {
                        edges {
                          node {
                            quantity
                            lineItem { id }
                          }
                        }
                      }
                    }
                    returns(first: 20) {
                      edges {
                        node {
                          id status decline { reason note }
                          returnLineItems(first: 50) {
                            edges {
                              node {
                                ... on ReturnLineItem {
                                  quantity
                                  fulfillmentLineItem { lineItem { id } }
                                }
                              }
                            }
                          }
                        }
                      }
                    }
                    fulfillments {
                      id displayStatus deliveredAt updatedAt
                      trackingInfo { company number url }
                      fulfillmentLineItems(first: 50) {
                        edges {
                          node {
                            lineItem { id }
                            quantity
                          }
                        }
                      }
                    }
                    lineItems(first: 50) {
                      edges {
                        node {
                          id title quantity
                          discountedUnitPriceSet { shopMoney { amount } }
                          product { handle }
                          image { url }
                          variant { title }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    `, { query: `email:${sessionEmail}` });

    const customers = data?.customers?.edges || [];
    if (customers.length === 0) {
      return NextResponse.json({ firstName: "", email: sessionEmail, orders: [] });
    }

    const firstName = customers[0].node.firstName || "";
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rawOrders = customers[0].node.orders.edges.map((e: any) => e.node);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const processedOrders = rawOrders.map((order: any) => {

      // ── 1. Refunded quantities per line item ──────────────────────────────
      // Order.refunds = plain array; refundLineItems inside = connection
      const refundedQuantities: Record<string, number> = {};
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (order.refunds || []).forEach((ref: any) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (ref.refundLineItems?.edges || []).forEach((rli: any) => {
          const id = rli.node.lineItem?.id;
          if (id) refundedQuantities[id] = (refundedQuantities[id] || 0) + rli.node.quantity;
        });
      });

      // ── 2. Collect ALL return records per line item ───────────────────────
      // Keep an array so multiple returns on the same item are all tracked.
      // Priority for "winning" status: OPEN > REQUESTED > DECLINED > CANCELED > CLOSED
      const returnPriority: Record<string, number> = {
        OPEN: 5, REQUESTED: 4, DECLINED: 3, CANCELED: 2, CLOSED: 1,
      };

      type ReturnEntry = {
        status: string;
        declineReason?: string;
        declineNote?: string;
        quantity: number;
      };
      const returnsByItem: Record<string, ReturnEntry[]> = {};

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (order.returns?.edges || []).forEach((retEdge: any) => {
        const ret = retEdge.node;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        for (const rliEdge of (ret.returnLineItems?.edges || [])) {
          const lineItemId = rliEdge.node.fulfillmentLineItem?.lineItem?.id;
          if (!lineItemId) continue;
          if (!returnsByItem[lineItemId]) returnsByItem[lineItemId] = [];
          returnsByItem[lineItemId].push({
            status: ret.status,
            declineReason: ret.decline?.reason,
            declineNote: ret.decline?.note,
            quantity: rliEdge.node.quantity || 1,
          });
        }
      });

      // Best (highest-priority) return per line item
      const itemReturnStatus: Record<string, ReturnEntry> = {};
      // Active (blocking) return quantity per line item — only OPEN/REQUESTED/CLOSED block eligibility
      const activeReturnQty: Record<string, number> = {};

      for (const [lid, entries] of Object.entries(returnsByItem)) {
        const sorted = [...entries].sort(
          (a, b) => (returnPriority[b.status] ?? 0) - (returnPriority[a.status] ?? 0)
        );
        itemReturnStatus[lid] = sorted[0];

        // Quantities that block future returns: OPEN + REQUESTED + CLOSED are "used up"
        // DECLINED and CANCELED do NOT block — the customer can try again
        const blocking = entries
          .filter(e => ["OPEN", "REQUESTED", "CLOSED"].includes(e.status))
          .reduce((sum, e) => sum + e.quantity, 0);
        if (blocking > 0) activeReturnQty[lid] = blocking;
      }

      // ── 3. Build shipments with tracking ─────────────────────────────────
      // Order.fulfillments = plain array; trackingInfo inside = plain array
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const shipments = (order.fulfillments || []).map((f: any) => ({
        id: f.id,
        displayStatus: f.displayStatus,
        deliveredAt: f.deliveredAt ? new Date(f.deliveredAt).toISOString() : null,
        trackingInfo: (f.trackingInfo || [])
          .filter((t: { number?: string }) => t.number)
          .map((t: { number: string; url: string | null; company: string | null }) => ({
            number: t.number,
            url: t.url || buildTrackingUrl(t.company, t.number),
            company: t.company || "Carrier",
          })),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        items: (f.fulfillmentLineItems?.edges || []).map((e: any) => ({
          id: e.node.lineItem.id,
          quantity: e.node.quantity,
        })),
      }));

      // ── 4. Per-line-item delivery state ───────────────────────────────────
      type LineDelivery = {
        isDelivered: boolean;
        isConfirmed: boolean;  // label created, preparing — NOT yet with carrier
        inTransit: boolean;    // with carrier, moving
        isDispatched: boolean; // any of the above
        deliveredAt: Date | null;
      };
      const lineItemDelivery: Record<string, LineDelivery> = {};

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      for (const f of (order.fulfillments || [])) {
        const s = f.displayStatus;
        const isDelivered = s === "DELIVERED";

        // "Confirmed" = label purchased/printed, not yet picked up by carrier
        const isConfirmed =
          s === "CONFIRMED" ||
          s === "SUBMITTED" ||
          s === "LABEL_PURCHASED" ||
          s === "LABEL_PRINTED";

        // "In transit" = carrier has it, moving toward customer
        const inTransit =
          s === "IN_TRANSIT" ||
          s === "OUT_FOR_DELIVERY" ||
          s === "ATTEMPTED_DELIVERY" ||
          s === "READY_FOR_PICKUP" ||
          s === "PICKED_UP" ||
          s === "FULFILLED" ||
          s === "MARKED_AS_FULFILLED";

        const isDispatched = isDelivered || inTransit || isConfirmed;

        let deliveredAt: Date | null = null;
        if (isDelivered) {
          deliveredAt = f.deliveredAt ? new Date(f.deliveredAt) : new Date(f.updatedAt);
        }

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        for (const edge of (f.fulfillmentLineItems?.edges || [])) {
          const liId = edge.node.lineItem.id;
          const existing = lineItemDelivery[liId];
          // Prefer: delivered > inTransit > confirmed
          if (!existing || (!existing.isDelivered && isDelivered)) {
            lineItemDelivery[liId] = {
              isDelivered,
              isConfirmed: isConfirmed && !inTransit && !isDelivered,
              inTransit,
              isDispatched,
              deliveredAt,
            };
          }
        }
      }

      // ── 5. Map each line item ─────────────────────────────────────────────
      const now = new Date();
      let deliveredCount = 0;
      let dispatchedCount = 0;  // in-transit but not delivered
      let confirmedCount = 0;   // label created but not shipped
      let earliestDelivery: Date | null = null;
      let latestDelivery: Date | null = null;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const items = order.lineItems.edges.map(({ node: item }: any) => {
        const delivery = lineItemDelivery[item.id];
        const bestReturn = itemReturnStatus[item.id];

        const refQty = refundedQuantities[item.id] || 0;
        const retQty = activeReturnQty[item.id] || 0;

        // Conservative: treat refunded + in-active-return as separate pools that
        // could overlap (same unit refunded AND in return). Cap at item quantity.
        const unavailableQty = Math.min(item.quantity, refQty + retQty);
        const eligibleQuantity = Math.max(0, item.quantity - unavailableQty);

        // Track delivery counts per line item (not by unit, to avoid inflating counts)
        if (delivery?.isDelivered) {
          deliveredCount++;
          if (delivery.deliveredAt) {
            if (!earliestDelivery || delivery.deliveredAt < earliestDelivery) earliestDelivery = delivery.deliveredAt;
            if (!latestDelivery || delivery.deliveredAt > latestDelivery) latestDelivery = delivery.deliveredAt;
          }
        } else if (delivery?.inTransit) {
          dispatchedCount++;
        } else if (delivery?.isConfirmed) {
          confirmedCount++;
        }

        let returnStatus: string;
        let returnReason: string;

        if (order.cancelledAt) {
          returnStatus = "Cancelled";
          returnReason = "This order was cancelled.";
        } else if (bestReturn) {
          const statusMap: Record<string, string> = {
            REQUESTED: "Return requested",
            OPEN:      "Return in progress",
            CLOSED:    "Return completed",
            DECLINED:  "Return declined",
            CANCELED:  "Return cancelled",
          };
          returnStatus = statusMap[bestReturn.status] || "Return in progress";

          if (bestReturn.status === "DECLINED") {
            const note = (bestReturn.declineNote || "").trim();
            if (note) returnReason = note;
            else if (bestReturn.declineReason === "RETURN_PERIOD_ENDED")
              returnReason = "Your return request was declined because it is outside the return window.";
            else if (bestReturn.declineReason === "FINAL_SALE")
              returnReason = "Your return request was declined because the item is a final sale.";
            else returnReason = "Your return request was declined.";
          } else {
            returnReason = "You have an active or completed return for this item.";
            // If the return is closed/declined/cancelled and some units are still eligible,
            // show the item as eligible for those units
            if (eligibleQuantity > 0 && !["OPEN", "REQUESTED"].includes(bestReturn.status)) {
              returnStatus = "Eligible";
              returnReason = "";
            }
          }
        } else if (eligibleQuantity <= 0 && refQty > 0) {
          returnStatus = "Refunded";
          returnReason = "This item has already been fully refunded.";
        } else if (!delivery || !delivery.isDispatched) {
          returnStatus = "Not yet dispatched";
          returnReason = "This item hasn't been dispatched yet — check back once it ships.";
        } else if (delivery.isConfirmed && !delivery.inTransit && !delivery.isDelivered) {
          returnStatus = "Confirmed";
          returnReason = "We're preparing your items for shipping.";
        } else if (delivery.inTransit && !delivery.isDelivered) {
          returnStatus = "On its way";
          returnReason = "Your parcel is on its way. Your 30-day return window starts once it's delivered.";
        } else if (delivery.isDelivered) {
          if (delivery.deliveredAt) {
            const daysSince = (now.getTime() - delivery.deliveredAt.getTime()) / (1000 * 60 * 60 * 24);
            if (daysSince > 30) {
              returnStatus = "Passed the return window";
              returnReason = `Delivered on ${delivery.deliveredAt.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })} — outside the 30-day return window.`;
            } else {
              returnStatus = "Eligible";
              returnReason = "";
            }
          } else {
            // Delivered but no timestamp — default to eligible (conservative)
            returnStatus = "Eligible";
            returnReason = "";
          }
        } else {
          returnStatus = "Not yet dispatched";
          returnReason = "This item hasn't been dispatched yet.";
        }

        return {
          ...item,
          productHandle: item.product?.handle || null,
          unitPrice: item.discountedUnitPriceSet?.shopMoney?.amount
            ? parseFloat(item.discountedUnitPriceSet.shopMoney.amount)
            : null,
          eligibleQuantity,
          refundedQuantity: refQty,
          activeReturnQuantity: retQty,
          returnStatus,
          returnReason,
          lineDeliveredAt: delivery?.isDelivered && delivery.deliveredAt
            ? delivery.deliveredAt.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })
            : null,
        };
      });

      const totalLineItems = items.length;
      const notDispatchedCount = totalLineItems - deliveredCount - dispatchedCount - confirmedCount;

      // Order-level status: derived from per-item delivery states
      let orderStatus: string;
      if (order.cancelledAt) {
        orderStatus = "Cancelled";
      } else if (deliveredCount === totalLineItems && totalLineItems > 0) {
        orderStatus = "Delivered";
      } else if (deliveredCount > 0) {
        orderStatus = "Partially delivered";
      } else if (dispatchedCount > 0 && dispatchedCount + confirmedCount === totalLineItems) {
        orderStatus = "On its way";
      } else if (dispatchedCount > 0) {
        orderStatus = "Partially dispatched";
      } else if (confirmedCount > 0) {
        orderStatus = "Confirmed";
      } else {
        orderStatus = "Confirmed";
      }

      return {
        ...order,
        processedItems: items,
        shipments,
        orderStatus,
        deliveredCount,
        dispatchedCount,
        confirmedCount,
        notDispatchedCount,
        totalLineItems,
        earliestDelivery: earliestDelivery?.toISOString() ?? null,
        latestDelivery: latestDelivery?.toISOString() ?? null,
      };
    });

    return NextResponse.json({ firstName, email: sessionEmail, orders: processedOrders });
  } catch (err) {
    const error = err as Error;
    console.error("get-orders error:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

function buildTrackingUrl(company: string | null, number: string): string {
  const c = (company || "").toLowerCase();
  if (c.includes("royal mail")) return `https://www.royalmail.com/portal/rm/track?trackNumber=${encodeURIComponent(number)}`;
  if (c.includes("evri") || c.includes("hermes")) return `https://www.evri.com/track-a-parcel#/reference/${encodeURIComponent(number)}`;
  if (c.includes("dpd")) return `https://www.dpd.co.uk/service/index.jsp?focusOnRef=true&reference=${encodeURIComponent(number)}`;
  if (c.includes("ups")) return `https://www.ups.com/track?tracknum=${encodeURIComponent(number)}`;
  if (c.includes("fedex")) return `https://www.fedex.com/apps/fedextrack/?tracknumbers=${encodeURIComponent(number)}`;
  if (c.includes("dhl")) return `https://www.dhl.com/gb-en/home/tracking/tracking-parcel.html?submit=1&tracking-id=${encodeURIComponent(number)}`;
  if (c.includes("yodel")) return `https://www.yodel.co.uk/track/${encodeURIComponent(number)}`;
  return `https://www.royalmail.com/portal/rm/track?trackNumber=${encodeURIComponent(number)}`;
}
