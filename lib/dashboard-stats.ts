export const DASHBOARD_STATS_TTL_SECONDS = 31 * 24 * 60 * 60;

export function formatDateKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/** 30 date keys, oldest first, ending on `now`'s UTC calendar date. */
export function last30DateKeys(now: Date = new Date()): string[] {
  const keys: string[] = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
    keys.push(formatDateKey(d));
  }
  return keys;
}

export function ordersKey(shop: string, dateKey: string): string {
  return `stats:${shop}:orders:${dateKey}`;
}
export function returnsKey(shop: string, dateKey: string): string {
  return `stats:${shop}:returns:${dateKey}`;
}
export function refundValueKey(shop: string, dateKey: string): string {
  return `stats:${shop}:refundValue:${dateKey}`;
}
export function reasonsKey(shop: string, dateKey: string): string {
  return `stats:${shop}:reasons:${dateKey}`;
}
export function productsKey(shop: string, dateKey: string): string {
  return `stats:${shop}:products:${dateKey}`;
}

/**
 * Not date-scoped — holds the latest known title/image for each product GID
 * seen in a return, refreshed on every resolution. Looked up by ID after
 * the 30-day products hashes are merged and topN'd.
 */
export function productInfoKey(shop: string): string {
  return `stats:${shop}:productInfo`;
}

/** "gid://shopify/Product/123456789" -> "123456789", for building admin URLs. */
export function numericIdFromGid(gid: string): string {
  const match = gid.match(/(\d+)$/);
  return match ? match[1] : gid;
}

export function computeReturnRate(returns: number, orders: number): number {
  if (orders <= 0) return 0;
  return returns / orders;
}

export function sumCounts(values: (number | null)[]): number {
  return values.reduce<number>((sum, v) => sum + (typeof v === "number" ? v : 0), 0);
}

/** Last 7 entries of a 30-day series (oldest first), with null treated as 0 — for sparkline trends. */
export function last7(values: (number | null)[]): number[] {
  return values.slice(-7).map((v) => (typeof v === "number" ? v : 0));
}

export function mergeHashCounts(hashes: (Record<string, string> | null)[]): Record<string, number> {
  const merged: Record<string, number> = {};
  for (const hash of hashes) {
    if (!hash) continue;
    for (const [field, value] of Object.entries(hash)) {
      const n = Number(value);
      if (!Number.isFinite(n)) continue;
      merged[field] = (merged[field] ?? 0) + n;
    }
  }
  return merged;
}

export function topN(counts: Record<string, number>, n: number): { key: string; count: number }[] {
  return Object.entries(counts)
    .map(([key, count]) => ({ key, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, n);
}

export function minorUnitsToMajor(minorUnits: number): number {
  return Math.round(minorUnits) / 100;
}

export function majorUnitsToMinor(majorUnits: number): number {
  return Math.round(majorUnits * 100);
}
