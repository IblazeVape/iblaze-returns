import { NextRequest, NextResponse } from "next/server";
import { validateSession } from "@/lib/auth";
import { shopifyAdmin } from "@/lib/shopify";

// IMPORTANT: Order.fulfillments is a PLAIN ARRAY — not a paginated connection, do NOT use edges/node
// fulfillmentLineItems IS a connection — use edges { node { ... } }
// Order.returns IS a connection — use edges { node { ... } }

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
                    id name createdAt displayFulfillmentStatus
                    totalPriceSet { shopMoney { amount currencyCode } }
                    totalRefundedSet { shopMoney { amount } }
                    fulfillments {
                      id
                      displayStatus
                      deliveredAt
                      updatedAt
                      fulfillmentLineItems(first: 50) {
                        edges {
                          node {
                            lineItem { id }
                            quantity
                          }
                        }
                      }
                    }
                    returns(first: 20) {
                      edges {
                        node {
                          id
                          status
                          returnLineItems(first: 50) {
                            edges {
                              node {
                                quantity
                                fulfillmentLineItem {
                                  lineItem { id }
                                }
                              }
                            }
                          }
                        }
                      }
                    }
                    lineItems(first: 50) {
                      edges {
                        node {
                          id title quantity
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
    const rawOrders = customers[0].node.orders.edges.map((e: { node: unknown }) => e.node);

    const processedOrders = rawOrders.map((order: {
      id: string;
      name: string;
      createdAt: string;
      displayFulfillmentStatus: string;
      totalPriceSet: { shopMoney: { amount: string; currencyCode: string } };
      totalRefundedSet: { shopMoney: { amount: string } } | null;
      fulfillments: Array<{
        id: string;
        displayStatus: string;
        deliveredAt: string | null;
        updatedAt: string;
        fulfillmentLineItems: {
          edges: Array<{ node: { lineItem: { id: string }; quantity: number } }>;
        };
      }>;
      returns: {
        edges: Array<{
          node: {
            id: string;
            status: string;
            returnLineItems: {
              edges: Array<{
                node: {
                  quantity: number;
                  fulfillmentLineItem: { lineItem: { id: string } };
                };
              }>;
            };
          };
        }>;
      };
      lineItems: {
        edges: Array<{
          node: {
            id: string;
            title: string;
            quantity: number;
            product: { handle: string } | null;
            image: { url: string } | null;
            variant: { title: string } | null;
          };
        }>;
      };
    }) => {
      const fulfillments = order.fulfillments || [];

      // ── Build per-line-item delivery tracking ──────────────────────────
      type LineDelivery = {
        isDelivered: boolean;
        deliveredAt: Date | null;
        inTransit: boolean;
        isDispatched: boolean;
      };
      const lineItemDelivery: Record<string, LineDelivery> = {};

      for (const fulfillment of fulfillments) {
        const status = fulfillment.displayStatus;
        const isDelivered = status === "DELIVERED";
        const inTransit =
          status === "IN_TRANSIT" ||
          status === "OUT_FOR_DELIVERY" ||
          status === "ATTEMPTED_DELIVERY" ||
          status === "READY_FOR_PICKUP" ||
          status === "PICKED_UP";
        const isDispatched = isDelivered || inTransit || status === "SUBMITTED";

        let deliveredAt: Date | null = null;
        if (isDelivered) {
          deliveredAt = fulfillment.deliveredAt
            ? new Date(fulfillment.deliveredAt)
            : new Date(fulfillment.updatedAt);
        }

        for (const edge of fulfillment.fulfillmentLineItems?.edges || []) {
          const liId = edge.node.lineItem.id;
          const existing = lineItemDelivery[liId];
          if (!existing || (!existing.isDelivered && isDelivered)) {
            lineItemDelivery[liId] = { isDelivered, deliveredAt, inTransit, isDispatched };
          }
        }
      }

      // ── Build per-line-item return status from Shopify returns ─────────
      // Maps lineItem GID → { shopifyStatus, returnId }
      // Priority: prefer highest-lifecycle status if multiple returns exist
      const STATUS_PRIORITY: Record<string, number> = {
        CLOSED: 5,    // returned/completed — highest
        OPEN: 4,      // approved by merchant
        REQUESTED: 3, // waiting for merchant review
        DECLINED: 2,  // merchant declined
        CANCELED: 1,  // customer/merchant cancelled
      };

      const lineItemReturnInfo: Record<string, { shopifyStatus: string; returnId: string }> = {};

      for (const retEdge of order.returns?.edges || []) {
        const ret = retEdge.node;
        for (const liEdge of ret.returnLineItems?.edges || []) {
          const lineItemId = liEdge.node.fulfillmentLineItem?.lineItem?.id;
          if (!lineItemId) continue;
          const existing = lineItemReturnInfo[lineItemId];
          const newPriority = STATUS_PRIORITY[ret.status] ?? 0;
          const existingPriority = existing ? (STATUS_PRIORITY[existing.shopifyStatus] ?? 0) : -1;
          if (newPriority > existingPriority) {
            lineItemReturnInfo[lineItemId] = { shopifyStatus: ret.status, returnId: ret.id };
          }
        }
      }

      // Customer-facing return status labels
      const shopifyReturnStatusToLabel = (s: string): string => {
        switch (s) {
          case "REQUESTED": return "Return requested";
          case "OPEN":      return "Return approved";
          case "DECLINED":  return "Return declined";
          case "CANCELED":  return "Return cancelled";
          case "CLOSED":    return "Returned";
          default:          return "Return in progress";
        }
      };

      // ── Determine order-level delivery state ───────────────────────────
      const now = new Date();
      let orderIsDelivered = false;
      let orderDeliveredAt = null as Date | null;

      const items = order.lineItems.edges.map(({ node: item }) => {
        const delivery = lineItemDelivery[item.id];
        const existingReturn = lineItemReturnInfo[item.id];

        let returnStatus: string;
        let returnReason: string;
        let existingReturnStatus: string | null = null;

        // If Shopify already has a return record for this line item, it takes priority
        if (existingReturn) {
          existingReturnStatus = shopifyReturnStatusToLabel(existingReturn.shopifyStatus);
          returnStatus = existingReturnStatus;
          returnReason = existingReturnStatus;
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
          returnStatus,
          returnReason,
          existingReturnStatus,
        };
      });

      // Build a deduplicated list of existing returns for display
      const existingReturns = (order.returns?.edges || []).map((retEdge) => ({
        id: retEdge.node.id,
        status: retEdge.node.status,
        label: shopifyReturnStatusToLabel(retEdge.node.status),
        itemCount: retEdge.node.returnLineItems?.edges?.length || 0,
      }));

      return {
        ...order,
        processedItems: items,
        isDelivered: orderIsDelivered,
        deliveredAt: orderDeliveredAt?.toISOString() ?? null,
        existingReturns,
      };
    });

    return NextResponse.json({ firstName, email: sessionEmail, orders: processedOrders });
  } catch (err) {
    const error = err as Error;
    console.error("get-orders error:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
