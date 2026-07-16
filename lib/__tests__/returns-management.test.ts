import { describe, it, expect } from "vitest";
import { buildNativeReturnsUrl, buildAdminProductUrl } from "@/lib/returns-management";

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

describe("buildAdminProductUrl", () => {
  it("strips the .myshopify.com suffix and links straight to the product", () => {
    const url = buildAdminProductUrl("6jjpzt-jz.myshopify.com", "123456789");
    expect(url).toBe("https://admin.shopify.com/store/6jjpzt-jz/products/123456789");
  });
});
