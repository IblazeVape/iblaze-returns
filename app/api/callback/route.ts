import { NextRequest, NextResponse } from "next/server";
import { buildSessionCookie } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get("code");
    if (!code) return NextResponse.json({ error: "Authorisation code missing." }, { status: 400 });

    const clientId = process.env.CUSTOMER_API_CLIENT_ID!;
    const clientSecret = process.env.CUSTOMER_API_CLIENT_SECRET!;
    const appUrl = process.env.NEXT_PUBLIC_APP_URL!;
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
    return NextResponse.redirect(new URL("/", request.url));
  }
}
