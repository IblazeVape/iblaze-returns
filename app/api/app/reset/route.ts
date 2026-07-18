import { NextRequest, NextResponse } from "next/server";
import { verifyMerchantSessionToken } from "@/lib/merchant-session-token";
import { redis } from "@/lib/redis";
import { setTenant, getTenant } from "@/lib/tenant";
import { DEFAULT_TENANT_FIELDS } from "@/lib/tenant-defaults";

export const dynamic = "force-dynamic";

/**
 * Full app reset — wipes every Dashboard stats key for this shop and resets
 * branding/returnWindowDays to defaults, as if the app were freshly
 * installed. Deliberately does NOT touch accessToken/scopes/installedAt
 * (unlike deleteTenant, used by the app/uninstalled webhook) — clearing
 * those would break the app's Shopify API connectivity until reinstall,
 * which isn't what a merchant asking to "start over" wants.
 */
export async function POST(request: NextRequest) {
  const auth = request.headers.get("authorization") || "";
  const sessionToken = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  const claims = sessionToken ? verifyMerchantSessionToken(sessionToken) : null;
  if (!claims) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const shop = claims.shop;

  try {
    const statsKeys = await redis.keys(`stats:${shop}:*`);
    if (statsKeys.length > 0) {
      await redis.del(...statsKeys);
    }

    await setTenant(shop, {
      returnWindowDays: DEFAULT_TENANT_FIELDS.returnWindowDays,
      branding: DEFAULT_TENANT_FIELDS.branding,
    });

    const tenant = await getTenant(shop);
    return NextResponse.json({
      ok: true,
      branding: tenant!.branding,
      returnWindowDays: tenant!.returnWindowDays,
    });
  } catch (err) {
    console.error("app reset error:", err instanceof Error ? err.message : String(err));
    return NextResponse.json({ error: "reset failed" }, { status: 500 });
  }
}
