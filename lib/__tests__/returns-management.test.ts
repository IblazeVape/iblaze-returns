import { describe, it, expect } from "vitest";
import {
  RETURN_STATUS_FILTERS,
  isReturnStatusFilter,
  buildReturnStatusSearchQuery,
  shapeReturnsResponse,
  shapePageInfo,
  RETURN_SORT_OPTIONS,
  isReturnSortOption,
  shopifySortForOption,
} from "@/lib/returns-management";

describe("isReturnStatusFilter", () => {
  it("accepts every value in RETURN_STATUS_FILTERS", () => {
    for (const value of RETURN_STATUS_FILTERS) {
      expect(isReturnStatusFilter(value)).toBe(true);
    }
  });

  it("rejects unknown strings", () => {
    expect(isReturnStatusFilter("bogus")).toBe(false);
    expect(isReturnStatusFilter("no_return")).toBe(false);
  });

  it("rejects non-string values", () => {
    expect(isReturnStatusFilter(undefined)).toBe(false);
    expect(isReturnStatusFilter(42)).toBe(false);
    expect(isReturnStatusFilter(null)).toBe(false);
  });
});

describe("buildReturnStatusSearchQuery", () => {
  it("builds a return_status: filter for a specific status", () => {
    expect(buildReturnStatusSearchQuery("return_requested")).toBe("return_status:return_requested");
    expect(buildReturnStatusSearchQuery("in_progress")).toBe("return_status:in_progress");
    expect(buildReturnStatusSearchQuery("inspection_complete")).toBe("return_status:inspection_complete");
    expect(buildReturnStatusSearchQuery("returned")).toBe("return_status:returned");
    expect(buildReturnStatusSearchQuery("return_failed")).toBe("return_status:return_failed");
  });

  it("excludes no_return orders for the 'all' filter instead of matching a single status", () => {
    expect(buildReturnStatusSearchQuery("all")).toBe("-return_status:no_return");
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
              returnStatus: "IN_PROGRESS",
              createdAt: "2026-07-02T12:00:00Z",
              displayFinancialStatus: "PAID",
              displayFulfillmentStatus: "FULFILLED",
              subtotalLineItemsQuantity: 1,
              currentTotalPriceSet: { shopMoney: { amount: "10.00", currencyCode: "GBP" } },
            },
          },
        ],
      },
    };
    expect(shapeReturnsResponse(data)[0].customerName).toBe("Guest");
  });

  it("defaults financial/fulfillment status, item count, and total when fields are missing", () => {
    const data = {
      orders: {
        edges: [
          {
            node: {
              id: "gid://shopify/Order/2",
              name: "#1003",
              customer: null,
              returnStatus: "RETURNED",
              createdAt: "2026-07-03T12:00:00Z",
              displayFinancialStatus: null,
              displayFulfillmentStatus: null,
              subtotalLineItemsQuantity: 0,
              currentTotalPriceSet: null,
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
    });
  });

  it("returns an empty array for malformed or missing data", () => {
    expect(shapeReturnsResponse(null)).toEqual([]);
    expect(shapeReturnsResponse({})).toEqual([]);
    expect(shapeReturnsResponse({ orders: {} })).toEqual([]);
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
