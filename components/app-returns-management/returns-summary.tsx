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
  | { status: "opened" }
  | { status: "blocked"; url: string };

async function authedFetch(input: string, init: RequestInit = {}) {
  const token = await shopify.idToken();
  return fetch(input, { ...init, headers: { ...init.headers, Authorization: `Bearer ${token}` } });
}

/**
 * No table here — Shopify's own internal table components (used to render
 * the native Orders list) aren't exposed to third-party apps, so a
 * hand-built copy could only ever approximate their real design. Instead,
 * as soon as this page loads it opens Shopify's own native Orders page in a
 * new tab, pre-filtered to return-requested orders with the columns the
 * merchant wants: the actual native UI, not a copy.
 *
 * A tab opened this way (from a useEffect, after an async token exchange +
 * fetch — no direct click in the call chain) is a coin flip: browsers only
 * guarantee window.open() succeeds when it's called synchronously inside a
 * real user-gesture handler. Here it often still works (many browsers keep
 * a window of leeway after the "Returns" nav click), but when a browser's
 * popup blocker does kick in, window.open() returns null/undefined instead
 * of throwing — so that return value is exactly the signal to fall back to
 * a real, always-reliable click-to-open link instead of leaving the
 * merchant looking at nothing.
 */
export function ReturnsSummary() {
  const [state, setState] = useState<FetchState>({ status: "loading" });

  useEffect(() => {
    let cancelled = false;
    authedFetch("/api/app/returns")
      .then(async (res) => {
        const data = await res.json().catch(() => ({}));
        if (!res.ok || !data.nativeUrl) throw new Error(data.error || "Couldn't open returns.");
        if (cancelled) return;
        const win = window.open(data.nativeUrl, "_blank", "noopener,noreferrer");
        setState(win ? { status: "opened" } : { status: "blocked", url: data.nativeUrl });
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

        {state.status === "opened" && <s-paragraph>Return requests opened in a new tab.</s-paragraph>}

        {state.status === "blocked" && (
          <s-stack direction="block" gap="base">
            <s-paragraph>Your browser blocked the new tab.</s-paragraph>
            <s-button href={state.url} target="_blank" variant="primary">
              Open return requests
            </s-button>
          </s-stack>
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
