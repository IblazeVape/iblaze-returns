import { resolveTenant } from "@/lib/resolve-tenant";

// Returns the shop for a request: the signed App Proxy shop if present,
// otherwise the legacy iBlaze store (tenant #1) so the existing / portal keeps working.
export async function getRequestShop(
  request: Request
): Promise<{ shop: string; loggedInCustomerId: string | null } | null> {
  const resolved = await resolveTenant(request);
  if (resolved) return { shop: resolved.tenant.shop, loggedInCustomerId: resolved.loggedInCustomerId };
  const legacy = process.env.SHOPIFY_STORE_URL;
  if (legacy) return { shop: legacy, loggedInCustomerId: null };
  return null;
}
