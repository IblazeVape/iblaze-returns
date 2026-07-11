import { createMDX } from "fumadocs-mdx/next";

/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: ['cdn.shopify.com'],
  },
  turbopack: {
    root: import.meta.dirname,
  },
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
