/** @jsxRuntime classic */
/** @jsx h */
import { h, render } from "preact"
import "@shopify/ui-extensions/preact"

declare const shopify: {
  orderId?: string
  shop: { storefrontUrl?: string }
  sessionToken: { get: () => Promise<string> }
}

// Backend eligibility check hits our app directly — not customer-facing
// navigation, so no App Proxy involved here.
const APP_ORIGIN = "https://iblaze-returns.vercel.app"

export default async () => {
  const orderId = shopify.orderId
  if (!orderId) return

  const numericId = orderId.includes("/") ? (orderId.split("/").pop() ?? orderId) : orderId
  const eligible = await isOrderEligible(numericId)
  if (!eligible) return

  // Customer-facing link must go through THIS shop's own storefront (App
  // Proxy), not our app's own domain — the portal is multi-tenant and only
  // resolves the right tenant when reached via the shop's own /apps/returns
  // path.
  const storefrontUrl = (shopify.shop?.storefrontUrl ?? "").replace(/\/$/, "")
  const portalUrl = storefrontUrl
    ? `${storefrontUrl}/apps/returns?order=${numericId}`
    : `${APP_ORIGIN}/?order=${numericId}`
  render(<s-button href={portalUrl}>Start a Return</s-button>, document.body)
}

async function isOrderEligible(numericId: string): Promise<boolean> {
  try {
    const token = await shopify.sessionToken.get()
    const url = `${APP_ORIGIN}/api/order-eligible?order=${numericId}&t=${Date.now()}`
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
    })
    if (!res.ok) return true
    const json = await res.json()
    return json?.eligible !== false
  } catch {
    return true
  }
}
