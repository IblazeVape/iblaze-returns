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
 * Guest-order match: email (case-insensitive) always required. Postcode
 * (whitespace/case-insensitive) is required too unless `requirePostcode` is
 * false (a merchant Settings toggle — see guestLookupRequirePostcode) — in
 * which case email alone is the match. Either required factor
 * missing/mismatched fails the whole match.
 */
export function guestOrderMatches(
  order: ShopifyOrderForMatch | null | undefined,
  candidateEmail: string,
  candidatePostcode: string,
  requirePostcode: boolean = true
): boolean {
  if (!order) return false;

  const orderEmail = order.email ? normalizeEmail(order.email) : null;
  if (!orderEmail) return false;
  if (orderEmail !== normalizeEmail(candidateEmail)) return false;

  if (requirePostcode) {
    const orderZip = order.shippingAddress?.zip ? normalizePostcode(order.shippingAddress.zip) : null;
    if (!orderZip || orderZip !== normalizePostcode(candidatePostcode)) return false;
  }

  return true;
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
