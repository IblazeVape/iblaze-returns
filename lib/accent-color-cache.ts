// lib/accent-color-cache.ts
const CACHED_ACCENT_COLOR_KEY = "iblaze_cached_accent_color";
const CACHED_SIDEBAR_DEFAULT_OPEN_KEY = "iblaze_cached_sidebar_default_open";

/** The tenant's accent color only arrives after a branding fetch resolves
 * (or, for AuthenticatingCard, may never arrive at all before this screen
 * unmounts), so the very first paint of any loading screen has no real
 * color to use yet. Caching the last-seen value means every visit AFTER
 * the first renders branded immediately instead of flashing a neutral
 * color — a genuine first-ever visit still falls back to neutral since
 * there's nothing to read yet. */
export function getCachedAccentColor(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(CACHED_ACCENT_COLOR_KEY);
  } catch {
    return null;
  }
}

export function setCachedAccentColor(color: string) {
  try {
    window.localStorage.setItem(CACHED_ACCENT_COLOR_KEY, color);
  } catch {
    // localStorage unavailable (private mode, etc.) — non-critical, skip.
  }
}

/** Same first-paint problem as accent: SidebarProvider only reads
 * `defaultOpen` on mount, and DashboardClient's branding state starts as
 * `true` until `/api/branding` returns. Cache the merchant's
 * "Sidebar starts open on desktop" so Find-your-order → auth → portal
 * doesn't flash expanded then collapse. */
export function getCachedSidebarDefaultOpen(): boolean | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(CACHED_SIDEBAR_DEFAULT_OPEN_KEY);
    if (raw === "1") return true;
    if (raw === "0") return false;
    return null;
  } catch {
    return null;
  }
}

export function setCachedSidebarDefaultOpen(open: boolean) {
  try {
    window.localStorage.setItem(CACHED_SIDEBAR_DEFAULT_OPEN_KEY, open ? "1" : "0");
  } catch {
    // localStorage unavailable — non-critical, skip.
  }
}
