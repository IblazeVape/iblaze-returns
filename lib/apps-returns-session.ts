import crypto from "crypto";

/**
 * Session for the App Proxy portal (/apps/returns). Separate from the legacy
 * `portal_session` (lib/auth.ts, iBlaze-only, carries a customer OAuth token).
 * This carries { shop, email, orderScope } so it works for ANY tenant:
 *  - logged-in customers: orderScope "" -> full order history (like an account).
 *  - guests (order-lookup match): orderScope = the one verified order's GID ->
 *    DashboardClient's own fetches to /api/get-orders get scoped to just that
 *    order, not the customer's full history (a guest verifying one order
 *    shouldn't browse everything ever placed under that email).
 * No customer OAuth access token here — eligibility falls back to the
 * merchant-admin-based check (lib/returnEligibility.ts), which get-orders
 * already does whenever accessToken is absent.
 */
const COOKIE_NAME = "apps_returns_session";
const MAX_AGE_SECONDS = 60 * 60 * 24; // 24h

export function buildAppsReturnsSession(
  shop: string,
  email: string,
  orderScope: string = ""
): { name: string; value: string; maxAge: number } {
  const secret = process.env.PORTAL_SECRET!;
  const expiry = Math.floor(Date.now() / 1000) + MAX_AGE_SECONDS;
  const data = `${shop}|${email}|${orderScope}|${expiry}`;
  const sig = crypto.createHmac("sha256", secret).update(data).digest("hex");
  return { name: COOKIE_NAME, value: `${data}|${sig}`, maxAge: MAX_AGE_SECONDS };
}

export function validateAppsReturnsSession(cookieValue: string | undefined | null): {
  valid: boolean;
  shop?: string;
  email?: string;
  orderScope?: string;
} {
  if (!cookieValue) return { valid: false };
  const parts = cookieValue.split("|");
  if (parts.length !== 5) return { valid: false };
  const [shop, email, orderScope, expiry, sig] = parts;

  if (Math.floor(Date.now() / 1000) > parseInt(expiry, 10)) return { valid: false };

  const secret = process.env.PORTAL_SECRET!;
  const expected = crypto
    .createHmac("sha256", secret)
    .update(`${shop}|${email}|${orderScope}|${expiry}`)
    .digest("hex");
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return { valid: false };

  return { valid: true, shop, email, orderScope: orderScope || undefined };
}

export const APPS_RETURNS_COOKIE_NAME = COOKIE_NAME;
