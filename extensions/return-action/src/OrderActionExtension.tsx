/** @jsxRuntime classic */
/** @jsx h */
import { h, render } from "preact"
import "@shopify/ui-extensions/preact"

declare const shopify: {
  orderId?: string
}

const PORTAL_BASE_URL = "https://iblaze-returns.vercel.app"

export default async () => {
  const rawId = shopify.orderId ?? ""
  const numericId = rawId.includes("/") ? (rawId.split("/").pop() ?? "") : rawId
  const portalUrl = numericId
    ? `${PORTAL_BASE_URL}/?order=${numericId}`
    : PORTAL_BASE_URL
  render(<s-button href={portalUrl}>Start a Return</s-button>, document.body)
}
