/** @jsxRuntime classic */
/** @jsx h */
import { h, render } from "preact"
import "@shopify/ui-extensions/preact"

// Per Shopify docs and official tutorial for customer-account.order.action.menu-item.render:
// shopify.orderId is the synchronous, documented way to get the order ID on this target.
declare const shopify: {
  orderId: string | null | undefined
  sessionToken: { get: () => Promise<string> }
}

const PORTAL_BASE_URL = "https://iblaze-returns.vercel.app"

export default async () => {
  const orderId = shopify.orderId  // synchronous per Shopify's own tutorial

  if (!orderId) {
    // orderId unavailable — don't render (Shopify's documented pattern for this case)
    return
  }

  // Extract numeric ID from GID (e.g. "gid://shopify/Order/12345" → "12345")
  const numericId = orderId.includes("/") ? (orderId.split("/").pop() ?? orderId) : orderId

  // Check eligibility via portal API — Admin-backed, window-aware, works with
  // native self-serve returns disabled. Fail open so a transient error never hides
  // the button for a genuinely returnable order.
  const eligible = await isOrderEligible(numericId)
  if (!eligible) return

  const portalUrl = `${PORTAL_BASE_URL}/?order=${numericId}`
  render(<s-button href={portalUrl}>Start a Return</s-button>, document.body)
}

async function isOrderEligible(numericId: string): Promise<boolean> {
  try {
    const token = await shopify.sessionToken.get()
    // Timestamp busts any CDN cache so eligibility reflects current window state.
    const url = `${PORTAL_BASE_URL}/api/order-eligible?order=${numericId}&t=${Date.now()}`
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
