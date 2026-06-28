import { NextRequest, NextResponse } from "next/server";
import { buildSessionCookie } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const appUrl = process.env.NEXT_PUBLIC_APP_URL!;

    const oauthError = searchParams.get("error");
    if (oauthError) {
      console.error("OAuth denied:", oauthError, searchParams.get("error_description"));
      return NextResponse.redirect(new URL(`/?auth_error=${encodeURIComponent(oauthError)}`, appUrl));
    }

    const code = searchParams.get("code");
    if (!code) return NextResponse.json({ error: "Authorisation code missing." }, { status: 400 });

    const clientId = process.env.CUSTOMER_API_CLIENT_ID!;
    const clientSecret = process.env.CUSTOMER_API_CLIENT_SECRET!;
    const redirectUri = `${appUrl}/api/callback`;

    const body = new URLSearchParams();
    body.append("grant_type", "authorization_code");
    body.append("client_id", clientId);
    body.append("redirect_uri", redirectUri);
    body.append("code", code);

    const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");

    const tokenRes = await fetch("https://account.iblazevape.co.uk/authentication/oauth/token", {
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

    // Decode returnTo from state param (format: "<nonce>_<base64url-path>")
    const state = searchParams.get("state") ?? "";
    const stateParts = state.split("_");
    let returnTo = "/";
    if (stateParts.length >= 2) {
      try {
        const decoded = Buffer.from(stateParts.slice(1).join("_"), "base64url").toString("utf8");
        // Only allow relative paths to prevent open redirect
        if (decoded.startsWith("/")) returnTo = decoded;
      } catch {
        // fall back to "/"
      }
    }

    const response = NextResponse.redirect(new URL(returnTo, appUrl));
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
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || new URL(request.url).origin;
    return NextResponse.redirect(new URL("/?auth_error=callback_failed", appUrl));
  }
}
