// components/app-dashboard/stat-box.tsx
"use client";

type StatBoxProps = {
  title: string;
  value: string;
  data: number[];
};

/** Rate of change from the first entry to the last — 0 when there's nothing to compare or the series is flat at zero. */
function rateOfChange(data: number[]): number | null {
  if (data.length < 2) return null;
  const first = data[0];
  const last = data[data.length - 1];
  if (first === 0) return last === 0 ? 0 : null;
  return ((last - first) / first) * 100;
}

function sparklinePoints(data: number[], width: number, height: number): string {
  if (data.length === 0) return "";
  const max = Math.max(...data, 1);
  const min = Math.min(...data, 0);
  const range = max - min || 1;
  const step = data.length > 1 ? width / (data.length - 1) : 0;
  return data
    .map((v, i) => {
      const x = i * step;
      const y = height - ((v - min) / range) * height;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
}

export function StatBox({ title, value, data }: StatBoxProps) {
  const width = 120;
  const height = 32;
  const points = sparklinePoints(data, width, height);
  const change = rateOfChange(data);

  return (
    <s-box padding="base" background="base" border="base" borderRadius="base">
      <s-stack direction="block" gap="small-300">
        <s-text color="subdued">{title}</s-text>
        <s-stack direction="inline" gap="small-300" alignItems="center">
          <s-heading>{value}</s-heading>
          {change !== null && (
            <s-badge tone={change >= 0 ? "success" : "critical"}>
              {change >= 0 ? "+" : ""}
              {change.toFixed(0)}%
            </s-badge>
          )}
        </s-stack>
        {points && (
          <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} role="img" aria-label={`${title} trend over the last ${data.length} days`}>
            <polyline points={points} fill="none" stroke="currentColor" strokeWidth="2" />
          </svg>
        )}
      </s-stack>
    </s-box>
  );
}
