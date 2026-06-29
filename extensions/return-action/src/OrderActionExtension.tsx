/** @jsxRuntime classic */
/** @jsx h */
import { h, render } from "preact"
import "@shopify/ui-extensions/preact"

declare const shopify: {
  orderId?: string
  // Order data loads asynchronously and is undefined until ready.
  order?: { value?: { id?: string } }
  sessionToken: { get: () => Promise<string> }
}

const PORTAL_BASE_URL = "https://iblaze-returns.vercel.app"

export default async () => {
  // Order identity can be undefined on first render (loads async), so wait for it.
  // Without this the eligibility check below is skipped and the button renders
  // unconditionally.
  const rawId = await resolveOrderId()
  const numericId = rawId.includes("/") ? (rawId.split("/").pop() ?? "") : rawId

  // Only render "Start a Return" when the portal reports the order has at least
  // one item eligible for return (returnable + delivered + within the 30-day
  // window, computed via the Admin API — works with native self-serve returns off).
  // Fail open if we can't determine eligibility, so a transient error never hides
  // the button on a genuinely returnable order.
  if (numericId && !(await isOrderEligible(numericId))) return

  const portalUrl = numericId
    ? `${PORTAL_BASE_URL}/?order=${numericId}`
    : PORTAL_BASE_URL

  render(<s-button href={portalUrl}>Start a Return</s-button>, document.body)
}

/** Wait (briefly) for the order ID — it may be undefined on first render. */
async function resolveOrderId(): Promise<string> {
  if (shopify.orderId) return shopify.orderId
  for (let i = 0; i < 25; i++) {
    const id = shopify.order?.value?.id || shopify.orderId
    if (id) return id
    await new Promise((r) => setTimeout(r, 100))
  }
  return shopify.order?.value?.id || shopify.orderId || ""
}

async function isOrderEligible(numericId: string): Promise<boolean> {
  try {
    const token = await shopify.sessionToken.get()
    // Cache-bust so the extension sandbox never serves a stale response —
    // eligibility changes over time (return window expiry).
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
