import { describe, it, expect } from "vitest";
import { shapeReturnsCountResponse, buildNativeReturnsUrl } from "@/lib/returns-management";

describe("shapeReturnsCountResponse", () => {
  it("extracts the count from a valid response", () => {
    expect(shapeReturnsCountResponse({ ordersCount: { count: 7 } })).toBe(7);
    expect(shapeReturnsCountResponse({ ordersCount: { count: 0 } })).toBe(0);
  });

  it("defaults to 0 for malformed or missing data", () => {
    expect(shapeReturnsCountResponse(null)).toBe(0);
    expect(shapeReturnsCountResponse({})).toBe(0);
    expect(shapeReturnsCountResponse({ ordersCount: {} })).toBe(0);
    expect(shapeReturnsCountResponse({ ordersCount: { count: "7" } })).toBe(0);
  });
});

describe("buildNativeReturnsUrl", () => {
  it("strips the .myshopify.com suffix to get the store handle", () => {
    const url = buildNativeReturnsUrl("6jjpzt-jz.myshopify.com");
    expect(url.startsWith("https://admin.shopify.com/store/6jjpzt-jz/orders?")).toBe(true);
  });

  it("includes the return_status:return_requested query filter", () => {
    const url = buildNativeReturnsUrl("example.myshopify.com");
    const params = new URL(url).searchParams;
    expect(params.get("query")).toBe('return_status:"return_requested"');
  });

  it("includes the exact requested column set", () => {
    const url = buildNativeReturnsUrl("example.myshopify.com");
    const params = new URL(url).searchParams;
    expect(params.get("selectedColumns")).toBe(
      "CUSTOMER_NAME,TOTAL_PRICE,RETURN_STATUS,FINANCIAL_STATUS,FULFILLMENT_STATUS,ITEM_COUNT,ORDER_DATE,DELIVERY_METHOD,DELIVERY_STATUS"
    );
  });
});
