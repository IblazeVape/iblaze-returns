// components/app-returns-management/returns-list.tsx
"use client";

import { useEffect, useState } from "react";
import {
  RETURN_STATUS_FILTERS,
  RETURN_SORT_OPTIONS,
  type ReturnStatusFilter,
  type ReturnSortOption,
  type ReturnManagementOrder,
} from "@/lib/returns-management";
import { MorphingInfinity } from "@/components/loading-ui/morphing-infinity";

/** `undefined` cursor means "first page" (no `after` param sent). */
type Cursor = string | undefined;

declare const shopify: {
  idToken: () => Promise<string>;
};

const STATUS_LABELS: Record<ReturnStatusFilter, string> = {
  all: "All",
  return_requested: "Return requested",
  in_progress: "In progress",
  inspection_complete: "Inspection complete",
  returned: "Returned",
  return_failed: "Failed",
};

const SORT_LABELS: Record<ReturnSortOption, string> = {
  date_desc: "Date: Newest first",
  date_asc: "Date: Oldest first",
  customer_asc: "Customer: A to Z",
  customer_desc: "Customer: Z to A",
};

type FetchState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; orders: ReturnManagementOrder[]; hasNextPage: boolean; endCursor: string | null };

async function authedFetch(input: string, init: RequestInit = {}) {
  const token = await shopify.idToken();
  return fetch(input, { ...init, headers: { ...init.headers, Authorization: `Bearer ${token}` } });
}

/**
 * Shopify's GraphQL OrderReturnStatus enum comes back SCREAMING_SNAKE_CASE
 * (e.g. "RETURN_REQUESTED"); STATUS_LABELS above is keyed by the lowercase
 * search-filter values instead, so this maps the enum shape to the same
 * label set for display.
 */
function labelForGraphqlReturnStatus(value: string): string {
  const key = value.toLowerCase() as ReturnStatusFilter;
  return STATUS_LABELS[key] ?? value;
}

/** "PARTIALLY_REFUNDED" -> "Partially refunded". Used for the financial/fulfillment status enums, which don't have a fixed label map like return status does. */
function humanizeEnum(value: string | null): string {
  if (!value) return "—";
  const words = value.toLowerCase().split("_");
  return words[0].charAt(0).toUpperCase() + words[0].slice(1) + (words.length > 1 ? " " + words.slice(1).join(" ") : "");
}

/** Return statuses needing action (requested/in-progress/failed) get an amber pill, matching Shopify's own "Return requested" badge color; resolved statuses get a neutral grey pill. */
function returnStatusPillClass(value: string): string {
  const needsAction = value === "RETURN_REQUESTED" || value === "IN_PROGRESS" || value === "RETURN_FAILED";
  return needsAction
    ? "bg-amber-100 text-amber-900 dark:bg-amber-500/20 dark:text-amber-300"
    : "bg-muted text-muted-foreground";
}

function formatMoney(amount: string, currency: string): string {
  const n = Number(amount);
  if (Number.isNaN(n)) return currency ? `${amount} ${currency}` : amount;
  return currency ? `${n.toFixed(2)} ${currency}` : n.toFixed(2);
}

export function ReturnsList({ shop }: { shop: string }) {
  const [activeStatus, setActiveStatus] = useState<ReturnStatusFilter>("all");
  const [sortOption, setSortOption] = useState<ReturnSortOption>("date_desc");
  const [state, setState] = useState<FetchState>({ status: "loading" });
  // Shopify's cursor pagination only moves forward (`after`), so "Back" is
  // implemented by remembering the cursor used to reach each prior page
  // rather than relying on `before`/`last`.
  const [cursor, setCursor] = useState<Cursor>(undefined);
  const [backStack, setBackStack] = useState<Cursor[]>([]);

  async function loadReturns(guard?: { cancelled: boolean }) {
    setState({ status: "loading" });
    try {
      const params = new URLSearchParams({ status: activeStatus, sort: sortOption });
      if (cursor) params.set("after", cursor);
      const res = await authedFetch(`/api/app/returns?${params.toString()}`);
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Couldn't load returns.");
      if (!guard?.cancelled) {
        setState({
          status: "ready",
          orders: data.orders,
          hasNextPage: data.pageInfo?.hasNextPage ?? false,
          endCursor: data.pageInfo?.endCursor ?? null,
        });
      }
    } catch (err) {
      if (!guard?.cancelled) {
        setState({ status: "error", message: err instanceof Error ? err.message : "Something went wrong." });
      }
    }
  }

  useEffect(() => {
    const guard = { cancelled: false };
    loadReturns(guard);
    return () => { guard.cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeStatus, sortOption, cursor]);

  function retry() {
    loadReturns();
  }

  function selectStatus(value: ReturnStatusFilter) {
    setActiveStatus(value);
    setCursor(undefined);
    setBackStack([]);
  }

  function selectSort(value: ReturnSortOption) {
    setSortOption(value);
    setCursor(undefined);
    setBackStack([]);
  }

  function goNext() {
    if (state.status !== "ready" || !state.endCursor) return;
    setBackStack((prev) => [...prev, cursor]);
    setCursor(state.endCursor);
  }

  function goBack() {
    setBackStack((prev) => {
      if (prev.length === 0) return prev;
      const next = prev.slice(0, -1);
      setCursor(prev[prev.length - 1]);
      return next;
    });
  }

  return (
    <s-page heading="Returns">
      <div className="flex items-center justify-between gap-2 flex-wrap mb-4">
        <s-select
          label="Status"
          value={activeStatus}
          onChange={(e: React.ChangeEvent<HTMLSelectElement>) => selectStatus(e.target.value as ReturnStatusFilter)}
        >
          {RETURN_STATUS_FILTERS.map((value) => (
            <s-option key={value} value={value}>{STATUS_LABELS[value]}</s-option>
          ))}
        </s-select>
        <s-select
          label="Sort by"
          value={sortOption}
          onChange={(e: React.ChangeEvent<HTMLSelectElement>) => selectSort(e.target.value as ReturnSortOption)}
        >
          {RETURN_SORT_OPTIONS.map((value) => (
            <s-option key={value} value={value}>{SORT_LABELS[value]}</s-option>
          ))}
        </s-select>
      </div>

      {state.status === "loading" && (
        <s-box padding="large">
          <s-stack direction="block" alignItems="center">
            <MorphingInfinity className="size-8 text-muted-foreground" />
          </s-stack>
        </s-box>
      )}

      {state.status === "error" && (
        <s-banner heading="Couldn't load returns" tone="critical">
          <s-paragraph>{state.message}</s-paragraph>
          <s-button onClick={retry}>Retry</s-button>
        </s-banner>
      )}

      {state.status === "ready" && state.orders.length === 0 && (
        <s-paragraph>No returns in this status.</s-paragraph>
      )}

      {state.status === "ready" && state.orders.length > 0 && (
        <>
          <div className="border border-border rounded-lg overflow-hidden overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40 text-left text-muted-foreground">
                  <th className="px-4 py-2 font-medium">Order</th>
                  <th className="px-4 py-2 font-medium">Date</th>
                  <th className="px-4 py-2 font-medium">Customer</th>
                  <th className="px-4 py-2 font-medium">Total</th>
                  <th className="px-4 py-2 font-medium">Return status</th>
                  <th className="px-4 py-2 font-medium">Payment status</th>
                  <th className="px-4 py-2 font-medium">Fulfillment status</th>
                  <th className="px-4 py-2 font-medium">Items</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {state.orders.map((order) => {
                  const url = `https://${shop}/admin/orders/${order.numericId}`;
                  function open() {
                    window.open(url, "_blank", "noopener,noreferrer");
                  }
                  return (
                    <tr
                      key={order.id}
                      role="link"
                      tabIndex={0}
                      onClick={open}
                      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); open(); } }}
                      className="cursor-pointer hover:bg-muted transition-colors"
                    >
                      <td className="px-4 py-3 font-medium">{order.name}</td>
                      <td className="px-4 py-3 text-muted-foreground">{new Date(order.createdAt).toLocaleDateString()}</td>
                      <td className="px-4 py-3 text-muted-foreground">{order.customerName}</td>
                      <td className="px-4 py-3 text-muted-foreground">{formatMoney(order.totalAmount, order.totalCurrency)}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${returnStatusPillClass(order.returnStatus)}`}>
                          {labelForGraphqlReturnStatus(order.returnStatus)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{humanizeEnum(order.financialStatus)}</td>
                      <td className="px-4 py-3 text-muted-foreground">{humanizeEnum(order.fulfillmentStatus)}</td>
                      <td className="px-4 py-3 text-muted-foreground">{order.itemCount}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {(backStack.length > 0 || state.hasNextPage) && (
            <div className="flex items-center justify-between gap-2 mt-4">
              {backStack.length > 0 ? (
                <s-button variant="secondary" onClick={goBack}>Back</s-button>
              ) : (
                <span />
              )}
              {state.hasNextPage && (
                <s-button variant="secondary" onClick={goNext}>Next</s-button>
              )}
            </div>
          )}
        </>
      )}
    </s-page>
  );
}
