// components/app-dashboard/setup-guide.tsx
"use client";

import { useEffect, useState } from "react";
import type { TenantBranding } from "@/lib/tenant";

// Mirrors lib/tenant.ts's DEFAULT_TENANT_FIELDS.returnWindowDays. Not
// imported directly — lib/tenant.ts pulls in the server-only Redis client,
// which has no business being bundled into this client component.
const DEFAULT_RETURN_WINDOW_DAYS = 30;

type SetupGuideProps = {
  shop: string;
  branding: TenantBranding;
  returnWindowDays: number;
  returnVolume: number;
};

function dismissedStorageKey(shop: string): string {
  // Scoped per shop: this app's embedded iframe is a single shared origin
  // across every merchant's store, so an unscoped key would leak dismissal
  // state between different shops using the same browser.
  return `iblaze-returns:setup-guide-dismissed:${shop}`;
}

export function SetupGuide({ shop, branding, returnWindowDays, returnVolume }: SetupGuideProps) {
  const [dismissed, setDismissed] = useState(true);
  const [expanded, setExpanded] = useState(true);

  useEffect(() => {
    setDismissed(window.localStorage.getItem(dismissedStorageKey(shop)) === "1");
  }, [shop]);

  if (dismissed) return null;

  const steps = [
    {
      id: "branding",
      title: "Configure your branding",
      description: "Add your logo and brand color so the returns portal looks like your store.",
      done: branding.logoUrl !== "",
      buttonLabel: "Go to Branding",
      href: "/app?tab=branding",
    },
    {
      id: "returns-policy",
      title: "Set your returns policy",
      description: "Set the return window and policy details customers see before requesting a return.",
      done: returnWindowDays !== DEFAULT_RETURN_WINDOW_DAYS,
      buttonLabel: "Go to Returns policy",
      href: "/app?tab=returns",
    },
    {
      id: "test-return",
      title: "Test a return",
      description: "Trigger a test return in your store to confirm everything's connected. This completes itself once a return comes through.",
      done: returnVolume > 0,
      buttonLabel: null,
      href: null,
    },
  ] as const;

  const completedCount = steps.filter((s) => s.done).length;

  function dismiss() {
    window.localStorage.setItem(dismissedStorageKey(shop), "1");
    setDismissed(true);
  }

  return (
    <s-section>
      <s-grid gap="base">
        <s-grid gap="small-200">
          <s-grid gridTemplateColumns="1fr auto auto" gap="small-300" alignItems="center">
            <s-heading>Setup Guide</s-heading>
            <s-button accessibilityLabel="Dismiss Guide" variant="tertiary" tone="neutral" icon="x" onClick={dismiss} />
            <s-button
              accessibilityLabel="Toggle setup guide"
              variant="tertiary"
              tone="neutral"
              icon={expanded ? "chevron-up" : "chevron-down"}
              onClick={() => setExpanded(!expanded)}
            />
          </s-grid>
          <s-paragraph>Use this guide to get your returns portal ready for customers.</s-paragraph>
          <s-paragraph color="subdued">{completedCount} out of {steps.length} steps completed</s-paragraph>
        </s-grid>

        {expanded && (
          <s-box borderRadius="base" border="base" background="base">
            {steps.map((step) => (
              <s-box key={step.id} padding="small">
                <s-grid gridTemplateColumns="auto 1fr auto" gap="base" alignItems="center">
                  <s-checkbox label="" accessibilityLabel={step.title} checked={step.done} disabled />
                  <s-stack direction="block" gap="small-100">
                    <s-text type="strong">{step.title}</s-text>
                    <s-text color="subdued">{step.description}</s-text>
                  </s-stack>
                  {step.href && (
                    <s-button href={step.href} variant="secondary">
                      {step.buttonLabel}
                    </s-button>
                  )}
                </s-grid>
              </s-box>
            ))}
          </s-box>
        )}
      </s-grid>
    </s-section>
  );
}
