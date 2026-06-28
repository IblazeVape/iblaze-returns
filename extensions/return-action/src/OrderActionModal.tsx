/**
 * customer-account.order.action.render
 *
 * Opens as a modal when the "Start a Return" menu item is clicked.
 * The primaryAction button navigates to our portal with the order pre-loaded.
 * Root must be CustomerAccountAction (2025-07 API requirement).
 */
import {
  reactExtension,
  useOrder,
  useApi,
  Button,
  CustomerAccountAction,
  TextBlock,
  BlockStack,
  Text,
} from "@shopify/ui-extensions-react/customer-account"

const PORTAL_BASE_URL = "https://iblaze-returns.vercel.app"

export default reactExtension(
  "customer-account.order.action.render",
  () => <OrderActionModal />,
)

function OrderActionModal() {
  const order = useOrder()
  const api = useApi()

  const numericOrderId = order?.id?.split("/").pop() ?? ""
  const wizardUrl = numericOrderId
    ? `${PORTAL_BASE_URL}/wizard?order=${numericOrderId}`
    : PORTAL_BASE_URL

  return (
    <CustomerAccountAction
      title="Start a return"
      primaryAction={
        <Button to={wizardUrl}>Open returns portal →</Button>
      }
      secondaryAction={
        <Button onPress={() => api.close()}>Cancel</Button>
      }
    >
      <BlockStack spacing="loose">
        <TextBlock>
          Our returns portal lets you choose which items to return, see your estimated refund, and submit your request in a few steps.
        </TextBlock>
        <BlockStack spacing="tight">
          <Text size="small" emphasis="bold">Before you start</Text>
          <TextBlock size="small">
            E-liquids and disposables must be unopened and sealed. Tanks and coils have a 7-day Dead On Arrival window. Kits and mods have a 30-day return period.
          </TextBlock>
        </BlockStack>
      </BlockStack>
    </CustomerAccountAction>
  )
}
