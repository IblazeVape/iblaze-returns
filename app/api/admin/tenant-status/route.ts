import { NextRequest, NextResponse } from "next/server";
import { getTenant } from "@/lib/tenant";

export const dynamic = "force-dynamic";

/**
 * Diagnostic: read a shop's tenant record and live-test its admin token.
 * Protected by ADMIN_SECRET. `?shop=` optional (defaults to SHOPIFY_STORE_URL).
 * Reveals token presence/shape and whether Shopify accepts it right now —
 * without exposing the token value. Remove after go-live.
 */
export async function GET(request: NextRequest) {
  const secret = request.nextUrl.searchParams.get("secret");
  if (!secret || secret !== process.env.ADMIN_SECRET) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const shop = request.nextUrl.searchParams.get("shop") || process.env.SHOPIFY_STORE_URL || "";
  if (!shop) return NextResponse.json({ error: "no shop" }, { status: 400 });

  const tenant = await getTenant(shop);
  const token = tenant?.accessToken || "";

  const record = {
    shop,
    tenantExists: !!tenant,
    hasToken: !!token,
    tokenPrefix: token ? token.slice(0, 8) : null,
    tokenLength: token.length,
    scopes: tenant?.scopes ?? null,
    installedAt: tenant?.installedAt ?? null,
    plan: tenant?.plan ?? null,
  };

  // Live-test the token directly (not via the shared lib, to avoid fallbacks).
  let liveTest: unknown = "skipped (no token)";
  if (token) {
    try {
      const res = await fetch(`https://${shop}/admin/api/2025-04/graphql.json`, {
        method: "POST",
        headers: { "X-Shopify-Access-Token": token, "Content-Type": "application/json" },
        body: JSON.stringify({ query: "{ shop { name myshopifyDomain } }" }),
      });
      const json = await res.json();
      liveTest = {
        httpStatus: res.status,
        ok: !json.errors,
        shopName: json?.data?.shop?.name ?? null,
        errors: json?.errors ?? null,
      };
    } catch (e) {
      liveTest = { error: (e as Error).message };
    }
  }

  return NextResponse.json({ record, liveTest });
}
