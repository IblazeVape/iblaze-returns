import { describe, it, expect } from "vitest";
import {
  RETURN_STATUS_FILTERS,
  isReturnStatusFilter,
  buildReturnStatusSearchQuery,
  shapeReturnsResponse,
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
            },
          },
        ],
      },
    };
    expect(shapeReturnsResponse(data)[0].customerName).toBe("Guest");
  });

  it("returns an empty array for malformed or missing data", () => {
    expect(shapeReturnsResponse(null)).toEqual([]);
    expect(shapeReturnsResponse({})).toEqual([]);
    expect(shapeReturnsResponse({ orders: {} })).toEqual([]);
  });
});
