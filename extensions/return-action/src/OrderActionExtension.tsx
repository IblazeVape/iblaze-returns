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
  console.log("[iBlaze v45] extension running, shopify.orderId =", shopify.orderId)

  const orderId = shopify.orderId

  if (!orderId) {
    console.log("[iBlaze v45] orderId is falsy — not rendering button")
    return
  }

  const numericId = orderId.includes("/") ? (orderId.split("/").pop() ?? orderId) : orderId
  console.log("[iBlaze v45] numericId =", numericId, "— checking eligibility")

  const eligible = await isOrderEligible(numericId)
  console.log("[iBlaze v45] eligible =", eligible)

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
