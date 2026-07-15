import { NextRequest, NextResponse } from "next/server";
import { verifyMerchantSessionToken } from "@/lib/merchant-session-token";
import { shopifyAdmin } from "@/lib/shopify";
import { shapeOrderDeliveryResponse } from "@/lib/returns-management";

export const dynamic = "force-dynamic";

const ORDER_DELIVERY_QUERY = `
  query ReturnsManagementOrderDelivery($id: ID!) {
    order(id: $id) {
      id
      fulfillments(first: 5) {
        name
        displayStatus
        deliveredAt
        estimatedDeliveryAt
        trackingInfo(first: 1) {
          company
          number
          url
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
    const data = await shopifyAdmin(claims.shop, ORDER_DELIVERY_QUERY, { id: orderId }, "ReturnsManagementOrderDelivery");
    return NextResponse.json({ fulfillments: shapeOrderDeliveryResponse(data) });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("returns-management order delivery query error:", message);
    return NextResponse.json({ error: message || "failed to load delivery status" }, { status: 500 });
  }
}
