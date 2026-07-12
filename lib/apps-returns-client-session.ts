"use client";

/**
 * Client-side storage + fetch-patching for the App Proxy portal session.
 *
 * Two platform constraints drive this file, both confirmed live:
 *  1. Shopify's App Proxy strips Set-Cookie on responses — so the session
 *     token can't travel as a cookie. It's returned in the JSON body of
 *     session/route.ts and guest-lookup/route.ts instead, stored here in
 *     localStorage, and attached as a header on API calls.
 *  2. Shopify's App Proxy only forwards requests matching the configured
 *     prefix (/apps/returns/*). DashboardClient's own fetch("/api/get-
 *     orders") etc. do NOT match that prefix, so on the storefront domain
 *     those requests never reach Shopify's proxy at all — the storefront
 *     404s them itself. So this patch also REWRITES /api/* requests to an
 *     absolute URL on our own domain, bypassing the proxy entirely for API
 *     calls (mirroring what next.config.mjs's assetPrefix already does for
 *     static JS/CSS). This makes them genuine cross-origin requests, so the
 *     API routes need CORS headers (lib/cors.ts).
 *
 * Together these let DashboardClient run completely unmodified — its own
 * fetch("/api/...") calls are patched transparently at the window.fetch
 * level, never edited in the component itself.
 */
const STORAGE_KEY = "apps_returns_session_token";
export const APPS_RETURNS_SESSION_HEADER = "x-apps-returns-session";
const APP_ORIGIN = "https://iblaze-returns.vercel.app";

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
 * Monkey-patches window.fetch (once): rewrites /api/* requests to our
 * absolute domain (bypassing the App Proxy, which doesn't forward that
 * path) and attaches the stored session token as a header. Must run before
 * DashboardClient mounts and fires its own fetches. A no-op when already on
 * our own domain directly (nothing to rewrite/no proxy involved).
 */
export function installAppsReturnsFetchPatch() {
  if (patched || typeof window === "undefined") return;
  patched = true;
  if (window.location.origin === APP_ORIGIN) return; // direct access — no proxy to route around

  const originalFetch = window.fetch.bind(window);
  window.fetch = (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
    if (!url.startsWith("/api/")) return originalFetch(input, init);

    const absoluteUrl = `${APP_ORIGIN}${url}`;
    const headers = new Headers(
      init?.headers ?? (typeof input === "object" && "headers" in input ? input.headers : undefined)
    );
    const token = getStoredAppsReturnsSession();
    if (token) headers.set(APPS_RETURNS_SESSION_HEADER, token);

    return originalFetch(absoluteUrl, { ...init, headers });
  };
}
