export type SidebarLayout = "inset" | "sidebar"

export const SIDEBAR_LAYOUT_COOKIE = "sidebar_layout"
export const SIDEBAR_LAYOUT_DEFAULT: SidebarLayout = "inset"
const SIDEBAR_LAYOUT_MAX_AGE = 60 * 60 * 24 * 365

export function parseSidebarLayout(value: string | null | undefined): SidebarLayout {
  return value === "sidebar" ? "sidebar" : "inset"
}

export function getSidebarLayoutCookie(): SidebarLayout {
  if (typeof document === "undefined") return SIDEBAR_LAYOUT_DEFAULT
  const match = document.cookie.match(new RegExp(`(?:^|; )${SIDEBAR_LAYOUT_COOKIE}=([^;]*)`))
  return parseSidebarLayout(match?.[1])
}

/** Distinguishes "no preference stored yet" from "cookie explicitly set to
 * the same value as the default" — needed to decide whether the merchant's
 * configured default should still apply. */
export function hasSidebarLayoutCookie(): boolean {
  if (typeof document === "undefined") return false
  return new RegExp(`(?:^|; )${SIDEBAR_LAYOUT_COOKIE}=`).test(document.cookie)
}

export function setSidebarLayoutCookie(layout: SidebarLayout) {
  document.cookie = `${SIDEBAR_LAYOUT_COOKIE}=${layout}; path=/; max-age=${SIDEBAR_LAYOUT_MAX_AGE}`
}
