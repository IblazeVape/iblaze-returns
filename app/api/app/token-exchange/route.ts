import { NextRequest, NextResponse } from "next/server";
import { verifyMerchantSessionToken } from "@/lib/merchant-session-token";
import { exchangeSessionTokenForAccessToken } from "@/lib/shopify-token-exchange";
import { getTenant, setTenant, DEFAULT_TENANT_FIELDS } from "@/lib/tenant";
import { SHOPIFY_API_VERSION } from "@/lib/shopify";

export const dynamic = "force-dynamic";

const SHOP_INFO_QUERY = `
  query TenantShopInfo {
    shop {
      name
      primaryDomain { url }
    }
  }
`;

/**
 * One-time on first install only (guarded by the caller checking branding
 * is still blank) — not called on every token-exchange, which happens on
 * every embedded page load. Uses the accessToken we just minted directly
 * rather than lib/shopify.ts's shopifyAdmin() helper, which reads the
 * token back out of Redis — a chicken-and-egg problem since it isn't
 * saved yet at this point.
 */
async function fetchShopInfo(shop: string, accessToken: string): Promise<{ name: string; url: string } | null> {
  try {
    const res = await fetch(`https://${shop}/admin/api/${SHOPIFY_API_VERSION}/graphql.json`, {
      method: "POST",
      headers: { "X-Shopify-Access-Token": accessToken, "Content-Type": "application/json" },
      body: JSON.stringify({ query: SHOP_INFO_QUERY }),
    });
    const data = await res.json();
    const shopData = data?.data?.shop as { name?: string; primaryDomain?: { url?: string } } | undefined;
    if (!shopData?.name) return null;
    return { name: shopData.name, url: shopData.primaryDomain?.url ?? "" };
  } catch (err) {
    console.error("token-exchange shop-info fetch error:", err instanceof Error ? err.message : String(err));
    return null;
  }
}

export async function POST(request: NextRequest) {
  const auth = request.headers.get("authorization") || "";
  const sessionToken = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  const claims = sessionToken ? verifyMerchantSessionToken(sessionToken) : null;
  if (!claims) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  try {
    const { accessToken, scope } = await exchangeSessionTokenForAccessToken(claims.shop, sessionToken);

    const existing = await getTenant(claims.shop);
    // Never customized yet (brand-new install, or a merchant who reset to
    // defaults) — pre-fill from the store's own Shopify info instead of
    // leaving these blank. A merchant who already set their own values
    // never has them overwritten, since this only fires when both are
    // still at their untouched defaults.
    const neverCustomized =
      !existing || (existing.branding.name === "" && existing.branding.storefrontUrl === "");

    const brandingPatch: Partial<typeof DEFAULT_TENANT_FIELDS.branding> = {};
    if (neverCustomized) {
      const shopInfo = await fetchShopInfo(claims.shop, accessToken);
      if (shopInfo) {
        brandingPatch.name = shopInfo.name;
        brandingPatch.storefrontUrl = shopInfo.url;
        brandingPatch.policyHeading = `${shopInfo.name} Policy`;
      }
    }

    await setTenant(claims.shop, {
      accessToken,
      scopes: scope,
      installedAt: existing?.installedAt || new Date().toISOString(),
      ...(Object.keys(brandingPatch).length > 0
        ? { branding: { ...(existing?.branding ?? DEFAULT_TENANT_FIELDS.branding), ...brandingPatch } }
        : {}),
    });

    const tenant = await getTenant(claims.shop);
    return NextResponse.json({
      ok: true,
      shop: claims.shop,
      branding: tenant?.branding ?? DEFAULT_TENANT_FIELDS.branding,
      returnWindowDays: tenant?.returnWindowDays ?? DEFAULT_TENANT_FIELDS.returnWindowDays,
    });
  } catch (err) {
    console.error("token-exchange error:", err instanceof Error ? err.message : String(err));
    return NextResponse.json({ error: "token exchange failed" }, { status: 500 });
  }
}
