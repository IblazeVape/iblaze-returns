import { NextRequest, NextResponse } from "next/server";
import { buildSessionCookie } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get("code");
    if (!code) return NextResponse.json({ error: "Authorisation code missing." }, { status: 400 });

    const shop = process.env.SHOPIFY_STORE_URL!;
    const storeDomain = process.env.SHOPIFY_STORE_DOMAIN!;
    const clientId = process.env.CUSTOMER_API_CLIENT_ID!;
    const clientSecret = process.env.CUSTOMER_API_CLIENT_SECRET!;
    const host = request.headers.get("host");
    const redirectUri = `https://${host}/api/callback`;

    const discoveryRes = await fetch(`https://${storeDomain}/.well-known/openid-configuration`);
    const config = await discoveryRes.json();

    const body = new URLSearchParams();
    body.append("grant_type", "authorization_code");
    body.append("client_id", clientId);
    body.append("redirect_uri", redirectUri);
    body.append("code", code);

    const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");

    const tokenRes = await fetch(config.token_endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Basic ${credentials}`,
      },
      body,
    });

    const tokenData = await tokenRes.json();
    if (tokenData.error) throw new Error(tokenData.error_description);

    const idTokenParts = tokenData.id_token.split(".");
    const payload = JSON.parse(Buffer.from(idTokenParts[1], "base64").toString());
    const verifiedEmail = payload.email;

    const cookieValue = buildSessionCookie(verifiedEmail, tokenData.access_token);

    // Redirect to root, not /dashboard
    const response = NextResponse.redirect(new URL("/", request.url));
    response.cookies.set("portal_session", cookieValue, {
      httpOnly: true,
      secure: true,
      path: "/",
      maxAge: 7200,
      sameSite: "lax",
    });

    return response;
  } catch (error) {
    console.error("OAuth Callback Error:", error);
    return NextResponse.redirect(new URL("/api/login", request.url));
  }
}
