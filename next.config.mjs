import { createMDX } from "fumadocs-mdx/next";

/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: ['cdn.shopify.com'],
  },
  turbopack: {
    root: import.meta.dirname,
  },
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
