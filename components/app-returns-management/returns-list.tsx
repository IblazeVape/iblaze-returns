// components/app-returns-management/returns-list.tsx
"use client";

import { useEffect, useState } from "react";
import {
  RETURN_SORT_OPTIONS,
  type ReturnSortOption,
  type ReturnManagementOrder,
  type ReturnOrderLineItem,
  type ReturnDeliveryInfo,
} from "@/lib/returns-management";

/** `undefined` cursor means "first page" (no `after` param sent). */
type Cursor = string | undefined;

declare const shopify: {
  idToken: () => Promise<string>;
};

const SORT_LABELS: Record<ReturnSortOption, string> = {
  date_desc: "Date: Newest first",
  date_asc: "Date: Oldest first",
  customer_asc: "Customer: A to Z",
  customer_desc: "Customer: Z to A",
};

/** "Order" is always shown (primary column, not draggable/hideable — same as Shopify's own list). */
type ColumnKey =
  | "date"
  | "customer"
  | "total"
  | "returnStatus"
  | "financialStatus"
  | "fulfillmentStatus"
  | "items"
  | "deliveryMethod"
  | "deliveryStatus";

const COLUMN_LABELS: Record<ColumnKey, string> = {
  date: "Date",
  customer: "Customer",
  total: "Total",
  returnStatus: "Return status",
  financialStatus: "Payment status",
  fulfillmentStatus: "Fulfillment status",
  items: "Items",
  deliveryMethod: "Delivery method",
  deliveryStatus: "Delivery status",
};

const DEFAULT_COLUMN_ORDER: ColumnKey[] = [
  "date",
  "customer",
  "total",
  "returnStatus",
  "financialStatus",
  "fulfillmentStatus",
  "items",
  "deliveryMethod",
  "deliveryStatus",
];

type FetchState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; orders: ReturnManagementOrder[]; hasNextPage: boolean; endCursor: string | null };

type ItemsCacheEntry =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; items: ReturnOrderLineItem[] };

type DeliveryCacheEntry =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; fulfillments: ReturnDeliveryInfo[] };

async function authedFetch(input: string, init: RequestInit = {}) {
  const token = await shopify.idToken();
  return fetch(input, { ...init, headers: { ...init.headers, Authorization: `Bearer ${token}` } });
}

/** "PARTIALLY_REFUNDED" -> "Partially refunded". Shared humanizer for every SCREAMING_SNAKE_CASE enum this page shows. */
function humanizeEnum(value: string | null): string {
  if (!value) return "—";
  const words = value.toLowerCase().split("_");
  return words[0].charAt(0).toUpperCase() + words[0].slice(1) + (words.length > 1 ? " " + words.slice(1).join(" ") : "");
}

/**
 * Verified live against Shopify's own order list (badge tone/icon attrs
 * read straight off the DOM): almost every status badge renders neutral
 * (grey). Only "Return requested" and "Partially fulfilled" get the amber
 * warning tone. Paid, Fulfilled, Delivered, Partially refunded are all
 * plain neutral badges — no green/success tone anywhere in this table.
 */
function fulfillmentStatusTone(value: string | null): "warning" | "neutral" {
  return value === "PARTIALLY_FULFILLED" ? "warning" : "neutral";
}

function formatMoney(amount: string, currency: string): string {
  const n = Number(amount);
  if (Number.isNaN(n)) return currency ? `${amount} ${currency}` : amount;
  return currency ? `${n.toFixed(2)} ${currency}` : n.toFixed(2);
}

function formatDateTime(value: string | null): string | null {
  if (!value) return null;
  return new Date(value).toLocaleString(undefined, { weekday: "long", month: "short", day: "numeric" });
}

export function ReturnsList({ shop }: { shop: string }) {
  const [sortOption, setSortOption] = useState<ReturnSortOption>("date_desc");
  const [searchInput, setSearchInput] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [state, setState] = useState<FetchState>({ status: "loading" });
  // Shopify's cursor pagination only moves forward (`after`), so "Back" is
  // implemented by remembering the cursor used to reach each prior page
  // rather than relying on `before`/`last`.
  const [cursor, setCursor] = useState<Cursor>(undefined);
  const [backStack, setBackStack] = useState<Cursor[]>([]);

  const [columnOrder, setColumnOrder] = useState<ColumnKey[]>(DEFAULT_COLUMN_ORDER);
  const [visibleColumns, setVisibleColumns] = useState<Set<ColumnKey>>(new Set(DEFAULT_COLUMN_ORDER));
  const [draggedColumn, setDraggedColumn] = useState<ColumnKey | null>(null);

  const [itemsCache, setItemsCache] = useState<Record<string, ItemsCacheEntry>>({});
  const [deliveryCache, setDeliveryCache] = useState<Record<string, DeliveryCacheEntry>>({});

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

  function handleColumnDragStart(key: ColumnKey) {
    setDraggedColumn(key);
  }
  function handleColumnDragOver(e: React.DragEvent, overKey: ColumnKey) {
    e.preventDefault();
    if (!draggedColumn || draggedColumn === overKey) return;
    setColumnOrder((prev) => {
      const from = prev.indexOf(draggedColumn);
      const to = prev.indexOf(overKey);
      if (from === -1 || to === -1) return prev;
      const next = [...prev];
      next.splice(from, 1);
      next.splice(to, 0, draggedColumn);
      return next;
    });
  }
  function handleColumnDragEnd() {
    setDraggedColumn(null);
  }

  // Debounce the search box so every keystroke doesn't fire a request.
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchInput), 400);
    return () => clearTimeout(t);
  }, [searchInput]);

  async function loadReturns(guard?: { cancelled: boolean }) {
    setState((prev) => (prev.status === "ready" ? prev : { status: "loading" }));
    try {
      const params = new URLSearchParams({ sort: sortOption });
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
  }, [sortOption, debouncedSearch, cursor]);

  function retry() {
    loadReturns();
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

  function loadItemsFor(orderId: string) {
    const existing = itemsCache[orderId];
    if (existing && (existing.status === "loading" || existing.status === "ready")) return;
    setItemsCache((prev) => ({ ...prev, [orderId]: { status: "loading" } }));
    authedFetch(`/api/app/returns/items?orderId=${encodeURIComponent(orderId)}`)
      .then(async (res) => {
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || "Couldn't load items.");
        setItemsCache((prev) => ({ ...prev, [orderId]: { status: "ready", items: data.items } }));
      })
      .catch((err) => {
        setItemsCache((prev) => ({
          ...prev,
          [orderId]: { status: "error", message: err instanceof Error ? err.message : "Something went wrong." },
        }));
      });
  }

  function loadDeliveryFor(orderId: string) {
    const existing = deliveryCache[orderId];
    if (existing && (existing.status === "loading" || existing.status === "ready")) return;
    setDeliveryCache((prev) => ({ ...prev, [orderId]: { status: "loading" } }));
    authedFetch(`/api/app/returns/delivery?orderId=${encodeURIComponent(orderId)}`)
      .then(async (res) => {
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || "Couldn't load delivery status.");
        setDeliveryCache((prev) => ({ ...prev, [orderId]: { status: "ready", fulfillments: data.fulfillments } }));
      })
      .catch((err) => {
        setDeliveryCache((prev) => ({
          ...prev,
          [orderId]: { status: "error", message: err instanceof Error ? err.message : "Something went wrong." },
        }));
      });
  }

  const orders = state.status === "ready" ? state.orders : [];
  const isLoading = state.status === "loading";
  const visibleColumnOrder = columnOrder.filter((key) => isColumnVisible(key));

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
          <div className="overflow-x-auto">
            <s-table
              variant="table"
              paginate
              hasPreviousPage={backStack.length > 0}
              hasNextPage={state.status === "ready" ? state.hasNextPage : false}
              loading={isLoading}
              onPreviousPage={goBack}
              onNextPage={goNext}
            >
              <s-grid slot="filters" gap="small-200" gridTemplateColumns="1fr auto">
                <s-text-field
                  label="Search returns"
                  labelAccessibilityVisibility="exclusive"
                  icon="search"
                  placeholder="Search and filter"
                  value={searchInput}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleSearchChange(e.target.value)}
                ></s-text-field>

                <s-button commandFor="display-popover" icon="grid" variant="secondary" accessibilityLabel="Display options"></s-button>
                <s-popover id="display-popover">
                  <s-box padding="small">
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
                      <s-text color="subdued">Columns (drag to reorder)</s-text>
                      {columnOrder.map((key) => (
                        <div
                          key={key}
                          draggable
                          onDragStart={() => handleColumnDragStart(key)}
                          onDragOver={(e) => handleColumnDragOver(e, key)}
                          onDragEnd={handleColumnDragEnd}
                          className="flex items-center gap-2 cursor-move py-0.5"
                        >
                          <span className="text-muted-foreground text-xs select-none">⠿</span>
                          <s-checkbox checked={isColumnVisible(key)} onChange={() => toggleColumn(key)}>
                            {COLUMN_LABELS[key]}
                          </s-checkbox>
                        </div>
                      ))}
                    </s-stack>
                  </s-box>
                </s-popover>
              </s-grid>

              <s-table-header-row>
                <s-table-header listSlot="primary">Order</s-table-header>
                {visibleColumnOrder.map((key) => (
                  <s-table-header key={key} format={key === "total" ? "currency" : key === "items" ? "numeric" : "base"}>
                    {COLUMN_LABELS[key]}
                  </s-table-header>
                ))}
              </s-table-header-row>
              <s-table-body>
                {orders.map((order) => {
                  const url = `https://${shop}/admin/orders/${order.numericId}`;
                  const linkId = `order-link-${order.id}`;
                  const itemsPopoverId = `items-popover-${order.id}`;
                  const deliveryPopoverId = `delivery-popover-${order.id}`;
                  const itemsState = itemsCache[order.id];
                  const deliveryState = deliveryCache[order.id];
                  return (
                    <s-table-row key={order.id} clickDelegate={linkId}>
                      <s-table-cell>
                        <s-link id={linkId} href={url} target="_blank">{order.name}</s-link>
                      </s-table-cell>
                      {visibleColumnOrder.map((key) => {
                        switch (key) {
                          case "date":
                            return <s-table-cell key={key}>{new Date(order.createdAt).toLocaleDateString()}</s-table-cell>;
                          case "customer":
                            return <s-table-cell key={key}>{order.customerName}</s-table-cell>;
                          case "total":
                            return <s-table-cell key={key}>{formatMoney(order.totalAmount, order.totalCurrency)}</s-table-cell>;
                          case "returnStatus":
                            return (
                              <s-table-cell key={key}>
                                <s-badge tone="warning">Return requested</s-badge>
                              </s-table-cell>
                            );
                          case "financialStatus":
                            return (
                              <s-table-cell key={key}>
                                {order.financialStatus ? <s-badge>{humanizeEnum(order.financialStatus)}</s-badge> : "—"}
                              </s-table-cell>
                            );
                          case "fulfillmentStatus":
                            return (
                              <s-table-cell key={key}>
                                {order.fulfillmentStatus ? (
                                  <s-badge tone={fulfillmentStatusTone(order.fulfillmentStatus)}>{humanizeEnum(order.fulfillmentStatus)}</s-badge>
                                ) : (
                                  "—"
                                )}
                              </s-table-cell>
                            );
                          case "items":
                            return (
                              <s-table-cell key={key}>
                                <s-button
                                  commandFor={itemsPopoverId}
                                  variant="tertiary"
                                  onClick={() => loadItemsFor(order.id)}
                                >
                                  {order.itemCount} items
                                </s-button>
                                <s-popover id={itemsPopoverId}>
                                  <s-box padding="small" maxInlineSize="320px">
                                    {(!itemsState || itemsState.status === "loading") && <s-paragraph>Loading…</s-paragraph>}
                                    {itemsState?.status === "error" && <s-paragraph>{itemsState.message}</s-paragraph>}
                                    {itemsState?.status === "ready" && itemsState.items.length === 0 && (
                                      <s-paragraph>No returned items found.</s-paragraph>
                                    )}
                                    {itemsState?.status === "ready" && itemsState.items.length > 0 && (
                                      <s-stack direction="block" gap="base">
                                        <s-badge tone="warning">Return requested</s-badge>
                                        {itemsState.items.map((item) => (
                                          <s-box key={item.id} padding="small" border="base" borderRadius="base">
                                            <s-stack direction="inline" gap="small" alignItems="start">
                                              {item.imageUrl && (
                                                <s-image src={item.imageUrl} inlineSize="40px" blockSize="40px" objectFit="cover"></s-image>
                                              )}
                                              <s-stack direction="block" gap="small-300">
                                                <s-stack direction="inline" gap="small" alignItems="center">
                                                  {item.productId ? (
                                                    <s-link href={`https://${shop}/admin/products/${item.productId.split("/").pop()}`} target="_blank">
                                                      {item.title}
                                                    </s-link>
                                                  ) : (
                                                    <s-text>{item.title}</s-text>
                                                  )}
                                                  <s-text color="subdued">× {item.quantity}</s-text>
                                                </s-stack>
                                                {item.sku && <s-text color="subdued">{item.sku}</s-text>}
                                                {item.returnReason && <s-text color="subdued">Return reason: {item.returnReason}</s-text>}
                                              </s-stack>
                                            </s-stack>
                                          </s-box>
                                        ))}
                                      </s-stack>
                                    )}
                                  </s-box>
                                </s-popover>
                              </s-table-cell>
                            );
                          case "deliveryMethod":
                            return <s-table-cell key={key}>{order.deliveryMethod ?? "—"}</s-table-cell>;
                          case "deliveryStatus":
                            return (
                              <s-table-cell key={key}>
                                {order.deliveryStatus ? (
                                  <>
                                    <s-button
                                      commandFor={deliveryPopoverId}
                                      variant="tertiary"
                                      onClick={() => loadDeliveryFor(order.id)}
                                    >
                                      <s-badge>{humanizeEnum(order.deliveryStatus)}</s-badge>
                                    </s-button>
                                    <s-popover id={deliveryPopoverId}>
                                      <s-box padding="small" maxInlineSize="280px">
                                        {(!deliveryState || deliveryState.status === "loading") && <s-paragraph>Loading…</s-paragraph>}
                                        {deliveryState?.status === "error" && <s-paragraph>{deliveryState.message}</s-paragraph>}
                                        {deliveryState?.status === "ready" &&
                                          deliveryState.fulfillments.map((f, i) => (
                                            <s-stack key={i} direction="block" gap="small">
                                              <s-stack direction="inline" gap="small" alignItems="center">
                                                <s-badge>{humanizeEnum(f.displayStatus)}</s-badge>
                                                {f.fulfillmentName && <s-text color="subdued">{f.fulfillmentName}</s-text>}
                                              </s-stack>
                                              {formatDateTime(f.deliveredAt ?? f.estimatedDeliveryAt) && (
                                                <s-text>{formatDateTime(f.deliveredAt ?? f.estimatedDeliveryAt)}</s-text>
                                              )}
                                              {f.trackingNumber && (
                                                <s-text>
                                                  {f.trackingCompany ? `${f.trackingCompany}: ` : ""}
                                                  {f.trackingUrl ? (
                                                    <s-link href={f.trackingUrl} target="_blank">{f.trackingNumber}</s-link>
                                                  ) : (
                                                    f.trackingNumber
                                                  )}
                                                </s-text>
                                              )}
                                            </s-stack>
                                          ))}
                                      </s-box>
                                    </s-popover>
                                  </>
                                ) : (
                                  "—"
                                )}
                              </s-table-cell>
                            );
                          default:
                            return null;
                        }
                      })}
                    </s-table-row>
                  );
                })}
              </s-table-body>
            </s-table>
          </div>
          {state.status === "ready" && orders.length === 0 && (
            <s-box padding="base">
              <s-paragraph>No return requests right now.</s-paragraph>
            </s-box>
          )}
        </s-section>
      )}
    </s-page>
  );
}
