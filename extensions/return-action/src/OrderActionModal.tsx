/** @jsxRuntime classic */
/** @jsx h */
/**
 * Fallback modal — shown if the menu-item href approach causes the button to disappear.
 * Uses onClick + window.open to bypass <s-customer-account-action>'s internal router,
 * which intercepts href on primary-action buttons and swallows external URLs.
 */
import { h, render } from "preact"
import "@shopify/ui-extensions/preact"

declare const shopify: {
  order: { value: { id: string } | undefined }
  sessionToken: { get: () => Promise<string> }
  close: () => void
}

const APP_ORIGIN = "https://iblaze-returns.vercel.app"

export default async () => {
  const orderId = shopify.order?.value?.id?.split("/").pop() ?? ""
  // The Shop API (shopify.shop) isn't available at this target — reuse the
  // order-eligible endpoint's verified session-token shop lookup instead
  // (its `eligible` field is ignored here; this modal is only ever shown
  // once the caller already decided to offer a return).
  const shop = await lookupShop(orderId)
  render(<OrderActionModal orderId={orderId} shop={shop} />, document.body)
}

async function lookupShop(orderId: string): Promise<string | null> {
  try {
    const token = await shopify.sessionToken.get()
    const url = `${APP_ORIGIN}/api/order-eligible?order=${orderId}&t=${Date.now()}`
    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } })
    if (!res.ok) return null
    const json = await res.json()
    return json?.shop ?? null
  } catch {
    return null
  }
}

function OrderActionModal({ orderId, shop }: { orderId: string; shop: string | null }) {
  // Customer-facing link must go through THIS shop's own storefront (App
  // Proxy) so the multi-tenant portal resolves the right tenant.
  const base = shop ? `https://${shop}/apps/returns` : APP_ORIGIN
  const portalUrl = orderId ? `${base}?order=${orderId}` : base

  const handleOpen = () => {
    window.open(portalUrl, "_blank")
  }

  return (
    <s-customer-account-action heading="Start a return">
      <s-button slot="primary-action" onClick={handleOpen}>
        Open returns portal →
      </s-button>
      <s-button slot="secondary-action" onClick={() => shopify.close()}>
        Cancel
      </s-button>
      <s-stack direction="block" gap="base">
        <s-text>
          Our returns portal lets you choose which items to return, see your estimated refund, and submit your request in a few steps.
        </s-text>
        <s-text>
          E-liquids and disposables must be unopened and sealed. Tanks and coils have a 7-day DOA window. Kits and mods have a 30-day return period.
        </s-text>
      </s-stack>
    </s-customer-account-action>
  )
}
