import { describe, it, expect } from "vitest";
import {
  DASHBOARD_STATS_TTL_SECONDS,
  formatDateKey,
  last30DateKeys,
  ordersKey,
  returnsKey,
  refundValueKey,
  reasonsKey,
  productsKey,
  productInfoKey,
  numericIdFromGid,
  last7,
  computeReturnRate,
  sumCounts,
  mergeHashCounts,
  topN,
  minorUnitsToMajor,
  majorUnitsToMinor,
} from "@/lib/dashboard-stats";

describe("formatDateKey", () => {
  it("formats a date as YYYY-MM-DD in UTC", () => {
    expect(formatDateKey(new Date("2026-07-16T23:59:00Z"))).toBe("2026-07-16");
    expect(formatDateKey(new Date("2026-01-05T00:00:00Z"))).toBe("2026-01-05");
  });
});

describe("last30DateKeys", () => {
  it("returns exactly 30 date keys, oldest first, ending on the given date", () => {
    const keys = last30DateKeys(new Date("2026-07-16T12:00:00Z"));
    expect(keys).toHaveLength(30);
    expect(keys[0]).toBe("2026-06-17");
    expect(keys[29]).toBe("2026-07-16");
  });

  it("has no duplicate dates", () => {
    const keys = last30DateKeys(new Date("2026-07-16T12:00:00Z"));
    expect(new Set(keys).size).toBe(30);
  });
});

describe("redis key builders", () => {
  it("namespace every key by shop, metric, and date", () => {
    expect(ordersKey("shop1.myshopify.com", "2026-07-16")).toBe("stats:shop1.myshopify.com:orders:2026-07-16");
    expect(returnsKey("shop1.myshopify.com", "2026-07-16")).toBe("stats:shop1.myshopify.com:returns:2026-07-16");
    expect(refundValueKey("shop1.myshopify.com", "2026-07-16")).toBe("stats:shop1.myshopify.com:refundValue:2026-07-16");
    expect(reasonsKey("shop1.myshopify.com", "2026-07-16")).toBe("stats:shop1.myshopify.com:reasons:2026-07-16");
    expect(productsKey("shop1.myshopify.com", "2026-07-16")).toBe("stats:shop1.myshopify.com:products:2026-07-16");
  });

  it("namespaces productInfoKey by shop only, no date", () => {
    expect(productInfoKey("shop1.myshopify.com")).toBe("stats:shop1.myshopify.com:productInfo");
  });
});

describe("numericIdFromGid", () => {
  it("extracts the trailing numeric id from a Shopify GID", () => {
    expect(numericIdFromGid("gid://shopify/Product/123456789")).toBe("123456789");
  });

  it("returns the input unchanged when it has no trailing digits", () => {
    expect(numericIdFromGid("not-a-gid")).toBe("not-a-gid");
  });
});

describe("computeReturnRate", () => {
  it("divides returns by orders", () => {
    expect(computeReturnRate(5, 100)).toBe(0.05);
    expect(computeReturnRate(0, 100)).toBe(0);
  });

  it("returns 0 instead of dividing by zero when there are no orders", () => {
    expect(computeReturnRate(5, 0)).toBe(0);
    expect(computeReturnRate(0, 0)).toBe(0);
  });
});

describe("sumCounts", () => {
  it("sums numeric values and treats null as 0", () => {
    expect(sumCounts([1, 2, null, 3])).toBe(6);
    expect(sumCounts([])).toBe(0);
    expect(sumCounts([null, null])).toBe(0);
  });
});

describe("last7", () => {
  it("takes the last 7 entries of a 30-day series", () => {
    const thirty = Array.from({ length: 30 }, (_, i) => i);
    expect(last7(thirty)).toEqual([23, 24, 25, 26, 27, 28, 29]);
  });

  it("treats null as 0", () => {
    expect(last7([1, 2, 3, null, 5, null, 7])).toEqual([1, 2, 3, 0, 5, 0, 7]);
  });

  it("returns everything when there are fewer than 7 entries", () => {
    expect(last7([1, 2])).toEqual([1, 2]);
  });
});

describe("mergeHashCounts", () => {
  it("sums matching fields across multiple hashes", () => {
    const merged = mergeHashCounts([
      { wrong_item: "2", damaged: "1" },
      { wrong_item: "3" },
      null,
    ]);
    expect(merged).toEqual({ wrong_item: 5, damaged: 1 });
  });

  it("returns an empty object when every hash is null", () => {
    expect(mergeHashCounts([null, null])).toEqual({});
  });

  it("ignores non-numeric field values", () => {
    expect(mergeHashCounts([{ a: "not-a-number" }])).toEqual({});
  });
});

describe("topN", () => {
  it("sorts descending by count and truncates to n", () => {
    const result = topN({ a: 1, b: 5, c: 3, d: 4, e: 2 }, 3);
    expect(result).toEqual([
      { key: "b", count: 5 },
      { key: "d", count: 4 },
      { key: "c", count: 3 },
    ]);
  });

  it("returns everything when there are fewer entries than n", () => {
    expect(topN({ a: 1 }, 5)).toEqual([{ key: "a", count: 1 }]);
  });

  it("returns an empty array for an empty input", () => {
    expect(topN({}, 5)).toEqual([]);
  });
});

describe("minorUnitsToMajor / majorUnitsToMinor", () => {
  it("converts minor units (pence) to major units (pounds) with 2dp precision", () => {
    expect(minorUnitsToMajor(12345)).toBe(123.45);
    expect(minorUnitsToMajor(0)).toBe(0);
  });

  it("converts major units to minor units, rounding to avoid float drift", () => {
    expect(majorUnitsToMinor(89.99)).toBe(8999);
    expect(majorUnitsToMinor(0.1 + 0.2)).toBe(30);
  });
});

describe("DASHBOARD_STATS_TTL_SECONDS", () => {
  it("is 31 days in seconds", () => {
    expect(DASHBOARD_STATS_TTL_SECONDS).toBe(31 * 24 * 60 * 60);
  });
});
