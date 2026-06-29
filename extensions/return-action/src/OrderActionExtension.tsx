/** @jsxRuntime classic */
/** @jsx h */
import { h, render } from "preact"
import "@shopify/ui-extensions/preact"

declare const shopify: {
  orderId?: string
}

const PORTAL_BASE_URL = "https://iblaze-returns.vercel.app"
const API_VERSION = "2026-04"

export default async () => {
  // shopify.orderId is synchronously available in menu-item.render context.
  // May be a GID ("gid://shopify/Order/12345") or plain numeric.
  const rawId = shopify.orderId ?? ""
  const numericId = rawId.includes("/") ? (rawId.split("/").pop() ?? "") : rawId
  const orderGid = rawId.includes("gid://")
    ? rawId
    : numericId
      ? `gid://shopify/Order/${numericId}`
      : ""

  // Only render the "Start a Return" button when Shopify reports at least one
  // returnable line item — this mirrors the native "Return items" button, which
  // Shopify hides when nothing is eligible. We read returnInformation.returnableLineItems,
  // the same source the portal and Shopify's native page use.
  //
  // Fail open: if the eligibility check can't be completed (network/API error),
  // show the button rather than risk hiding it on a genuinely returnable order.
  // A successful-but-empty result still hides the button (the intended behaviour).
  if (orderGid && !(await hasReturnableItems(orderGid))) return

  const portalUrl = numericId
    ? `${PORTAL_BASE_URL}/?order=${numericId}`
    : PORTAL_BASE_URL

  render(<s-button href={portalUrl}>Start a Return</s-button>, document.body)
}

async function hasReturnableItems(orderGid: string): Promise<boolean> {
  try {
    const res = await fetch(`shopify://customer-account/api/${API_VERSION}/graphql.json`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        query: `query OrderReturnable($id: ID!) {
          order(id: $id) {
            returnInformation {
              returnableLineItems(first: 1) { nodes { quantity } }
            }
          }
        }`,
        variables: { id: orderGid },
      }),
    })
    const json = await res.json()
    if (json?.errors) return true // fail open on GraphQL errors

    // Distinguish "can't determine eligibility" from "nothing eligible":
    //   returnInformation null/absent  → feature unavailable (e.g. self-serve
    //     returns disabled) → fail open so portal access is never blocked.
    //   returnInformation present, returnableLineItems empty → genuinely nothing
    //     eligible → hide the button (mirrors Shopify's native page).
    const info = json?.data?.order?.returnInformation
    if (!info) return true
    const nodes = info.returnableLineItems?.nodes ?? []
    return nodes.some((n: { quantity?: number }) => (n?.quantity ?? 0) > 0)
  } catch {
    return true // fail open on network errors
  }
}
