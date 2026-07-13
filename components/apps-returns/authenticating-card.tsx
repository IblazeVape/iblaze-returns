import { Card } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";

/**
 * Matches DashboardClient's own "Authenticating" loading card exactly (its
 * `if (loading)` branch), so the brief moment before the token is ready
 * looks like a continuation of the same portal loading — not a separate
 * "Signing you in…" screen.
 */
export function AuthenticatingCard({ label = "Verifying your session securely..." }: { label?: string }) {
  return (
    <div
      className="relative flex items-center justify-center bg-background/40"
      style={{ height: "100dvh", width: "100vw" }}
    >
      <Card className="w-full max-w-xs mx-4 shadow-xl">
        <div className="flex flex-col items-center justify-center gap-3 py-8 px-6">
          <div className="size-10 rounded-full bg-[var(--brand)]/10 flex items-center justify-center">
            <Spinner className="size-5 text-[var(--brand)]" />
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
