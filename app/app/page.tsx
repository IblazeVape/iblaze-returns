import { MerchantAppGate } from "@/components/app-settings/merchant-app-gate";

export const dynamic = "force-dynamic";

/**
 * Merchant app entry — the app's `application_url`, embedded in Shopify
 * admin. Auth happens client-side (MerchantAppGate): App Bridge mints a
 * session token, which is exchanged server-side (POST /api/app/token-
 * exchange) for a real access token. No OAuth redirect, no cookie — this
 * page is a thin server shell around that client flow.
 */
export default function MerchantAppEntry() {
  return (
    <div id="merchant-app-root">
      <MerchantAppGate />
    </div>
  );
}
