import { NextRequest, NextResponse } from "next/server";
import { verifyMerchantSessionToken } from "@/lib/merchant-session-token";
import { shopifyAdmin } from "@/lib/shopify";
import {
  isReturnStatusFilter,
  buildReturnStatusSearchQuery,
  shapeReturnsResponse,
} from "@/lib/returns-management";

export const dynamic = "force-dynamic";

const RETURNS_QUERY = `
  query ReturnsManagementList($query: String!) {
    orders(first: 50, query: $query, sortKey: CREATED_AT, reverse: true) {
      edges {
        node {
          id
          name
          customer { displayName }
          returnStatus
          createdAt
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

  const statusParam = request.nextUrl.searchParams.get("status") ?? "all";
  if (!isReturnStatusFilter(statusParam)) {
    return NextResponse.json({ error: "invalid status" }, { status: 400 });
  }

  try {
    const data = await shopifyAdmin(
      claims.shop,
      RETURNS_QUERY,
      { query: buildReturnStatusSearchQuery(statusParam) },
      "ReturnsManagementList"
    );
    return NextResponse.json({ shop: claims.shop, orders: shapeReturnsResponse(data) });
  } catch (err) {
    console.error("returns-management query error:", err instanceof Error ? err.message : String(err));
    return NextResponse.json({ error: "failed to load returns" }, { status: 500 });
  }
}
