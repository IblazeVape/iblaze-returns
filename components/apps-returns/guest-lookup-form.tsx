"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardDescription, CardHeader } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";

/**
 * Guest order lookup form for the App Proxy portal.
 *
 * Layouts (Settings → Branding): classic | split
 * Pass interactive={false} for a display-only settings preview.
 */
type GuestOrder = {
  id: string;
  name: string;
  createdAt: string;
  fulfillmentStatus: string;
  financialStatus: string;
  statusPageUrl: string | null;
};

export type GuestLookupLayout = "classic" | "split";
export type GuestLookupBrandDisplay = "logo" | "text" | "none";
export type GuestLookupSideStyle = "image" | "gradient";

function defaultGuestLookupHeroSrc() {
  const raw = (process.env.NEXT_PUBLIC_APP_URL || "").replace(/\/$/, "");
  const base =
    raw && !raw.includes("trycloudflare.com") && !raw.includes("localhost")
      ? raw
      : "https://iblaze-returns.vercel.app";
  return `${base}/assets/guest-lookup-hero.png`;
}

export function GuestLookupForm({
  onVerified,
  requirePostcode = true,
  description,
  layout = "split",
  brandName,
  logoUrl,
  loginUrl,
  heroImageUrl,
  headline = "Return your order with ease",
  subtext = "Look up your order in seconds — no account needed.",
  brandDisplay = "logo",
  overlayOpacity = 40,
  overlayBlur = 0,
  snakeBorder = true,
  sideStyle = "image",
  gradientFrom = "#0f172a",
  gradientTo = "#334155",
  interactive = true,
}: {
  onVerified: (token: string, order: GuestOrder) => void;
  requirePostcode?: boolean;
  description?: string;
  layout?: GuestLookupLayout;
  brandName?: string;
  logoUrl?: string;
  loginUrl?: string;
  heroImageUrl?: string;
  headline?: string;
  subtext?: string;
  brandDisplay?: GuestLookupBrandDisplay;
  overlayOpacity?: number;
  overlayBlur?: number;
  snakeBorder?: boolean;
  sideStyle?: "image" | "gradient";
  gradientFrom?: string;
  gradientTo?: string;
  interactive?: boolean;
}) {
  const [orderNumber, setOrderNumber] = useState("");
  const [email, setEmail] = useState("");
  const [postcode, setPostcode] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [error, setError] = useState("");
  const [logoFailed, setLogoFailed] = useState(false);
  const heroSrc = heroImageUrl || defaultGuestLookupHeroSrc();
  const lockUi = !interactive;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (lockUi) return;
    setStatus("loading");
    setError("");
    try {
      const res = await fetch("/apps/returns/guest-lookup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requirePostcode ? { orderNumber, email, postcode } : { orderNumber, email }),
      });
      const data = await res.json();
      if (!res.ok || !data.session || !data.order) {
        setStatus("error");
        setError(data.error || "Something went wrong. Please try again.");
        return;
      }
      onVerified(data.session, data.order);
    } catch {
      setStatus("error");
      setError("Something went wrong. Please try again.");
    }
  }

  const resolvedDescription =
    description ??
    (requirePostcode
      ? "Enter your order number, the email used at checkout, and your delivery postcode."
      : "Enter your order number and the email used at checkout.");

  const fields = (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="guest-order-number">Order number</Label>
        <Input
          id="guest-order-number"
          value={orderNumber}
          onChange={(e) => setOrderNumber(e.target.value)}
          placeholder="#1234"
          required
          readOnly={lockUi}
          tabIndex={lockUi ? -1 : undefined}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="guest-email">Email</Label>
        <Input
          id="guest-email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          required
          readOnly={lockUi}
          tabIndex={lockUi ? -1 : undefined}
        />
      </div>
      {requirePostcode && (
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="guest-postcode">Postcode</Label>
          <Input
            id="guest-postcode"
            value={postcode}
            onChange={(e) => setPostcode(e.target.value)}
            placeholder="SW1A 1AA"
            required
            readOnly={lockUi}
            tabIndex={lockUi ? -1 : undefined}
          />
        </div>
      )}

      {status === "error" && <p className="text-sm text-destructive">{error}</p>}

      <Button
        type="submit"
        disabled={lockUi || status === "loading"}
        className="mt-1 w-full bg-[var(--brand)] hover:bg-[var(--brand)]/90 text-white"
        tabIndex={lockUi ? -1 : undefined}
      >
        {status === "loading" ? (
          <>
            <Spinner className="size-4" /> Looking up…
          </>
        ) : (
          "Find my order"
        )}
      </Button>
    </form>
  );

  const loginFooter = loginUrl ? (
    <div className="flex flex-col items-center gap-2 border-t pt-5">
      <span className="text-xs text-muted-foreground">— or —</span>
      <a
        href={lockUi ? undefined : loginUrl}
        className="text-sm font-semibold text-[var(--brand)] hover:underline underline-offset-2"
        tabIndex={lockUi ? -1 : undefined}
        onClick={lockUi ? (e) => e.preventDefault() : undefined}
      >
        Log in to see all your orders
      </a>
    </div>
  ) : null;

  const showBrandMark = brandDisplay !== "none" && (brandDisplay === "text" ? !!brandName : !!(logoUrl || brandName));
  const veilOpacity = Math.min(100, Math.max(0, overlayOpacity)) / 100;
  const blurPx = Math.min(24, Math.max(0, overlayBlur));

  const classicInner = (
    <Card className="border-0 shadow-none bg-transparent">
      <CardHeader>
        <CardDescription className="text-center">{resolvedDescription}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-5">
        {fields}
        {loginFooter}
      </CardContent>
    </Card>
  );

  const useGradient = sideStyle === "gradient";
  const sideBackground = useGradient
    ? {
        backgroundImage: `linear-gradient(145deg, ${gradientFrom} 0%, ${gradientTo} 100%)`,
      }
    : undefined;

  // Empty headline/subtext → hide copy and shrink the mobile hero so it
  // doesn't leave a tall empty band above the form (logo-only strip).
  const panelHeadline = (headline ?? "").trim();
  const panelSubtext = (subtext ?? "").trim();
  const hasPanelCopy = Boolean(panelHeadline || panelSubtext);
  const compactMobileHero = !hasPanelCopy;

  const splitInner = (
    <div
      className={cn(
        "flex flex-col min-[720px]:flex-row",
        // Only force a tall desktop panel when there's photo/copy to fill it.
        hasPanelCopy || !useGradient ? "min-[720px]:min-h-[420px]" : "min-[720px]:min-h-[280px]",
      )}
    >
      <div
        className={cn(
          "relative w-full shrink-0 overflow-hidden bg-zinc-900 min-[720px]:h-auto min-[720px]:w-[44%]",
          compactMobileHero ? "h-16" : "h-44",
        )}
        style={sideBackground}
      >
        {!useGradient ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={heroSrc}
              alt=""
              className="absolute inset-0 size-full object-cover object-center"
              style={blurPx > 0 ? { filter: `blur(${blurPx}px)`, transform: "scale(1.06)" } : undefined}
            />
          </>
        ) : null}
        <div
          aria-hidden
          className="absolute inset-0"
          style={{ backgroundColor: `rgba(0, 0, 0, ${veilOpacity})` }}
        />

        {showBrandMark && (
          <div
            className={cn(
              "absolute z-10",
              compactMobileHero
                ? "inset-0 flex items-center px-4 min-[720px]:inset-auto min-[720px]:left-6 min-[720px]:top-6 min-[720px]:block min-[720px]:px-0"
                : "left-4 top-4 min-[720px]:left-6 min-[720px]:top-6",
            )}
          >
            {brandDisplay === "logo" && logoUrl && !logoFailed ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={logoUrl}
                alt={brandName || "Store"}
                width={140}
                height={40}
                className="h-7 w-auto max-w-[140px] object-contain drop-shadow"
                onError={() => setLogoFailed(true)}
              />
            ) : (
              <span className="text-sm font-semibold text-white drop-shadow">
                {brandName}
              </span>
            )}
          </div>
        )}

        {hasPanelCopy ? (
          <div className="absolute inset-x-0 bottom-0 z-10 p-4 min-[720px]:p-8">
            {panelHeadline ? (
              <p className="max-w-[16rem] text-lg font-semibold leading-snug tracking-tight text-white min-[720px]:text-2xl">
                {panelHeadline}
              </p>
            ) : null}
            {panelSubtext ? (
              <p
                className={cn(
                  "max-w-[18rem] text-xs leading-relaxed text-white/80 min-[720px]:text-sm",
                  panelHeadline && "mt-1 min-[720px]:mt-2",
                )}
              >
                {panelSubtext}
              </p>
            ) : null}
          </div>
        ) : null}
      </div>

      <div className="flex flex-1 flex-col justify-center gap-5 px-6 py-7 min-[720px]:px-10 min-[720px]:py-10">
        <div className="space-y-1.5">
          <h2 className="text-xl font-semibold tracking-tight">Find your order</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">{resolvedDescription}</p>
        </div>
        {fields}
        {loginFooter}
      </div>
    </div>
  );

  // Same snake-border shell for classic + split: 1px gap (p-px) over a
  // rotating conic gradient. Inner card must NOT add its own border — that
  // double stroke was clipping the rounded corners on classic.
  return (
    <div
      className={cn(
        "relative w-full overflow-hidden rounded-2xl p-px shadow-xl",
        layout === "classic" ? "max-w-md" : "max-w-4xl",
        lockUi && "pointer-events-none select-none",
      )}
      aria-hidden={lockUi || undefined}
    >
      <div className="absolute inset-0 rounded-2xl" style={{ background: "hsl(var(--border))" }} aria-hidden />
      {snakeBorder && !lockUi ? (
        <motion.div
          className="absolute pointer-events-none"
          style={{
            inset: "-100%",
            width: "300%",
            height: "300%",
            background:
              "conic-gradient(from 0deg, transparent 65%, currentColor 75%, transparent 85%)",
            opacity: 0.55,
          }}
          animate={{ rotate: 360 }}
          transition={{ duration: 6, repeat: Infinity, ease: "linear" }}
          aria-hidden
        />
      ) : null}

      <div className="relative overflow-hidden rounded-[15px] bg-card text-card-foreground">
        {layout === "classic" ? classicInner : splitInner}
      </div>
    </div>
  );
}
