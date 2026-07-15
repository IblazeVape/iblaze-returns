// components/app-returns-management/returns-summary.tsx
"use client";

import { useEffect, useRef, useState } from "react";
import { MorphingInfinity } from "@/components/loading-ui/morphing-infinity";

declare const shopify: {
  idToken: () => Promise<string>;
};

type FetchState = { status: "loading" } | { status: "error"; message: string } | { status: "redirecting" };

async function authedFetch(input: string, init: RequestInit = {}) {
  const token = await shopify.idToken();
  return fetch(input, { ...init, headers: { ...init.headers, Authorization: `Bearer ${token}` } });
}

/**
 * No table here — Shopify's own internal table components (used to render
 * the native Orders list) aren't exposed to third-party apps, so a
 * hand-built copy could only ever approximate their real design. Instead,
 * as soon as this page loads it redirects the merchant straight to
 * Shopify's own native Orders page, pre-filtered to return-requested
 * orders with the columns they want: the actual native UI, not a copy.
 *
 * The redirect must break OUT of this app's iframe into the top-level
 * browser tab (target="_top") — Shopify's own admin pages refuse to be
 * framed inside another app's iframe (X-Frame-Options), so navigating this
 * iframe's own window.location would just show a blank/broken embed.
 * Triggered via a real anchor's .click() (App Bridge's documented pattern
 * for target="_top" navigation) rather than window.open(), since a new
 * tab opened without a direct user gesture gets silently blocked by the
 * browser's popup blocker — this fires from a useEffect after an async
 * fetch, so there's no gesture to attach to.
 */
export function ReturnsSummary() {
  const [state, setState] = useState<FetchState>({ status: "loading" });
  const redirectLinkRef = useRef<HTMLAnchorElement>(null);

  useEffect(() => {
    let cancelled = false;
    authedFetch("/api/app/returns")
      .then(async (res) => {
        const data = await res.json().catch(() => ({}));
        if (!res.ok || !data.nativeUrl) throw new Error(data.error || "Couldn't open returns.");
        if (!cancelled) {
          setState({ status: "redirecting" });
          const link = redirectLinkRef.current;
          if (link) {
            link.href = data.nativeUrl;
            link.click();
          }
        }
      })
      .catch((err) => {
        if (!cancelled) setState({ status: "error", message: err instanceof Error ? err.message : "Something went wrong." });
      });
    return () => { cancelled = true; };
  }, []);

  return (
    <s-page heading="Returns" inlineSize="large">
      {/* eslint-disable-next-line jsx-a11y/anchor-is-valid */}
      <a ref={redirectLinkRef} href="#" target="_top" rel="noopener" className="hidden" aria-hidden="true">
        Open return requests
      </a>
      <s-section>
        {(state.status === "loading" || state.status === "redirecting") && (
          <s-box padding="large">
            <s-stack direction="block" alignItems="center">
              <MorphingInfinity className="size-8 text-muted-foreground" />
            </s-stack>
          </s-box>
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
