// components/loading-ui/page-skeleton.tsx
"use client";

/**
 * Card-shaped skeleton placeholders shown while a page's auth bootstrap +
 * first data fetch are in flight — replaces the generic spinner with
 * something shaped like the real content. Built from plain <div> elements
 * with inline styles, not <s-box> (its inlineSize/blockSize sizing props
 * didn't render — the box collapsed to zero height with nothing visible)
 * and not <s-skeleton-paragraph> (doesn't render correctly in this app's
 * embedded runtime — same class of issue as <s-tabs>, confirmed elsewhere
 * in this codebase). Plain HTML is the one thing confirmed reliable here.
 */
function SkeletonLine({ width }: { width: string }) {
  return (
    <div
      style={{
        width,
        height: 12,
        borderRadius: 6,
        backgroundColor: "#e1e3e5",
      }}
    />
  );
}

export function PageSkeleton({ cardCount = 3 }: { cardCount?: number }) {
  const span = Math.floor(12 / cardCount);
  return (
    <s-grid gridTemplateColumns="repeat(12, 1fr)" gap="base">
      {Array.from({ length: cardCount }).map((_, i) => (
        <s-grid-item key={i} gridColumn={`span ${span}`}>
          <s-box padding="base" background="base" border="base" borderRadius="base">
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <SkeletonLine width="60%" />
              <SkeletonLine width="85%" />
            </div>
          </s-box>
        </s-grid-item>
      ))}
    </s-grid>
  );
}
