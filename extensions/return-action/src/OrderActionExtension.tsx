/**
 * customer-account.order.action.menu-item.render
 *
 * `href` navigates directly to the portal without opening a modal.
 * Falls back to the portal homepage if the order ID isn't available yet.
 */
import { reactExtension, Button, useOrder } from "@shopify/ui-extensions-react/customer-account"

const PORTAL_BASE_URL = "https://iblaze-returns-git-main-vapeumbrellamanchester-8664s-projects.vercel.app"

export default reactExtension(
  "customer-account.order.action.menu-item.render",
  () => <OrderActionMenuItem />,
)

function OrderActionMenuItem() {
  const order = useOrder()
  const numericOrderId = order?.id?.split("/").pop()
  const href = numericOrderId
    ? `${PORTAL_BASE_URL}/wizard?order=${numericOrderId}`
    : `${PORTAL_BASE_URL}/wizard`

  return <Button href={href}>Start a Return</Button>
}
