import { NextResponse } from "next/server";

/**
 * CORS for the App Proxy portal's API calls. DashboardClient's own fetches
 * (get-orders, submit-return) get rewritten by the client fetch patch
 * (lib/apps-returns-client-session.ts) to hit our absolute domain directly —
 * bypassing Shopify's App Proxy, which only forwards /apps/returns/* — so
 * those become genuine cross-origin requests from the storefront domain and
 * need CORS headers. Wildcard origin is safe here: auth travels via a custom
 * header (a signed, bearer-style token) rather than cookies, so there's no
 * ambient credential for a third-party origin to piggyback on.
 */
const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, x-apps-returns-session",
};

export function withCors(response: NextResponse): NextResponse {
  for (const [key, value] of Object.entries(CORS_HEADERS)) {
    response.headers.set(key, value);
  }
  return response;
}

export function corsPreflight(): NextResponse {
  return withCors(new NextResponse(null, { status: 204 }));
}
