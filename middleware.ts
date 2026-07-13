import { NextRequest, NextResponse } from "next/server";

const AUTH_URL = "https://account.iblazevape.co.uk/authentication/oauth/authorize";

const PROTECTED_PATHS = ["/"];

export async function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  // Merchant Settings page — embedded in Shopify admin, needs an explicit
  // frame-ancestors CSP header or the browser refuses to let Shopify iframe
  // it at all (independent of shopify.app.toml's embedded=true).
  if (pathname === "/app" || pathname.startsWith("/app/")) {
    const shopParam = request.nextUrl.searchParams.get("shop");
    const shopDomain = shopParam && /^[a-z0-9-]+\.myshopify\.com$/i.test(shopParam) ? shopParam : null;
    // Root layout reads this (via next/headers) to decide whether to render
    // the App Bridge <script> tag server-side — must be set on the request,
    // not the response, since Server Components only see request headers.
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set("x-embedded-app", "1");
    const response = NextResponse.next({ request: { headers: requestHeaders } });
    response.headers.set(
      "Content-Security-Policy",
      shopDomain
        ? `frame-ancestors https://admin.shopify.com https://${shopDomain};`
        : `frame-ancestors https://admin.shopify.com;`
    );
    return response;
  }

  const isProtected = PROTECTED_PATHS.some(
    (p) => pathname === p || (p !== "/" && pathname.startsWith(p)),
  );
  if (!isProtected) return NextResponse.next();

  // Lightweight check — just presence of the session cookie.
  // Full HMAC validation happens in the API routes and server components.
  const session = request.cookies.get("portal_session");
  if (session?.value) return NextResponse.next();

  // Not authenticated — build OAuth URL with returnTo encoded in state
  const clientId = process.env.CUSTOMER_API_CLIENT_ID!;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL!;
  const redirectUri = `${appUrl}/api/callback`;

  const returnTo = pathname + search;
  const encoded = btoa(returnTo).replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
  const state = `${Math.random().toString(36).substring(2)}_${encoded}`;

  const authUrl = new URL(AUTH_URL);
  authUrl.searchParams.set("scope", "openid email customer-account-api:full");
  authUrl.searchParams.set("client_id", clientId);
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("redirect_uri", redirectUri);
  authUrl.searchParams.set("state", state);

  return NextResponse.redirect(authUrl.toString());
}

export const config = {
  matcher: ["/", "/app", "/app/:path*"],
};
