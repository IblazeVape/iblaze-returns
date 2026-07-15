// components/app-returns-management/returns-summary.tsx
"use client";

import { useEffect, useState } from "react";
import { MorphingInfinity } from "@/components/loading-ui/morphing-infinity";

declare const shopify: {
  idToken: () => Promise<string>;
};

type FetchState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; count: number; nativeUrl: string };

async function authedFetch(input: string, init: RequestInit = {}) {
  const token = await shopify.idToken();
  return fetch(input, { ...init, headers: { ...init.headers, Authorization: `Bearer ${token}` } });
}

/**
 * Deliberately not a rebuilt table. Shopify's own internal table components
 * (used to render the native Orders list) aren't exposed to third-party
 * apps, so a hand-built table can only ever approximate — not match —
 * Shopify's real design. Instead this page shows a live count and deep-links
 * straight to Shopify's own native Orders page, pre-filtered to
 * return-requested orders with the columns merchants want: the actual native
 * UI, not a lookalike.
 */
export function ReturnsSummary() {
  const [state, setState] = useState<FetchState>({ status: "loading" });

  useEffect(() => {
    let cancelled = false;
    authedFetch("/api/app/returns")
      .then(async (res) => {
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || "Couldn't load return count.");
        if (!cancelled) setState({ status: "ready", count: data.count, nativeUrl: data.nativeUrl });
      })
      .catch((err) => {
        if (!cancelled) setState({ status: "error", message: err instanceof Error ? err.message : "Something went wrong." });
      });
    return () => { cancelled = true; };
  }, []);

  return (
    <s-page heading="Returns" inlineSize="large">
      <s-section>
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
          </s-banner>
        )}

        {state.status === "ready" && (
          <s-stack direction="block" gap="base">
            <s-heading>
              {state.count} {state.count === 1 ? "order needs" : "orders need"} attention
            </s-heading>
            <s-paragraph>
              These orders have an active return request. Approve, decline, and manage each return
              from Shopify's own Orders page — the exact same view, filtered and columned for
              returns.
            </s-paragraph>
            <s-button href={state.nativeUrl} target="_blank" variant="primary">
              Open in Shopify Orders
            </s-button>
          </s-stack>
        )}
      </s-section>
    </s-page>
  );
}
