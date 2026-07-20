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
    <div className="w-full max-w-4xl mx-4 overflow-hidden rounded-2xl border bg-card text-card-foreground shadow-xl">
      {/*
        Flex (not grid) so the brand panel keeps a fixed visual weight.
        Side-by-side from 720px up — Moqups-style; stacks cleanly on phones.
      */}
      <div className="flex flex-col min-[720px]:flex-row min-[720px]:min-h-[440px]">
        {/* Brand / visual panel */}
        <div
          className="relative flex w-full flex-col items-center justify-center gap-5 overflow-hidden px-8 py-10 min-[720px]:w-[42%] min-[720px]:shrink-0 min-[720px]:py-12"
          style={{ backgroundColor: "var(--brand, #111)" }}
        >
          {heroImageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={heroImageUrl}
              alt=""
              className="absolute inset-0 size-full object-cover"
            />
          ) : (
            <>
              <div
                aria-hidden
                className="pointer-events-none absolute -right-12 -top-12 size-44 rounded-full opacity-25"
                style={{ background: "radial-gradient(circle, #fff 0%, transparent 70%)" }}
              />
              <div
                aria-hidden
                className="pointer-events-none absolute -bottom-20 -left-10 size-56 rounded-full opacity-15"
                style={{ background: "radial-gradient(circle, #fff 0%, transparent 70%)" }}
              />
            </>
          )}

          <div className="relative z-10 flex flex-col items-center gap-5 text-center">
            {logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={logoUrl}
                alt={brandName || "Store"}
                width={200}
                height={80}
                className="h-16 w-auto max-w-[200px] object-contain drop-shadow-md min-[720px]:h-20"
              />
            ) : (
              <span className="text-lg font-semibold tracking-wide text-white">
                {brandName || "Returns"}
              </span>
            )}
            <div className="max-w-[18rem] space-y-2">
              <p className="text-xl font-semibold leading-snug tracking-tight text-white min-[720px]:text-2xl">
                Look up your order in seconds
              </p>
              <p className="text-sm leading-relaxed text-white/75">
                No account needed — just the details from your checkout.
              </p>
            </div>
          </div>
        </div>

        {/* Form panel */}
        <div className="flex flex-1 flex-col justify-center gap-5 px-6 py-8 min-[720px]:px-10">
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
  );
}
