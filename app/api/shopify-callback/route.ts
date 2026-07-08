import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { setTenant } from "@/lib/tenant";

function verifyHmac(params: URLSearchParams, secret: string): boolean {
  const hmac = params.get("hmac");
  if (!hmac) return false;

  const pairs: string[] = [];
  params.forEach((value, key) => {
    if (key !== "hmac") pairs.push(`${key}=${value}`);
  });
  pairs.sort();

  const message = pairs.join("&");
  const expected = crypto
    .createHmac("sha256", secret)
    .update(message)
    .digest("hex");

  return crypto.timingSafeEqual(Buffer.from(hmac), Buffer.from(expected));
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const shop = searchParams.get("shop");

  const clientId = process.env.SHOPIFY_CLIENT_ID!;
  const clientSecret = process.env.SHOPIFY_CLIENT_SECRET!;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL!;

  // Step 1: No code yet — redirect to Shopify OAuth
  if (!code || !shop) {
    if (!shop) {
      return NextResponse.json({ error: "Missing shop" }, { status: 400 });
    }
    const redirectUri = `${appUrl}/api/shopify-callback`;
    const scopes = "read_orders,write_returns,read_customers,read_fulfillments";
    const installUrl = `https://${shop}/admin/oauth/authorize?client_id=${clientId}&scope=${scopes}&redirect_uri=${encodeURIComponent(redirectUri)}`;
    return NextResponse.redirect(installUrl);
  }

  // Step 2: Verify HMAC to confirm request is from Shopify
  if (!verifyHmac(searchParams, clientSecret)) {
    return NextResponse.json({ error: "Invalid HMAC — request not from Shopify." }, { status: 401 });
  }

  // Step 3: Exchange code for access token
  const tokenRes = await fetch(`https://${shop}/admin/oauth/access_token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ client_id: clientId, client_secret: clientSecret, code }),
  });

  const tokenData = await tokenRes.json();

  if (!tokenData.access_token) {
    return NextResponse.json({ error: "Failed to get token", detail: tokenData }, { status: 500 });
  }

  // Step 4: Save per-shop tenant record
  await setTenant(shop, {
    accessToken: tokenData.access_token,
    scopes: tokenData.scope ?? "",
    installedAt: new Date().toISOString(),
  });

  return NextResponse.json({
    success: true,
    message: "App installed successfully. Token saved. You can close this tab.",
    scopes: tokenData.scope,
  });
}
