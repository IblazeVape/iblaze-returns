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
                    id name createdAt displayFulfillmentStatus
                    totalPriceSet { shopMoney { amount currencyCode } }
                    totalRefundedSet { shopMoney { amount } }
                    returns(first: 10) {
                      edges {
                        node {
                          id
                          status
                          updatedAt
                          decline {
                            reason
                            note
                          }
                          returnLineItems(first: 50) {
                            edges {
                              node {
                                ... on ReturnLineItem {
                                  fulfillmentLineItem {
                                    lineItem { id }
                                  }
                                }
                              }
                            }
                          }
                        }
                      }
                    }
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
      totalRefundedSet?: { shopMoney: { amount: string } } | null;
      returns?: {
        edges: Array<{
          node: {
            id: string;
            status: string;
            updatedAt: string;
            decline?: {
              reason: string;
              note: string;
            } | null;
            returnLineItems: {
              edges: Array<{
                node: {
                  fulfillmentLineItem?: {
                    lineItem?: { id: string };
                  };
                };
              }>;
            };
          };
        }>;
      };
      fulfillments: Array<{
        id: string;
        displayStatus: string;
        deliveredAt: string | null;
        updatedAt: string;
        fulfillmentLineItems: {
          edges: Array<{ node: { lineItem: { id: string }; quantity: number } }>;
        };
      }>;
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
      
      const itemReturnStatus: Record<string, { status: string; declineReason?: string; declineNote?: string; updatedAt: Date }> = {};
      const returns = order.returns?.edges || [];

      // Helper to prioritise active returns over cancelled/older ones
      const getPriority = (status: string) => {
        switch (status) {
          case "OPEN": return 5;
          case "REQUESTED": return 4;
          case "CLOSED": return 3;
          case "DECLINED": return 2;
          case "CANCELED": return 1;
          default: return 0;
        }
      };

      for (const retEdge of returns) {
        const returnNode = retEdge.node;
        const currentPriority = getPriority(returnNode.status);
        const returnUpdatedAt = new Date(returnNode.updatedAt);
        
        for (const rliEdge of returnNode.returnLineItems?.edges || []) {
          const lineItemId = rliEdge.node.fulfillmentLineItem?.lineItem?.id;
          if (lineItemId) {
            const existing = itemReturnStatus[lineItemId];
            const existingPriority = existing ? getPriority(existing.status) : -1;
            
            // Overwrite if the new status has a HIGHER priority
            // OR if the priority is the SAME, but the new one is MORE RECENT
            if (currentPriority > existingPriority || (currentPriority === existingPriority && returnUpdatedAt > existing.updatedAt)) {
              itemReturnStatus[lineItemId] = {
                status: returnNode.status,
                declineReason: returnNode.decline?.reason,
                declineNote: returnNode.decline?.note,
                updatedAt: returnUpdatedAt
              }; 
            }
          }
        }
      }

      const fulfillments = order.fulfillments || [];
      type LineDelivery = { isDelivered: boolean; deliveredAt: Date | null; inTransit: boolean; isDispatched: boolean; };
      const lineItemDelivery: Record<string, LineDelivery> = {};

      for (const fulfillment of fulfillments) {
        const status = fulfillment.displayStatus;
        const isDelivered = status === "DELIVERED";
        const inTransit = status === "IN_TRANSIT" || status === "OUT_FOR_DELIVERY" || status === "ATTEMPTED_DELIVERY" || status === "READY_FOR_PICKUP" || status === "PICKED_UP";
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

      const now = new Date();
      let orderIsDelivered = false;
      let orderDeliveredAt = null as Date | null;

      const items = order.lineItems.edges.map(({ node: item }) => {
        const delivery = lineItemDelivery[item.id];
        const existingReturn = itemReturnStatus[item.id];
        
        let returnStatus: string;
        let returnReason: string;

        if (existingReturn) {
          const statusMap: Record<string, string> = {
            REQUESTED: "Return requested",
            OPEN: "Return approved",
            CLOSED: "Return completed",
            DECLINED: "Return declined",
            CANCELED: "Return cancelled"
          };
          
          returnStatus = statusMap[existingReturn.status] || "Return in progress";
          
          if (existingReturn.status === "DECLINED") {
            const dNote = (existingReturn.declineNote || "").trim();
            const dReason = existingReturn.declineReason;
            
            console.log("DECLINED RETURN DEBUG", {
              lineItemId: item.id,
              declineReason: dReason,
              declineNote: existingReturn.declineNote,
              processedNote: dNote,
              updatedAt: existingReturn.updatedAt
            });
            
            if (dNote) {
              returnReason = dNote;
            } else if (dReason === "RETURN_PERIOD_ENDED") {
              returnReason = "Your return request was declined because it is outside the return window.";
            } else if (dReason === "FINAL_SALE") {
              returnReason = "Your return request was declined because the item is a final sale.";
            } else {
              returnReason = "Your return request was declined.";
            }
          } else {
            returnReason = "You have already submitted a return request for this item.";
          }

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
        };
      });

      return {
        ...order,
        processedItems: items,
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
