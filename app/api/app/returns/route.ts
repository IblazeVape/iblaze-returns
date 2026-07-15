import { NextRequest, NextResponse } from "next/server";
import { verifyMerchantSessionToken } from "@/lib/merchant-session-token";
import { buildNativeReturnsUrl } from "@/lib/returns-management";

export const dynamic = "force-dynamic";

/**
 * No Shopify API call needed — the native Orders URL is derived purely
 * from the shop domain, so this just verifies the merchant session and
 * hands back the deep-link.
 */
export async function GET(request: NextRequest) {
  const auth = request.headers.get("authorization") || "";
  const sessionToken = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  const claims = sessionToken ? verifyMerchantSessionToken(sessionToken) : null;
  if (!claims) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  return NextResponse.json({ nativeUrl: buildNativeReturnsUrl(claims.shop) });
}
