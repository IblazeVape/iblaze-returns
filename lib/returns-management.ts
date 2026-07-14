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
};

type OrdersQueryNode = {
  id: string;
  name: string;
  customer: { displayName: string } | null;
  returnStatus: string;
  createdAt: string;
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
  }));
}
