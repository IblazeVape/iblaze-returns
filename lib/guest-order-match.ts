export type ShopifyOrderForMatch = {
  email?: string | null;
  shippingAddress?: { zip?: string | null } | null;
  customer?: { id?: string | null } | null;
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
 * hardening beyond email-only lookup. Always required for logged-out guests.
 * Logged-in customers skip postcode unless the merchant enables
 * loggedInLookupRequirePostcode (see shippingPostcodeMatches).
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

/** Delivery postcode check only — used when a logged-in lookup also requires postcode. */
export function shippingPostcodeMatches(
  order: ShopifyOrderForMatch | null | undefined,
  candidatePostcode: string
): boolean {
  if (!order) return false;
  const orderZip = order.shippingAddress?.zip ? normalizePostcode(order.shippingAddress.zip) : null;
  if (!orderZip || !candidatePostcode.trim()) return false;
  return orderZip === normalizePostcode(candidatePostcode);
}

/**
 * Stronger check for customers already logged into the store (Shopify's
 * signed App Proxy request tells us their customer ID): the order must
 * belong to that exact customer AND the email must match — proves ownership
 * without needing a postcode at all, since the login itself is the third
 * factor guests don't have.
 */
export function loggedInOrderMatches(
  order: ShopifyOrderForMatch | null | undefined,
  candidateEmail: string,
  loggedInCustomerId: string
): boolean {
  if (!order) return false;

  const orderEmail = order.email ? normalizeEmail(order.email) : null;
  if (!orderEmail || orderEmail !== normalizeEmail(candidateEmail)) return false;

  const orderCustomerGid = order.customer?.id ?? null;
  if (!orderCustomerGid) return false;
  const orderCustomerId = orderCustomerGid.split("/").pop();
  return orderCustomerId === loggedInCustomerId;
}
