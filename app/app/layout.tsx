import Script from "next/script";

const SHOPIFY_CLIENT_ID = process.env.SHOPIFY_CLIENT_ID || "699e9ffee4fd5d72b8126884d37584be";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Script
        src="https://cdn.shopify.com/shopifycloud/app-bridge.js"
        data-api-key={SHOPIFY_CLIENT_ID}
        strategy="beforeInteractive"
      />
      {children}
    </>
  );
}
