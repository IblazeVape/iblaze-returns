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

const RETURN_REASONS = [
  { value: "CHANGED_MIND", label: "Changed my mind" },
  { value: "WRONG_ITEM", label: "Wrong item received" },
  { value: "FAULTY", label: "Faulty / not working" },
  { value: "DAMAGED", label: "Damaged in transit" },
  { value: "NOT_AS_DESCRIBED", label: "Not as described" },
  { value: "OTHER", label: "Other" },
];

const STATUS_COLORS: Record<ReturnStatus, string> = {
  Eligible: "bg-green-50 text-green-700 border-green-200",
  "Not yet dispatched": "bg-gray-100 text-gray-500 border-gray-200",
  "On its way": "bg-blue-50 text-blue-600 border-blue-200",
  "Passed the return window": "bg-red-50 text-red-500 border-red-200",
};

export default function DashboardClient() {
  const router = useRouter();
  const [data, setData] = useState<OrdersData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [view, setView] = useState<"grid" | "list">("grid");
  const [search, setSearch] = useState("");

  // Return modal
  const [returnModal, setReturnModal] = useState<Order | null>(null);
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
    order.processedItems.filter((i) => i.returnStatus === "Eligible").forEach((i) => {
      init[i.id] = { selected: false, quantity: 1, reason: "CHANGED_MIND", description: "" };
    });
    setSelectedItems(init);
    setReturnModal(order);
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
      const orderId = returnModal.id.split("/").pop();
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

  const selectedCount = Object.values(selectedItems).filter((v) => v.selected).length;
  const initial = data?.firstName?.[0]?.toUpperCase() || "?";

  const filteredOrders = (data?.orders || []).filter((o) =>
    o.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">

      {/* Sidebar */}
      <aside className={`${sidebarOpen ? "w-56" : "w-16"} transition-all duration-300 bg-white border-r border-gray-100 flex flex-col flex-shrink-0`}>
        {/* Logo */}
        <div className="h-14 flex items-center px-4 border-b border-gray-100">
          {sidebarOpen ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src="https://cdn.shopify.com/s/files/1/0941/5383/4761/files/IblazeLogo.png?v=14858" alt="iBlaze" className="h-8" />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img src="https://cdn.shopify.com/s/files/1/0941/5383/4761/files/IblazeLogo.png?v=14858" alt="iBlaze" className="h-7 w-7 object-contain" />
          )}
        </div>

        {/* Nav */}
        <nav className="flex-1 py-4 space-y-0.5 px-2">
          <button
            onClick={() => setSelectedOrder(null)}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition ${
              !selectedOrder ? "bg-[#E5403B]/8 text-[#E5403B] font-medium" : "text-gray-600 hover:bg-gray-50"
            }`}
          >
            <svg className="w-4 h-4 flex-shrink-0" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2"/><rect x="9" y="3" width="6" height="4" rx="1"/>
            </svg>
            {sidebarOpen && <span>My Orders</span>}
          </button>

          {sidebarOpen && (
            <div className="pt-4">
              <p className="px-3 text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Resources</p>
            </div>
          )}

          <a
            href="https://iblazevape.co.uk/blogs/news"
            target="_blank"
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition"
          >
            <svg className="w-4 h-4 flex-shrink-0" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 22h16a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v16a2 2 0 0 1-2 2Zm0 0a2 2 0 0 1-2-2v-9c0-1.1.9-2 2-2h2"/><path d="M18 14h-8"/><path d="M15 18h-5"/><path d="M10 6h8v4h-8V6Z"/>
            </svg>
            {sidebarOpen && <span>News & Updates</span>}
          </a>

          <a
            href="https://iblazevape.co.uk/policies/refund-policy"
            target="_blank"
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition"
          >
            <svg className="w-4 h-4 flex-shrink-0" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>
            </svg>
            {sidebarOpen && <span>Returns Policy</span>}
          </a>

          <a
            href="mailto:info@iblazevape.co.uk"
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition"
          >
            <svg className="w-4 h-4 flex-shrink-0" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
            </svg>
            {sidebarOpen && <span>Speak to Support</span>}
          </a>
        </nav>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col overflow-hidden">

        {/* Top nav */}
        <header className="h-14 bg-white border-b border-gray-100 flex items-center px-4 gap-4 flex-shrink-0">
          {/* Collapse toggle */}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition"
          >
            <svg className="w-5 h-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/>
            </svg>
          </button>

          {/* Breadcrumb */}
          <div className="flex items-center gap-2 text-sm text-gray-400">
            <span>Dashboard</span>
            <span>›</span>
            <span className="text-gray-700 font-medium">
              {selectedOrder ? selectedOrder.name : "My Orders"}
            </span>
          </div>

          {/* Search */}
          {!selectedOrder && (
            <div className="flex-1 max-w-md">
              <div className="relative">
                <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
                </svg>
                <input
                  type="text"
                  placeholder="Search orders..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#E5403B]/20 focus:border-[#E5403B]"
                />
              </div>
            </div>
          )}

          <div className="ml-auto flex items-center gap-3">
            {/* Back to store */}
            <a
              href="https://iblazevape.co.uk"
              target="_blank"
              className="text-sm text-gray-500 hover:text-gray-900 transition flex items-center gap-1.5"
            >
              Back to Store
              <svg className="w-3.5 h-3.5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" x2="21" y1="14" y2="3"/>
              </svg>
            </a>

            {/* User avatar */}
            <div className="w-8 h-8 rounded-full bg-[#E5403B] flex items-center justify-center text-white text-sm font-semibold">
              {initial}
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto p-6">

          {/* Order detail view */}
          {selectedOrder ? (
            <div className="max-w-2xl">
              <button
                onClick={() => setSelectedOrder(null)}
                className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 mb-6 transition"
              >
                <svg className="w-4 h-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M19 12H5"/><path d="m12 19-7-7 7-7"/>
                </svg>
                Back to orders
              </button>

              <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
                <div className="px-6 py-5 border-b border-gray-50 flex items-center justify-between">
                  <div>
                    <h2 className="font-semibold text-gray-900 text-lg">{selectedOrder.name}</h2>
                    <p className="text-sm text-gray-400 mt-0.5">
                      {new Date(selectedOrder.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-gray-900">£{parseFloat(selectedOrder.totalPriceSet.shopMoney.amount).toFixed(2)}</p>
                    {selectedOrder.processedItems.some((i) => i.returnStatus === "Eligible") && (
                      <button onClick={() => openReturnModal(selectedOrder)} className="text-sm text-[#E5403B] hover:text-[#cc3935] font-medium mt-1">
                        Return items →
                      </button>
                    )}
                  </div>
                </div>
                <div className="divide-y divide-gray-50">
                  {selectedOrder.processedItems.map((item) => (
                    <div key={item.id} className="px-6 py-4 flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl bg-gray-100 overflow-hidden flex-shrink-0">
                        {item.image?.url && <img src={item.image.url} alt={item.title} className="w-full h-full object-cover" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{item.title}</p>
                        {item.variant?.title && item.variant.title !== "Default Title" && (
                          <p className="text-xs text-gray-400">{item.variant.title}</p>
                        )}
                        <p className="text-xs text-gray-400 mt-0.5">Qty: {item.quantity}</p>
                      </div>
                      <span className={`text-xs font-medium px-2.5 py-1 rounded-full border ${STATUS_COLORS[item.returnStatus]}`}>
                        {item.returnStatus}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            /* Orders list */
            <>
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h1 className="text-xl font-semibold text-gray-900">Your Recent Orders</h1>
                  <p className="text-sm text-gray-400 mt-0.5">Select an order below to initiate a return or log a claim.</p>
                </div>
                <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
                  <button onClick={() => setView("grid")} className={`p-1.5 rounded-md transition ${view === "grid" ? "bg-white shadow-sm text-gray-900" : "text-gray-400"}`}>
                    <svg className="w-4 h-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/>
                    </svg>
                  </button>
                  <button onClick={() => setView("list")} className={`p-1.5 rounded-md transition ${view === "list" ? "bg-white shadow-sm text-gray-900" : "text-gray-400"}`}>
                    <svg className="w-4 h-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/>
                    </svg>
                  </button>
                </div>
              </div>

              {loading && (
                <div className={view === "grid" ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4" : "space-y-3"}>
                  {[1, 2, 3, 4, 5, 6].map((i) => (
                    <div key={i} className="bg-white rounded-2xl border border-gray-100 p-5 animate-pulse">
                      <div className="h-4 bg-gray-100 rounded w-1/3 mb-3" />
                      <div className="h-3 bg-gray-100 rounded w-1/2 mb-4" />
                      <div className="flex gap-2">
                        {[1, 2, 3].map((j) => <div key={j} className="w-10 h-10 bg-gray-100 rounded-lg" />)}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {error && (
                <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{error}</div>
              )}

              {!loading && filteredOrders.length === 0 && (
                <div className="text-center py-20 text-gray-400">
                  <p className="text-lg font-medium">No orders found</p>
                  <p className="text-sm mt-1">Orders placed with this account will appear here</p>
                </div>
              )}

              {/* Grid view */}
              {!loading && view === "grid" && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredOrders.map((order) => {
                    const images = order.processedItems.map((i) => i.image?.url).filter(Boolean).slice(0, 5);
                    const extra = order.processedItems.length - 5;
                    return (
                      <button
                        key={order.id}
                        onClick={() => setSelectedOrder(order)}
                        className="bg-white rounded-2xl border border-gray-100 p-5 text-left hover:border-[#E5403B]/30 hover:shadow-sm transition group"
                      >
                        <div className="flex items-start justify-between mb-1">
                          <p className="font-semibold text-gray-900 group-hover:text-[#E5403B] transition">{order.name}</p>
                          <p className="font-semibold text-gray-700">£{parseFloat(order.totalPriceSet.shopMoney.amount).toFixed(2)}</p>
                        </div>
                        <p className="text-xs text-gray-400 mb-4">
                          {new Date(order.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })} • {order.processedItems.length} item{order.processedItems.length !== 1 ? "s" : ""}
                        </p>
                        <div className="flex items-center gap-1.5">
                          {images.map((url, i) => (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img key={i} src={url!} alt="" className="w-10 h-10 rounded-lg object-cover border border-gray-100" />
                          ))}
                          {extra > 0 && (
                            <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center text-xs font-medium text-gray-500">
                              +{extra}
                            </div>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}

              {/* List view */}
              {!loading && view === "list" && (
                <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden divide-y divide-gray-50">
                  {filteredOrders.map((order) => (
                    <button
                      key={order.id}
                      onClick={() => setSelectedOrder(order)}
                      className="w-full px-6 py-4 flex items-center gap-4 hover:bg-gray-50 transition text-left"
                    >
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">{order.name}</p>
                        <p className="text-xs text-gray-400 mt-0.5">
                          {new Date(order.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })} • {order.processedItems.length} items
                        </p>
                      </div>
                      <div className="flex -space-x-1">
                        {order.processedItems.slice(0, 4).map((item, i) => item.image?.url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img key={i} src={item.image.url} alt="" className="w-8 h-8 rounded-lg object-cover border-2 border-white" />
                        ) : null)}
                      </div>
                      <p className="font-semibold text-gray-900 w-20 text-right">£{parseFloat(order.totalPriceSet.shopMoney.amount).toFixed(2)}</p>
                      <svg className="w-4 h-4 text-gray-300" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="m9 18 6-6-6-6"/>
                      </svg>
                    </button>
                  ))}
                </div>
              )}
            </>
          )}
        </main>
      </div>

      {/* Return Modal */}
      {returnModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/40">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between sticky top-0 bg-white">
              <h2 className="font-semibold text-gray-900">Return items — {returnModal.name}</h2>
              <button onClick={() => { setReturnModal(null); setSubmitResult(null); }} className="text-gray-400 hover:text-gray-700 transition text-lg leading-none">✕</button>
            </div>

            {submitResult?.success ? (
              <div className="px-6 py-10 text-center space-y-3">
                <div className="w-14 h-14 bg-green-50 rounded-full flex items-center justify-center mx-auto text-green-600 text-2xl">✓</div>
                <h3 className="font-semibold text-gray-900 text-lg">Return requested</h3>
                <p className="text-sm text-gray-500">We&apos;ve sent you a confirmation email. Our team will be in touch shortly.</p>
                <button onClick={() => { setReturnModal(null); setSelectedOrder(null); }} className="mt-4 w-full py-3 rounded-xl bg-gray-900 text-white text-sm font-medium">Done</button>
              </div>
            ) : (
              <div className="px-6 py-5 space-y-5">
                {returnModal.processedItems.filter((i) => i.returnStatus === "Eligible").length === 0 && (
                  <p className="text-sm text-gray-500 text-center py-4">No eligible items for return in this order.</p>
                )}

                {returnModal.processedItems.filter((i) => i.returnStatus === "Eligible").map((item) => {
                  const sel = selectedItems[item.id];
                  return (
                    <div key={item.id} className="space-y-3">
                      <label className="flex items-start gap-3 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={sel?.selected || false}
                          onChange={(e) => setSelectedItems((prev) => ({ ...prev, [item.id]: { ...prev[item.id], selected: e.target.checked } }))}
                          className="mt-0.5 accent-[#E5403B] w-4 h-4"
                        />
                        <div className="flex items-center gap-3">
                          {item.image?.url && (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={item.image.url} alt={item.title} className="w-10 h-10 rounded-lg object-cover flex-shrink-0" />
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
                        <div className="ml-7 space-y-3">
                          <div>
                            <label className="text-xs font-medium text-gray-700 block mb-1">Reason</label>
                            <select
                              value={sel.reason}
                              onChange={(e) => setSelectedItems((prev) => ({ ...prev, [item.id]: { ...prev[item.id], reason: e.target.value } }))}
                              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#E5403B]/20"
                            >
                              {RETURN_REASONS.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
                            </select>
                          </div>
                          <div>
                            <label className="text-xs font-medium text-gray-700 block mb-1">Additional notes (optional)</label>
                            <textarea
                              value={sel.description}
                              onChange={(e) => setSelectedItems((prev) => ({ ...prev, [item.id]: { ...prev[item.id], description: e.target.value } }))}
                              rows={2}
                              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#E5403B]/20 resize-none"
                              placeholder="Tell us more..."
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}

                {submitResult?.error && (
                  <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">{submitResult.error}</div>
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
