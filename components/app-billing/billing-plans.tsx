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
    title: "Standard",
    description: "This is a great plan for stores that are just starting out",
    features: ["Process up to 1,000 orders/mo", "Amazing feature", "Another really cool feature", "24/7 Customer Support"],
    price: "$19",
    frequency: "month",
  },
  {
    title: "Advanced",
    description: "For stores that are growing and need a reliable solution to scale with them",
    features: ["Process up to 10,000 orders/mo", "Amazing feature", "Another really cool feature", "24/7 Customer Support"],
    price: "$49",
    frequency: "month",
    featuredText: "Most Popular",
  },
  {
    title: "Premium",
    description: "The best of the best, for stores that have the highest order processing needs",
    features: ["Process up to 100,000 orders/mo", "Amazing feature", "Another really cool feature", "24/7 Customer Support"],
    price: "$99",
    frequency: "month",
  },
] as const;

export function BillingPlans() {
  return (
    <s-page heading="Pricing" inlineSize="large">
      <s-stack direction="block" gap="base" alignItems="center">
        <s-paragraph tone="subdued">
          Choose the plan that fits your store. This is a preview of upcoming plans — nothing is charged yet.
        </s-paragraph>
        <s-stack direction="inline" gap="large" wrap justifyContent="center">
          {PLANS.map((plan) => (
            <PricingCard
              key={plan.title}
              title={plan.title}
              description={plan.description}
              features={[...plan.features]}
              price={plan.price}
              frequency={plan.frequency}
              featuredText={"featuredText" in plan ? plan.featuredText : undefined}
              buttonLabel="Select Plan"
              onSelect={() => {}}
            />
          ))}
        </s-stack>
      </s-stack>
    </s-page>
  );
}
