"use client";

import { useState } from "react";
import { motion } from "framer-motion";
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
 * Split layout: returns hero image on the left (top strip on mobile), form
 * on the right. Hero must be an absolute app URL — relative `/assets/...`
 * resolves on the storefront domain under App Proxy and 404s.
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

/** App Proxy only forwards `/apps/returns*`, so static files must be loaded
 * from the app origin (Vercel), not as relative paths on the shop domain. */
function guestLookupHeroSrc() {
  const base = (process.env.NEXT_PUBLIC_APP_URL || "").replace(/\/$/, "");
  return base ? `${base}/assets/guest-lookup-hero.png` : "/assets/guest-lookup-hero.png";
}

export function GuestLookupForm({
  onVerified,
  requirePostcode = true,
  description,
  brandName,
  logoUrl,
  loginUrl,
  heroImageUrl,
}: {
  onVerified: (token: string, order: GuestOrder) => void;
  /** Off for logged-in customers (their store login is the 3rd factor
   * instead) and, per the guestLookupRequirePostcode Settings toggle, for
   * guests too — see app/apps/returns/guest-lookup/route.ts. */
  requirePostcode?: boolean;
  description?: string;
  brandName?: string;
  logoUrl?: string;
  /** When set, shows the “Log in to see all your orders” path under the CTA. */
  loginUrl?: string;
  /** Left-panel hero. Defaults to the built-in returns package image on the app origin. */
  heroImageUrl?: string;
}) {
  const [orderNumber, setOrderNumber] = useState("");
  const [email, setEmail] = useState("");
  const [postcode, setPostcode] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [error, setError] = useState("");
  const [logoFailed, setLogoFailed] = useState(false);
  const heroSrc = heroImageUrl || guestLookupHeroSrc();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("loading");
    setError("");
    try {
      // Relative, no query params: the browser is on the storefront domain
      // (via the proxied page), so this re-enters Shopify's App Proxy, which
      // signs THIS request fresh before forwarding to us — the route verifies
      // that signature and takes `shop` from it.
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

  return (
    // Spinning conic border — same technique as SnakeBorderAlert / Order summary
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
          {/* Hero — short strip on mobile, full left column on desktop */}
          <div className="relative h-44 w-full shrink-0 overflow-hidden bg-zinc-900 min-[720px]:h-auto min-[720px]:w-[44%]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={heroSrc}
              alt=""
              className="absolute inset-0 size-full object-cover object-center"
            />
            {/* Light bottom fade only — keeps copy readable without a heavy black frame */}
            <div
              aria-hidden
              className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/55 to-transparent"
            />

            {(logoUrl || brandName) && (
              <div className="absolute left-4 top-4 z-10 min-[720px]:left-6 min-[720px]:top-6">
                {logoUrl && !logoFailed ? (
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
                Return your order with ease
              </p>
              <p className="mt-1 max-w-[18rem] text-xs leading-relaxed text-white/80 min-[720px]:mt-2 min-[720px]:text-sm">
                Look up your order in seconds — no account needed.
              </p>
            </div>
          </div>

          {/* Form panel */}
          <div className="flex flex-1 flex-col justify-center gap-5 px-6 py-7 min-[720px]:px-10 min-[720px]:py-10">
            <div className="space-y-1.5">
              <h2 className="text-xl font-semibold tracking-tight">Find your order</h2>
              <p className="text-sm text-muted-foreground leading-relaxed">{resolvedDescription}</p>
            </div>

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

              {status === "error" && (
                <p className="text-sm text-destructive">{error}</p>
              )}

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

            {loginUrl && (
              <div className="flex flex-col items-center gap-2 border-t pt-5">
                <span className="text-xs text-muted-foreground">— or —</span>
                <a
                  href={loginUrl}
                  className="text-sm font-semibold text-[var(--brand)] hover:underline underline-offset-2"
                >
                  Log in to see all your orders
                </a>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
