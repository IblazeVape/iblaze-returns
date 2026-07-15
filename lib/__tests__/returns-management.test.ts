import { describe, it, expect } from "vitest";
import {
  buildReturnsSearchQuery,
  shapeReturnsResponse,
  shapePageInfo,
  shapeOrderItemsResponse,
  RETURN_SORT_OPTIONS,
  isReturnSortOption,
  shopifySortForOption,
} from "@/lib/returns-management";

describe("buildReturnsSearchQuery", () => {
  it("returns just the fixed return-requested filter when there's no search text", () => {
    expect(buildReturnsSearchQuery("")).toBe("return_status:return_requested");
    expect(buildReturnsSearchQuery("   ")).toBe("return_status:return_requested");
  });

  it("ANDs a trimmed free-text search term onto the fixed filter", () => {
    expect(buildReturnsSearchQuery("  #1034  ")).toBe("return_status:return_requested AND (#1034)");
    expect(buildReturnsSearchQuery("Jane Doe")).toBe("return_status:return_requested AND (Jane Doe)");
  });
});

describe("shapeReturnsResponse", () => {
  it("maps GraphQL order edges into flat rows with numeric id extracted from the gid", () => {
    const data = {
      orders: {
        edges: [
          {
            node: {
              id: "gid://shopify/Order/123456789",
              name: "#1001",
              customer: { displayName: "Jane Doe" },
              returnStatus: "RETURN_REQUESTED",
              createdAt: "2026-07-01T12:00:00Z",
              displayFinancialStatus: "PARTIALLY_REFUNDED",
              displayFulfillmentStatus: "FULFILLED",
              subtotalLineItemsQuantity: 18,
              currentTotalPriceSet: { shopMoney: { amount: "72.00", currencyCode: "GBP" } },
              shippingLine: { title: "Standard Shipping" },
              fulfillments: [{ displayStatus: "DELIVERED" }],
            },
          },
        ],
      },
    };
    expect(shapeReturnsResponse(data)).toEqual([
      {
        id: "gid://shopify/Order/123456789",
        numericId: "123456789",
        name: "#1001",
        customerName: "Jane Doe",
        returnStatus: "RETURN_REQUESTED",
        createdAt: "2026-07-01T12:00:00Z",
        financialStatus: "PARTIALLY_REFUNDED",
        fulfillmentStatus: "FULFILLED",
        itemCount: 18,
        totalAmount: "72.00",
        totalCurrency: "GBP",
        deliveryMethod: "Standard Shipping",
        deliveryStatus: "DELIVERED",
      },
    ]);
  });

  it("falls back to 'Guest' when the order has no customer", () => {
    const data = {
      orders: {
        edges: [
          {
            node: {
              id: "gid://shopify/Order/1",
              name: "#1002",
              customer: null,
              returnStatus: "RETURN_REQUESTED",
              createdAt: "2026-07-02T12:00:00Z",
              displayFinancialStatus: "PAID",
              displayFulfillmentStatus: "FULFILLED",
              subtotalLineItemsQuantity: 1,
              currentTotalPriceSet: { shopMoney: { amount: "10.00", currencyCode: "GBP" } },
              shippingLine: null,
              fulfillments: [],
            },
          },
        ],
      },
    };
    expect(shapeReturnsResponse(data)[0].customerName).toBe("Guest");
  });

  it("defaults financial/fulfillment status, item count, total, delivery method, and delivery status when fields are missing", () => {
    const data = {
      orders: {
        edges: [
          {
            node: {
              id: "gid://shopify/Order/2",
              name: "#1003",
              customer: null,
              returnStatus: "RETURN_REQUESTED",
              createdAt: "2026-07-03T12:00:00Z",
              displayFinancialStatus: null,
              displayFulfillmentStatus: null,
              subtotalLineItemsQuantity: 0,
              currentTotalPriceSet: null,
              shippingLine: null,
              fulfillments: [],
            },
          },
        ],
      },
    };
    expect(shapeReturnsResponse(data)[0]).toMatchObject({
      financialStatus: null,
      fulfillmentStatus: null,
      itemCount: 0,
      totalAmount: "0.00",
      totalCurrency: "",
      deliveryMethod: null,
      deliveryStatus: null,
    });
  });

  it("returns an empty array for malformed or missing data", () => {
    expect(shapeReturnsResponse(null)).toEqual([]);
    expect(shapeReturnsResponse({})).toEqual([]);
    expect(shapeReturnsResponse({ orders: {} })).toEqual([]);
  });
});

describe("shapeOrderItemsResponse", () => {
  it("maps line items and attaches the matching return reason from the order's returns", () => {
    const data = {
      order: {
        lineItems: {
          edges: [
            {
              node: {
                id: "gid://shopify/LineItem/1",
                title: "Test 1 Sub Ohm kit",
                quantity: 1,
                variantTitle: "4tt",
                image: { url: "https://example.com/img.jpg" },
              },
            },
            {
              node: {
                id: "gid://shopify/LineItem/2",
                title: "Widget",
                quantity: 2,
                variantTitle: null,
                image: null,
              },
            },
          ],
        },
        returns: {
          edges: [
            {
              node: {
                returnLineItems: {
                  edges: [
                    {
                      node: {
                        quantity: 1,
                        returnReasonNote: "Received the wrong item",
                        returnReasonDefinition: { name: "Wrong item" },
                        fulfillmentLineItem: { lineItem: { id: "gid://shopify/LineItem/1" } },
                      },
                    },
                  ],
                },
              },
            },
          ],
        },
      },
    };
    expect(shapeOrderItemsResponse(data)).toEqual([
      {
        id: "gid://shopify/LineItem/1",
        title: "Test 1 Sub Ohm kit",
        quantity: 1,
        variantTitle: "4tt",
        imageUrl: "https://example.com/img.jpg",
        returnReason: "Received the wrong item",
      },
      {
        id: "gid://shopify/LineItem/2",
        title: "Widget",
        quantity: 2,
        variantTitle: null,
        imageUrl: null,
        returnReason: null,
      },
    ]);
  });

  it("falls back to the standardized reason name when there's no free-text note", () => {
    const data = {
      order: {
        lineItems: {
          edges: [
            { node: { id: "gid://shopify/LineItem/1", title: "Item", quantity: 1, variantTitle: null, image: null } },
          ],
        },
        returns: {
          edges: [
            {
              node: {
                returnLineItems: {
                  edges: [
                    {
                      node: {
                        quantity: 1,
                        returnReasonNote: "",
                        returnReasonDefinition: { name: "Other" },
                        fulfillmentLineItem: { lineItem: { id: "gid://shopify/LineItem/1" } },
                      },
                    },
                  ],
                },
              },
            },
          ],
        },
      },
    };
    expect(shapeOrderItemsResponse(data)[0].returnReason).toBe("Other");
  });

  it("returns an empty array for malformed or missing data", () => {
    expect(shapeOrderItemsResponse(null)).toEqual([]);
    expect(shapeOrderItemsResponse({})).toEqual([]);
    expect(shapeOrderItemsResponse({ order: {} })).toEqual([]);
  });
});

describe("isReturnSortOption", () => {
  it("accepts every value in RETURN_SORT_OPTIONS", () => {
    for (const value of RETURN_SORT_OPTIONS) {
      expect(isReturnSortOption(value)).toBe(true);
    }
  });

  it("rejects unknown strings and non-string values", () => {
    expect(isReturnSortOption("bogus")).toBe(false);
    expect(isReturnSortOption(undefined)).toBe(false);
    expect(isReturnSortOption(null)).toBe(false);
  });
});

describe("shopifySortForOption", () => {
  it("maps each sort option to the correct Shopify sortKey and direction", () => {
    expect(shopifySortForOption("date_desc")).toEqual({ sortKey: "CREATED_AT", reverse: true });
    expect(shopifySortForOption("date_asc")).toEqual({ sortKey: "CREATED_AT", reverse: false });
    expect(shopifySortForOption("customer_asc")).toEqual({ sortKey: "CUSTOMER_NAME", reverse: false });
    expect(shopifySortForOption("customer_desc")).toEqual({ sortKey: "CUSTOMER_NAME", reverse: true });
  });
});

describe("shapePageInfo", () => {
  it("extracts hasNextPage and endCursor when present", () => {
    const data = { orders: { pageInfo: { hasNextPage: true, endCursor: "cursor-abc" } } };
    expect(shapePageInfo(data)).toEqual({ hasNextPage: true, endCursor: "cursor-abc" });
  });

  it("defaults to no next page and a null cursor for malformed or missing data", () => {
    expect(shapePageInfo(null)).toEqual({ hasNextPage: false, endCursor: null });
    expect(shapePageInfo({})).toEqual({ hasNextPage: false, endCursor: null });
    expect(shapePageInfo({ orders: {} })).toEqual({ hasNextPage: false, endCursor: null });
    expect(shapePageInfo({ orders: { pageInfo: { hasNextPage: "yes", endCursor: 123 } } })).toEqual({
      hasNextPage: false,
      endCursor: null,
    });
  });
});
