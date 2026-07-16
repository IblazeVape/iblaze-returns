// components/app-returns-management/returns-summary.tsx
"use client";

import { useEffect, useState } from "react";
import { MorphingInfinity } from "@/components/loading-ui/morphing-infinity";

declare const shopify: {
  idToken: () => Promise<string>;
};

type FetchState = { status: "loading" } | { status: "error"; message: string } | { status: "ready"; url: string };

async function authedFetch(input: string, init: RequestInit = {}) {
  const token = await shopify.idToken();
  return fetch(input, { ...init, headers: { ...init.headers, Authorization: `Bearer ${token}` } });
}

/**
 * No table here — Shopify's own internal table components (used to render
 * the native Orders list) aren't exposed to third-party apps, so a
 * hand-built copy could only ever approximate their real design. Instead,
 * this page deep-links straight to Shopify's own native Orders page,
 * pre-filtered to return-requested orders with the columns the merchant
 * wants: the actual native UI, not a copy.
 *
 * Opening a new tab automatically (no direct click) isn't reliable —
 * confirmed both by MDN's user-activation rules and independently by
 * Shopify's own Sidekick: window.open() only reliably opens a new tab
 * when it's the direct, synchronous result of a user gesture (a click).
 * Called from a useEffect after an async token exchange + fetch, it has
 * no such gesture to point to and gets silently blocked in most browsers.
 * So this renders a real <a target="_blank"> the merchant clicks — the
 * only combination that's actually guaranteed to open a new tab.
 */
export function ReturnsSummary() {
  const [state, setState] = useState<FetchState>({ status: "loading" });

  useEffect(() => {
    let cancelled = false;
    authedFetch("/api/app/returns")
      .then(async (res) => {
        const data = await res.json().catch(() => ({}));
        if (!res.ok || !data.nativeUrl) throw new Error(data.error || "Couldn't open returns.");
        if (!cancelled) setState({ status: "ready", url: data.nativeUrl });
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

        {state.status === "ready" && (
          <s-button href={state.url} target="_blank" variant="primary">
            Open return requests
          </s-button>
        )}

        {state.status === "error" && (
          <s-banner heading="Couldn't open returns" tone="critical">
            <s-paragraph>{state.message}</s-paragraph>
          </s-banner>
        )}
      </s-section>
    </s-page>
  );
}
