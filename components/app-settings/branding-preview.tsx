"use client"

import { Card, CardContent } from "@/components/ui/card"

export function BrandingPreview({
  logoUrl,
  name,
  accentColor,
}: {
  logoUrl: string
  name: string
  accentColor: string
}) {
  return (
    <div className="sticky top-4 flex flex-col gap-3" style={{ "--brand": accentColor } as React.CSSProperties}>
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Preview</p>
      <Card className="w-64 overflow-hidden py-0 shadow-xs">
        <div className="flex items-center gap-2 border-b px-4 py-3">
          {logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logoUrl} alt="" className="size-6 shrink-0 object-contain" />
          ) : (
            <div className="size-6 shrink-0 rounded-md bg-[var(--brand)]" />
          )}
          <span className="truncate text-sm font-semibold">{name || "Your Store"} Returns</span>
        </div>
        <CardContent className="flex flex-col gap-2 px-4 py-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold">#1035</span>
            <span className="text-sm font-semibold">£72.00</span>
          </div>
          <p className="text-xs text-muted-foreground">Ordered 12 Jun 2026 · 3 items</p>
          <button
            type="button"
            className="mt-1 w-full rounded-md bg-[var(--brand)] py-1.5 text-xs font-semibold text-white"
          >
            Start a Return
          </button>
        </CardContent>
      </Card>
    </div>
  )
}
