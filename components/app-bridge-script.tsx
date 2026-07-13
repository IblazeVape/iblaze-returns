"use client"

import { usePathname } from "next/navigation"
import Script from "next/script"

// Public, non-secret client ID (already hardcoded identically in
// app/api/order-eligible/route.ts and the built customer-account extension
// bundle) — used only as a fallback; not read from env here since this is a
// client component and only NEXT_PUBLIC_-prefixed vars reach the browser.
const SHOPIFY_CLIENT_ID = "699e9ffee4fd5d72b8126884d37584be"

/**
 * Loads the Shopify App Bridge script — required before any App Bridge API
 * (idToken(), picker(), etc.) is available on window.shopify — but ONLY on
 * /app (the embedded merchant Settings page). Next.js requires
 * beforeInteractive scripts to be declared in the ROOT layout (not a nested
 * one — a nested app/app/layout.tsx script tag silently never loads
 * correctly), so this lives in the root layout and gates itself by path
 * instead.
 */
export function AppBridgeScript() {
  const pathname = usePathname()
  if (!pathname.startsWith("/app")) return null

  return (
    <Script
      src="https://cdn.shopify.com/shopifycloud/app-bridge.js"
      data-api-key={SHOPIFY_CLIENT_ID}
      strategy="beforeInteractive"
    />
  )
}
