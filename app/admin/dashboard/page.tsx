"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

interface ReturnItem {
  quantity: number;
  returnReason: string;
  customerNote: string;
  fulfillmentLineItem: {
    lineItem: { title: string; image?: { url: string } };
  };
}

interface Return {
  id: string;
  status: string;
  createdAt: string;
  order: {
    id: string;
    name: string;
    email: string;
    totalPriceSet: { shopMoney: { amount: string; currencyCode: string } };
    customer: { firstName: string; lastName: string } | null;
  };
  returnLineItems: { edges: Array<{ node: ReturnItem }> };
}

const STATUS_COLORS: Record<string, string> = {
  REQUESTED: "bg-yellow-900/30 text-yellow-400 border-yellow-800",
  OPEN: "bg-blue-900/30 text-blue-400 border-blue-800",
  CLOSED: "bg-gray-800 text-gray-400 border-gray-700",
  DECLINED: "bg-red-900/30 text-red-400 border-red-800",
};

function StatCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
      <p className="text-sm text-gray-500 mb-1">{label}</p>
      <p className="text-3xl font-semibold text-white">{value}</p>
      {sub && <p className="text-xs text-gray-600 mt-1">{sub}</p>}
    </div>
  );
}

export default function AdminDashboardPage() {
  const router = useRouter();
  const [returns, setReturns] = useState<Return[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/returns")
      .then((r) => {
        if (r.status === 401) { router.push("/admin/login"); return null; }
        return r.json();
      })
      .then((d) => { if (d) setReturns(d.returns || []); })
      .finally(() => setLoading(false));
  }, [router]);

  const stats = {
    total: returns.length,
    requested: returns.filter((r) => r.status === "REQUESTED").length,
    open: returns.filter((r) => r.status === "OPEN").length,
    closed: returns.filter((r) => r.status === "CLOSED").length,
  };

  const recent = returns.slice(0, 5);

  return (
    <div className="p-8 space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-white">Returns Overview</h1>
        <p className="text-sm text-gray-500 mt-1">All returns from your Shopify store</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Returns" value={loading ? "—" : stats.total} />
        <StatCard label="Requested" value={loading ? "—" : stats.requested} sub="Awaiting review" />
        <StatCard label="Open / Active" value={loading ? "—" : stats.open} />
        <StatCard label="Closed" value={loading ? "—" : stats.closed} />
      </div>

      {/* Recent returns */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-white">Recent Returns</h2>
          <a href="/admin/returns" className="text-sm text-[#E5403B] hover:text-[#ff5a55] transition">
            View all →
          </a>
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
          {loading ? (
            <div className="divide-y divide-gray-800">
              {[1, 2, 3].map((i) => (
                <div key={i} className="px-6 py-4 animate-pulse flex gap-4">
                  <div className="h-4 bg-gray-800 rounded w-24" />
                  <div className="h-4 bg-gray-800 rounded w-40" />
                </div>
              ))}
            </div>
          ) : recent.length === 0 ? (
            <div className="px-6 py-10 text-center text-gray-600">No returns yet</div>
          ) : (
            <div className="divide-y divide-gray-800">
              {recent.map((ret) => (
                <div key={ret.id} className="px-6 py-4 flex items-center gap-4">
                  <div className="flex-1">
                    <span className="text-sm font-medium text-white">{ret.order.name}</span>
                    <span className="ml-2 text-sm text-gray-500">{ret.order.email}</span>
                  </div>
                  <span className="text-xs text-gray-500">
                    {new Date(ret.createdAt).toLocaleDateString("en-GB")}
                  </span>
                  <span className={`text-xs font-medium px-2.5 py-1 rounded-full border ${STATUS_COLORS[ret.status] || STATUS_COLORS.CLOSED}`}>
                    {ret.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
