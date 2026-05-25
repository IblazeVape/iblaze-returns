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
                    id
                    name
                    createdAt
                    displayFulfillmentStatus
                    totalPriceSet { shopMoney { amount currencyCode } }
                    fulfillments(first: 10) {
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
                      events(first: 20) {
                        edges {
                          node {
                            happenedAt
                            status
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
        createdAt: string;
        updatedAt: string;
        displayStatus: string;
        trackingInfo: Array<{ number: string; url: string; company: string }>;
        fulfillmentLineItems: {
          edges: Array<{ node: { lineItem: { id: string }; quantity: number } }>;
        };
        events: {
          edges: Array<{ node: { happenedAt: string; status: string } }>;
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
      const fulfillmentStatus = order.displayFulfillmentStatus;
      const isFulfilled =
        fulfillmentStatus === "FULFILLED" ||
        fulfillmentStatus === "PARTIALLY_FULFILLED" ||
        fulfillmentStatus === "IN_PROGRESS";

      // Find actual delivery date from fulfillment events
      let deliveredAt: Date | null = null;
      let isDelivered = false;
      const now = new Date();

      if (isFulfilled && order.fulfillments?.length > 0) {
        for (const fulfillment of order.fulfillments) {
          if (fulfillment.displayStatus === "DELIVERED") {
            isDelivered = true;

            // Look for the delivery event to get the exact delivery timestamp
            const deliveryEvent = fulfillment.events?.edges?.find(
              (e) => e.node.status === "delivered"
            );

            if (deliveryEvent?.node?.happenedAt) {
              deliveredAt = new Date(deliveryEvent.node.happenedAt);
            } else {
              // Fall back to fulfillment updatedAt as delivery approximation
              deliveredAt = new Date(fulfillment.updatedAt);
            }
            break; // Use first delivered fulfillment
          }
        }
      }

      // Build a map of which fulfillment covers which line item
      const lineItemFulfillmentStatus: Record<string, { delivered: boolean; inTransit: boolean }> = {};
      if (order.fulfillments?.length > 0) {
        for (const fulfillment of order.fulfillments) {
          const isThisDelivered = fulfillment.displayStatus === "DELIVERED";
          const isThisInTransit =
            fulfillment.displayStatus === "IN_TRANSIT" ||
            fulfillment.displayStatus === "OUT_FOR_DELIVERY" ||
            fulfillment.displayStatus === "ATTEMPTED_DELIVERY" ||
            fulfillment.displayStatus === "READY_FOR_PICKUP" ||
            fulfillment.displayStatus === "PICKED_UP" ||
            fulfillment.displayStatus === "LABEL_PRINTED" ||
            fulfillment.displayStatus === "LABEL_PURCHASED" ||
            fulfillment.displayStatus === "CONFIRMED";

          for (const edge of fulfillment.fulfillmentLineItems?.edges || []) {
            const liId = edge.node.lineItem.id;
            if (!lineItemFulfillmentStatus[liId]) {
              lineItemFulfillmentStatus[liId] = { delivered: false, inTransit: false };
            }
            if (isThisDelivered) lineItemFulfillmentStatus[liId].delivered = true;
            if (isThisInTransit) lineItemFulfillmentStatus[liId].inTransit = true;
          }
        }
      }

      const items = order.lineItems.edges.map(({ node: item }) => {
        const itemFulfillment = lineItemFulfillmentStatus[item.id];
        let returnStatus: string;
        let returnReason: string;

        if (!isFulfilled || (!itemFulfillment?.delivered && !itemFulfillment?.inTransit)) {
          returnStatus = "Not yet dispatched";
          returnReason = "This item hasn't been dispatched yet.";
        } else if (!itemFulfillment?.delivered && itemFulfillment?.inTransit) {
          returnStatus = "On its way";
          returnReason = "Your parcel is on its way — your 30-day return window starts once it's delivered.";
        } else if (itemFulfillment?.delivered) {
          // Item is delivered — check the 30-day window
          if (deliveredAt) {
            const daysSinceDelivery =
              (now.getTime() - deliveredAt.getTime()) / (1000 * 60 * 60 * 24);
            if (daysSinceDelivery > 30) {
              returnStatus = "Passed the return window";
              returnReason = `This item was delivered more than 30 days ago (on ${deliveredAt.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}).`;
            } else {
              returnStatus = "Eligible";
              returnReason = "";
            }
          } else {
            // displayStatus is DELIVERED but no delivery date found — treat as eligible
            returnStatus = "Eligible";
            returnReason = "";
          }
        } else {
          // Item has no fulfillment record
          returnStatus = "Not yet dispatched";
          returnReason = "This item hasn't been dispatched yet.";
        }

        return { ...item, returnStatus, returnReason };
      });

      return {
        ...order,
        processedItems: items,
        isDelivered,
        deliveredAt: deliveredAt?.toISOString() ?? null,
      };
    });

    return NextResponse.json({ firstName, email: sessionEmail, orders: processedOrders });
  } catch (err) {
    const error = err as Error;
    console.error("get-orders error:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
