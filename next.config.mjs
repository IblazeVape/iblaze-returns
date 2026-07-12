import { createMDX } from "fumadocs-mdx/next";

const APP_ORIGIN = "https://iblaze-returns.vercel.app";

/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: ['cdn.shopify.com'],
  },
  turbopack: {
    root: import.meta.dirname,
  },
  // /apps/returns is served via Shopify App Proxy: the storefront browser
  // believes it's on iblazevape.co.uk, but Shopify only forwards requests
  // matching the configured proxy prefix (/apps/returns/*). Next.js hardcodes
  // its client JS/CSS to absolute-path URLs like /_next/static/... — which do
  // NOT match that prefix, so Shopify's storefront 404s them itself before
  // ever asking our app (confirmed live: every _next/static/* request 404s,
  // so React never hydrates and no client-side code — including the session-
  // minting fetch — ever runs). assetPrefix makes Next.js request those
  // assets directly from our own domain instead, bypassing the proxy for
  // static assets while page navigation still correctly goes through it.
  // Safe for directly-accessed routes too (/, /home) — that's already where
  // their assets live. Production-only: in local dev this would point at the
  // deployed build instead of the live dev server, breaking `npm run dev`.
  assetPrefix: process.env.NODE_ENV === "production" ? APP_ORIGIN : undefined,
  // Next.js normally 308-redirects trailing-slash mismatches (framework-level,
  // independent of route matching — a catch-all route alone doesn't disable
  // it). Shopify's App Proxy treats ANY redirect from the app as an instruction
  // to redirect the customer's storefront browser back through proxy signing,
  // which re-triggers this redirect forever — an infinite loop at Shopify's
  // edge. Disabling it here (app/apps/returns is a catch-all, so both slash
  // forms already render the same page) removes the trigger entirely.
  skipTrailingSlashRedirect: true,
  // Marketing site (StarterCN) runs as its own Vercel deployment and is served
  // under /home via these rewrites — one domain, separate build ("two houses,
  // one front door"). MARKETING_SITE_URL is the marketing deployment's base URL
  // (e.g. https://iblaze-marketing.vercel.app). The marketing app sets
  // basePath:"/home", so it serves /home and /home/_next/* — proxied here.
  async rewrites() {
    const marketing = process.env.MARKETING_SITE_URL;
    if (!marketing) return [];
    return [
      { source: '/home', destination: `${marketing}/home` },
      { source: '/home/:path*', destination: `${marketing}/home/:path*` },
    ];
  },
};

const withMDX = createMDX();

export default withMDX(nextConfig);
