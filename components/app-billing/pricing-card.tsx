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
    <div
      style={{
        width: "18rem",
        boxShadow: featuredText ? "0px 0px 15px 4px #CDFEE1" : "none",
        borderRadius: ".75rem",
        position: "relative",
        zIndex: 0,
      }}
    >
      {featuredText && (
        <div style={{ position: "absolute", top: "-15px", right: "6px", zIndex: 100 }}>
          <s-badge tone="success">{featuredText}</s-badge>
        </div>
      )}
      <s-section padding="base">
        <s-stack direction="block" gap="large">
          <s-stack direction="block" gap="base" alignItems="start">
            <h1 style={{ fontSize: "20px", fontWeight: "bold" }}>{title}</h1>
            <s-paragraph color="subdued">{description}</s-paragraph>
          </s-stack>

          <s-stack direction="inline" gap="small-400" alignItems="baseline">
            <h2 style={{ fontSize: "28px", fontWeight: "bold" }}>{price}</h2>
            <s-text>/ {frequency}</s-text>
          </s-stack>

          <s-stack direction="block" gap="small-400">
            {features.map((feature) => (
              <s-text color="subdued" key={feature}>{feature}</s-text>
            ))}
          </s-stack>

          <s-stack alignItems="end">
            <s-button variant="primary" onClick={onSelect}>
              {buttonLabel}
            </s-button>
          </s-stack>
        </s-stack>
      </s-section>
    </div>
  );
}
