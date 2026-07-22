"use client";

import { useEffect, useLayoutEffect, useState } from "react";
import DashboardClient from "@/components/dashboard-client";
import { GuestLookupForm } from "@/components/apps-returns/guest-lookup-form";
import { GuestPortalShell } from "@/components/apps-returns/guest-portal-shell";
import { AuthenticatingCard } from "@/components/apps-returns/authenticating-card";
import { PortalCustomScripts } from "@/components/apps-returns/portal-custom-scripts";
import { setHideLegacySignOut } from "@/components/user-account-menu";
import {
  storeAppsReturnsSession,
  clearStoredAppsReturnsSession,
  installAppsReturnsFetchPatch,
} from "@/lib/apps-returns-client-session";
import { setAppsReturnsPortal, setAppsReturnsIdentityKind, setGuestOrderContext } from "@/lib/apps-returns-portal-mode";
import { setCachedAccentColor, setCachedSidebarDefaultOpen } from "@/lib/accent-color-cache";
import { setPortalToastPosition } from "@/lib/portal-toast";

export type InitialBranding = {
  name: string
  logoUrl: string
  logoHeight: number
  accentColor: string
  storefrontUrl: string
  storeLinkEnabled: boolean
  storeLinkLabel: string
  sidebarLinks: { label: string; url: string; icon?: string; children?: { label: string; url: string; icon?: string }[] }[]
  sidebarNote: string
  sidebarLayoutSwitcherEnabled: boolean
  defaultSidebarLayout: "inset" | "sidebar"
  sidebarEnabled: boolean
  lookupSidebarEnabled: boolean
  sidebarDefaultOpenOnDesktop: boolean
  sidebarAvatarEnabled: boolean
  headerAvatarEnabled: boolean
  sidebarSubmenusExpandedByDefault: boolean
  orderStatusLinkEnabled: boolean
  orderStatusLinkLabel: string
  headerSearchEnabled: boolean
  headerSearchPlaceholder: string
  guestBackgroundStyle: "none" | "shapeGrid" | "dotField"
  guestLookupLayout: "classic" | "split"
  guestLookupHeadline: string
  guestLookupSubtext: string
  guestLookupHeroUrl: string
  guestLookupBrandDisplay: "logo" | "text" | "none"
  guestLookupLogoUrl: string
  guestLookupOverlayOpacity: number
  guestLookupOverlayBlur: number
  guestLookupSnakeBorder: boolean
  guestLookupSideStyle: "image" | "gradient"
  guestLookupGradientFrom: string
  guestLookupGradientTo: string
  toastPosition: "top-left" | "top-center" | "top-right" | "bottom-left" | "bottom-center" | "bottom-right"
  portalCustomScript: string
  loggedInLookupRequirePostcode: boolean
}

export type GateInitial =
  | { kind: "unsigned" }
  | { kind: "not-set-up"; shop: string }
  | { kind: "logged-in"; branding: Pick<InitialBranding, "accentColor" | "toastPosition" | "portalCustomScript"> }
  | { kind: "logged-in-lookup"; branding: InitialBranding }
  | { kind: "guest-or-login"; branding: InitialBranding }
  | { kind: "guest-login-required" };

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

  // Seed accent + toast position as soon as we have server branding — before
  // paint of AuthenticatingCard / GuestPortalShell so a freshly changed accent
  // never flashes the previous cached (or default) colour.
  if (
    initial.kind === "logged-in" ||
    initial.kind === "guest-or-login" ||
    initial.kind === "logged-in-lookup"
  ) {
    if (initial.branding.accentColor) {
      setCachedAccentColor(initial.branding.accentColor);
      if (typeof document !== "undefined") {
        document.documentElement.style.setProperty("--brand", initial.branding.accentColor);
      }
    }
    setPortalToastPosition(initial.branding.toastPosition);
    if (
      (initial.kind === "guest-or-login" || initial.kind === "logged-in-lookup") &&
      typeof initial.branding.sidebarDefaultOpenOnDesktop === "boolean"
    ) {
      setCachedSidebarDefaultOpen(initial.branding.sidebarDefaultOpenOnDesktop);
    }
  }

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

  function openVerifiedOrder(token: string, orderId: string, branding: InitialBranding) {
    storeAppsReturnsSession(token);
    // Seed the cache DashboardClient reads on its first paint so its
    // Authenticating overlay shows the tenant's actual color immediately.
    setCachedAccentColor(branding.accentColor);
    setCachedSidebarDefaultOpen(branding.sidebarDefaultOpenOnDesktop);
    setPortalToastPosition(branding.toastPosition);
    const numericOrderId = orderId.split("/").pop() ?? null;
    setGuestOrderContext(numericOrderId, handleLookupAnother);
    setReady(true);
  }

  if (ready) return <DashboardClient />;

  if (error) {
    return <Notice title="Couldn't sign you in" body={error} />;
  }

  if (signingIn) {
    const accent =
      initial.kind === "logged-in" ? initial.branding.accentColor : undefined;
    return <AuthenticatingCard accentColor={accent} />;
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
      return <AuthenticatingCard accentColor={initial.branding.accentColor} />;
    case "guest-login-required":
      return <RedirectToStoreLogin />;
    case "guest-or-login": {
      const loginUrl = `/customer_authentication/login?return_to=${encodeURIComponent("/apps/returns")}`;
      return (
        <LookupScreen
          branding={initial.branding}
          loginUrl={loginUrl}
          onVerified={(token, order) => openVerifiedOrder(token, order.id, initial.branding)}
        />
      );
    }
    case "logged-in-lookup":
      // Merchant has alwaysShowGuestLookup on: even though the App Proxy
      // confirms this browser IS logged in, skip the auto full-history
      // session and show the lookup form instead — scoped to one order
      // (like a guest). Postcode is skipped by default (login is enough);
      // merchants can require it via loggedInLookupRequirePostcode.
      return (
        <LookupScreen
          branding={initial.branding}
          requirePostcode={initial.branding.loggedInLookupRequirePostcode}
          onVerified={(token, order) => openVerifiedOrder(token, order.id, initial.branding)}
        />
      );
  }
}

function LookupScreen({
  branding,
  loginUrl,
  requirePostcode = true,
  onVerified,
}: {
  branding: InitialBranding
  loginUrl?: string
  requirePostcode?: boolean
  onVerified: (token: string, order: { id: string }) => void
}) {
  return (
    <GuestPortalShell branding={branding} title={branding.name || "Returns"}>
      <PortalCustomScripts html={branding.portalCustomScript} />
      <GuestLookupForm
        requirePostcode={requirePostcode}
        layout={branding.guestLookupLayout}
        brandName={branding.name}
        logoUrl={
          branding.guestLookupBrandDisplay === "logo"
            ? (branding.guestLookupLogoUrl || branding.logoUrl)
            : undefined
        }
        brandDisplay={branding.guestLookupBrandDisplay}
        heroImageUrl={branding.guestLookupHeroUrl || undefined}
        headline={branding.guestLookupHeadline}
        subtext={branding.guestLookupSubtext}
        overlayOpacity={branding.guestLookupOverlayOpacity}
        overlayBlur={branding.guestLookupOverlayBlur}
        snakeBorder={branding.guestLookupSnakeBorder}
        sideStyle={branding.guestLookupSideStyle}
        gradientFrom={branding.guestLookupGradientFrom}
        gradientTo={branding.guestLookupGradientTo}
        loginUrl={loginUrl}
        onVerified={onVerified}
      />
    </GuestPortalShell>
  );
}

/** Guest lookup disabled — jump to Shopify login, then return_to brings them back to the portal. */
function RedirectToStoreLogin() {
  useLayoutEffect(() => {
    // New Customer Accounts: /customer_authentication/login?return_to=… (relative path only).
    // Legacy /account/login?return_url= often dumps people on the account orders page instead.
    const loginUrl = `/customer_authentication/login?return_to=${encodeURIComponent("/apps/returns")}`;
    window.location.replace(loginUrl);
  }, []);
  return null;
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
