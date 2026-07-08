// lib/resolve-tenant.ts
import type { Tenant } from "@/lib/tenant";
import { getTenant } from "@/lib/tenant";
import { verifyAppProxySignature, parseProxyRequest } from "@/lib/app-proxy";

// Foundation: resolve via signed App Proxy request. A future custom-domain
// branch can resolve by Host header before this, without touching callers.
export async function resolveTenant(
  req: Request
): Promise<{ tenant: Tenant; loggedInCustomerId: string | null } | null> {
  const url = new URL(req.url);
  const secret = process.env.SHOPIFY_CLIENT_SECRET;
  if (!secret) return null;
  if (!verifyAppProxySignature(url.searchParams, secret)) return null;
  const { shop, loggedInCustomerId } = parseProxyRequest(url.searchParams);
  if (!shop) return null;
  const tenant = await getTenant(shop);
  if (!tenant) return null;
  return { tenant, loggedInCustomerId };
}
