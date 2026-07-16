import { DashboardGate } from "@/components/app-dashboard/dashboard-gate";

export const dynamic = "force-dynamic";

/**
 * Dashboard page — sibling to the Settings page (`/app`), reached via the
 * sidebar nav both pages register through <AppNav />. Auth happens
 * client-side (DashboardGate), same token-exchange flow as Settings.
 * Route path stays `/app/returns` (not renamed to `/app/dashboard`) — only
 * the page's rendered content and the sidebar nav label changed; renaming
 * the URL wasn't needed for this feature and would be unrelated churn.
 */
export default function DashboardEntry() {
  return (
    <div id="dashboard-root">
      <DashboardGate />
    </div>
  );
}
