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
              orders(first: 20, sortKey: CREATED_AT, reverse: true) {
                edges {
                  node {
                    id name createdAt displayFulfillmentStatus
                    totalPriceSet { shopMoney { amount currencyCode } }
                    fulfillments(first: 5) {
                      createdAt displayStatus
                      trackingInfo { number }
                    }
                    lineItems(first: 50) {
                      edges {
                        node {
                          id title quantity
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
      fulfillments: Array<{ createdAt: string; displayStatus: string }>;
      lineItems: { edges: Array<{ node: { id: string; title: string; quantity: number; image: { url: string }; variant: { title: string } } }> };
    }) => {
      const status = order.displayFulfillmentStatus;
      const isFulfilled = status === "FULFILLED" || status === "PARTIALLY_FULFILLED";

      let dispatchDate = new Date(order.createdAt);
      let isDelivered = false;

      if (isFulfilled && order.fulfillments?.length > 0) {
        dispatchDate = new Date(order.fulfillments[0].createdAt);
        if (order.fulfillments[0].displayStatus === "DELIVERED") isDelivered = true;
      }

      const returnDeadline = new Date(dispatchDate);
      returnDeadline.setDate(returnDeadline.getDate() + 33);
      const isPastWindow = new Date() > returnDeadline;

      const items = order.lineItems.edges.map(({ node: item }: { node: { id: string; title: string; quantity: number; image: { url: string }; variant: { title: string } } }) => {
        let returnStatus = "Eligible";
        if (!isFulfilled) returnStatus = "Not yet dispatched";
        else if (!isDelivered && !isPastWindow) returnStatus = "On its way";
        else if (isPastWindow) returnStatus = "Passed the return window";
        return { ...item, returnStatus };
      });

      return { ...order, processedItems: items };
    });

    return NextResponse.json({ firstName, email: sessionEmail, orders: processedOrders });
  } catch (err) {
    const error = err as Error;
    console.error("get-orders error:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
