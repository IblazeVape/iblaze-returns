/** @jsxRuntime classic */
/** @jsx h */
import { h, render } from "preact"
import "@shopify/ui-extensions/preact"

declare const shopify: {
  orderId?: string
}

const PORTAL_BASE_URL = "https://iblaze-returns.vercel.app"

export default async () => {
  // shopify.orderId is synchronously available in menu-item.render context
  const rawId = shopify.orderId ?? ""
  // May be a GID ("gid://shopify/Order/12345") or plain numeric — extract the number
  const numericId = rawId.includes("/") ? (rawId.split("/").pop() ?? "") : rawId

  const portalUrl = numericId
    ? `${PORTAL_BASE_URL}/?order=${numericId}`
    : PORTAL_BASE_URL

  render(<s-button href={portalUrl}>Start a Return</s-button>, document.body)
}
