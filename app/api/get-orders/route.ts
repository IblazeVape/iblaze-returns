import { NextRequest, NextResponse } from "next/server";
import { validateSession } from "@/lib/auth";
import { shopifyAdmin } from "@/lib/shopify";
import { getOrderReturnInfo, ReturnInfo } from "@/lib/customerAccount";
import { getAdminReturnableInfo, fetchRemainingLineItems, fetchRemainingReturns } from "@/lib/returnEligibility";

type EligibilitySource = "shopify" | "shopify-admin" | "fallback";

async function resolveReturnInfo(
  orderId: string,
  orderName: string,
  cancelledAt: string | null | undefined,
  accessToken: string | undefined
): Promise<{ returnInfo: ReturnInfo | null; eligibilitySource: EligibilitySource }> {
  if (cancelledAt) return { returnInfo: null, eligibilitySource: "fallback" };
  if (!accessToken) return { returnInfo: null, eligibilitySource: "fallback" };

  try {
    const returnInfo = await getOrderReturnInfo(orderId, accessToken);
    return { returnInfo, eligibilitySource: "shopify" };
  } catch (err) {
    console.error(`getOrderReturnInfo failed for ${orderName}:`, (err as Error).message);
    try {
      const returnInfo = await getAdminReturnableInfo(orderId);
      return { returnInfo, eligibilitySource: "shopify-admin" };
    } catch (adminErr) {
      console.error(`getAdminReturnableInfo failed for ${orderName}:`, (adminErr as Error).message);
      return { returnInfo: null, eligibilitySource: "fallback" };
    }
  }
}

export async function GET(request: NextRequest) {
  try {
    const cookieHeader = request.headers.get("cookie");
    const session = validateSession(cookieHeader);
    if (!session.valid) {
      return NextResponse.json({ error: "Session missing. Please log in." }, { status: 401 });
    }
    const { email: sessionEmail, accessToken } = session;

    const url = new URL(request.url);
    const after = url.searchParams.get("after") ?? null;

    const data = await shopifyAdmin(`
      query GetOrders($query: String!, $after: String) {
        customers(first: 1, query: $query) {
          edges {
            node {
              firstName
              email
              orders(first: 15, after: $after, sortKey: CREATED_AT, reverse: true) {
                pageInfo { hasNextPage endCursor }
                edges {
                  node {
                    id name createdAt cancelledAt displayFulfillmentStatus displayFinancialStatus
                    totalPriceSet { shopMoney { amount currencyCode } }
                    totalRefundedSet { shopMoney { amount } }
                    refunds {
                      refundLineItems(first: 25) {
                        edges {
                          node {
                            quantity
                            lineItem { id }
                          }
                        }
                      }
                    }
                    returns(first: 25) {
                      pageInfo { hasNextPage endCursor }
                      edges {
                        node {
                          id status decline { reason note }
                          returnLineItems(first: 25) {
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
                      id displayStatus createdAt deliveredAt updatedAt
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
                      pageInfo { hasNextPage endCursor }
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
    `, { query: `email:${sessionEmail}`, after });

    const customers = data?.customers?.edges || [];
    if (customers.length === 0) {
      return NextResponse.json({ firstName: "", email: sessionEmail, orders: [], hasNextPage: false, endCursor: null });
    }

    const firstName = customers[0].node.firstName || "";
    const ordersConnection = customers[0].node.orders;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rawOrders = ordersConnection.edges.map((e: any) => e.node);
    const hasNextPage: boolean = ordersConnection.pageInfo?.hasNextPage ?? false;
    const endCursor: string | null = ordersConnection.pageInfo?.endCursor ?? null;

    // Paginate line items and returns when an order exceeds the first page
    await Promise.all(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      rawOrders.map(async (order: any) => {
        const linePageInfo = order.lineItems?.pageInfo;
        if (linePageInfo?.hasNextPage && linePageInfo.endCursor) {
          const extraLines = await fetchRemainingLineItems(order.id, linePageInfo.endCursor);
          order.lineItems.edges.push(...extraLines);
        }

        const returnsPageInfo = order.returns?.pageInfo;
        if (returnsPageInfo?.hasNextPage && returnsPageInfo.endCursor) {
          const extraReturns = await fetchRemainingReturns(order.id, returnsPageInfo.endCursor);
          order.returns.edges.push(...extraReturns.map((node: unknown) => ({ node })));
        }
      })
    );

    // ── Fetch Shopify return eligibility for all orders in parallel ──────────
    // Customer Account API first; Admin returnableFulfillments if that fails;
    // delivery-based manual logic only as last resort.
    const returnInfoResults = await Promise.all(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      rawOrders.map((order: any) =>
        resolveReturnInfo(order.id, order.name, order.cancelledAt, accessToken)
      )
    );

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const processedOrders = rawOrders.map((order: any, orderIdx: number) => {
      const { returnInfo, eligibilitySource } = returnInfoResults[orderIdx];

      // ── 1. Refunded quantities per line item ──────────────────────────────
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

      const itemReturnStatus: Record<string, ReturnEntry> = {};
      const requestedReturnQty: Record<string, number> = {}; // REQUESTED only
      const openReturnQty: Record<string, number> = {};      // OPEN only
      const completedReturnQty: Record<string, number> = {}; // CLOSED only
      const declinedReturnEntries: Record<string, { quantity: number; message: string; declineReason?: string }[]> = {}; // DECLINED — per entry with resolved message

      const lineItemQuantities: Record<string, number> = {};
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      for (const edge of order.lineItems.edges) {
        const li = edge.node;
        lineItemQuantities[li.id] = li.quantity;
      }

      const directRefundQtyByLine: Record<string, number> = {};

      for (const [lid, entries] of Object.entries(returnsByItem)) {
        const sorted = [...entries].sort(
          (a, b) => (returnPriority[b.status] ?? 0) - (returnPriority[a.status] ?? 0)
        );
        itemReturnStatus[lid] = sorted[0];

        const lineQty = lineItemQuantities[lid] ?? 0;
        const requestedRaw = entries
          .filter(e => e.status === "REQUESTED")
          .reduce((sum, e) => sum + e.quantity, 0);
        const openRaw = entries
          .filter(e => e.status === "OPEN")
          .reduce((sum, e) => sum + e.quantity, 0);
        const completedRaw = entries
          .filter(e => e.status === "CLOSED")
          .reduce((sum, e) => sum + e.quantity, 0);

        const declinedMapped = entries
          .filter(e => e.status === "DECLINED")
          .map(e => {
            const note = (e.declineNote || "").trim();
            const message = note && !/^decline reason\.?$/i.test(note) && !/^n\/?a$/i.test(note)
              && !(note.length < 12 && !/\s/.test(note) && !/[.!?]/.test(note))
              ? note
              : (e.declineReason === "RETURN_PERIOD_ENDED" || e.declineReason === "RETURN_WINDOW_EXPIRED")
                ? "Your return request was declined because it is outside the return window."
                : e.declineReason === "FINAL_SALE"
                  ? "Your return request was declined because the item is a final sale."
                  : "Your return request was declined.";
            return { quantity: e.quantity, message, declineReason: e.declineReason };
          });
        const declinedRaw = declinedMapped.reduce((sum, e) => sum + e.quantity, 0);

        const allocated = allocateExclusiveReturnQty(
          lineQty,
          requestedRaw,
          openRaw,
          completedRaw,
          declinedRaw,
          refundedQuantities[lid] || 0,
        );

        if (allocated.requested > 0) requestedReturnQty[lid] = allocated.requested;
        if (allocated.open > 0) openReturnQty[lid] = allocated.open;
        if (allocated.completed > 0) completedReturnQty[lid] = allocated.completed;
        if (allocated.declined > 0) {
          declinedReturnEntries[lid] = capDeclinedEntries(declinedMapped, allocated.declined);
        }
        if (allocated.directRefund > 0) directRefundQtyByLine[lid] = allocated.directRefund;
      }

      // ── 3. Build shipments with tracking ─────────────────────────────────
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const shipments = (order.fulfillments || []).map((f: any) => ({
        id: f.id,
        displayStatus: f.displayStatus,
        shippedAt: f.createdAt ? new Date(f.createdAt).toISOString() : null,
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
        deliveredQty: number;
        inTransitQty: number;
        confirmedQty: number;
        latestDeliveredAt: Date | null;
      };
      
      const lineItemDelivery: Record<string, LineDelivery> = {};
      let earliestDelivery = null as Date | null;
      let latestDelivery = null as Date | null;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      for (const f of (order.fulfillments || [])) {
        const s = f.displayStatus;
        const isDelivered = s === "DELIVERED";
        const isConfirmed = s === "CONFIRMED" || s === "SUBMITTED" || s === "LABEL_PURCHASED" || s === "LABEL_PRINTED";
        const inTransit = s === "IN_TRANSIT" || s === "OUT_FOR_DELIVERY" || s === "ATTEMPTED_DELIVERY" || s === "READY_FOR_PICKUP" || s === "PICKED_UP" || s === "FULFILLED" || s === "MARKED_AS_FULFILLED";

        let dDate: Date | null = null;
        if (isDelivered) {
          dDate = f.deliveredAt ? new Date(f.deliveredAt) : new Date(f.updatedAt);
          if (!earliestDelivery || dDate < earliestDelivery) earliestDelivery = dDate;
          if (!latestDelivery || dDate > latestDelivery) latestDelivery = dDate;
        }

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        for (const edge of (f.fulfillmentLineItems?.edges || [])) {
          const liId = edge.node.lineItem.id;
          const qty = edge.node.quantity;
          
          if (!lineItemDelivery[liId]) {
            lineItemDelivery[liId] = { deliveredQty: 0, inTransitQty: 0, confirmedQty: 0, latestDeliveredAt: null };
          }
          
          if (isDelivered) {
            lineItemDelivery[liId].deliveredQty += qty;
            if (!lineItemDelivery[liId].latestDeliveredAt || (dDate && dDate > lineItemDelivery[liId].latestDeliveredAt!)) {
              lineItemDelivery[liId].latestDeliveredAt = dDate;
            }
          } else if (inTransit) {
            lineItemDelivery[liId].inTransitQty += qty;
          } else if (isConfirmed) {
            lineItemDelivery[liId].confirmedQty += qty;
          }
        }
      }

      // ── 5. Map each line item ─────────────────────────────────────────────
      const now = new Date();
      let totalUnits = 0;
      let deliveredCount = 0;
      let dispatchedCount = 0;  
      let confirmedCount = 0;   

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const items = order.lineItems.edges.map(({ node: item }: any) => {
        totalUnits += item.quantity;
        const delivery = lineItemDelivery[item.id] || { deliveredQty: 0, inTransitQty: 0, confirmedQty: 0, latestDeliveredAt: null };
        const bestReturn = itemReturnStatus[item.id];

        deliveredCount += delivery.deliveredQty;
        dispatchedCount += delivery.inTransitQty;
        confirmedCount += delivery.confirmedQty;

        const refQty          = directRefundQtyByLine[item.id] || 0;
        const requestedQty    = requestedReturnQty[item.id]  || 0;
        const openQty         = openReturnQty[item.id]       || 0;
        const completedQty    = completedReturnQty[item.id]  || 0;
        const declinedEntries = declinedReturnEntries[item.id] || [];
        const declinedQty     = declinedEntries.reduce((s, e) => s + e.quantity, 0);

        const reservedQty = Math.min(
          item.quantity,
          refQty + requestedQty + openQty + completedQty + declinedQty
        );
        const shopifyReturnableQty = returnInfo ? (returnInfo.returnableItems[item.id] ?? 0) : 0;
        const slotAvailable = Math.max(0, item.quantity - reservedQty);
        const deliveredAvailable = Math.max(0, delivery.deliveredQty - reservedQty);
        // Shopify return rules (returnInformation) + portal rule: must be delivered before selectable
        const shopifySlotEligible = returnInfo
          ? Math.min(shopifyReturnableQty, slotAvailable)
          : deliveredAvailable;
        const effectiveEligible = returnInfo
          ? Math.min(shopifySlotEligible, deliveredAvailable)
          : deliveredAvailable;

        let returnStatus: string;
        let returnReason: string;

        if (order.cancelledAt) {
          returnStatus = "Cancelled";
          returnReason = "This order was cancelled.";

        } else if (effectiveEligible > 0) {
          returnStatus = "Eligible";
          returnReason = "";

        } else if (shopifySlotEligible > 0 && delivery.inTransitQty > 0) {
          // Shopify says returnable, but we wait for delivery before the customer can request
          returnStatus = "On its way";
          returnReason = "Your parcel is on its way. Your return window starts once it's delivered.";

        } else if (bestReturn && Math.max(0, item.quantity - reservedQty) <= 0) {
          // ── Priority 2: Return record covers all units ─────────────────────
          const statusMap: Record<string, string> = {
            REQUESTED: "Return requested", OPEN: "Return in progress", CLOSED: "Return completed", DECLINED: "Return declined", CANCELED: "Return cancelled — please contact us",
          };
          returnStatus = statusMap[bestReturn.status] || "Return in progress";
          if (bestReturn.status === "DECLINED") {
            const note = (bestReturn.declineNote || "").trim();
            if (note && !/^decline reason\.?$/i.test(note)) returnReason = note;
            else if (bestReturn.declineReason === "RETURN_WINDOW_EXPIRED" || bestReturn.declineReason === "RETURN_PERIOD_ENDED") returnReason = "Your return request was declined because it is outside the return window.";
            else if (bestReturn.declineReason === "FINAL_SALE") returnReason = "Your return request was declined because the item is a final sale.";
            else returnReason = "Your return request was declined.";
          } else {
            returnReason = bestReturn.status === "CLOSED"
              ? "Your return has been processed."
              : "You have an active or completed return for this item.";
          }

        } else if (returnInfo) {
          // ── Priority 3: Shopify returnInformation (no returnable qty right now) ─
          const nonReturnableDetail = returnInfo.nonReturnableItems[item.id];

          if (nonReturnableDetail) {
            // Sidekick-aligned priority order for nonReturnable reason codes:
            //   UNFULFILLED first (operational blocker — delivery hasn't happened)
            //   RETURN_WINDOW_EXPIRED next — but only once item is actually delivered
            //   FINAL_SALE (permanent — item never returnable)
            //   RETURNED (item already returned — UI uses Return records for detail)
            //   Unknown/OTHER last — generic copy, log for monitoring
            const reasonCodes = nonReturnableDetail.map((d: { reasonCode: string }) => d.reasonCode);

            // Log any codes we haven't mapped — helps us extend coverage over time
            const knownCodes = new Set(["UNFULFILLED", "RETURN_WINDOW_EXPIRED", "FINAL_SALE", "RETURNED", "OTHER"]);
            const unknownCodes = reasonCodes.filter((c: string) => !knownCodes.has(c));
            if (unknownCodes.length > 0) {
              console.warn(`[get-orders] Unknown nonReturnableReason codes for item ${item.id}: ${unknownCodes.join(", ")}`);
            }

            if (reasonCodes.includes("UNFULFILLED")) {
              // Not yet dispatched/delivered — delivery state takes precedence
              const undelivered = statusFromUndeliveredDelivery(delivery);
              returnStatus = undelivered.returnStatus;
              returnReason = undelivered.returnReason;
            } else if (reasonCodes.includes("RETURN_WINDOW_EXPIRED")) {
              // Window can't be expired before delivery — guard against Shopify API edge cases
              if (delivery.deliveredQty <= 0) {
                const undelivered = statusFromUndeliveredDelivery(delivery);
                returnStatus = undelivered.returnStatus;
                returnReason = undelivered.returnReason;
              } else {
                returnStatus = "Passed the return window";
                returnReason = formatReturnWindowExpiredReason(delivery.latestDeliveredAt);
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
          } else {
            // Not in either Shopify list — fall back to delivery state
            if (delivery.inTransitQty > 0) {
              returnStatus = "On its way";
              returnReason = "Your parcel is on its way. Your return window starts once it's delivered.";
            } else {
              returnStatus = "Not yet dispatched";
              returnReason = delivery.confirmedQty > 0
                ? "We're preparing your items for shipping."
                : "This item hasn't been dispatched yet — check back once it ships.";
            }
          }

        } else {
          // ── Priority 4: Manual fallback (Customer Account API unavailable) ─
          if (bestReturn) {
            const statusMap: Record<string, string> = {
              REQUESTED: "Return requested", OPEN: "Return in progress", CLOSED: "Return completed", DECLINED: "Return declined", CANCELED: "Return cancelled — please contact us",
            };
            returnStatus = statusMap[bestReturn.status] || "Return in progress";
            returnReason = "You have an active or completed return for this item.";
          } else if (Math.max(0, item.quantity - reservedQty) <= 0) {
            returnStatus = "Refunded";
            returnReason = "This item has already been fully refunded.";
          } else if (effectiveEligible > 0) {
            if (delivery.latestDeliveredAt) {
              const daysSince = (now.getTime() - delivery.latestDeliveredAt.getTime()) / (1000 * 60 * 60 * 24);
              if (daysSince > 30) {
                returnStatus = "Passed the return window";
                returnReason = formatReturnWindowExpiredReason(delivery.latestDeliveredAt);
              } else {
                returnStatus = "Eligible";
                returnReason = "";
              }
            } else {
              returnStatus = "Eligible";
              returnReason = "";
            }
          } else {
            if (delivery.inTransitQty > 0) {
              returnStatus = "On its way";
              returnReason = "Your parcel is on its way. Your return window starts once it's delivered.";
            } else {
              returnStatus = "Not yet dispatched";
              returnReason = delivery.confirmedQty > 0
                ? "We're preparing your items for shipping."
                : "This item hasn't been dispatched yet — check back once it ships.";
            }
          }
        }

        return {
          ...item,
          productHandle: item.product?.handle || null,
          unitPrice: item.discountedUnitPriceSet?.shopMoney?.amount
            ? parseFloat(item.discountedUnitPriceSet.shopMoney.amount)
            : null,
          eligibleQuantity: returnStatus === "Eligible" ? effectiveEligible : 0,
          refundedQuantity: refQty,
          requestedReturnQuantity: requestedQty,
          openReturnQuantity: openQty,
          completedReturnQuantity: completedQty,
          declinedReturnQuantity: declinedQty,
          declinedReturnEntries: declinedEntries,
          inTransitQuantity: delivery.inTransitQty,
          pendingQuantity: Math.max(0, item.quantity - delivery.deliveredQty - delivery.inTransitQty - delivery.confirmedQty),
          returnStatus,
          returnReason,
          lineDeliveredAt: delivery.latestDeliveredAt
            ? delivery.latestDeliveredAt.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })
            : null,
        };
      });

      const notDispatchedCount = Math.max(0, totalUnits - deliveredCount - dispatchedCount - confirmedCount);

      let orderStatus: string;
      if (order.cancelledAt) {
        orderStatus = "Cancelled";
      } else if (deliveredCount === totalUnits && totalUnits > 0) {
        orderStatus = "Delivered";
      } else if (deliveredCount > 0) {
        orderStatus = "Partially delivered";
      } else if (dispatchedCount > 0 && (dispatchedCount + confirmedCount + deliveredCount) === totalUnits) {
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
        eligibilitySource,
        deliveredCount,
        dispatchedCount,
        confirmedCount,
        notDispatchedCount,
        totalUnits,
        earliestDelivery: earliestDelivery ? earliestDelivery.toISOString() : null,
        latestDelivery: latestDelivery ? latestDelivery.toISOString() : null,
      };
    });

    return NextResponse.json({ firstName, email: sessionEmail, orders: processedOrders, hasNextPage, endCursor });
  } catch (err) {
    const error = err as Error;
    console.error("get-orders error:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

function allocateExclusiveReturnQty(
  lineQty: number,
  requestedRaw: number,
  openRaw: number,
  completedRaw: number,
  declinedRaw: number,
  totalRefundedRaw: number,
) {
  let remaining = lineQty;

  const completed = Math.min(remaining, completedRaw);
  remaining -= completed;

  const declined = Math.min(remaining, declinedRaw);
  remaining -= declined;

  const open = Math.min(remaining, openRaw);
  remaining -= open;

  const requested = Math.min(remaining, requestedRaw);
  remaining -= requested;

  // Refunds tied to completed/open returns are already represented above.
  const directRefund = Math.min(remaining, Math.max(0, totalRefundedRaw - completed - open));
  remaining -= directRefund;

  return { completed, declined, open, requested, directRefund };
}

function capDeclinedEntries(
  entries: { quantity: number; message: string; declineReason?: string }[],
  cap: number,
) {
  if (cap <= 0) return [];
  let remaining = cap;
  const result: typeof entries = [];
  for (const entry of entries) {
    if (remaining <= 0) break;
    const quantity = Math.min(entry.quantity, remaining);
    if (quantity > 0) result.push({ ...entry, quantity });
    remaining -= quantity;
  }
  return result;
}

// UI-only fallback — used only for expired-window date labels.
// Eligibility always comes from returnInformation, never from this constant.
// Keep in sync with iBlaze's configured return window in Shopify Settings → Policies.
const RETURN_WINDOW_DAYS = 30;

function statusFromUndeliveredDelivery(delivery: {
  inTransitQty: number;
  confirmedQty: number;
}): { returnStatus: string; returnReason: string } {
  if (delivery.inTransitQty > 0) {
    return {
      returnStatus: "On its way",
      returnReason: "Your parcel is on its way. Your return window starts once it's delivered.",
    };
  }
  if (delivery.confirmedQty > 0) {
    return {
      returnStatus: "Not yet dispatched",
      returnReason: "We're preparing your items for shipping.",
    };
  }
  return {
    returnStatus: "Not yet dispatched",
    returnReason: "This item hasn't been dispatched yet — check back once it ships.",
  };
}

function formatReturnWindowExpiredReason(deliveredAt: Date | null): string {
  if (!deliveredAt) return "The return window has expired for this item.";
  const closed = new Date(deliveredAt.getTime() + RETURN_WINDOW_DAYS * 24 * 60 * 60 * 1000);
  const closedLabel = closed.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
  return `The return window closed on ${closedLabel}.`;
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
