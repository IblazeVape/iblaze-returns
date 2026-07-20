"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardDescription, CardHeader } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";

/**
 * Guest order lookup form for the App Proxy portal. Shown when the customer
 * has no Shopify account session (guest checkout). Verifies order number +
 * email + postcode against the tenant's Shopify data — see
 * app/apps/returns/guest-lookup/route.ts for the server-side check.
 *
 * Two merchant-selectable layouts (Settings → Branding → Guest lookup layout):
 *  - classic: original centered form card
 *  - split: image panel + form (hero must be an absolute app/CDN URL —
 *    relative `/assets/...` 404s on the storefront under App Proxy)
 *
 * On success the server returns a session token in the JSON body (NOT via
 * Set-Cookie — Shopify's App Proxy strips that on the way back to the
 * browser, confirmed live). `onVerified` hands the token to the parent
 * (ClientPortalGate), which stores it and renders the real DashboardClient
 * portal inline — no page reload.
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

/** App Proxy only forwards `/apps/returns*`, so static files must be loaded
 * from the app origin (Vercel), not as relative paths on the shop domain. */
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
}) {
  const [orderNumber, setOrderNumber] = useState("");
  const [email, setEmail] = useState("");
  const [postcode, setPostcode] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [error, setError] = useState("");
  const [logoFailed, setLogoFailed] = useState(false);
  const heroSrc = heroImageUrl || defaultGuestLookupHeroSrc();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
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
          />
        </div>
      )}

      {status === "error" && <p className="text-sm text-destructive">{error}</p>}

      <Button
        type="submit"
        disabled={status === "loading"}
        className="mt-1 w-full bg-[var(--brand)] hover:bg-[var(--brand)]/90 text-white"
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
        href={loginUrl}
        className="text-sm font-semibold text-[var(--brand)] hover:underline underline-offset-2"
      >
        Log in to see all your orders
      </a>
    </div>
  ) : null;

  if (layout === "classic") {
    return (
      <Card className="w-full max-w-md mx-4 shadow-xl">
        <CardHeader>
          <CardDescription className="text-center">{resolvedDescription}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-5">
          {fields}
          {loginFooter}
        </CardContent>
      </Card>
    );
  }

  const showBrandMark = brandDisplay !== "none" && (brandDisplay === "text" ? !!brandName : !!(logoUrl || brandName));

  return (
    <div className="relative w-full max-w-4xl mx-4 overflow-hidden rounded-2xl p-px shadow-xl">
      <div className="absolute inset-0 rounded-2xl" style={{ background: "hsl(var(--border))" }} aria-hidden />
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

      <div className="relative overflow-hidden rounded-[15px] bg-card text-card-foreground">
        <div className="flex flex-col min-[720px]:flex-row min-[720px]:min-h-[460px]">
          <div className="relative h-44 w-full shrink-0 overflow-hidden bg-zinc-900 min-[720px]:h-auto min-[720px]:w-[44%]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={heroSrc}
              alt=""
              className="absolute inset-0 size-full object-cover object-center"
            />
            <div
              aria-hidden
              className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/55 to-transparent"
            />

            {showBrandMark && (
              <div className="absolute left-4 top-4 z-10 min-[720px]:left-6 min-[720px]:top-6">
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

            <div className="absolute inset-x-0 bottom-0 z-10 p-4 min-[720px]:p-8">
              <p className="max-w-[16rem] text-lg font-semibold leading-snug tracking-tight text-white min-[720px]:text-2xl">
                {headline}
              </p>
              <p className="mt-1 max-w-[18rem] text-xs leading-relaxed text-white/80 min-[720px]:mt-2 min-[720px]:text-sm">
                {subtext}
              </p>
            </div>
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
      </div>
    </div>
  );
}
