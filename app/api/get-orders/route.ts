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
                    returns(first: 10) {
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
                            lineItem { id } quantity
                          }
                        }
                      }
                    }
                    lineItems(first: 50) {
                      edges {
                        node {
                          id title quantity
                          discountedUnitPriceSet { shopMoney { amount } }
                          product { handle } image { url } variant { title }
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
      // ── 1. Calculate Refunded & Returned Quantities ───────────────────
      const refundedQuantities: Record<string, number> = {};
      
      // Refunds is a plain array, refundLineItems is a connection
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (order.refunds || []).forEach((ref: any) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (ref.refundLineItems?.edges || []).forEach((rli: any) => {
          const id = rli.node.lineItem?.id;
          if (id) {
            refundedQuantities[id] = (refundedQuantities[id] || 0) + rli.node.quantity;
          }
        });
      });

      const returnQuantities: Record<string, number> = {};
      const itemReturnStatus: Record<string, { status: string; declineReason?: string; declineNote?: string }> = {};
      
      // Returns is a connection
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (order.returns?.edges || []).forEach((retEdge: any) => {
        const ret = retEdge.node;
        const isActiveReturn = ret.status !== "DECLINED" && ret.status !== "CANCELED";
        
        for (const rliEdge of ret.returnLineItems?.edges || []) {
          const lineItemId = rliEdge.node.fulfillmentLineItem?.lineItem?.id;
          if (!lineItemId) continue;
          
          if (isActiveReturn) {
            returnQuantities[lineItemId] = (returnQuantities[lineItemId] || 0) + rliEdge.node.quantity;
          }

          itemReturnStatus[lineItemId] = {
            status: ret.status,
            declineReason: ret.decline?.reason,
            declineNote: ret.decline?.note,
          };
        }
      });

      // ── 2. Build Shipments ───────────────────────
      // Fulfillments is a plain array
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const shipments = (order.fulfillments || []).map((f: any) => ({
        id: f.id,
        displayStatus: f.displayStatus,
        deliveredAt: f.deliveredAt ? new Date(f.deliveredAt).toISOString() : null,
        trackingInfo: f.trackingInfo || [],
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        items: f.fulfillmentLineItems?.edges.map((e: any) => ({
          id: e.node.lineItem.id,
          quantity: e.node.quantity
        })) || []
      }));

      // ── 3. Build per-line-item delivery tracking ───────────────────────
      type LineDelivery = { isDelivered: boolean; deliveredAt: Date | null; inTransit: boolean; isDispatched: boolean; };
      const lineItemDelivery: Record<string, LineDelivery> = {};

      for (const fulfillment of order.fulfillments || []) {
        const status = fulfillment.displayStatus;
        const isDelivered = status === "DELIVERED";
        const inTransit = ["IN_TRANSIT", "OUT_FOR_DELIVERY", "ATTEMPTED_DELIVERY", "READY_FOR_PICKUP", "PICKED_UP", "FULFILLED", "LABEL_PRINTED", "LABEL_PURCHASED", "MARKED_AS_FULFILLED"].includes(status);
        const isDispatched = isDelivered || inTransit || status === "SUBMITTED";

        let deliveredAt: Date | null = null;
        if (isDelivered) {
          deliveredAt = fulfillment.deliveredAt ? new Date(fulfillment.deliveredAt) : new Date(fulfillment.updatedAt);
        }

        for (const edge of fulfillment.fulfillmentLineItems?.edges || []) {
          const liId = edge.node.lineItem.id;
          const existing = lineItemDelivery[liId];
          if (!existing || (!existing.isDelivered && isDelivered)) {
            lineItemDelivery[liId] = { isDelivered, deliveredAt, inTransit, isDispatched };
          }
        }
      }

      // ── 4. Map each line item ───────────────────────
      const now = new Date();
      let orderIsDelivered = false;
      let orderDeliveredAt = null as Date | null;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const items = order.lineItems.edges.map(({ node: item }: any) => {
        const delivery = lineItemDelivery[item.id];
        const existingReturn = itemReturnStatus[item.id];

        const refQty = refundedQuantities[item.id] || 0;
        const retQty = returnQuantities[item.id] || 0;
        const unavailableQty = Math.max(refQty, retQty); 
        const eligibleQuantity = Math.max(0, item.quantity - unavailableQty);

        let returnStatus: string;
        let returnReason: string;

        if (order.cancelledAt) {
          returnStatus = "Cancelled";
          returnReason = "This order was cancelled.";
        } else if (existingReturn) {
          const statusMap: Record<string, string> = {
            REQUESTED: "Return requested",
            OPEN:      "Return in progress",
            CLOSED:    "Return completed",
            DECLINED:  "Return declined",
            CANCELED:  "Return cancelled",
          };
          returnStatus = statusMap[existingReturn.status] || "Return in progress";

          if (existingReturn.status === "DECLINED") {
            const dNote = (existingReturn.declineNote || "").trim();
            const dReason = existingReturn.declineReason;
            if (dNote) returnReason = dNote;
            else if (dReason === "RETURN_PERIOD_ENDED") returnReason = "Your return request was declined because it is outside the return window.";
            else if (dReason === "FINAL_SALE") returnReason = "Your return request was declined because the item is a final sale.";
            else returnReason = "Your return request was declined.";
          } else {
            returnReason = `You have an active or completed return for ${retQty} of these items.`;
            if (eligibleQuantity > 0) {
               returnStatus = "Eligible"; 
               returnReason = "";
            }
          }
        } else if (eligibleQuantity <= 0) {
          returnStatus = "Refunded";
          returnReason = "This item has already been refunded.";
        } else if (!delivery || !delivery.isDispatched) {
          returnStatus = "Not yet dispatched";
          returnReason = "This item hasn't been dispatched yet — check back once it ships.";
        } else if (delivery.inTransit && !delivery.isDelivered) {
          returnStatus = "On its way";
          returnReason = "Your parcel is on its way. Your 30-day return window starts once it's delivered.";
        } else if (delivery.isDelivered) {
          orderIsDelivered = true;
          if (!orderDeliveredAt && delivery.deliveredAt) orderDeliveredAt = delivery.deliveredAt;

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
          unitPrice: item.discountedUnitPriceSet?.shopMoney?.amount ? parseFloat(item.discountedUnitPriceSet.shopMoney.amount) : null,
          eligibleQuantity,
          refundedQuantity: refQty,
          returnStatus,
          returnReason,
          lineDeliveredAt: delivery?.isDelivered && delivery.deliveredAt
            ? delivery.deliveredAt.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })
            : null,
        };
      });

      return {
        ...order,
        processedItems: items,
        shipments,
        isDelivered: orderIsDelivered,
        deliveredAt: orderDeliveredAt?.toISOString() ?? null,
      };
    });

    return NextResponse.json({ firstName, email: sessionEmail, orders: processedOrders });
  } catch (err) {
    const error = err as Error;
    console.error("get-orders error:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
