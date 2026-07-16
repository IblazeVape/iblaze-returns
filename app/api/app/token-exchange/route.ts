import { NextRequest, NextResponse } from "next/server";
import { verifyMerchantSessionToken } from "@/lib/merchant-session-token";
import { exchangeSessionTokenForAccessToken } from "@/lib/shopify-token-exchange";
import { getTenant, setTenant, DEFAULT_TENANT_FIELDS } from "@/lib/tenant";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const auth = request.headers.get("authorization") || "";
  const sessionToken = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  const claims = sessionToken ? verifyMerchantSessionToken(sessionToken) : null;
  if (!claims) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  try {
    const { accessToken, scope } = await exchangeSessionTokenForAccessToken(claims.shop, sessionToken);
    await setTenant(claims.shop, { accessToken, scopes: scope, installedAt: new Date().toISOString() });

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
