"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
 * Styled with the same Card/Input/Button/Spinner primitives as the rest of
 * DashboardClient (see AuthenticatingCard) so this doesn't look like a
 * separate, unstyled page bolted onto the real portal.
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
}: {
  onVerified: (token: string, order: GuestOrder) => void;
  /** Off for logged-in customers (their store login is the 3rd factor
   * instead) and, per the guestLookupRequirePostcode Settings toggle, for
   * guests too — see app/apps/returns/guest-lookup/route.ts. */
  requirePostcode?: boolean;
  description?: string;
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

  return (
    <Card className="w-full max-w-md mx-4 shadow-xl">
      <CardHeader>
        <CardTitle className="text-lg text-center">Find your order</CardTitle>
        <CardDescription className="text-center">
          {description ??
            (requirePostcode
              ? "Enter your order number, the email used at checkout, and your delivery postcode."
              : "Enter your order number and the email used at checkout.")}
        </CardDescription>
      </CardHeader>
      <CardContent>
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
      </CardContent>
    </Card>
  );
}
