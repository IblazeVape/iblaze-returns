/**
 * This app only ever cares about orders with an active return REQUEST —
 * merchants come here to jump to those, not to browse a full return
 * history. The deep-link is always scoped to this filter.
 */
export const RETURN_REQUESTED_QUERY = 'return_status:"return_requested"';

/**
 * The exact column set requested for the deep-linked native view, matching
 * Shopify's own selectedColumns URL param values for the Orders page.
 */
const DEEP_LINK_COLUMNS = [
  "CUSTOMER_NAME",
  "TOTAL_PRICE",
  "RETURN_STATUS",
  "FINANCIAL_STATUS",
  "FULFILLMENT_STATUS",
  "ITEM_COUNT",
  "ORDER_DATE",
  "DELIVERY_METHOD",
  "DELIVERY_STATUS",
] as const;

/**
 * Builds a link straight to Shopify's own native Orders page, filtered to
 * return-requested orders with the columns merchants actually want visible.
 * This is deliberately NOT a saved-view URL (savedViewId is per-store and
 * wouldn't exist for other merchants) — query + selectedColumns alone
 * reproduce the same filtered, columned view without depending on one.
 */
export function buildNativeReturnsUrl(shop: string): string {
  const storeHandle = shop.replace(/\.myshopify\.com$/, "");
  const params = new URLSearchParams({
    query: RETURN_REQUESTED_QUERY,
    selectedColumns: DEEP_LINK_COLUMNS.join(","),
  });
  return `https://admin.shopify.com/store/${storeHandle}/orders?${params.toString()}`;
}
