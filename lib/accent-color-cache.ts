// lib/accent-color-cache.ts
const CACHED_ACCENT_COLOR_KEY = "iblaze_cached_accent_color";

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
