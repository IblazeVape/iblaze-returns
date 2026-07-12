"use client";

import { useEffect, useState } from "react";

const ATTEMPT_KEY = "apps_returns_mint_attempts";
const MAX_ATTEMPTS = 2;

function hasMarkerCookie(): boolean {
  return document.cookie.split("; ").some((c) => c === "apps_returns_marker=1");
}

/**
 * Mints the apps_returns_session cookie for a logged-in customer via a
 * client-side fetch (re-enters Shopify's App Proxy, same mechanism proven
 * working by the guest-lookup form), then reloads into the real portal.
 * MUST be a client-side fetch, not a server redirect — see
 * app/apps/returns/session/route.ts for why.
 *
 * Guards against an infinite reload loop (if the session cookie doesn't
 * survive the reload for any reason, e.g. Set-Cookie stripped somewhere in
 * the proxy chain): caps retries via sessionStorage, and after a successful
 * fetch checks the non-httpOnly apps_returns_marker cookie (set alongside the
 * real session cookie) to confirm Set-Cookie actually reached the browser
 * before reloading — if it didn't, this shows that diagnosis on screen
 * instead of looping again.
 */
export function MintSession() {
  const [error, setError] = useState("");

  useEffect(() => {
    const attempts = Number(sessionStorage.getItem(ATTEMPT_KEY) || "0");

    if (attempts >= MAX_ATTEMPTS) {
      setError(
        hasMarkerCookie()
          ? "Signed in, but the app couldn't detect it after reloading. Please refresh the page."
          : "The sign-in cookie isn't reaching your browser (it may be getting blocked or stripped somewhere between your store and the app)."
      );
      return;
    }

    sessionStorage.setItem(ATTEMPT_KEY, String(attempts + 1));

    fetch("/apps/returns/session")
      .then(async (res) => {
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          setError(data.error || "Couldn't verify your session.");
          return;
        }
        if (!hasMarkerCookie()) {
          setError(
            "Signed in on the server, but the browser didn't keep the cookie. This usually means it was stripped in transit."
          );
          return;
        }
        sessionStorage.removeItem(ATTEMPT_KEY);
        window.location.href = "/apps/returns";
      })
      .catch(() => setError("Something went wrong. Please try again."));
  }, []);

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
      <div style={{ maxWidth: 420, textAlign: "center" }}>
        {error ? (
          <>
            <h1 style={{ fontSize: "1.15rem", fontWeight: 600, marginBottom: "0.5rem" }}>
              Couldn&apos;t sign you in
            </h1>
            <p style={{ color: "#555", lineHeight: 1.5 }}>{error}</p>
          </>
        ) : (
          <p style={{ color: "#555" }}>Signing you in…</p>
        )}
      </div>
    </main>
  );
}
