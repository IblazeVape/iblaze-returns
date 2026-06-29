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
  // shopify.orderId is synchronously available in menu-item.render context.
  // May be a GID ("gid://shopify/Order/12345") or plain numeric.
  const rawId = shopify.orderId ?? ""
  const numericId = rawId.includes("/") ? (rawId.split("/").pop() ?? "") : rawId

  // Only render "Start a Return" when the portal reports the order has at least
  // one item eligible for return. The portal computes this via the Admin API
  // (returnable + delivered + within the 30-day window), so it works even though
  // native self-serve returns are disabled. Fail open so portal access is never
  // blocked by a transient error.
  if (numericId && !(await isOrderEligible(numericId))) return

  const portalUrl = numericId
    ? `${PORTAL_BASE_URL}/?order=${numericId}`
    : PORTAL_BASE_URL

  render(<s-button href={portalUrl}>Start a Return</s-button>, document.body)
}

async function isOrderEligible(numericId: string): Promise<boolean> {
  try {
    const token = await shopify.sessionToken.get()
    // Cache-bust the URL so the extension sandbox never serves a stale cached
    // response — eligibility changes over time (return window expiry).
    const url = `${PORTAL_BASE_URL}/api/order-eligible?order=${numericId}&t=${Date.now()}`
    const res = await fetch(url, {
      method: "GET",
      cache: "no-store",
      headers: { Authorization: `Bearer ${token}` },
    })
    if (!res.ok) return true // fail open
    const json = await res.json()
    return json?.eligible !== false
  } catch {
    return true // fail open on any error
  }
}
