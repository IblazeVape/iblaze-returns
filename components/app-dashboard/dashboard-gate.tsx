// components/app-dashboard/dashboard-gate.tsx
"use client";

import { useEffect, useState } from "react";
import { AppNav } from "@/components/app-nav";
import { DashboardSummary } from "@/components/app-dashboard/dashboard-summary";
import { MorphingInfinity } from "@/components/loading-ui/morphing-infinity";

declare const shopify: {
  idToken: () => Promise<string>;
};

type GateState = "loading" | "error" | "ready";

/**
 * Same App Bridge token-exchange bootstrap as MerchantAppGate
 * (components/app-settings/merchant-app-gate.tsx) — each embedded page gets
 * its own fresh JS context on load, so this can't assume Settings already
 * ran token-exchange first.
 */
export function DashboardGate() {
  const [state, setState] = useState<GateState>("loading");
  const [errorMessage, setErrorMessage] = useState("");

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
        if (!cancelled) setState("ready");
      } catch (err) {
        if (!cancelled) {
          setErrorMessage(err instanceof Error ? err.message : "Something went wrong.");
          setState("error");
        }
      }
    }

    bootstrap();
    return () => { cancelled = true; };
  }, []);

  if (state === "loading") {
    return (
      <>
        <AppNav />
        <s-page heading="Dashboard" inlineSize="base">
          <s-box padding="large">
            <s-stack direction="block" alignItems="center">
              <MorphingInfinity className="size-8 text-muted-foreground" />
            </s-stack>
          </s-box>
        </s-page>
      </>
    );
  }
  if (state === "error") {
    return (
      <>
        <AppNav />
        <s-page heading="Dashboard" inlineSize="base">
          <s-banner heading="Couldn't load dashboard" tone="critical">
            <s-paragraph>{errorMessage}</s-paragraph>
          </s-banner>
        </s-page>
      </>
    );
  }
  return (
    <>
      <AppNav />
      <DashboardSummary />
    </>
  );
}
