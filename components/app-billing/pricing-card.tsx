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
    <s-box
      padding="large"
      background="base"
      border="base"
      borderRadius="base"
      borderWidth={featuredText ? "large" : "base"}
      borderColor={featuredText ? "emphasis" : "base"}
      minInlineSize="240px"
    >
      <s-stack direction="block" gap="base">
        <s-stack direction="block" gap="small-200">
          <s-stack direction="inline" gap="small-300" alignItems="center">
            <s-heading>{title}</s-heading>
            {featuredText && <s-badge tone="success">{featuredText}</s-badge>}
          </s-stack>
          <s-paragraph tone="subdued">{description}</s-paragraph>
        </s-stack>

        <s-stack direction="inline" gap="small-100" alignItems="end">
          <s-heading>{price}</s-heading>
          <s-text color="subdued">/{frequency}</s-text>
        </s-stack>

        <s-unordered-list>
          {features.map((feature) => (
            <s-list-item key={feature}>{feature}</s-list-item>
          ))}
        </s-unordered-list>

        <s-button variant="primary" onClick={onSelect}>
          {buttonLabel}
        </s-button>
      </s-stack>
    </s-box>
  );
}
