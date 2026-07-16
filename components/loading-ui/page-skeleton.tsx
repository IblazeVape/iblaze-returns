// components/loading-ui/page-skeleton.tsx
"use client";

/**
 * Card-shaped skeleton placeholders (via the real Polaris <s-skeleton-paragraph>
 * component) shown while a page's auth bootstrap + first data fetch are in
 * flight — replaces the generic spinner with something shaped like the real
 * content, matching Shopify's SkeletonPage pattern intent.
 */
export function PageSkeleton({ cardCount = 3 }: { cardCount?: number }) {
  const span = Math.floor(12 / cardCount);
  return (
    <s-grid gridTemplateColumns="repeat(12, 1fr)" gap="base">
      {Array.from({ length: cardCount }).map((_, i) => (
        <s-grid-item key={i} gridColumn={`span ${span}`}>
          <s-box padding="base" background="base" border="base" borderRadius="base">
            <s-stack direction="block" gap="small-300">
              <s-skeleton-paragraph content="Loading title"></s-skeleton-paragraph>
              <s-skeleton-paragraph content="Loading placeholder value text for this card"></s-skeleton-paragraph>
            </s-stack>
          </s-box>
        </s-grid-item>
      ))}
    </s-grid>
  );
}
