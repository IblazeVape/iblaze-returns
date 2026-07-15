import { NextRequest, NextResponse } from "next/server";
import { verifyMerchantSessionToken } from "@/lib/merchant-session-token";
import { shopifyAdmin } from "@/lib/shopify";
import { shapeOrderItemsResponse } from "@/lib/returns-management";

export const dynamic = "force-dynamic";

// Only queries the order's RETURNED line items (via returns.returnLineItems),
// not the full order line-item list — matches Shopify's own "View items"
// popover, which shows exactly what's part of the return, nothing more.
const ORDER_ITEMS_QUERY = `
  query ReturnsManagementOrderItems($id: ID!) {
    order(id: $id) {
      id
      returns(first: 10) {
        edges {
          node {
            returnLineItems(first: 50) {
              edges {
                node {
                  ... on ReturnLineItem {
                    id
                    quantity
                    returnReasonNote
                    returnReasonDefinition { name }
                    fulfillmentLineItem {
                      lineItem {
                        title
                        sku
                        image { url }
                        product { id }
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
  }
`;

export async function GET(request: NextRequest) {
  const auth = request.headers.get("authorization") || "";
  const sessionToken = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  const claims = sessionToken ? verifyMerchantSessionToken(sessionToken) : null;
  if (!claims) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const orderId = request.nextUrl.searchParams.get("orderId");
  if (!orderId) {
    return NextResponse.json({ error: "missing orderId" }, { status: 400 });
  }

  try {
    const data = await shopifyAdmin(claims.shop, ORDER_ITEMS_QUERY, { id: orderId }, "ReturnsManagementOrderItems");
    return NextResponse.json({ items: shapeOrderItemsResponse(data) });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("returns-management order items query error:", message);
    // Surface the real Shopify error (e.g. a missing-scope message after a
    // scope update the merchant hasn't re-approved yet) instead of a generic
    // string — this route only runs inside the merchant's own embedded app,
    // so there's no public-facing leak risk in showing it.
    return NextResponse.json({ error: message || "failed to load items" }, { status: 500 });
  }
}
