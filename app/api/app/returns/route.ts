import { NextRequest, NextResponse } from "next/server";
import { verifyMerchantSessionToken } from "@/lib/merchant-session-token";
import { shopifyAdmin } from "@/lib/shopify";
import { RETURN_REQUESTED_QUERY, shapeReturnsCountResponse, buildNativeReturnsUrl } from "@/lib/returns-management";

export const dynamic = "force-dynamic";

const RETURNS_COUNT_QUERY = `
  query ReturnsManagementCount($query: String!) {
    ordersCount(query: $query) {
      count
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

  try {
    const data = await shopifyAdmin(
      claims.shop,
      RETURNS_COUNT_QUERY,
      { query: RETURN_REQUESTED_QUERY },
      "ReturnsManagementCount"
    );
    return NextResponse.json({
      count: shapeReturnsCountResponse(data),
      nativeUrl: buildNativeReturnsUrl(claims.shop),
    });
  } catch (err) {
    console.error("returns-management count query error:", err instanceof Error ? err.message : String(err));
    return NextResponse.json({ error: "failed to load return count" }, { status: 500 });
  }
}
