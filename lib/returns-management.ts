/**
 * This app only ever shows orders with an active return REQUEST — merchants
 * come here to see what's new/needs attention, not a full return-history
 * browser. So the query is always scoped to return_status:return_requested,
 * with no status filter exposed in the UI.
 */
const RETURN_REQUESTED_QUERY = "return_status:return_requested";

/**
 * Combines the fixed return-requested filter with an optional free-text
 * search term (order number, customer name/email, etc. — Shopify's orders
 * search matches all of these on an unprefixed term, same as typing into
 * the search box in Shopify's own order list).
 */
export function buildReturnsSearchQuery(searchText: string): string {
  const trimmed = searchText.trim();
  if (!trimmed) return RETURN_REQUESTED_QUERY;
  return `${RETURN_REQUESTED_QUERY} AND (${trimmed})`;
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
  deliveryMethod: string | null;
  deliveryStatus: string | null;
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
  shippingLine: { title: string } | null;
  fulfillments: { displayStatus: string }[];
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
    deliveryMethod: node.shippingLine?.title ?? null,
    deliveryStatus: Array.isArray(node.fulfillments) && node.fulfillments.length > 0 ? node.fulfillments[0].displayStatus : null,
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

/**
 * One entry per RETURNED item (not every order line item) — matches
 * Shopify's own "View items" popover, which only lists what's actually
 * part of the return request, each with its own quantity and reason.
 */
export type ReturnOrderLineItem = {
  id: string;
  title: string;
  sku: string | null;
  quantity: number;
  imageUrl: string | null;
  returnReason: string | null;
  productId: string | null;
};

type ReturnLineItemNode = {
  id: string;
  quantity: number;
  returnReasonNote: string;
  returnReasonDefinition: { name: string } | null;
  fulfillmentLineItem: {
    lineItem: { title: string; sku: string | null; image: { url: string } | null; product: { id: string } | null };
  };
};

type OrderItemsQueryNode = {
  returns: { edges: { node: { returnLineItems: { edges: { node: ReturnLineItemNode }[] } } }[] };
};

export function shapeOrderItemsResponse(data: unknown): ReturnOrderLineItem[] {
  const order = (data as { order?: OrderItemsQueryNode } | null)?.order;
  const returnEdges = order?.returns?.edges;
  if (!Array.isArray(returnEdges)) return [];

  const items: ReturnOrderLineItem[] = [];
  for (const { node: ret } of returnEdges) {
    for (const { node: rli } of ret.returnLineItems?.edges ?? []) {
      const lineItem = rli.fulfillmentLineItem?.lineItem;
      if (!lineItem) continue;
      items.push({
        id: rli.id,
        title: lineItem.title,
        sku: lineItem.sku ?? null,
        quantity: rli.quantity,
        imageUrl: lineItem.image?.url ?? null,
        returnReason: rli.returnReasonNote?.trim() || rli.returnReasonDefinition?.name || null,
        productId: lineItem.product?.id ?? null,
      });
    }
  }
  return items;
}

export type ReturnDeliveryInfo = {
  fulfillmentName: string | null;
  displayStatus: string | null;
  deliveredAt: string | null;
  estimatedDeliveryAt: string | null;
  trackingCompany: string | null;
  trackingNumber: string | null;
  trackingUrl: string | null;
};

type FulfillmentNode = {
  name: string;
  displayStatus: string;
  deliveredAt: string | null;
  estimatedDeliveryAt: string | null;
  trackingInfo: { company: string | null; number: string | null; url: string | null }[];
};

export function shapeOrderDeliveryResponse(data: unknown): ReturnDeliveryInfo[] {
  const fulfillments = (data as { order?: { fulfillments?: FulfillmentNode[] } } | null)?.order?.fulfillments;
  if (!Array.isArray(fulfillments)) return [];

  return fulfillments.map((f) => {
    const tracking = f.trackingInfo?.[0];
    return {
      fulfillmentName: f.name ?? null,
      displayStatus: f.displayStatus ?? null,
      deliveredAt: f.deliveredAt ?? null,
      estimatedDeliveryAt: f.estimatedDeliveryAt ?? null,
      trackingCompany: tracking?.company ?? null,
      trackingNumber: tracking?.number ?? null,
      trackingUrl: tracking?.url ?? null,
    };
  });
}
