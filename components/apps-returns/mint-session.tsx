"use client";

import { useEffect, useState } from "react";

/**
 * Mints the apps_returns_session cookie for a logged-in customer via a
 * client-side fetch (re-enters Shopify's App Proxy, same mechanism proven
 * working by the guest-lookup form), then reloads into the real portal.
 * MUST be a client-side fetch, not a server redirect — see
 * app/apps/returns/session/route.ts for why.
 */
export function MintSession() {
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/apps/returns/session")
      .then(async (res) => {
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          setError(data.error || "Couldn't verify your session.");
          return;
        }
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
