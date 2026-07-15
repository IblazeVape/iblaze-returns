// components/app-returns-management/returns-list.tsx
"use client";

import { useEffect, useState } from "react";
import { ChevronDown, Check, Search, Columns3, Eye, EyeOff } from "lucide-react";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
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

/** "Order" is always shown (primary column, same as Shopify's own list where it isn't in the hide menu). */
type ColumnKey = "date" | "customer" | "total" | "returnStatus" | "financialStatus" | "fulfillmentStatus" | "items" | "tags" | "channel";

const ALL_COLUMNS: { key: ColumnKey; label: string }[] = [
  { key: "date", label: "Date" },
  { key: "customer", label: "Customer" },
  { key: "total", label: "Total" },
  { key: "returnStatus", label: "Return status" },
  { key: "financialStatus", label: "Payment status" },
  { key: "fulfillmentStatus", label: "Fulfillment status" },
  { key: "items", label: "Items" },
  { key: "tags", label: "Tags" },
  { key: "channel", label: "Channel" },
];

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
  const [searchInput, setSearchInput] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [state, setState] = useState<FetchState>({ status: "loading" });
  // Shopify's cursor pagination only moves forward (`after`), so "Back" is
  // implemented by remembering the cursor used to reach each prior page
  // rather than relying on `before`/`last`.
  const [cursor, setCursor] = useState<Cursor>(undefined);
  const [backStack, setBackStack] = useState<Cursor[]>([]);

  const [statusOpen, setStatusOpen] = useState(false);
  const [columnsOpen, setColumnsOpen] = useState(false);
  const [visibleColumns, setVisibleColumns] = useState<Set<ColumnKey>>(new Set(ALL_COLUMNS.map((c) => c.key)));

  function toggleColumn(key: ColumnKey) {
    setVisibleColumns((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }
  function isColumnVisible(key: ColumnKey) {
    return visibleColumns.has(key);
  }

  // Debounce the search box so every keystroke doesn't fire a request.
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchInput), 400);
    return () => clearTimeout(t);
  }, [searchInput]);

  async function loadReturns(guard?: { cancelled: boolean }) {
    setState({ status: "loading" });
    try {
      const params = new URLSearchParams({ status: activeStatus, sort: sortOption });
      if (debouncedSearch) params.set("search", debouncedSearch);
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
  }, [activeStatus, sortOption, debouncedSearch, cursor]);

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

  function handleSearchChange(value: string) {
    setSearchInput(value);
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
      <div className="flex items-center gap-3 border border-border rounded-lg px-3 py-2 mb-4 bg-background">
        <Popover open={statusOpen} onOpenChange={setStatusOpen}>
          <PopoverTrigger asChild>
            <button type="button" className="flex items-center gap-1 text-sm font-medium shrink-0 hover:text-foreground/80">
              {STATUS_LABELS[activeStatus]}
              <ChevronDown className="size-4 text-muted-foreground" />
            </button>
          </PopoverTrigger>
          <PopoverContent align="start" className="w-56 p-1">
            {RETURN_STATUS_FILTERS.map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => { selectStatus(value); setStatusOpen(false); }}
                className="flex w-full items-center justify-between rounded px-2 py-1.5 text-sm hover:bg-muted text-left"
              >
                <span className={activeStatus === value ? "font-medium" : ""}>{STATUS_LABELS[value]}</span>
                {activeStatus === value && <Check className="size-4 shrink-0" />}
              </button>
            ))}
          </PopoverContent>
        </Popover>

        <div className="w-px self-stretch bg-border" />

        <div className="flex items-center gap-2 flex-1 min-w-[140px]">
          <Search className="size-4 text-muted-foreground shrink-0" />
          <input
            type="text"
            value={searchInput}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder="Search and filter"
            className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
        </div>

        <Popover open={columnsOpen} onOpenChange={setColumnsOpen}>
          <PopoverTrigger asChild>
            <button type="button" className="p-1.5 rounded hover:bg-muted text-muted-foreground shrink-0" aria-label="Sort and columns">
              <Columns3 className="size-4" />
            </button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-64 p-2">
            <div className="px-2 pt-1 pb-2">
              <span className="text-xs font-medium text-muted-foreground">Sort by</span>
              <div className="mt-1 flex flex-col gap-0.5">
                {RETURN_SORT_OPTIONS.map((value) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => selectSort(value)}
                    className="flex w-full items-center justify-between rounded px-2 py-1.5 text-sm hover:bg-muted text-left"
                  >
                    <span className={sortOption === value ? "font-medium" : ""}>{SORT_LABELS[value]}</span>
                    {sortOption === value && <Check className="size-4 shrink-0" />}
                  </button>
                ))}
              </div>
            </div>
            <div className="border-t border-border px-2 pt-2">
              <span className="text-xs font-medium text-muted-foreground">Columns</span>
              <div className="mt-1 flex flex-col gap-0.5">
                {ALL_COLUMNS.map((col) => (
                  <button
                    key={col.key}
                    type="button"
                    onClick={() => toggleColumn(col.key)}
                    className="flex w-full items-center justify-between rounded px-2 py-1.5 text-sm hover:bg-muted text-left"
                  >
                    <span>{col.label}</span>
                    {isColumnVisible(col.key) ? (
                      <Eye className="size-4 text-muted-foreground shrink-0" />
                    ) : (
                      <EyeOff className="size-4 text-muted-foreground/50 shrink-0" />
                    )}
                  </button>
                ))}
              </div>
            </div>
          </PopoverContent>
        </Popover>
      </div>

      <div className="mb-2">
        <span className="text-sm font-semibold">Orders</span>
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
                  {isColumnVisible("date") && <th className="px-4 py-2 font-medium">Date</th>}
                  {isColumnVisible("customer") && <th className="px-4 py-2 font-medium">Customer</th>}
                  {isColumnVisible("total") && <th className="px-4 py-2 font-medium">Total</th>}
                  {isColumnVisible("returnStatus") && <th className="px-4 py-2 font-medium">Return status</th>}
                  {isColumnVisible("financialStatus") && <th className="px-4 py-2 font-medium">Payment status</th>}
                  {isColumnVisible("fulfillmentStatus") && <th className="px-4 py-2 font-medium">Fulfillment status</th>}
                  {isColumnVisible("items") && <th className="px-4 py-2 font-medium">Items</th>}
                  {isColumnVisible("tags") && <th className="px-4 py-2 font-medium">Tags</th>}
                  {isColumnVisible("channel") && <th className="px-4 py-2 font-medium">Channel</th>}
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
                      {isColumnVisible("date") && (
                        <td className="px-4 py-3 text-muted-foreground">{new Date(order.createdAt).toLocaleDateString()}</td>
                      )}
                      {isColumnVisible("customer") && <td className="px-4 py-3 text-muted-foreground">{order.customerName}</td>}
                      {isColumnVisible("total") && (
                        <td className="px-4 py-3 text-muted-foreground">{formatMoney(order.totalAmount, order.totalCurrency)}</td>
                      )}
                      {isColumnVisible("returnStatus") && (
                        <td className="px-4 py-3">
                          <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${returnStatusPillClass(order.returnStatus)}`}>
                            {labelForGraphqlReturnStatus(order.returnStatus)}
                          </span>
                        </td>
                      )}
                      {isColumnVisible("financialStatus") && (
                        <td className="px-4 py-3 text-muted-foreground">{humanizeEnum(order.financialStatus)}</td>
                      )}
                      {isColumnVisible("fulfillmentStatus") && (
                        <td className="px-4 py-3 text-muted-foreground">{humanizeEnum(order.fulfillmentStatus)}</td>
                      )}
                      {isColumnVisible("items") && <td className="px-4 py-3 text-muted-foreground">{order.itemCount}</td>}
                      {isColumnVisible("tags") && (
                        <td className="px-4 py-3 text-muted-foreground">{order.tags.length > 0 ? order.tags.join(", ") : "—"}</td>
                      )}
                      {isColumnVisible("channel") && (
                        <td className="px-4 py-3 text-muted-foreground">{order.channelName ?? "—"}</td>
                      )}
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
