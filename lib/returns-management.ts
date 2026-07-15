export const RETURN_STATUS_FILTERS = [
  "all",
  "return_requested",
  "in_progress",
  "inspection_complete",
  "returned",
  "return_failed",
] as const;

export type ReturnStatusFilter = (typeof RETURN_STATUS_FILTERS)[number];

export function isReturnStatusFilter(value: unknown): value is ReturnStatusFilter {
  return typeof value === "string" && (RETURN_STATUS_FILTERS as readonly string[]).includes(value);
}

/**
 * "all" isn't a real Shopify return_status value — it means "any order with
 * some return activity", which Shopify expresses as excluding no_return
 * rather than matching a single status.
 */
export function buildReturnStatusSearchQuery(status: ReturnStatusFilter): string {
  if (status === "all") return "-return_status:no_return";
  return `return_status:${status}`;
}

export type ReturnManagementOrder = {
  id: string;
  numericId: string;
  name: string;
  customerName: string;
  returnStatus: string;
  createdAt: string;
  financialStatus: string | null;
  fulfillmentStatus: string | null;
  itemCount: number;
  totalAmount: string;
  totalCurrency: string;
};

type OrdersQueryNode = {
  id: string;
  name: string;
  customer: { displayName: string } | null;
  returnStatus: string;
  createdAt: string;
  displayFinancialStatus: string | null;
  displayFulfillmentStatus: string | null;
  subtotalLineItemsQuantity: number;
  currentTotalPriceSet: { shopMoney: { amount: string; currencyCode: string } } | null;
};

export function shapeReturnsResponse(data: unknown): ReturnManagementOrder[] {
  const edges = (data as { orders?: { edges?: { node: OrdersQueryNode }[] } } | null)?.orders?.edges;
  if (!Array.isArray(edges)) return [];

  return edges.map(({ node }) => ({
    id: node.id,
    numericId: node.id.split("/").pop() ?? node.id,
    name: node.name,
    customerName: node.customer?.displayName ?? "Guest",
    returnStatus: node.returnStatus,
    createdAt: node.createdAt,
    financialStatus: node.displayFinancialStatus ?? null,
    fulfillmentStatus: node.displayFulfillmentStatus ?? null,
    itemCount: node.subtotalLineItemsQuantity ?? 0,
    totalAmount: node.currentTotalPriceSet?.shopMoney.amount ?? "0.00",
    totalCurrency: node.currentTotalPriceSet?.shopMoney.currencyCode ?? "",
  }));
}

export const RETURN_SORT_OPTIONS = ["date_desc", "date_asc", "customer_asc", "customer_desc"] as const;

export type ReturnSortOption = (typeof RETURN_SORT_OPTIONS)[number];

export function isReturnSortOption(value: unknown): value is ReturnSortOption {
  return typeof value === "string" && (RETURN_SORT_OPTIONS as readonly string[]).includes(value);
}

/**
 * Shopify's orders connection only sorts by a fixed set of GraphQL enum
 * keys (OrderSortKeys) — "sort by return status" isn't one of them, so the
 * UI's sort dropdown is limited to what the API actually supports.
 */
export function shopifySortForOption(option: ReturnSortOption): { sortKey: "CREATED_AT" | "CUSTOMER_NAME"; reverse: boolean } {
  switch (option) {
    case "date_asc":
      return { sortKey: "CREATED_AT", reverse: false };
    case "customer_asc":
      return { sortKey: "CUSTOMER_NAME", reverse: false };
    case "customer_desc":
      return { sortKey: "CUSTOMER_NAME", reverse: true };
    case "date_desc":
    default:
      return { sortKey: "CREATED_AT", reverse: true };
  }
}

export type ReturnsPageInfo = {
  hasNextPage: boolean;
  endCursor: string | null;
};

export function shapePageInfo(data: unknown): ReturnsPageInfo {
  const pageInfo = (data as { orders?: { pageInfo?: { hasNextPage?: unknown; endCursor?: unknown } } } | null)?.orders
    ?.pageInfo;
  return {
    hasNextPage: pageInfo?.hasNextPage === true,
    endCursor: typeof pageInfo?.endCursor === "string" ? pageInfo.endCursor : null,
  };
}
