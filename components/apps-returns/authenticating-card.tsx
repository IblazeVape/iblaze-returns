"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";
import { getCachedAccentColor } from "@/lib/accent-color-cache";

/**
 * Matches DashboardClient's own "Authenticating" loading card exactly (its
 * `if (loading)` branch), so the brief moment before the token is ready
 * looks like a continuation of the same portal loading — not a separate
 * "Signing you in…" screen.
 *
 * Prefer an explicit `accentColor` from the server (App Proxy branding).
 * Fall back to the localStorage cache from a previous visit, then to a
 * live `--brand` CSS var if GuestPortalShell already set it this session.
 * Only a genuine first-ever visit with no branding yet uses neutral gray.
 */
export function AuthenticatingCard({
  label = "Verifying your session securely...",
  accentColor: accentFromProps,
}: {
  label?: string;
  accentColor?: string;
}) {
  const [accentColor] = useState(() => {
    if (accentFromProps) return accentFromProps;
    const cached = getCachedAccentColor();
    if (cached) return cached;
    if (typeof document !== "undefined") {
      const fromCss = document.documentElement.style.getPropertyValue("--brand").trim();
      if (fromCss) return fromCss;
    }
    return null;
  });

  return (
    <div
      className="relative flex items-center justify-center bg-background/40"
      style={{ height: "100dvh", width: "100vw" }}
    >
      <Card className="w-full max-w-xs mx-4 shadow-xl">
        <div className="flex flex-col items-center justify-center gap-3 py-8 px-6">
          <div
            className={cn("size-10 rounded-full flex items-center justify-center", !accentColor && "bg-muted")}
            style={accentColor ? { backgroundColor: `${accentColor}1a` } : undefined}
          >
            <Spinner className={cn("size-5", !accentColor && "text-muted-foreground")} style={accentColor ? { color: accentColor } : undefined} />
          </div>
          <div className="text-center">
            <p className="font-semibold text-sm">Authenticating</p>
            <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
          </div>
        </div>
      </Card>
    </div>
  );
}
