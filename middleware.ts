import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";

function isValidPortalSession(cookieHeader: string | null): boolean {
  if (!cookieHeader) return false;
  const cookies: Record<string, string> = {};
  cookieHeader.split(";").forEach((c) => {
    const [k, ...v] = c.split("=");
    if (k?.trim()) cookies[k.trim()] = v.join("=").trim();
  });
  const sessionCookie = cookies["portal_session"];
  if (!sessionCookie) return false;
  try {
    const [email, token, expiry, sig] = sessionCookie.split("|");
    if (Math.floor(Date.now() / 1000) > parseInt(expiry)) return false;
    const expected = crypto
      .createHmac("sha256", process.env.PORTAL_SECRET!)
      .update(`${email}|${token}|${expiry}`)
      .digest("hex");
    return sig === expected;
  } catch {
    return false;
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const cookieHeader = request.headers.get("cookie");

  // Don't touch API routes or callback
  if (pathname.startsWith("/api/")) {
    return NextResponse.next();
  }

  if (pathname === "/" && !isValidPortalSession(cookieHeader)) {
    const clientId = process.env.CUSTOMER_API_CLIENT_ID!;
    const appUrl = process.env.NEXT_PUBLIC_APP_URL!;
    const redirectUri = `${appUrl}/api/callback`;

    const authUrl = new URL("https://account.iblazevape.co.uk/authentication/oauth/authorize");
    authUrl.searchParams.append("scope", "openid email customer-account-api:full");
    authUrl.searchParams.append("client_id", clientId);
    authUrl.searchParams.append("response_type", "code");
    authUrl.searchParams.append("redirect_uri", redirectUri);
    authUrl.searchParams.append("state", Math.random().toString(36).substring(2));

    return NextResponse.redirect(authUrl.toString());
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
