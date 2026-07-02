import type { Metadata } from "next"
import DashboardClient from "@/components/dashboard-client"

// The public demo IS the production portal component, fed with canned data
// from /api/demo-orders instead of the authed Shopify endpoint.
export const metadata: Metadata = {
  title: "Live Demo — Reflow Returns Portal",
}

export default function DemoPage() {
  return <DashboardClient demo />
}
