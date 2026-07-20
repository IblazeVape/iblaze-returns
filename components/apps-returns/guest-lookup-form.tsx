"use client";

import { useState } from "react";
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
 * Split layout (brand panel + form) mirrors common signup patterns so the
 * pre-auth screen feels intentional rather than a bare centered card.
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
  /** Optional left-panel photo. Falls back to logo-on-brand when empty. */
  heroImageUrl?: string;
}) {
  const [orderNumber, setOrderNumber] = useState("");
  const [email, setEmail] = useState("");
  const [postcode, setPostcode] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [error, setError] = useState("");

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
    <div className="w-full max-w-3xl mx-4 overflow-hidden rounded-xl border bg-card text-card-foreground shadow-xl">
      <div className="grid md:grid-cols-2">
        {/* Brand / visual panel — Moqups-style left column */}
        <div
          className="relative flex min-h-[180px] flex-col justify-between overflow-hidden p-6 md:min-h-[420px] md:p-8"
          style={{ backgroundColor: "var(--brand, #111)" }}
        >
          {heroImageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={heroImageUrl}
              alt=""
              className="absolute inset-0 h-full w-full object-cover"
            />
          ) : (
            <>
              <div
                className="pointer-events-none absolute -right-10 -top-10 size-40 rounded-full opacity-20"
                style={{ background: "radial-gradient(circle, #fff 0%, transparent 70%)" }}
              />
              <div
                className="pointer-events-none absolute -bottom-16 -left-8 size-52 rounded-full opacity-15"
                style={{ background: "radial-gradient(circle, #fff 0%, transparent 70%)" }}
              />
            </>
          )}

          <div className="relative z-10">
            {logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={logoUrl}
                alt={brandName || "Store"}
                className="h-8 w-auto max-w-[160px] object-contain brightness-0 invert"
              />
            ) : (
              <span className="text-sm font-semibold tracking-wide text-white/95">
                {brandName || "Returns"}
              </span>
            )}
          </div>

          <div className="relative z-10 mt-8 md:mt-auto">
            <p className="max-w-[14rem] text-xl font-semibold leading-snug tracking-tight text-white md:text-2xl">
              Look up your order in seconds
            </p>
            <p className="mt-2 max-w-[16rem] text-sm text-white/75">
              No account needed — just the details from your checkout.
            </p>
          </div>
        </div>

        {/* Form panel */}
        <div className="flex flex-col justify-center gap-6 p-6 md:p-8">
          <p className="text-sm text-muted-foreground">{resolvedDescription}</p>

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
              className="w-full bg-[var(--brand)] hover:bg-[var(--brand)]/90 text-white"
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
  );
}
