/** @jsxRuntime classic */
/** @jsx h */
import { h, render } from "preact"
import "@shopify/ui-extensions/preact"

declare const shopify: {
  orderId?: string
  sessionToken: { get: () => Promise<string> }
}

const PORTAL_BASE_URL = "https://iblaze-returns.vercel.app"

export default async () => {
  const orderId = shopify.orderId
  if (!orderId) return

  const numericId = orderId.includes("/") ? (orderId.split("/").pop() ?? orderId) : orderId
  const eligible = await isOrderEligible(numericId)
  if (!eligible) return

  const portalUrl = `${PORTAL_BASE_URL}/?order=${numericId}`
  render(<s-button href={portalUrl}>Start a Return</s-button>, document.body)
}

async function isOrderEligible(numericId: string): Promise<boolean> {
  try {
    const token = await shopify.sessionToken.get()
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
