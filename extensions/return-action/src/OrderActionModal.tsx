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
  shop: { storefrontUrl?: string }
  close: () => void
}

const APP_ORIGIN = "https://iblaze-returns.vercel.app"

export default async () => {
  const orderId = shopify.order?.value?.id?.split("/").pop() ?? ""
  const storefrontUrl = (shopify.shop?.storefrontUrl ?? "").replace(/\/$/, "")
  render(<OrderActionModal orderId={orderId} storefrontUrl={storefrontUrl} />, document.body)
}

function OrderActionModal({ orderId, storefrontUrl }: { orderId: string; storefrontUrl: string }) {
  // Customer-facing link must go through THIS shop's own storefront (App
  // Proxy) so the multi-tenant portal resolves the right tenant.
  const base = storefrontUrl ? `${storefrontUrl}/apps/returns` : APP_ORIGIN
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
