"use client";

import { useEffect, useState } from "react";
import DashboardClient from "@/components/dashboard-client";
import { GuestLookupForm } from "@/components/apps-returns/guest-lookup-form";
import { AuthenticatingCard } from "@/components/apps-returns/authenticating-card";
import { setHideLegacySignOut } from "@/components/user-account-menu";
import {
  storeAppsReturnsSession,
  clearStoredAppsReturnsSession,
  installAppsReturnsFetchPatch,
} from "@/lib/apps-returns-client-session";

export type GateInitial =
  | { kind: "unsigned" }
  | { kind: "not-set-up"; shop: string }
  | { kind: "logged-in" }
  | { kind: "guest-or-login" };

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

  useEffect(() => {
    installAppsReturnsFetchPatch();
    // Sign-out here would point at the legacy iBlaze headless account
    // system, which App Proxy customers were never logged into — they log
    // out of their store account instead. Doesn't affect the legacy `/`
    // portal (never sets this).
    setHideLegacySignOut(true);

    if (initial.kind === "logged-in") {
      setSigningIn(true);
      fetch("/apps/returns/session")
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

    if (initial.kind === "guest-or-login") {
      clearStoredAppsReturnsSession();
    }
  }, [initial]);

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
        <main
          style={{
            minHeight: "70vh",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: "2rem",
            gap: "1.5rem",
            fontFamily: "system-ui, sans-serif",
          }}
        >
          <GuestLookupForm
            onVerified={(token) => {
              storeAppsReturnsSession(token);
              setReady(true);
            }}
          />
          <div style={{ color: "#888", fontSize: "0.85rem" }}>— or —</div>
          <a href={loginUrl} style={{ color: "#111", fontSize: "0.95rem", fontWeight: 600 }}>
            Log in to see all your orders
          </a>
        </main>
      );
    }
  }
}

function Notice({ title, body }: { title: string; body: string }) {
  return (
    <main
      style={{
        minHeight: "60vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "2rem",
        fontFamily: "system-ui, sans-serif",
      }}
    >
      <div style={{ maxWidth: 480, textAlign: "center" }}>
        {title && <h1 style={{ fontSize: "1.25rem", fontWeight: 600, marginBottom: "0.5rem" }}>{title}</h1>}
        <p style={{ color: "#555", lineHeight: 1.5 }}>{body}</p>
      </div>
    </main>
  );
}
