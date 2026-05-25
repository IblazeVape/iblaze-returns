import { NextRequest, NextResponse } from "next/server";
import { validateSession } from "@/lib/auth";
import { shopifyAdmin } from "@/lib/shopify";

// Order.fulfillments IS a FulfillmentConnection (paginated) in Shopify Admin GraphQL
// Use edges { node { ... } } and first: N
// Use fulfillment.deliveredAt (dedicated field) not updatedAt

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
                    fulfillments(first: 20) {
                      edges {
                        node {
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
      fulfillments: {
        edges: Array<{
          node: {
            id: string;
            displayStatus: string;
            deliveredAt: string | null;
            updatedAt: string;
            fulfillmentLineItems: {
              edges: Array<{ node: { lineItem: { id: string }; quantity: number } }>;
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
      // Flatten the FulfillmentConnection into a plain array
      const fulfillments = order.fulfillments?.edges?.map(e => e.node) || [];

      // Build per-line-item delivery tracking
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

        // Active in-transit states (parcel is moving)
        const inTransit =
          status === "IN_TRANSIT" ||
          status === "OUT_FOR_DELIVERY" ||
          status === "ATTEMPTED_DELIVERY" ||
          status === "READY_FOR_PICKUP" ||
          status === "PICKED_UP";

        // Dispatched = label created or further along
        const isDispatched = isDelivered || inTransit || status === "SUBMITTED";

        // Use Shopify's dedicated deliveredAt field first, fall back to updatedAt
        let deliveredAt: Date | null = null;
        if (isDelivered) {
          deliveredAt = fulfillment.deliveredAt
            ? new Date(fulfillment.deliveredAt)
            : new Date(fulfillment.updatedAt);
        }

        for (const edge of fulfillment.fulfillmentLineItems?.edges || []) {
          const liId = edge.node.lineItem.id;
          const existing = lineItemDelivery[liId];
          // Prefer delivered state; only overwrite if we're upgrading the status
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
        let returnStatus: string;
        let returnReason: string;

        if (!delivery || !delivery.isDispatched) {
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
