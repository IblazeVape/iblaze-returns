"use client";

/**
 * Client-side storage + fetch-patching for the App Proxy portal session.
 *
 * Shopify's App Proxy strips Set-Cookie on responses (confirmed live via a
 * marker-cookie test), so the session token can't travel as a cookie. It's
 * returned in the JSON body of session/route.ts and guest-lookup/route.ts
 * instead, stored here in localStorage, and attached as a header to every
 * same-origin API call — which lets DashboardClient (reused verbatim, its
 * own fetch("/api/...") calls are never modified) still authenticate: the
 * server (lib/request-shop.ts) reads this header as an alternative to a
 * cookie.
 */
const STORAGE_KEY = "apps_returns_session_token";
export const APPS_RETURNS_SESSION_HEADER = "x-apps-returns-session";

export function storeAppsReturnsSession(token: string) {
  try {
    localStorage.setItem(STORAGE_KEY, token);
  } catch {
    /* localStorage unavailable (private mode etc.) — session just won't persist */
  }
}

export function getStoredAppsReturnsSession(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

export function clearStoredAppsReturnsSession() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

let patched = false;

/**
 * Monkey-patches window.fetch (once) so any relative /api/* request
 * automatically carries the stored session token as a header. Must run
 * before DashboardClient mounts and fires its own fetches.
 */
export function installAppsReturnsFetchPatch() {
  if (patched || typeof window === "undefined") return;
  patched = true;

  const originalFetch = window.fetch.bind(window);
  window.fetch = (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
    if (url.startsWith("/api/")) {
      const token = getStoredAppsReturnsSession();
      if (token) {
        const headers = new Headers(init?.headers ?? (typeof input === "object" && "headers" in input ? input.headers : undefined));
        headers.set(APPS_RETURNS_SESSION_HEADER, token);
        return originalFetch(input, { ...init, headers });
      }
    }
    return originalFetch(input, init);
  };
}
