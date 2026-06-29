/** @jsxRuntime classic */
/** @jsx h */
import { h, render } from "preact"
import "@shopify/ui-extensions/preact"

// Shopify Customer Account Extension API typings for menu-item.render target.
// The ONLY way to get the order is through shopify.order (SubscribableSignalLike).
// There is no shopify.orderId shortcut on this target.
declare const shopify: {
  order: {
    value: { id?: string } | undefined
    subscribe: (cb: (order: { id?: string } | undefined) => void) => () => void
  }
  sessionToken: { get: () => Promise<string> }
}

const PORTAL_BASE_URL = "https://iblaze-returns.vercel.app"

export default async () => {
  // Get the order GID — use the subscribe pattern so we wait for it to be
  // available even if undefined on first render, without burning the time budget
  // on a polling loop.
  const orderGid = await resolveOrderGid()
  const numericId = orderGid.includes("/") ? (orderGid.split("/").pop() ?? "") : orderGid

  if (!numericId) {
    // Order ID never became available — fail open so we don't permanently hide
    // the button for a customer with returnable items.
    render(<s-button href={PORTAL_BASE_URL}>Start a Return</s-button>, document.body)
    return
  }

  // Ask the portal whether this order has any returnable items (Admin-API-backed,
  // window-aware, works with native self-serve returns disabled).
  const eligible = await isOrderEligible(numericId)
  if (!eligible) return

  const portalUrl = `${PORTAL_BASE_URL}/?order=${numericId}`
  render(<s-button href={portalUrl}>Start a Return</s-button>, document.body)
}

/** Wait for the order GID via the SubscribableSignalLike, with a 4s timeout. */
function resolveOrderGid(): Promise<string> {
  return new Promise((resolve) => {
    // Synchronous check first (often available immediately)
    const immediate = shopify.order?.value?.id
    if (immediate) { resolve(immediate); return }

    // Subscribe and resolve as soon as the order lands
    let unsub: (() => void) | undefined
    const timer = setTimeout(() => {
      unsub?.()
      resolve("") // fail open after timeout
    }, 4000)

    unsub = shopify.order?.subscribe?.((order) => {
      const id = order?.id
      if (id) {
        clearTimeout(timer)
        unsub?.()
        resolve(id)
      }
    })
  })
}

async function isOrderEligible(numericId: string): Promise<boolean> {
  try {
    const token = await shopify.sessionToken.get()
    // Timestamp busts any CDN/browser cache so the button reflects current eligibility.
    const url = `${PORTAL_BASE_URL}/api/order-eligible?order=${numericId}&t=${Date.now()}`
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
    })
    if (!res.ok) return true // fail open
    const json = await res.json()
    return json?.eligible !== false
  } catch {
    return true // fail open on any error
  }
}
