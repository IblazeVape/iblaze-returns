import { shopifyAdmin } from "@/lib/shopify";
import type { ReturnInfo } from "@/lib/customerAccount";

const PAGE = 50;

/** Admin API fallback — same source submit-return uses when Customer Account API is unavailable. */
export async function getAdminReturnableInfo(shop: string, orderId: string): Promise<ReturnInfo> {
  const returnableItems: Record<string, number> = {};
  let fulfillmentAfter: string | null = null;

  do {
    const data = await shopifyAdmin(
      shop,
      `
      query AdminReturnable($orderId: ID!, $first: Int!, $after: String) {
        returnableFulfillments(orderId: $orderId, first: $first, after: $after) {
          pageInfo { hasNextPage endCursor }
          edges {
            node {
              returnableFulfillmentLineItems(first: 50) {
                edges {
                  node {
                    quantity
                    fulfillmentLineItem {
                      lineItem { id }
                    }
                  }
                }
              }
            }
          }
        }
      }
    `,
      { orderId, first: 5, after: fulfillmentAfter }
    );

    for (const fEdge of data?.returnableFulfillments?.edges || []) {
      for (const iEdge of fEdge.node.returnableFulfillmentLineItems?.edges || []) {
        const lineItemId = iEdge.node.fulfillmentLineItem?.lineItem?.id;
        if (!lineItemId) continue;
        returnableItems[lineItemId] = (returnableItems[lineItemId] || 0) + iEdge.node.quantity;
      }
    }

    const pageInfo = data?.returnableFulfillments?.pageInfo;
    fulfillmentAfter = pageInfo?.hasNextPage ? pageInfo.endCursor : null;
  } while (fulfillmentAfter);

  return { returnableItems, nonReturnableItems: {}, nonReturnableReasons: [] };
}

/** Fetch any line items beyond the first page — separate low-cost queries. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function fetchRemainingLineItems(shop: string, orderId: string, after: string): Promise<any[]> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const extra: any[] = [];
  let cursor: string | null = after;

  while (cursor) {
    const data = await shopifyAdmin(
      shop,
      `
      query OrderLineItems($id: ID!, $first: Int!, $after: String) {
        order(id: $id) {
          lineItems(first: $first, after: $after) {
            pageInfo { hasNextPage endCursor }
            edges {
              node {
                id title quantity
                discountedUnitPriceSet { shopMoney { amount } }
                product { handle }
                image { url }
                variant { title }
              }
            }
          }
        }
      }
    `,
      { id: orderId, first: PAGE, after: cursor }
    );

    extra.push(...(data?.order?.lineItems?.edges || []));
    const pageInfo = data?.order?.lineItems?.pageInfo;
    cursor = pageInfo?.hasNextPage ? pageInfo.endCursor : null;
  }

  return extra;
}

/** Fetch fulfillment line items beyond the first page — fulfillments with >30 variants need this. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function fetchRemainingFulfillmentLineItems(shop: string, fulfillmentId: string, after: string): Promise<any[]> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const extra: any[] = [];
  let cursor: string | null = after;

  while (cursor) {
    const data = await shopifyAdmin(
      shop,
      `
      query FulfillmentLineItems($id: ID!, $first: Int!, $after: String) {
        fulfillment(id: $id) {
          fulfillmentLineItems(first: $first, after: $after) {
            pageInfo { hasNextPage endCursor }
            edges { node { lineItem { id } quantity } }
          }
        }
      }
    `,
      { id: fulfillmentId, first: PAGE, after: cursor }
    );

    extra.push(...(data?.fulfillment?.fulfillmentLineItems?.edges || []));
    const pageInfo = data?.fulfillment?.fulfillmentLineItems?.pageInfo;
    cursor = pageInfo?.hasNextPage ? pageInfo.endCursor : null;
  }

  return extra;
}

/** Fetch return records beyond the first page — orders with many returns (e.g. #1033) need this. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function fetchRemainingReturns(shop: string, orderId: string, after: string): Promise<any[]> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const extra: any[] = [];
  let cursor: string | null = after;

  while (cursor) {
    const data = await shopifyAdmin(
      shop,
      `
      query OrderReturns($id: ID!, $first: Int!, $after: String) {
        order(id: $id) {
          returns(first: $first, after: $after) {
            pageInfo { hasNextPage endCursor }
            edges {
              node {
                id status decline { reason note }
                returnLineItems(first: 25) {
                  edges {
                    node {
                      ... on ReturnLineItem {
                        quantity
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
    `,
      { id: orderId, first: PAGE, after: cursor }
    );

    extra.push(...(data?.order?.returns?.edges || []).map((e: { node: unknown }) => e.node));
    const pageInfo = data?.order?.returns?.pageInfo;
    cursor = pageInfo?.hasNextPage ? pageInfo.endCursor : null;
  }

  return extra;
}
