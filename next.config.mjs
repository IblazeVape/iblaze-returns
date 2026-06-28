/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: ['cdn.shopify.com'],
  },
  turbopack: {
    root: import.meta.dirname,
  },
};

export default nextConfig;
