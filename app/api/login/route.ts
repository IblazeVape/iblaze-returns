import { NextResponse } from "next/server";
import { headers } from "next/headers";

export async function GET() {
  try {
    const clientId = process.env.CUSTOMER_API_CLIENT_ID!;
    const headersList = await headers();
    const host = headersList.get("host");
    const redirectUri = `https://${host}/api/callback`;

    // Use the custom store domain for Customer Account API discovery
    const storeDomain = process.env.SHOPIFY_STORE_DOMAIN!; // e.g. iblazevape.co.uk

    const discoveryRes = await fetch(`https://${storeDomain}/.well-known/openid-configuration`);
    const authConfig = await discoveryRes.json();

    const authUrl = new URL(authConfig.authorization_endpoint);
    authUrl.searchParams.append("scope", "openid email customer-account-api:full");
    authUrl.searchParams.append("client_id", clientId);
    authUrl.searchParams.append("response_type", "code");
    authUrl.searchParams.append("redirect_uri", redirectUri);
    authUrl.searchParams.append("state", Math.random().toString(36).substring(2));

    return NextResponse.redirect(authUrl.toString());
  } catch (err) {
    console.error("Login init error:", err);
    return NextResponse.json({ error: "Authentication initialization failed." }, { status: 500 });
  }
}
