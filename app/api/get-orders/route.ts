import { NextRequest, NextResponse } from "next/server";
import { validateSession } from "@/lib/auth";
import { shopifyAdmin } from "@/lib/shopify";

// Shopify's Order.fulfillments is a plain list (NOT a paginated connection)
// Shopify's Fulfillment.fulfillmentLineItems IS a paginated connection
// Shopify's Fulfillment.displayStatus uses uppercase enums: DELIVERED, IN_TRANSIT etc.

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
                    id
                    name
                    createdAt
                    displayFulfillmentStatus
                    totalPriceSet { shopMoney { amount currencyCode } }
                    fulfillments {
                      id
                      createdAt
                      updatedAt
                      displayStatus
                      trackingInfo { number url company }
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
                          id
                          title
                          quantity
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
      fulfillments: Array<{
        id: string;
        createdAt: string;
        updatedAt: string;
        displayStatus: string;
        trackingInfo: Array<{ number: string; url: string; company: string }>;
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
            image: { url: string };
            variant: { title: string };
          };
        }>;
      };
    }) => {
      // Order.fulfillments is a plain array in Shopify Admin GraphQL (not a connection)
      const fulfillments = order.fulfillments || [];

      // Build per-line-item delivery tracking
      // Each line item should use the delivery date of its own fulfillment
      type LineItemDelivery = {
        isDelivered: boolean;
        deliveredAt: Date | null;
        inTransit: boolean;
        isDispatched: boolean;
      };
      const lineItemDelivery: Record<string, LineItemDelivery> = {};

      for (const fulfillment of fulfillments) {
        const status = fulfillment.displayStatus;

        const isDelivered = status === "DELIVERED";

        const inTransit =
          status === "IN_TRANSIT" ||
          status === "OUT_FOR_DELIVERY" ||
          status === "ATTEMPTED_DELIVERY" ||
          status === "READY_FOR_PICKUP" ||
          status === "PICKED_UP";

        const isDispatched =
          isDelivered ||
          inTransit ||
          status === "CONFIRMED" ||
          status === "LABEL_PRINTED" ||
          status === "LABEL_PURCHASED" ||
          status === "SUBMITTED";

        // When delivered, use updatedAt as the best available delivery date approximation.
        // Shopify doesn't reliably expose a dedicated deliveredAt field on Fulfillment.
        const deliveredAt = isDelivered ? new Date(fulfillment.updatedAt) : null;

        for (const edge of fulfillment.fulfillmentLineItems?.edges || []) {
          const liId = edge.node.lineItem.id;
          // If the same line item appears in multiple fulfillments, prefer delivered state
          const existing = lineItemDelivery[liId];
          if (!existing || (!existing.isDelivered && isDelivered)) {
            lineItemDelivery[liId] = { isDelivered, deliveredAt, inTransit, isDispatched };
          }
        }
      }

      const now = new Date();
      let orderIsDelivered = false;
      let orderDeliveredAt: Date | null = null as Date | null;

      const items = order.lineItems.edges.map(({ node: item }) => {
        const delivery = lineItemDelivery[item.id];
        let returnStatus: string;
        let returnReason: string;

        if (!delivery || !delivery.isDispatched) {
          returnStatus = "Not yet dispatched";
          returnReason = "This item hasn't been dispatched yet — check back once it ships.";
        } else if (delivery.inTransit && !delivery.isDelivered) {
          returnStatus = "On its way";
          returnReason =
            "Your parcel is on its way. Your 30-day return window starts once it's delivered.";
        } else if (delivery.isDelivered) {
          if (delivery.deliveredAt) {
            const daysSince =
              (now.getTime() - delivery.deliveredAt.getTime()) / (1000 * 60 * 60 * 24);
            if (daysSince > 30) {
              returnStatus = "Passed the return window";
              const deliveredDateStr = delivery.deliveredAt.toLocaleDateString("en-GB", {
                day: "numeric",
                month: "short",
                year: "numeric",
              });
              returnReason = `This item was delivered on ${deliveredDateStr} — more than 30 days ago.`;
            } else {
              returnStatus = "Eligible";
              returnReason = "";
              orderIsDelivered = true;
              orderDeliveredAt = delivery.deliveredAt;
            }
          } else {
            // Delivered but no date available — treat as eligible conservatively
            returnStatus = "Eligible";
            returnReason = "";
            orderIsDelivered = true;
          }
        } else {
          returnStatus = "Not yet dispatched";
          returnReason = "This item hasn't been dispatched yet.";
        }

        return { ...item, returnStatus, returnReason };
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
