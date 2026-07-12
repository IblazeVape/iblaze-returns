export type ShopifyOrderForMatch = {
  email?: string | null;
  shippingAddress?: { zip?: string | null } | null;
};

/**
 * Normalize a postcode for comparison: trims, uppercases, strips internal
 * whitespace. Matches how carrier tracking portals (Royal Mail, UPS, etc.)
 * compare postcodes — case/spacing shouldn't matter ("sw1a 1aa" === "SW1A1AA").
 */
export function normalizePostcode(v: string): string {
  return v.trim().toUpperCase().replace(/\s+/g, "");
}

function normalizeEmail(v: string): string {
  return v.trim().toLowerCase();
}

/**
 * Two-factor guest-order match: email (case-insensitive) AND postcode
 * (whitespace/case-insensitive) must both match the order's real Shopify
 * data. Either factor missing/mismatched fails the whole match — this is the
 * hardening beyond email-only lookup.
 */
export function guestOrderMatches(
  order: ShopifyOrderForMatch | null | undefined,
  candidateEmail: string,
  candidatePostcode: string
): boolean {
  if (!order) return false;

  const orderEmail = order.email ? normalizeEmail(order.email) : null;
  const orderZip = order.shippingAddress?.zip ? normalizePostcode(order.shippingAddress.zip) : null;

  if (!orderEmail || !orderZip) return false;

  const emailMatches = orderEmail === normalizeEmail(candidateEmail);
  const postcodeMatches = orderZip === normalizePostcode(candidatePostcode);

  return emailMatches && postcodeMatches;
}
