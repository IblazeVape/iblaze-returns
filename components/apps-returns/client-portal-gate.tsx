"use client";

import { useEffect, useState } from "react";
import DashboardClient from "@/components/dashboard-client";
import { GuestLookupForm } from "@/components/apps-returns/guest-lookup-form";
import { GuestPortalShell } from "@/components/apps-returns/guest-portal-shell";
import { AuthenticatingCard } from "@/components/apps-returns/authenticating-card";
import { setHideLegacySignOut } from "@/components/user-account-menu";
import {
  storeAppsReturnsSession,
  clearStoredAppsReturnsSession,
  installAppsReturnsFetchPatch,
} from "@/lib/apps-returns-client-session";
import { setAppsReturnsPortal, setAppsReturnsIdentityKind, setGuestOrderContext } from "@/lib/apps-returns-portal-mode";
import { setCachedAccentColor } from "@/lib/accent-color-cache";

export type InitialBranding = {
  name: string
  logoUrl: string
  accentColor: string
  storefrontUrl: string
  storeLinkEnabled: boolean
  storeLinkLabel: string
  sidebarLinks: { label: string; url: string; icon?: string; children?: { label: string; url: string; icon?: string }[] }[]
  sidebarNote: string
  sidebarLayoutSwitcherEnabled: boolean
  defaultSidebarLayout: "inset" | "sidebar"
  sidebarSubmenusExpandedByDefault: boolean
  guestBackgroundStyle: "none" | "shapeGrid" | "dotField"
  guestLookupLayout: "classic" | "split"
  guestLookupHeadline: string
  guestLookupSubtext: string
  guestLookupHeroUrl: string
  guestLookupBrandDisplay: "logo" | "text" | "none"
  guestLookupLogoUrl: string
  guestLookupOverlayOpacity: number
  guestLookupOverlayBlur: number
}

export type GateInitial =
  | { kind: "unsigned" }
  | { kind: "not-set-up"; shop: string }
  | { kind: "logged-in" }
  | { kind: "logged-in-lookup"; branding: InitialBranding }
  | { kind: "guest-or-login"; branding: InitialBranding };

/**
 * Client-side identity resolution + portal rendering for the App Proxy
 * entry (/apps/returns), for ANY tenant.
 *
 * Renders DashboardClient (reused verbatim) INLINE, in the same page load,
 * once a session token is available — never via a page reload/navigation.
 * This is deliberate: Shopify's App Proxy strips Set-Cookie on the way back
 * to the browser (confirmed live with a marker-cookie test), so a
 * reload-and-hope-the-cookie-stuck approach silently loops forever. Instead:
 * the session token comes back in a JSON body, gets stored in localStorage,
 * and a window.fetch patch (installed before DashboardClient mounts)
 * attaches it as a header to DashboardClient's own unmodified API calls.
 *
 * Identity always tracks the CURRENT signed proxy request, never a stored
 * token from a previous visit:
 *  - "logged-in" (Shopify says this browser IS logged into the store right
 *    now) always mints a FRESH session, ignoring any pre-existing stored
 *    token — a shared/public device could have a different customer's token
 *    left over, and only a fresh mint is guaranteed to match who's actually
 *    logged in this instant.
 *  - "guest-or-login" (NOT currently logged into the store) never resumes a
 *    stored session either — the full order-history portal must never be
 *    reachable without being logged into the store; only the guest lookup
 *    form (which re-verifies order+email+postcode) or an explicit login.
 */
export function ClientPortalGate({ initial }: { initial: GateInitial }) {
  const [ready, setReady] = useState(false);
  const [signingIn, setSigningIn] = useState(false);
  const [error, setError] = useState("");

  // Set synchronously during render, not in the effect below: GuestPortalShell
  // (via AppSidebar) can render on this very first pass — for "guest-or-login"
  // — and an effect only runs after that render has already committed, which
  // left AppSidebar reading the stale default ("no identity") on first paint
  // with nothing to trigger a re-render afterward. These are plain module
  // flags (not React state), so setting them during render is safe and
  // idempotent — same pattern as DEMO_MODE elsewhere in this codebase.
  setHideLegacySignOut(true);
  setAppsReturnsPortal(true);
  // "logged-in-lookup" maps to the "guest-or-login" identity kind: from the
  // sidebar's perspective (see isGuestPending in app-sidebar.tsx) it behaves
  // identically — no verified order yet, so no "My Orders" nav target —
  // regardless of why the lookup form is showing.
  setAppsReturnsIdentityKind(
    initial.kind === "logged-in" ? "logged-in"
    : initial.kind === "guest-or-login" || initial.kind === "logged-in-lookup" ? "guest-or-login"
    : null
  );

  useEffect(() => {
    installAppsReturnsFetchPatch();

    if (initial.kind === "logged-in") {
      setSigningIn(true);
      fetch("/apps/returns/session", { method: "POST" })
        .then(async (res) => {
          const data = await res.json().catch(() => ({}));
          if (!res.ok || !data.session) {
            setError(data.error || "Couldn't verify your session.");
            return;
          }
          storeAppsReturnsSession(data.session);
          setReady(true);
        })
        .catch(() => setError("Something went wrong. Please try again."))
        .finally(() => setSigningIn(false));
      return;
    }

    if (initial.kind === "guest-or-login" || initial.kind === "logged-in-lookup") {
      clearStoredAppsReturnsSession();
      setGuestOrderContext(null, null);
    }
  }, [initial]);

  // Guest verified one order and wants to look up a different one — clear
  // everything and drop back to the fresh lookup form (no page reload: a
  // reload would re-run the signed proxy request, which — correctly, per
  // the "not logged in -> guest lookup only" rule above — never resumes a
  // session on its own).
  function handleLookupAnother() {
    clearStoredAppsReturnsSession();
    setGuestOrderContext(null, null);
    setReady(false);
  }

  if (ready) return <DashboardClient />;

  if (error) {
    return <Notice title="Couldn't sign you in" body={error} />;
  }

  if (signingIn) {
    return <AuthenticatingCard />;
  }

  switch (initial.kind) {
    case "unsigned":
      return (
        <Notice
          title="Open your returns portal from your store"
          body="This page must be reached through your shop (the Returns link on your order). The request wasn't a valid Shopify App Proxy request."
        />
      );
    case "not-set-up":
      return (
        <Notice
          title="This store isn't set up yet"
          body={`No tenant record for ${initial.shop}. The merchant needs to (re)install the app.`}
        />
      );
    case "logged-in":
      // useEffect above is about to fire the session fetch; signingIn covers
      // the visible state a beat later. Avoid a flash of guest UI here.
      return <AuthenticatingCard />;
    case "guest-or-login": {
      const loginUrl = `/account/login?return_url=${encodeURIComponent("/apps/returns")}`;
      return (
        <GuestPortalShell branding={initial.branding} title={initial.branding.name || "Returns"}>
          <GuestLookupForm
            layout={initial.branding.guestLookupLayout}
            brandName={initial.branding.name}
            logoUrl={
              initial.branding.guestLookupBrandDisplay === "logo"
                ? (initial.branding.guestLookupLogoUrl || initial.branding.logoUrl)
                : undefined
            }
            brandDisplay={initial.branding.guestLookupBrandDisplay}
            heroImageUrl={initial.branding.guestLookupHeroUrl || undefined}
            headline={initial.branding.guestLookupHeadline}
            subtext={initial.branding.guestLookupSubtext}
            overlayOpacity={initial.branding.guestLookupOverlayOpacity}
            overlayBlur={initial.branding.guestLookupOverlayBlur}
            loginUrl={loginUrl}
            onVerified={(token, order) => {
              storeAppsReturnsSession(token);
              // We already have the real accent color server-side (it came
              // down in `initial.branding`) — seed the cache DashboardClient
              // reads on its first paint so its "Authenticating" overlay
              // shows the tenant's actual color immediately instead of
              // flashing neutral gray while it re-fetches branding itself.
              setCachedAccentColor(initial.branding.accentColor);
              const numericOrderId = order.id.split("/").pop() ?? null;
              setGuestOrderContext(numericOrderId, handleLookupAnother);
              setReady(true);
            }}
          />
        </GuestPortalShell>
      );
    }
    case "logged-in-lookup":
      // Merchant has alwaysShowGuestLookup on: even though the App Proxy
      // confirms this browser IS logged in, skip the auto full-history
      // session and show the lookup form instead — scoped to one order
      // (like a guest), but no postcode needed since the store login itself
      // is verified server-side against the looked-up order's customer ID
      // (see loggedInOrderMatches in lib/guest-order-match.ts).
      return (
        <GuestPortalShell branding={initial.branding} title={initial.branding.name || "Returns"}>
          <GuestLookupForm
            requirePostcode={false}
            layout={initial.branding.guestLookupLayout}
            brandName={initial.branding.name}
            logoUrl={
              initial.branding.guestLookupBrandDisplay === "logo"
                ? (initial.branding.guestLookupLogoUrl || initial.branding.logoUrl)
                : undefined
            }
            brandDisplay={initial.branding.guestLookupBrandDisplay}
            heroImageUrl={initial.branding.guestLookupHeroUrl || undefined}
            headline={initial.branding.guestLookupHeadline}
            subtext={initial.branding.guestLookupSubtext}
            overlayOpacity={initial.branding.guestLookupOverlayOpacity}
            overlayBlur={initial.branding.guestLookupOverlayBlur}
            onVerified={(token, order) => {
              storeAppsReturnsSession(token);
              setCachedAccentColor(initial.branding.accentColor);
              const numericOrderId = order.id.split("/").pop() ?? null;
              setGuestOrderContext(numericOrderId, handleLookupAnother);
              setReady(true);
            }}
          />
        </GuestPortalShell>
      );
  }
}

function Notice({ title, body }: { title: string; body: string }) {
  return (
    <div
      className="flex items-center justify-center bg-background/40 px-4"
      style={{ minHeight: "100dvh", width: "100vw" }}
    >
      <div className="max-w-md text-center">
        {title && <h1 className="text-lg font-semibold mb-2">{title}</h1>}
        <p className="text-sm text-muted-foreground leading-relaxed">{body}</p>
      </div>
    </div>
  );
}
