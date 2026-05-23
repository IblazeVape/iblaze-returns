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

const REASON_LABELS: Record<string, string> = {
  WRONG_ITEM: "Wrong item",
  DEFECTIVE: "Faulty / damaged",
  OTHER: "Other",
  UNKNOWN: "Unknown",
};

export default function AdminReturnsPage() {
  const router = useRouter();
  const [returns, setReturns] = useState<Return[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("ALL");
  const [selected, setSelected] = useState<Return | null>(null);

  useEffect(() => {
    fetch("/api/admin/returns")
      .then((r) => {
        if (r.status === 401) { router.push("/admin/login"); return null; }
        return r.json();
      })
      .then((d) => { if (d) setReturns(d.returns || []); })
      .finally(() => setLoading(false));
  }, [router]);

  const filtered = filter === "ALL" ? returns : returns.filter((r) => r.status === filter);

  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-white">All Returns</h1>
        <p className="text-sm text-gray-500 mt-1">{filtered.length} return{filtered.length !== 1 ? "s" : ""}</p>
      </div>

      {/* Filters */}
      <div className="flex gap-2">
        {["ALL", "REQUESTED", "OPEN", "CLOSED", "DECLINED"].map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
              filter === s
                ? "bg-[#E5403B] text-white"
                : "bg-gray-800 text-gray-400 hover:text-white hover:bg-gray-700"
            }`}
          >
            {s === "ALL" ? "All" : s.charAt(0) + s.slice(1).toLowerCase()}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-800">
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Order</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Customer</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Items</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-10 text-center text-gray-600 animate-pulse">Loading returns…</td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-10 text-center text-gray-600">No returns found</td>
                </tr>
              ) : (
                filtered.map((ret) => {
                  const items = ret.returnLineItems.edges.map((e) => e.node);
                  const customerName = ret.order.customer
                    ? `${ret.order.customer.firstName} ${ret.order.customer.lastName}`
                    : ret.order.email;

                  return (
                    <tr key={ret.id} className="hover:bg-gray-800/50 transition">
                      <td className="px-6 py-4">
                        <span className="font-medium text-white">{ret.order.name}</span>
                      </td>
                      <td className="px-6 py-4">
                        <div>
                          <p className="text-gray-200">{customerName}</p>
                          <p className="text-xs text-gray-500">{ret.order.email}</p>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-gray-300 truncate max-w-[200px]">
                          {items.map((i) => i.fulfillmentLineItem.lineItem.title).join(", ")}
                        </p>
                        <p className="text-xs text-gray-600">{items.length} item{items.length !== 1 ? "s" : ""}</p>
                      </td>
                      <td className="px-6 py-4 text-gray-400 whitespace-nowrap">
                        {new Date(ret.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`text-xs font-medium px-2.5 py-1 rounded-full border ${STATUS_COLORS[ret.status] || STATUS_COLORS.CLOSED}`}>
                          {ret.status}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <button
                          onClick={() => setSelected(ret)}
                          className="text-xs text-[#E5403B] hover:text-[#ff5a55] transition font-medium"
                        >
                          View →
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detail drawer */}
      {selected && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/60" onClick={() => setSelected(null)}>
          <div className="bg-gray-900 w-full max-w-lg h-full overflow-y-auto border-l border-gray-800" onClick={(e) => e.stopPropagation()}>
            <div className="px-6 py-5 border-b border-gray-800 flex items-center justify-between sticky top-0 bg-gray-900">
              <h2 className="font-semibold text-white">Return — {selected.order.name}</h2>
              <button onClick={() => setSelected(null)} className="text-gray-500 hover:text-white transition">✕</button>
            </div>

            <div className="px-6 py-6 space-y-6">
              {/* Status */}
              <div className="flex items-center gap-3">
                <span className={`text-xs font-medium px-3 py-1.5 rounded-full border ${STATUS_COLORS[selected.status] || STATUS_COLORS.CLOSED}`}>
                  {selected.status}
                </span>
                <span className="text-sm text-gray-500">
                  {new Date(selected.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}
                </span>
              </div>

              {/* Customer */}
              <div className="bg-gray-800/50 rounded-xl p-4 space-y-2">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Customer</p>
                <p className="text-white font-medium">
                  {selected.order.customer
                    ? `${selected.order.customer.firstName} ${selected.order.customer.lastName}`
                    : selected.order.email}
                </p>
                <p className="text-sm text-gray-400">{selected.order.email}</p>
              </div>

              {/* Shopify link */}
              <a
                href={`https://${process.env.NEXT_PUBLIC_SHOPIFY_STORE_URL || "your-store.myshopify.com"}/admin/orders/${selected.order.id.split("/").pop()}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-sm text-[#E5403B] hover:text-[#ff5a55] transition"
              >
                <svg className="w-4 h-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" /><polyline points="15 3 21 3 21 9" /><line x1="10" x2="21" y1="14" y2="3" />
                </svg>
                Open order in Shopify
              </a>

              {/* Items */}
              <div className="space-y-3">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Return Items</p>
                {selected.returnLineItems.edges.map(({ node: item }, idx) => (
                  <div key={idx} className="bg-gray-800/50 rounded-xl p-4 flex gap-4">
                    {item.fulfillmentLineItem.lineItem.image?.url && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={item.fulfillmentLineItem.lineItem.image.url}
                        alt={item.fulfillmentLineItem.lineItem.title}
                        className="w-12 h-12 rounded-lg object-cover"
                      />
                    )}
                    <div className="flex-1">
                      <p className="text-sm font-medium text-white">{item.fulfillmentLineItem.lineItem.title}</p>
                      <p className="text-xs text-gray-400 mt-0.5">Qty: {item.quantity} · {REASON_LABELS[item.returnReason] || item.returnReason}</p>
                      {item.customerNote && (
                        <p className="text-xs text-gray-500 mt-1 italic">"{item.customerNote}"</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
