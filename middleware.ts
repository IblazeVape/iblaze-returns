import { NextRequest, NextResponse } from "next/server";

export async function middleware(request: NextRequest) {
  // Merchant Settings page — embedded in Shopify admin, needs an explicit
  // frame-ancestors CSP header or the browser refuses to let Shopify iframe
  // it at all (independent of shopify.app.toml's embedded=true).
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

export const config = {
  matcher: ["/app", "/app/:path*"],
};
