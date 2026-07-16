// components/app-dashboard/dashboard-summary.tsx
"use client";

import { useEffect, useState } from "react";
import { MorphingInfinity } from "@/components/loading-ui/morphing-infinity";

declare const shopify: {
  idToken: () => Promise<string>;
};

type DashboardStats = {
  returnRate: number;
  returnVolume: number;
  refundValue: number;
  topReasons: { reason: string; count: number }[];
  topProducts: { title: string; image: string | null; count: number; url: string }[];
  nativeReturnsUrl: string;
};

type FetchState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; stats: DashboardStats };

async function authedFetch(input: string, init: RequestInit = {}) {
  const token = await shopify.idToken();
  return fetch(input, { ...init, headers: { ...init.headers, Authorization: `Bearer ${token}` } });
}

/** "wrong_item" -> "Wrong item". Reason codes are stored raw (stable Redis keys); humanized only here, at render time. */
function humanizeReason(reason: string): string {
  const words = reason.toLowerCase().split("_");
  return words[0].charAt(0).toUpperCase() + words[0].slice(1) + (words.length > 1 ? " " + words.slice(1).join(" ") : "");
}

/** Mirrors settings-form.tsx's TABS list — tab ids must match SettingsTab exactly. */
const SETTINGS_QUICK_LINKS = [
  { tab: "branding", label: "Branding", description: "Logo, accent color, storefront and support links." },
  { tab: "returns", label: "Returns policy", description: "Return window, policy dialog, confirmation messages." },
  { tab: "navigation", label: "Navigation", description: "Store link, order status link, sidebar links and layout." },
  { tab: "table", label: "Table & search", description: "Header search, table search, columns and filters." },
] as const;

/** Bold card title with a dashed underline, matching the native admin app card header style. */
function CardLabel({ children }: { children: string }) {
  return (
    <div style={{ borderBottom: "1px dashed #d1d5db", paddingBottom: 8, marginBottom: 4 }}>
      <s-text type="strong">{children}</s-text>
    </div>
  );
}

export function DashboardSummary() {
  const [state, setState] = useState<FetchState>({ status: "loading" });

  useEffect(() => {
    let cancelled = false;
    authedFetch("/api/app/dashboard")
      .then(async (res) => {
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || "Couldn't load dashboard stats.");
        if (!cancelled) setState({ status: "ready", stats: data });
      })
      .catch((err) => {
        if (!cancelled) setState({ status: "error", message: err instanceof Error ? err.message : "Something went wrong." });
      });
    return () => { cancelled = true; };
  }, []);

  return (
    <s-page heading="Dashboard" inlineSize="base">
      {state.status === "loading" && (
        <s-box padding="large">
          <s-stack direction="block" alignItems="center">
            <MorphingInfinity className="size-8 text-muted-foreground" />
          </s-stack>
        </s-box>
      )}

      {state.status === "error" && (
        <s-banner heading="Couldn't load dashboard" tone="critical">
          <s-paragraph>{state.message}</s-paragraph>
        </s-banner>
      )}

      {state.status === "ready" && (
        <s-grid gridTemplateColumns="repeat(12, 1fr)" gap="base">
          <s-grid-item gridColumn="span 4">
            <s-box padding="base" background="base" border="base" borderRadius="base">
              <s-stack direction="block" gap="small-300">
                <CardLabel>Return rate (30 days)</CardLabel>
                <s-heading>{(state.stats.returnRate * 100).toFixed(1)}%</s-heading>
              </s-stack>
            </s-box>
          </s-grid-item>
          <s-grid-item gridColumn="span 4">
            <s-box padding="base" background="base" border="base" borderRadius="base">
              <s-stack direction="block" gap="small-300">
                <CardLabel>Return volume (30 days)</CardLabel>
                <s-heading>{state.stats.returnVolume}</s-heading>
              </s-stack>
            </s-box>
          </s-grid-item>
          <s-grid-item gridColumn="span 4">
            <s-box padding="base" background="base" border="base" borderRadius="base">
              <s-stack direction="block" gap="small-300">
                <CardLabel>Refund value (30 days)</CardLabel>
                <s-heading>£{state.stats.refundValue.toFixed(2)}</s-heading>
              </s-stack>
            </s-box>
          </s-grid-item>

          <s-grid-item gridColumn="span 4">
            <s-box padding="base" background="base" border="base" borderRadius="base">
              <s-stack direction="block" gap="small-300">
                <CardLabel>Top return reasons</CardLabel>
                {state.stats.topReasons.length === 0 && <s-paragraph>No returns yet.</s-paragraph>}
                {state.stats.topReasons.map((r) => (
                  <s-stack key={r.reason} direction="inline" gap="small-300">
                    <s-text>{humanizeReason(r.reason)}</s-text>
                    <s-text color="subdued">{r.count}</s-text>
                  </s-stack>
                ))}
              </s-stack>
            </s-box>
          </s-grid-item>
          <s-grid-item gridColumn="span 4">
            <s-box padding="base" background="base" border="base" borderRadius="base">
              <s-stack direction="block" gap="small-300">
                <CardLabel>Most-returned products</CardLabel>
                {state.stats.topProducts.length === 0 && <s-paragraph>No returns yet.</s-paragraph>}
                {state.stats.topProducts.map((p) => (
                  <s-clickable
                    key={p.url}
                    href={p.url}
                    target="_blank"
                    accessibilityLabel={`Open ${p.title} in Shopify admin`}
                  >
                    <s-stack direction="inline" gap="small-300" alignItems="center">
                      {p.image && <s-thumbnail src={p.image} alt={p.title} size="small" />}
                      <s-text>{p.title}</s-text>
                      <s-text color="subdued">{p.count}</s-text>
                    </s-stack>
                  </s-clickable>
                ))}
              </s-stack>
            </s-box>
          </s-grid-item>

          <s-grid-item gridColumn="span 4">
            <s-box padding="base" background="base" border="base" borderRadius="base">
              <s-stack direction="block" gap="small">
                <CardLabel>Return requests</CardLabel>
                <s-paragraph>
                  Orders with an active return request, filtered and columned in Shopify's own Orders page.
                </s-paragraph>
                <s-button href={state.stats.nativeReturnsUrl} target="_blank" variant="primary">
                  Open return requests
                </s-button>
              </s-stack>
            </s-box>
          </s-grid-item>

          <s-grid-item gridColumn="span 12">
            <s-heading>Quick settings access</s-heading>
          </s-grid-item>
          {SETTINGS_QUICK_LINKS.map((link) => (
            <s-grid-item key={link.tab} gridColumn="span 3">
              <s-clickable href={`/app?tab=${link.tab}`} accessibilityLabel={`Open ${link.label} settings`}>
                <s-box padding="base" background="base" border="base" borderRadius="base">
                  <s-stack direction="block" gap="small-300">
                    <CardLabel>{link.label}</CardLabel>
                    <s-paragraph tone="subdued">{link.description}</s-paragraph>
                  </s-stack>
                </s-box>
              </s-clickable>
            </s-grid-item>
          ))}
        </s-grid>
      )}
    </s-page>
  );
}
