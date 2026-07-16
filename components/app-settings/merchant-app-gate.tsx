// components/app-settings/merchant-app-gate.tsx
"use client";

import { useEffect, useState } from "react";
import { AppNav } from "@/components/app-nav";
import { SettingsForm } from "@/components/app-settings/settings-form";
import { PageSkeleton } from "@/components/loading-ui/page-skeleton";
import type { TenantBranding } from "@/lib/tenant";

declare const shopify: {
  idToken: () => Promise<string>;
};

type GateState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; branding: TenantBranding; returnWindowDays: number };

export function MerchantAppGate() {
  const [state, setState] = useState<GateState>({ status: "loading" });

  useEffect(() => {
    let cancelled = false;

    async function bootstrap() {
      try {
        // App Bridge's script tag registers `shopify` on window, but the
        // script itself may still be parsing when this effect first runs
        // (it's beforeInteractive, not synchronously ready) — poll briefly.
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
          setState({ status: "ready", branding: data.branding, returnWindowDays: data.returnWindowDays });
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
        <s-page heading="Returns Settings" inlineSize="base">
          <PageSkeleton cardCount={4} />
        </s-page>
      </>
    );
  }
  if (state.status === "error") {
    return (
      <>
        <AppNav />
        <s-page heading="Returns Settings" inlineSize="base">
          <s-banner heading="Couldn't load settings" tone="critical">
            <s-paragraph>{state.message}</s-paragraph>
          </s-banner>
        </s-page>
      </>
    );
  }
  return (
    <>
      <AppNav />
      <SettingsForm initialBranding={state.branding} initialReturnWindowDays={state.returnWindowDays} />
    </>
  );
}
