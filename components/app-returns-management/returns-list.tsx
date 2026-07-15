// components/app-returns-management/returns-list.tsx
"use client";

import { useEffect, useState } from "react";
import { RETURN_STATUS_FILTERS, type ReturnStatusFilter, type ReturnManagementOrder } from "@/lib/returns-management";
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

export function ReturnsList({ shop }: { shop: string }) {
  const [activeStatus, setActiveStatus] = useState<ReturnStatusFilter>("all");
  const [state, setState] = useState<FetchState>({ status: "loading" });
  // Shopify's cursor pagination only moves forward (`after`), so "Back" is
  // implemented by remembering the cursor used to reach each prior page
  // rather than relying on `before`/`last`.
  const [cursor, setCursor] = useState<Cursor>(undefined);
  const [backStack, setBackStack] = useState<Cursor[]>([]);

  async function loadReturns(guard?: { cancelled: boolean }) {
    setState({ status: "loading" });
    try {
      const params = new URLSearchParams({ status: activeStatus });
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
  }, [activeStatus, cursor]);

  function retry() {
    loadReturns();
  }

  function selectStatus(value: ReturnStatusFilter) {
    setActiveStatus(value);
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
      <div className="flex items-center gap-2 flex-wrap mb-4">
        {RETURN_STATUS_FILTERS.map((value) => (
          <s-button
            key={value}
            variant={activeStatus === value ? "primary" : "secondary"}
            onClick={() => selectStatus(value)}
          >
            {STATUS_LABELS[value]}
          </s-button>
        ))}
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
          <div className="border border-border rounded-lg divide-y divide-border overflow-hidden">
            {state.orders.map((order) => (
              <a
                key={order.id}
                href={`https://${shop}/admin/orders/${order.numericId}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between px-4 py-3 hover:bg-muted transition-colors"
              >
                <div className="flex flex-col">
                  <span className="font-medium">{order.name}</span>
                  <span className="text-sm text-muted-foreground">{order.customerName}</span>
                </div>
                <span className="text-sm text-muted-foreground">{labelForGraphqlReturnStatus(order.returnStatus)}</span>
              </a>
            ))}
          </div>
          <div className="flex items-center justify-between gap-2 mt-4">
            <s-button variant="secondary" disabled={backStack.length === 0} onClick={goBack}>
              Back
            </s-button>
            <s-button variant="secondary" disabled={!state.hasNextPage} onClick={goNext}>
              Next
            </s-button>
          </div>
        </>
      )}
    </s-page>
  );
}
