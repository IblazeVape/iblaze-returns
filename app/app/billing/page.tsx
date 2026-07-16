import { BillingGate } from "@/components/app-billing/billing-gate";

export const dynamic = "force-dynamic";

/** Billing page — sibling to Settings and Dashboard, reached via AppNav. Auth is client-side (BillingGate). */
export default function BillingEntry() {
  return (
    <div id="billing-root">
      <BillingGate />
    </div>
  );
}
