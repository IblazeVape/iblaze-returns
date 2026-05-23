import { NextRequest, NextResponse } from "next/server";
import { validateSession, verifyShopifyToken } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    const cookieHeader = request.headers.get("cookie");
    const session = validateSession(cookieHeader);
    if (!session.valid) return NextResponse.json({ error: session.error }, { status: 401 });

    const { email: sessionEmail, accessToken } = session;
    const shop = process.env.SHOPIFY_STORE_URL!;
    const shopifyAccessToken = process.env.SHOPIFY_ACCESS_TOKEN!;

    const query = `
      query GetOrders($query: String!) {
        shop { id }
        customers(first: 1, query: $query) {
          edges {
            node {
              firstName
              orders(first: 20, sortKey: CREATED_AT, reverse: true) {
                edges {
                  node {
                    id name createdAt displayFulfillmentStatus
                    totalPriceSet { shopMoney { amount currencyCode } }
                    fulfillments(first: 5) { createdAt displayStatus trackingInfo { number } }
                    lineItems(first: 50) { edges { node { id title quantity image { url } variant { title } } } }
                  }
                }
              }
            }
          }
        }
      }
    `;

    const response = await fetch(`https://${shop}/admin/api/2024-04/graphql.json`, {
      method: "POST",
      headers: {
        "X-Shopify-Access-Token": shopifyAccessToken,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ query, variables: { query: `email:${sessionEmail}` } }),
    });

    const result = await response.json();
    if (result.errors) throw new Error(result.errors[0].message);

    const shopId = result.data.shop.id.split("/").pop();
    const isValid = await verifyShopifyToken(shopId, accessToken!);
    if (!isValid) return NextResponse.json({ error: "Session revoked. Please log in again." }, { status: 401 });

    const customers = result.data?.customers?.edges || [];
    if (customers.length === 0) return NextResponse.json({ firstName: "", orders: [] });

    const firstName = customers[0].node.firstName || "";
    const rawOrders = customers[0].node.orders.edges.map((e: { node: unknown }) => e.node);

    const processedOrders = rawOrders.map((order: {
      displayFulfillmentStatus: string;
      fulfillments: Array<{ createdAt: string; displayStatus: string; trackingInfo: Array<{ number: string }> }>;
      createdAt: string;
      lineItems: { edges: Array<{ node: { id: string; title: string; quantity: number; image: { url: string }; variant: { title: string } } }> };
    }) => {
      const status = order.displayFulfillmentStatus;
      const isFulfilled = status === "FULFILLED" || status === "PARTIALLY_FULFILLED";

      let dispatchDate = new Date(order.createdAt);
      let isDelivered = false;

      if (isFulfilled && order.fulfillments && order.fulfillments.length > 0) {
        const fulfillment = order.fulfillments[0];
        dispatchDate = new Date(fulfillment.createdAt);
        if (fulfillment.displayStatus === "DELIVERED") isDelivered = true;
      }

      const returnDeadline = new Date(dispatchDate);
      returnDeadline.setDate(returnDeadline.getDate() + 33);
      const now = new Date();
      const isPastWindow = now > returnDeadline;

      const items = order.lineItems.edges.map((e: { node: { id: string; title: string; quantity: number; image: { url: string }; variant: { title: string } } }) => {
        const item = e.node;
        let returnStatus = "Eligible";
        if (!isFulfilled) returnStatus = "Not yet dispatched";
        else if (!isDelivered && !isPastWindow) returnStatus = "On its way";
        else if (isPastWindow) returnStatus = "Passed the return window";
        return { ...item, returnStatus };
      });

      return { ...order, processedItems: items };
    });

    return NextResponse.json({ firstName, orders: processedOrders });
  } catch (err) {
    const error = err as Error;
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
