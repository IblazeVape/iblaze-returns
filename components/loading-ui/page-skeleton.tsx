// components/loading-ui/page-skeleton.tsx
"use client";

/**
 * Card-shaped skeleton placeholders shown while a page's auth bootstrap +
 * first data fetch are in flight — replaces the generic spinner with
 * something shaped like the real content. Built from plain <s-box> blocks
 * with a subdued background, not <s-skeleton-paragraph> — that component
 * doesn't render correctly in this app's embedded runtime (same class of
 * issue as <s-tabs>, confirmed elsewhere in this codebase).
 */
function SkeletonLine({ width }: { width: string }) {
  return (
    <s-box
      background="subdued"
      borderRadius="base"
      inlineSize={width}
      blockSize="12px"
    ></s-box>
  );
}

export function PageSkeleton({ cardCount = 3 }: { cardCount?: number }) {
  const span = Math.floor(12 / cardCount);
  return (
    <s-grid gridTemplateColumns="repeat(12, 1fr)" gap="base">
      {Array.from({ length: cardCount }).map((_, i) => (
        <s-grid-item key={i} gridColumn={`span ${span}`}>
          <s-box padding="base" background="base" border="base" borderRadius="base">
            <s-stack direction="block" gap="small-300">
              <SkeletonLine width="60%" />
              <SkeletonLine width="85%" />
            </s-stack>
          </s-box>
        </s-grid-item>
      ))}
    </s-grid>
  );
}
