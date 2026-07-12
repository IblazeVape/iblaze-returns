"use client";

import { useState } from "react";

/**
 * Guest order lookup form for the App Proxy portal. Shown when the customer
 * has no Shopify account session (guest checkout). Verifies order number +
 * email + postcode against the tenant's Shopify data — see
 * app/apps/returns/guest-lookup/route.ts for the server-side check.
 *
 * On success the server sets a session cookie (scoped to just the verified
 * order) and this reloads into /apps/returns, which then renders the real
 * DashboardClient portal for that order.
 */
export function GuestLookupForm() {
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
        body: JSON.stringify({ orderNumber, email, postcode }),
      });
      const data = await res.json();
      if (!res.ok) {
        setStatus("error");
        setError(data.error || "Something went wrong. Please try again.");
        return;
      }
      // Session cookie is set — reload into the real portal for this order.
      window.location.href = "/apps/returns";
    } catch {
      setStatus("error");
      setError("Something went wrong. Please try again.");
    }
  }

  return (
    <form onSubmit={handleSubmit} style={{ maxWidth: 360, width: "100%" }}>
      <h2 style={{ fontSize: "1.1rem", fontWeight: 600, marginBottom: "0.25rem", textAlign: "center" }}>
        Look up your order
      </h2>
      <p style={{ color: "#666", fontSize: "0.9rem", textAlign: "center", marginBottom: "1.25rem" }}>
        Enter your order number, the email used at checkout, and your delivery postcode.
      </p>

      <label style={fieldLabelStyle}>
        Order number
        <input
          value={orderNumber}
          onChange={(e) => setOrderNumber(e.target.value)}
          placeholder="#1234"
          required
          style={inputStyle}
        />
      </label>
      <label style={fieldLabelStyle}>
        Email
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          required
          style={inputStyle}
        />
      </label>
      <label style={fieldLabelStyle}>
        Postcode
        <input
          value={postcode}
          onChange={(e) => setPostcode(e.target.value)}
          placeholder="SW1A 1AA"
          required
          style={inputStyle}
        />
      </label>

      {status === "error" && (
        <p style={{ color: "#c0392b", fontSize: "0.85rem", marginBottom: "0.75rem" }}>{error}</p>
      )}

      <button type="submit" disabled={status === "loading"} style={buttonStyle}>
        {status === "loading" ? "Looking up…" : "Find my order"}
      </button>
    </form>
  );
}

const fieldLabelStyle: React.CSSProperties = {
  display: "block",
  fontSize: "0.85rem",
  fontWeight: 500,
  color: "#333",
  marginBottom: "0.9rem",
};

const inputStyle: React.CSSProperties = {
  display: "block",
  width: "100%",
  marginTop: "0.3rem",
  padding: "0.55rem 0.7rem",
  border: "1px solid #ccc",
  borderRadius: "6px",
  fontSize: "0.95rem",
};

const buttonStyle: React.CSSProperties = {
  width: "100%",
  padding: "0.65rem",
  background: "#111",
  color: "#fff",
  border: "none",
  borderRadius: "6px",
  fontSize: "0.95rem",
  fontWeight: 600,
  cursor: "pointer",
};
