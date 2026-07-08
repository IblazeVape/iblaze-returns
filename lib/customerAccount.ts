// Customer Account API — discovery + return eligibility

const cache = new Map<string, string>();

export async function getCustomerAccountEndpoint(shop: string): Promise<string> {
  const cached = cache.get(shop);
  if (cached) return cached;
  const res = await fetch(`https://${shop}/.well-known/customer-account-api`);
  if (!res.ok) throw new Error(`Discovery failed: ${res.status}`);
  const data = await res.json();
  if (!data.graphql_api) throw new Error("No graphql_api in discovery response");
  cache.set(shop, data.graphql_api);
  return data.graphql_api;
}

export type NonReturnableDetail = {
  quantity: number;
  reasonCode: string; // RETURN_WINDOW_EXPIRED | FINAL_SALE | RETURNED | UNFULFILLED | OTHER
}[];

export type ReturnInfo = {
  // lineItemId → quantity Shopify says is returnable
  returnableItems: Record<string, number>;
  // lineItemId → per-item reason breakdown
  nonReturnableItems: Record<string, NonReturnableDetail>;
  // order-level distinct reasons (summary)
  nonReturnableReasons: string[];
};

const RETURN_INFO_PAGE = 50;

async function customerAccountQuery<T>(
  shop: string,
  accessToken: string,
  query: string,
  variables: Record<string, unknown>
): Promise<T> {
  const endpoint = await getCustomerAccountEndpoint(shop);
  const res = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: accessToken,
    },
    body: JSON.stringify({ query, variables }),
  });

  if (!res.ok) throw new Error(`Customer Account API error: ${res.status}`);
  const data = await res.json();
  if (data.errors) throw new Error(data.errors[0]?.message || "GraphQL error");
  return data.data as T;
}

export async function getOrderReturnInfo(
  shop: string,
  orderId: string,
  accessToken: string
): Promise<ReturnInfo> {
  const returnableItems: Record<string, number> = {};
  const nonReturnableItems: Record<string, NonReturnableDetail> = {};
  let nonReturnableReasons: string[] = [];
  let returnableAfter: string | null = null;
  let nonReturnableAfter: string | null = null;
  let sawReturnInfo = false;

  // Paginate returnable line items
  do {
    type ReturnablePage = {
      order?: {
        returnInformation?: {
          returnableLineItems?: {
            pageInfo?: { hasNextPage: boolean; endCursor: string | null };
            edges?: { node: { lineItem: { id: string }; quantity: number } }[];
          };
        };
      };
    };

    const data: ReturnablePage = await customerAccountQuery<ReturnablePage>(shop, accessToken, `
      query OrderReturnable($id: ID!, $first: Int!, $after: String) {
        order(id: $id) {
          returnInformation {
            returnableLineItems(first: $first, after: $after) {
              pageInfo { hasNextPage endCursor }
              edges {
                node {
                  lineItem { id }
                  quantity
                }
              }
            }
          }
        }
      }
    `, { id: orderId, first: RETURN_INFO_PAGE, after: returnableAfter });

    const conn = data.order?.returnInformation?.returnableLineItems;
    if (!conn && !sawReturnInfo) throw new Error("returnInformation not found in response");
    sawReturnInfo = true;

    for (const edge of conn?.edges || []) {
      returnableItems[edge.node.lineItem.id] = edge.node.quantity;
    }

    returnableAfter = conn?.pageInfo?.hasNextPage ? conn.pageInfo.endCursor : null;
  } while (returnableAfter);

  // Paginate non-returnable line items
  do {
    type NonReturnablePage = {
      order?: {
        returnInformation?: {
          nonReturnableSummary?: { nonReturnableReasons?: string[] };
          nonReturnableLineItems?: {
            pageInfo?: { hasNextPage: boolean; endCursor: string | null };
            edges?: {
              node: {
                lineItem: { id: string };
                quantityDetails?: { quantity: number; reasonCode: string }[];
              };
            }[];
          };
        };
      };
    };

    const data: NonReturnablePage = await customerAccountQuery<NonReturnablePage>(shop, accessToken, `
      query OrderNonReturnable($id: ID!, $first: Int!, $after: String) {
        order(id: $id) {
          returnInformation {
            nonReturnableSummary {
              nonReturnableReasons
            }
            nonReturnableLineItems(first: $first, after: $after) {
              pageInfo { hasNextPage endCursor }
              edges {
                node {
                  lineItem { id }
                  quantity
                  quantityDetails {
                    quantity
                    reasonCode
                  }
                }
              }
            }
          }
        }
      }
    `, { id: orderId, first: RETURN_INFO_PAGE, after: nonReturnableAfter });

    const info = data.order?.returnInformation;
    if (!info && !sawReturnInfo) throw new Error("returnInformation not found in response");
    sawReturnInfo = true;

    if (info?.nonReturnableSummary?.nonReturnableReasons) {
      nonReturnableReasons = info.nonReturnableSummary.nonReturnableReasons;
    }

    for (const edge of info?.nonReturnableLineItems?.edges || []) {
      nonReturnableItems[edge.node.lineItem.id] = edge.node.quantityDetails || [];
    }

    nonReturnableAfter = info?.nonReturnableLineItems?.pageInfo?.hasNextPage
      ? info.nonReturnableLineItems.pageInfo.endCursor
      : null;
  } while (nonReturnableAfter);

  return { returnableItems, nonReturnableItems, nonReturnableReasons };
}
