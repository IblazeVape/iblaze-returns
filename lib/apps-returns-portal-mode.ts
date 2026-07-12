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
