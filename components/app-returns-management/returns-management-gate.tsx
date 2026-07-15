// components/app-returns-management/returns-management-gate.tsx
"use client";

import { useEffect, useState } from "react";
import { AppNav } from "@/components/app-nav";

declare const shopify: {
  idToken: () => Promise<string>;
};

function base64UrlToBase64(input: string): string {
  const base64 = input.replace(/-/g, "+").replace(/_/g, "/");
  const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), "=");
  return padded;
}

type GateState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; shop: string };

/**
 * Same App Bridge token-exchange bootstrap as MerchantAppGate
 * (components/app-settings/merchant-app-gate.tsx) — each embedded page gets
 * its own fresh JS context on load, so this can't assume Settings already
 * ran token-exchange first.
 */
export function ReturnsManagementGate() {
  const [state, setState] = useState<GateState>({ status: "loading" });

  useEffect(() => {
    let cancelled = false;

    async function bootstrap() {
      try {
        const deadline = Date.now() + 5000;
        while (typeof shopify === "undefined" && Date.now() < deadline) {
          await new Promise((r) => setTimeout(r, 50));
        }
        if (typeof shopify === "undefined") {
          throw new Error("Shopify App Bridge did not load.");
        }

        const token = await shopify.idToken();
        const res = await fetch("/api/app/token-exchange", {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok || !data.ok) {
          throw new Error(data.error || "Could not verify this app installation.");
        }
        if (!cancelled) {
          const payload = JSON.parse(atob(base64UrlToBase64(token.split(".")[1])));
          const shop = String(payload.dest || "").replace(/^https:\/\//, "");
          setState({ status: "ready", shop });
        }
      } catch (err) {
        if (!cancelled) {
          setState({ status: "error", message: err instanceof Error ? err.message : "Something went wrong." });
        }
      }
    }

    bootstrap();
    return () => { cancelled = true; };
  }, []);

  if (state.status === "loading") {
    return (
      <>
        <AppNav />
        <s-page heading="Returns">
          <s-box padding="large">
            <s-stack direction="block" alignItems="center">
              <s-spinner accessibilityLabel="Loading" />
            </s-stack>
          </s-box>
        </s-page>
      </>
    );
  }
  if (state.status === "error") {
    return (
      <>
        <AppNav />
        <s-page heading="Returns">
          <s-banner heading="Couldn't load returns" tone="critical">
            <s-paragraph>{state.message}</s-paragraph>
          </s-banner>
        </s-page>
      </>
    );
  }
  return (
    <>
      <AppNav />
      <s-page heading="Returns">
        <s-paragraph>Loading returns…</s-paragraph>
      </s-page>
    </>
  );
}
