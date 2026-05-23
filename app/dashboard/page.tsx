"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type ReturnStatus = "Eligible" | "Not yet dispatched" | "On its way" | "Passed the return window";

interface LineItem {
  id: string;
  title: string;
  quantity: number;
  returnStatus: ReturnStatus;
  image?: { url: string };
  variant?: { title: string };
}

interface Order {
  id: string;
  name: string;
  createdAt: string;
  displayFulfillmentStatus: string;
  totalPriceSet: { shopMoney: { amount: string; currencyCode: string } };
  processedItems: LineItem[];
}

interface OrdersData {
  firstName: string;
  orders: Order[];
}

const statusColors: Record<ReturnStatus, string> = {
  Eligible: "bg-green-50 text-green-700 border-green-200",
  "Not yet dispatched": "bg-gray-50 text-gray-600 border-gray-200",
  "On its way": "bg-blue-50 text-blue-700 border-blue-200",
  "Passed the return window": "bg-red-50 text-red-600 border-red-200",
};

const RETURN_REASONS = [
  { value: "CHANGED_MIND", label: "Changed my mind" },
  { value: "WRONG_ITEM", label: "Wrong item received" },
  { value: "FAULTY", label: "Faulty / not working" },
  { value: "DAMAGED", label: "Damaged in transit" },
  { value: "NOT_AS_DESCRIBED", label: "Not as described" },
  { value: "OTHER", label: "Other" },
];

export default function DashboardPage() {
  const router = useRouter();
  const [data, setData] = useState<OrdersData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Return modal state
  const [returnModal, setReturnModal] = useState<{ order: Order } | null>(null);
  const [selectedItems, setSelectedItems] = useState<Record<string, { selected: boolean; quantity: number; reason: string; description: string }>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitResult, setSubmitResult] = useState<{ success?: boolean; error?: string } | null>(null);

  useEffect(() => {
    fetch("/api/get-orders")
      .then((r) => r.json())
      .then((d) => {
        if (d.error) {
          if (d.error.includes("Session")) router.push("/");
          else setError(d.error);
        } else {
          setData(d);
        }
      })
      .catch(() => setError("Failed to load orders."))
      .finally(() => setLoading(false));
  }, [router]);

  const openReturnModal = (order: Order) => {
    const init: typeof selectedItems = {};
    order.processedItems
      .filter((i) => i.returnStatus === "Eligible")
      .forEach((i) => {
        init[i.id] = { selected: false, quantity: 1, reason: "CHANGED_MIND", description: "" };
      });
    setSelectedItems(init);
    setReturnModal({ order });
    setSubmitResult(null);
  };

  const submitReturn = async () => {
    if (!returnModal) return;
    const items = Object.entries(selectedItems)
      .filter(([, v]) => v.selected)
      .map(([lineItemId, v]) => ({ lineItemId, quantity: v.quantity, reason: v.reason, description: v.description }));

    if (items.length === 0) return;
    setSubmitting(true);
    try {
      const orderId = returnModal.order.id.split("/").pop();
      const res = await fetch("/api/submit-return", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId, items }),
      });
      const result = await res.json();
      setSubmitResult(result.success ? { success: true } : { error: result.error });
    } catch {
      setSubmitResult({ error: "Network error. Please try again." });
    } finally {
      setSubmitting(false);
    }
  };

  const hasEligible = returnModal
    ? returnModal.order.processedItems.some((i) => i.returnStatus === "Eligible")
    : false;
  const selectedCount = Object.values(selectedItems).filter((v) => v.selected).length;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="https://cdn.shopify.com/s/files/1/0941/5383/4761/files/IblazeLogo.png?v=14858"
            alt="iBlaze"
            width={50}
          />
          <div className="flex items-center gap-4">
            {data?.firstName && (
              <span className="text-sm text-gray-500">Hi, {data.firstName}</span>
            )}
            <a
              href="/api/logout"
              className="text-sm text-gray-500 hover:text-gray-900 transition"
            >
              Sign out
            </a>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-semibold text-gray-900">Your Orders</h1>
          <p className="text-sm text-gray-500 mt-1">
            Select an eligible item to start a return
          </p>
        </div>

        {loading && (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white rounded-2xl border border-gray-100 p-6 animate-pulse">
                <div className="h-4 bg-gray-100 rounded w-1/4 mb-4" />
                <div className="h-3 bg-gray-100 rounded w-1/2" />
              </div>
            ))}
          </div>
        )}

        {error && (
          <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {!loading && data && data.orders.length === 0 && (
          <div className="text-center py-16 text-gray-400">
            <p className="text-lg">No orders found</p>
            <p className="text-sm mt-1">Orders placed with this account will appear here</p>
          </div>
        )}

        <div className="space-y-4">
          {data?.orders.map((order) => (
            <div key={order.id} className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
              {/* Order header */}
              <div className="px-6 py-4 flex items-center justify-between border-b border-gray-50">
                <div>
                  <span className="font-semibold text-gray-900">{order.name}</span>
                  <span className="ml-3 text-sm text-gray-400">
                    {new Date(order.createdAt).toLocaleDateString("en-GB", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium text-gray-700">
                    £{parseFloat(order.totalPriceSet.shopMoney.amount).toFixed(2)}
                  </span>
                  {order.processedItems.some((i) => i.returnStatus === "Eligible") && (
                    <button
                      onClick={() => openReturnModal(order)}
                      className="text-sm font-medium text-[#E5403B] hover:text-[#cc3935] transition"
                    >
                      Return items →
                    </button>
                  )}
                </div>
              </div>

              {/* Line items */}
              <div className="divide-y divide-gray-50">
                {order.processedItems.map((item) => (
                  <div key={item.id} className="px-6 py-4 flex items-center gap-4">
                    <div className="w-12 h-12 rounded-lg bg-gray-100 overflow-hidden flex-shrink-0">
                      {item.image?.url && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={item.image.url} alt={item.title} className="w-full h-full object-cover" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{item.title}</p>
                      {item.variant?.title && item.variant.title !== "Default Title" && (
                        <p className="text-xs text-gray-400">{item.variant.title}</p>
                      )}
                      <p className="text-xs text-gray-400 mt-0.5">Qty: {item.quantity}</p>
                    </div>
                    <span className={`text-xs font-medium px-2.5 py-1 rounded-full border ${statusColors[item.returnStatus]}`}>
                      {item.returnStatus}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </main>

      {/* Return Modal */}
      {returnModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/40">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between">
              <h2 className="font-semibold text-gray-900">Return items — {returnModal.order.name}</h2>
              <button
                onClick={() => { setReturnModal(null); setSubmitResult(null); }}
                className="text-gray-400 hover:text-gray-700 transition"
              >
                ✕
              </button>
            </div>

            {submitResult?.success ? (
              <div className="px-6 py-8 text-center space-y-3">
                <div className="w-12 h-12 bg-green-50 rounded-full flex items-center justify-center mx-auto text-green-600 text-xl">✓</div>
                <h3 className="font-semibold text-gray-900">Return requested</h3>
                <p className="text-sm text-gray-500">We&apos;ve sent you a confirmation email. Our team will be in touch shortly.</p>
                <button onClick={() => setReturnModal(null)} className="mt-2 w-full py-2.5 rounded-xl bg-gray-900 text-white text-sm font-medium">Done</button>
              </div>
            ) : (
              <div className="px-6 py-5 space-y-5">
                {!hasEligible && (
                  <p className="text-sm text-gray-500 text-center py-4">No eligible items for return in this order.</p>
                )}

                {returnModal.order.processedItems
                  .filter((i) => i.returnStatus === "Eligible")
                  .map((item) => {
                    const sel = selectedItems[item.id];
                    return (
                      <div key={item.id} className="space-y-3">
                        <label className="flex items-start gap-3 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={sel?.selected || false}
                            onChange={(e) =>
                              setSelectedItems((prev) => ({
                                ...prev,
                                [item.id]: { ...prev[item.id], selected: e.target.checked },
                              }))
                            }
                            className="mt-0.5 accent-[#E5403B]"
                          />
                          <div className="flex items-center gap-3">
                            {item.image?.url && (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={item.image.url} alt={item.title} className="w-10 h-10 rounded-lg object-cover" />
                            )}
                            <div>
                              <p className="text-sm font-medium text-gray-900">{item.title}</p>
                              {item.variant?.title && item.variant.title !== "Default Title" && (
                                <p className="text-xs text-gray-400">{item.variant.title}</p>
                              )}
                            </div>
                          </div>
                        </label>

                        {sel?.selected && (
                          <div className="ml-6 space-y-3">
                            <div>
                              <label className="text-xs font-medium text-gray-700 block mb-1">Reason</label>
                              <select
                                value={sel.reason}
                                onChange={(e) =>
                                  setSelectedItems((prev) => ({
                                    ...prev,
                                    [item.id]: { ...prev[item.id], reason: e.target.value },
                                  }))
                                }
                                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#E5403B]/30"
                              >
                                {RETURN_REASONS.map((r) => (
                                  <option key={r.value} value={r.value}>{r.label}</option>
                                ))}
                              </select>
                            </div>
                            <div>
                              <label className="text-xs font-medium text-gray-700 block mb-1">Additional notes (optional)</label>
                              <textarea
                                value={sel.description}
                                onChange={(e) =>
                                  setSelectedItems((prev) => ({
                                    ...prev,
                                    [item.id]: { ...prev[item.id], description: e.target.value },
                                  }))
                                }
                                rows={2}
                                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#E5403B]/30 resize-none"
                                placeholder="Tell us more about the issue..."
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}

                {submitResult?.error && (
                  <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">
                    {submitResult.error}
                  </div>
                )}

                <div className="pt-2 border-t border-gray-100">
                  <button
                    onClick={submitReturn}
                    disabled={selectedCount === 0 || submitting}
                    className="w-full py-3 rounded-xl bg-[#E5403B] text-white text-sm font-semibold disabled:opacity-40 disabled:cursor-not-allowed transition hover:bg-[#cc3935]"
                  >
                    {submitting ? "Submitting..." : `Submit return${selectedCount > 1 ? ` (${selectedCount} items)` : ""}`}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
