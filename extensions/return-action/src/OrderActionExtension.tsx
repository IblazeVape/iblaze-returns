/** @jsxRuntime classic */
/** @jsx h */
/**
 * customer-account.order.action.menu-item.render
 *
 * Uses Preact + native web components (<s-button href={url}>) as per
 * Shopify's official docs/examples. The React Button component silently
 * drops href on this target in 2025-07; the web component works correctly.
 */
import { h, render } from "preact"
import "@shopify/ui-extensions/preact"

declare const shopify: {
  order: { value: { id: string } | undefined }
}

const PORTAL_BASE_URL = "https://iblaze-returns.vercel.app"

export default async () => {
  const order = shopify.order?.value
  const numericOrderId = order?.id?.split("/").pop()
  const href = numericOrderId
    ? `${PORTAL_BASE_URL}/wizard?order=${numericOrderId}`
    : `${PORTAL_BASE_URL}/wizard`

  render(
    <s-button href={href}>Start a Return</s-button>,
    document.body,
  )
}
