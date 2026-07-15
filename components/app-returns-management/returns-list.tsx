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
type ColumnKey = "date" | "customer" | "total" | "returnStatus" | "financialStatus" | "fulfillmentStatus" | "items" | "deliveryMethod";

const ALL_COLUMNS: { key: ColumnKey; label: string; format?: "numeric" | "currency" }[] = [
  { key: "date", label: "Date" },
  { key: "customer", label: "Customer" },
  { key: "total", label: "Total", format: "currency" },
  { key: "returnStatus", label: "Return status" },
  { key: "financialStatus", label: "Payment status" },
  { key: "fulfillmentStatus", label: "Fulfillment status" },
  { key: "items", label: "Items", format: "numeric" },
  { key: "deliveryMethod", label: "Delivery method" },
];

/** All the columns this app needs are visible by default — no optional/hidden set here. */
const DEFAULT_VISIBLE_COLUMNS: ColumnKey[] = ALL_COLUMNS.map((c) => c.key);

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

/** Return statuses needing action (requested/in-progress/failed) get a warning badge, matching Shopify's own "Return requested" tone; resolved statuses are neutral. */
function returnStatusTone(value: string): string {
  const needsAction = value === "RETURN_REQUESTED" || value === "IN_PROGRESS" || value === "RETURN_FAILED";
  return needsAction ? "warning" : "neutral";
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

  const [visibleColumns, setVisibleColumns] = useState<Set<ColumnKey>>(new Set(DEFAULT_VISIBLE_COLUMNS));

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
    setState((prev) => (prev.status === "ready" ? prev : { status: "loading" }));
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

  const orders = state.status === "ready" ? state.orders : [];
  const isLoading = state.status === "loading";

  return (
    <s-page heading="Returns" inlineSize="large">
      {state.status === "error" && (
        <s-banner heading="Couldn't load returns" tone="critical">
          <s-paragraph>{state.message}</s-paragraph>
          <s-button onClick={retry}>Retry</s-button>
        </s-banner>
      )}

      {state.status !== "error" && (
        <s-section padding="none" accessibilityLabel="Returns table">
          <s-table
            paginate
            hasPreviousPage={backStack.length > 0}
            hasNextPage={state.status === "ready" ? state.hasNextPage : false}
            loading={isLoading}
            onPreviousPage={goBack}
            onNextPage={goNext}
          >
            <s-grid slot="filters" gap="small-200" gridTemplateColumns="1fr auto auto">
              <s-text-field
                label="Search returns"
                labelAccessibilityVisibility="exclusive"
                icon="search"
                placeholder="Search and filter"
                value={searchInput}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleSearchChange(e.target.value)}
              ></s-text-field>

              <s-button commandFor="status-popover" variant="secondary">{STATUS_LABELS[activeStatus]}</s-button>
              <s-popover id="status-popover">
                <s-box padding="small">
                  <s-choice-list
                    label="Status"
                    labelAccessibilityVisibility="exclusive"
                    value={activeStatus}
                    onChange={(e: React.ChangeEvent<HTMLInputElement> & { currentTarget: { value: string } }) =>
                      selectStatus(e.currentTarget.value as ReturnStatusFilter)
                    }
                  >
                    {RETURN_STATUS_FILTERS.map((value) => (
                      <s-choice key={value} value={value}>{STATUS_LABELS[value]}</s-choice>
                    ))}
                  </s-choice-list>
                </s-box>
              </s-popover>

              <s-button commandFor="display-popover" icon="sort" variant="secondary" accessibilityLabel="Display options"></s-button>
              <s-popover id="display-popover">
                <s-box padding="small">
                  <s-stack direction="block" gap="base">
                    <s-choice-list
                      label="Sort by"
                      value={sortOption}
                      onChange={(e: React.ChangeEvent<HTMLInputElement> & { currentTarget: { value: string } }) =>
                        selectSort(e.currentTarget.value as ReturnSortOption)
                      }
                    >
                      {RETURN_SORT_OPTIONS.map((value) => (
                        <s-choice key={value} value={value}>{SORT_LABELS[value]}</s-choice>
                      ))}
                    </s-choice-list>
                    <s-divider></s-divider>
                    <s-stack direction="block" gap="small-300">
                      <s-text color="subdued">Columns</s-text>
                      {ALL_COLUMNS.map((col) => (
                        <s-checkbox
                          key={col.key}
                          checked={isColumnVisible(col.key)}
                          onChange={() => toggleColumn(col.key)}
                        >
                          {col.label}
                        </s-checkbox>
                      ))}
                    </s-stack>
                  </s-stack>
                </s-box>
              </s-popover>
            </s-grid>

            <s-table-header-row>
              <s-table-header listSlot="primary">Order</s-table-header>
              {isColumnVisible("date") && <s-table-header>Date</s-table-header>}
              {isColumnVisible("customer") && <s-table-header listSlot="secondary">Customer</s-table-header>}
              {isColumnVisible("total") && <s-table-header format="currency">Total</s-table-header>}
              {isColumnVisible("returnStatus") && <s-table-header listSlot="inline">Return status</s-table-header>}
              {isColumnVisible("financialStatus") && <s-table-header>Payment status</s-table-header>}
              {isColumnVisible("fulfillmentStatus") && <s-table-header>Fulfillment status</s-table-header>}
              {isColumnVisible("items") && <s-table-header format="numeric">Items</s-table-header>}
              {isColumnVisible("deliveryMethod") && <s-table-header>Delivery method</s-table-header>}
            </s-table-header-row>
            <s-table-body>
              {orders.map((order) => {
                const url = `https://${shop}/admin/orders/${order.numericId}`;
                const linkId = `order-link-${order.id}`;
                return (
                  <s-table-row key={order.id} clickDelegate={linkId}>
                    <s-table-cell>
                      <s-link id={linkId} href={url} target="_blank">{order.name}</s-link>
                    </s-table-cell>
                    {isColumnVisible("date") && <s-table-cell>{new Date(order.createdAt).toLocaleDateString()}</s-table-cell>}
                    {isColumnVisible("customer") && <s-table-cell>{order.customerName}</s-table-cell>}
                    {isColumnVisible("total") && <s-table-cell>{formatMoney(order.totalAmount, order.totalCurrency)}</s-table-cell>}
                    {isColumnVisible("returnStatus") && (
                      <s-table-cell>
                        <s-badge tone={returnStatusTone(order.returnStatus)}>{labelForGraphqlReturnStatus(order.returnStatus)}</s-badge>
                      </s-table-cell>
                    )}
                    {isColumnVisible("financialStatus") && <s-table-cell>{humanizeEnum(order.financialStatus)}</s-table-cell>}
                    {isColumnVisible("fulfillmentStatus") && <s-table-cell>{humanizeEnum(order.fulfillmentStatus)}</s-table-cell>}
                    {isColumnVisible("items") && <s-table-cell>{order.itemCount}</s-table-cell>}
                    {isColumnVisible("deliveryMethod") && <s-table-cell>{order.deliveryMethod ?? "—"}</s-table-cell>}
                  </s-table-row>
                );
              })}
            </s-table-body>
          </s-table>
          {state.status === "ready" && orders.length === 0 && (
            <s-box padding="base">
              <s-paragraph>No returns in this status.</s-paragraph>
            </s-box>
          )}
        </s-section>
      )}
    </s-page>
  );
}
