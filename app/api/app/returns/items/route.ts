import { NextRequest, NextResponse } from "next/server";
import { verifyMerchantSessionToken } from "@/lib/merchant-session-token";
import { shopifyAdmin } from "@/lib/shopify";
import { shapeOrderItemsResponse } from "@/lib/returns-management";

export const dynamic = "force-dynamic";

const ORDER_ITEMS_QUERY = `
  query ReturnsManagementOrderItems($id: ID!) {
    order(id: $id) {
      id
      lineItems(first: 50) {
        edges {
          node {
            id
            title
            quantity
            variantTitle
            image { url }
          }
        }
      }
      returns(first: 10) {
        edges {
          node {
            returnLineItems(first: 50) {
              edges {
                node {
                  ... on ReturnLineItem {
                    quantity
                    returnReasonNote
                    returnReasonDefinition { name }
                    fulfillmentLineItem { lineItem { id } }
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
    console.error("returns-management order items query error:", err instanceof Error ? err.message : String(err));
    return NextResponse.json({ error: "failed to load items" }, { status: 500 });
  }
}
