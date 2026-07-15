import { NextRequest, NextResponse } from "next/server";
import { verifyMerchantSessionToken } from "@/lib/merchant-session-token";
import { shopifyAdmin } from "@/lib/shopify";
import {
  isReturnStatusFilter,
  buildReturnStatusSearchQuery,
  shapeReturnsResponse,
  shapePageInfo,
  isReturnSortOption,
  shopifySortForOption,
} from "@/lib/returns-management";

export const dynamic = "force-dynamic";

const RETURNS_PAGE_SIZE = 20;

const RETURNS_QUERY = `
  query ReturnsManagementList($query: String!, $after: String, $sortKey: OrderSortKeys!, $reverse: Boolean!) {
    orders(first: ${RETURNS_PAGE_SIZE}, after: $after, query: $query, sortKey: $sortKey, reverse: $reverse) {
      edges {
        node {
          id
          name
          customer { displayName }
          returnStatus
          createdAt
          displayFinancialStatus
          displayFulfillmentStatus
          subtotalLineItemsQuantity
          currentTotalPriceSet { shopMoney { amount currencyCode } }
        }
      }
      pageInfo {
        hasNextPage
        endCursor
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
  const after = request.nextUrl.searchParams.get("after") || undefined;

  const sortParam = request.nextUrl.searchParams.get("sort") ?? "date_desc";
  if (!isReturnSortOption(sortParam)) {
    return NextResponse.json({ error: "invalid sort" }, { status: 400 });
  }
  const { sortKey, reverse } = shopifySortForOption(sortParam);

  try {
    const data = await shopifyAdmin(
      claims.shop,
      RETURNS_QUERY,
      { query: buildReturnStatusSearchQuery(statusParam), after, sortKey, reverse },
      "ReturnsManagementList"
    );
    return NextResponse.json({
      shop: claims.shop,
      orders: shapeReturnsResponse(data),
      pageInfo: shapePageInfo(data),
    });
  } catch (err) {
    console.error("returns-management query error:", err instanceof Error ? err.message : String(err));
    return NextResponse.json({ error: "failed to load returns" }, { status: 500 });
  }
}
