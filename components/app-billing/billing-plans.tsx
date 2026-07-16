// components/app-billing/billing-plans.tsx
"use client";

import { PricingCard } from "@/components/app-billing/pricing-card";

/**
 * Static mockup only — not wired to Shopify's real Billing API yet
 * (AppSubscriptionCreate, confirmation redirect, subscription webhook).
 * Plan names/prices/features are placeholders pending real pricing decisions.
 */
const PLANS = [
  {
    title: "Starter",
    description: "For stores just getting their returns process set up.",
    features: ["Up to 100 returns/mo", "Branded returns portal", "Email notifications"],
    price: "$19",
    frequency: "month",
  },
  {
    title: "Growth",
    description: "For stores with a steady flow of returns to manage.",
    features: ["Up to 1,000 returns/mo", "Everything in Starter", "Dashboard analytics", "Priority support"],
    price: "$49",
    frequency: "month",
    featuredText: "Most popular",
  },
  {
    title: "Pro",
    description: "For high-volume stores that need it all.",
    features: ["Unlimited returns", "Everything in Growth", "Custom return reasons", "Dedicated support"],
    price: "$99",
    frequency: "month",
  },
] as const;

export function BillingPlans() {
  return (
    <s-page heading="Billing" inlineSize="base">
      <s-section>
        <s-stack direction="block" gap="base">
          <s-paragraph tone="subdued">
            Choose the plan that fits your store. This is a preview of upcoming plans — nothing is charged yet.
          </s-paragraph>
          <s-stack direction="inline" gap="base" wrap>
            {PLANS.map((plan) => (
              <PricingCard
                key={plan.title}
                title={plan.title}
                description={plan.description}
                features={[...plan.features]}
                price={plan.price}
                frequency={plan.frequency}
                featuredText={"featuredText" in plan ? plan.featuredText : undefined}
                buttonLabel="Coming soon"
                onSelect={() => {}}
              />
            ))}
          </s-stack>
        </s-stack>
      </s-section>
    </s-page>
  );
}
