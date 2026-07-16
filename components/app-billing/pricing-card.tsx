// components/app-billing/pricing-card.tsx
"use client";

type PricingCardProps = {
  title: string;
  description: string;
  features: string[];
  price: string;
  frequency: string;
  featuredText?: string;
  buttonLabel: string;
  onSelect: () => void;
};

export function PricingCard({ title, description, features, price, frequency, featuredText, buttonLabel, onSelect }: PricingCardProps) {
  return (
    <div style={{ position: "relative", width: "18rem" }}>
      {featuredText && (
        <div style={{ position: "absolute", top: -14, right: 10, zIndex: 1 }}>
          <s-badge tone="success" size="large">
            {featuredText}
          </s-badge>
        </div>
      )}
      <s-box padding="large" background="base" borderRadius="large" border="base">
        <s-stack direction="block" gap="base">
          <s-stack direction="block" gap="small-200">
            <s-heading>{title}</s-heading>
            <s-text color="subdued">{description}</s-text>
          </s-stack>

          <s-stack direction="inline" gap="small-100" alignItems="end">
            <s-heading>{price}</s-heading>
            <s-text color="subdued">/ {frequency}</s-text>
          </s-stack>

          <s-stack direction="block" gap="small-200">
            {features.map((feature) => (
              <s-text key={feature} color="subdued">{feature}</s-text>
            ))}
          </s-stack>

          <s-stack direction="inline" alignItems="center" justifyContent="end">
            <s-button variant="primary" onClick={onSelect}>
              {buttonLabel}
            </s-button>
          </s-stack>
        </s-stack>
      </s-box>
    </div>
  );
}
