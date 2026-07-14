import { ReturnsManagementGate } from "@/components/app-returns-management/returns-management-gate";

export const dynamic = "force-dynamic";

/**
 * Returns Management page — sibling to the Settings page (`/app`), reached
 * via the sidebar nav both pages register through <AppNav />. Auth happens
 * client-side (ReturnsManagementGate), same token-exchange flow as Settings.
 */
export default function ReturnsManagementEntry() {
  return (
    <div id="returns-management-root">
      <ReturnsManagementGate />
    </div>
  );
}
