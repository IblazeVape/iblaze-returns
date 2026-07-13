import type { Metadata, Viewport } from "next";
import { headers } from "next/headers";
import { Geist, Geist_Mono } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import { ThemeProvider } from "@/components/theme-provider";
import { SpeedInsights } from "@vercel/speed-insights/next";
import "./globals.css";

const SHOPIFY_CLIENT_ID = "699e9ffee4fd5d72b8126884d37584be";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "iBlaze Returns Portal",
  description: "Customer returns portal for iBlaze Vape",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const isEmbeddedApp = (await headers()).get("x-embedded-app") === "1";

  return (
    <html lang="en" suppressHydrationWarning>
      {isEmbeddedApp && (
        // Shopify requires this exact static, synchronous <script> tag to be
        // the first script on the page (no async/defer/type=module, not
        // injected via JS) — next/script's beforeInteractive strategy fails
        // this because it injects via document.createElement, which the DOM
        // defaults to async=true for. Rendering it here server-side avoids
        // that entirely.
        <head>
          <meta name="shopify-api-key" content={SHOPIFY_CLIENT_ID} />
          <script src="https://cdn.shopify.com/shopifycloud/app-bridge.js" />
          {/* Polaris web components (s-page, s-button, s-text-field, etc.) are a
              separate library from App Bridge — this script is what actually
              registers the s-* custom elements so they render styled instead
              of falling back to unstyled inline text. */}
          <script src="https://cdn.shopify.com/shopifycloud/polaris.js"></script>
        </head>
      )}
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <ThemeProvider>
          {children}
          <div id="portal-root" />
          <Toaster position="top-right" offset={{ top: 20 }} />
          <SpeedInsights />
        </ThemeProvider>
      </body>
    </html>
  );
}
