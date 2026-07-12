"use client";

/**
 * Cross-cutting flags for rendering DashboardClient inside the multi-tenant
 * App Proxy portal (/apps/returns), as opposed to iBlaze's own legacy `/`
 * OAuth portal. Set once by ClientPortalGate before DashboardClient first
 * mounts — same module-level pattern as DEMO_MODE / hideLegacySignOut in
 * user-account-menu.tsx — so DashboardClient and its children don't need
 * extra props threaded through every layer.
 */

let appsReturnsPortal = false;
export function setAppsReturnsPortal(enabled: boolean) {
  appsReturnsPortal = enabled;
}
/** True for ANY App Proxy session (guest or logged-in) — account.iblazevape.co.uk
 * is iBlaze's own single-tenant customer login and is meaningless for these. */
export function isAppsReturnsPortal() {
  return appsReturnsPortal;
}

// Which identity flow the current App Proxy request is in. Distinct from
// isGuestOrderContext(): a guest is "guest-or-login" here from the moment
// they land on the lookup form, before they've verified any order — used to
// keep the sidebar from showing a "My Orders" nav item that has nowhere
// useful to go yet.
export type AppsReturnsIdentityKind = "logged-in" | "guest-or-login" | null;
let identityKind: AppsReturnsIdentityKind = null;
export function setAppsReturnsIdentityKind(kind: AppsReturnsIdentityKind) {
  identityKind = kind;
}
export function getAppsReturnsIdentityKind() {
  return identityKind;
}

let guestOrderId: string | null = null;
let onLookupAnotherOrder: (() => void) | null = null;

/** Guest verified exactly one order (no store login) — set the numeric order id
 * DashboardClient should auto-open, and the callback its "look up another
 * order" action should trigger (clears the session, shows the form again). */
export function setGuestOrderContext(orderId: string | null, onLookupAnother: (() => void) | null) {
  guestOrderId = orderId;
  onLookupAnotherOrder = onLookupAnother;
}
export function getGuestOrderId() {
  return guestOrderId;
}
export function isGuestOrderContext() {
  return guestOrderId !== null;
}
export function lookupAnotherOrder() {
  onLookupAnotherOrder?.();
}
