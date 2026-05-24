"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Package, FileText, Newspaper, MessageCircle, ChevronRight,
  LayoutGrid, List, Search, ExternalLink, ArrowLeft, Menu,
  RotateCcw, ShoppingBag, CheckCircle2, Clock, Truck, XCircle, Info
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

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

const ITEM_PRICE = 4; // fallback price per item £

function getStatusBadge(status: ReturnStatus) {
  switch (status) {
    case "Eligible": return <Badge variant="success">Eligible to Return</Badge>;
    case "Not yet dispatched": return <Badge variant="muted">Not Yet Dispatched</Badge>;
    case "On its way": return <Badge variant="info">On Its Way</Badge>;
    case "Passed the return window": return <Badge variant="destructive">Window Closed</Badge>;
  }
}

function getFulfillmentBadge(status: string) {
  switch (status) {
    case "FULFILLED": return <Badge variant="success">Delivered</Badge>;
    case "PARTIALLY_FULFILLED": return <Badge variant="info">Partially Fulfilled</Badge>;
    case "IN_PROGRESS": return <Badge variant="info">In Progress</Badge>;
    case "UNFULFILLED": return <Badge variant="muted">Processing</Badge>;
    default: return <Badge variant="muted">{status}</Badge>;
  }
}

function getFulfillmentIcon(status: string) {
  switch (status) {
    case "FULFILLED": return <CheckCircle2 className="w-5 h-5 text-green-500" />;
    case "PARTIALLY_FULFILLED": return <Truck className="w-5 h-5 text-blue-500" />;
    case "IN_PROGRESS": return <Truck className="w-5 h-5 text-blue-500" />;
    case "UNFULFILLED": return <Clock className="w-5 h-5 text-gray-400" />;
    default: return <Package className="w-5 h-5 text-gray-400" />;
  }
}

// ─── Sidebar Nav ──────────────────────────────────────────────────────────────
function SidebarNav({ collapsed, onNavigate }: { collapsed: boolean; onNavigate?: () => void }) {
  return (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className={cn("flex items-center h-14 border-b border-border px-4", collapsed && "justify-center px-0")}>
        {collapsed ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src="https://cdn.shopify.com/s/files/1/0941/5383/4761/files/IblazeLogo.png?v=14858" alt="iBlaze" className="h-7 w-7 object-contain" />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img src="https://cdn.shopify.com/s/files/1/0941/5383/4761/files/IblazeLogo.png?v=14858" alt="iBlaze" className="h-8" />
        )}
      </div>

      {/* Nav links */}
      <nav className="flex-1 p-2 space-y-0.5 overflow-y-auto">
        <NavItem icon={<ShoppingBag className="w-4 h-4" />} label="My Orders" collapsed={collapsed} active onClick={onNavigate} />

        {!collapsed && <p className="px-3 pt-4 pb-1 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Resources</p>}
        {collapsed && <Separator className="my-2" />}

        <NavItem icon={<Newspaper className="w-4 h-4" />} label="News & Updates" collapsed={collapsed}
          href="https://iblazevape.co.uk/blogs/news" onClick={onNavigate} />
        <NavItem icon={<FileText className="w-4 h-4" />} label="Returns Policy" collapsed={collapsed}
          href="https://iblazevape.co.uk/policies/refund-policy" onClick={onNavigate} />
        <NavItem icon={<MessageCircle className="w-4 h-4" />} label="Speak to Support" collapsed={collapsed}
          href="mailto:info@iblazevape.co.uk" onClick={onNavigate} />
      </nav>

      {/* Footer */}
      {!collapsed && (
        <div className="p-4 border-t border-border">
          <div className="rounded-lg bg-muted p-3 text-xs text-muted-foreground">
            <p className="font-medium text-foreground mb-1">Return Policy</p>
            <p>Unwanted items can be returned within <strong>30 days</strong> from delivery. Return postage is at your expense (tracked service required).</p>
          </div>
        </div>
      )}
    </div>
  );
}

function NavItem({ icon, label, collapsed, active, href, onClick }: {
  icon: React.ReactNode; label: string; collapsed: boolean; active?: boolean; href?: string; onClick?: () => void;
}) {
  const cls = cn(
    "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors",
    collapsed && "justify-center px-0",
    active ? "bg-primary/10 text-primary font-medium" : "text-muted-foreground hover:bg-accent hover:text-foreground"
  );
  if (href) return (
    <a href={href} target={href.startsWith("http") ? "_blank" : undefined} className={cls} onClick={onClick}>
      {icon}{!collapsed && <span>{label}</span>}
    </a>
  );
  return (
    <button className={cls} onClick={onClick}>
      {icon}{!collapsed && <span>{label}</span>}
    </button>
  );
}

// ─── Order Card ───────────────────────────────────────────────────────────────
function OrderCardSkeleton() {
  return (
    <div className="bg-card border border-border rounded-xl p-5 space-y-4">
      <div className="flex justify-between">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-4 w-16" />
      </div>
      <Skeleton className="h-3 w-40" />
      <div className="flex gap-2">
        <Skeleton className="w-10 h-10 rounded-lg" />
        <Skeleton className="w-10 h-10 rounded-lg" />
        <Skeleton className="w-10 h-10 rounded-lg" />
      </div>
    </div>
  );
}

function OrderCard({ order, onClick }: { order: Order; onClick: () => void }) {
  const images = order.processedItems.map(i => i.image?.url).filter(Boolean).slice(0, 5) as string[];
  const extra = order.processedItems.length - 5;
  const hasEligible = order.processedItems.some(i => i.returnStatus === "Eligible");

  return (
    <button onClick={onClick} className="w-full bg-card border border-border rounded-xl p-5 text-left hover:border-primary/40 hover:shadow-md transition-all duration-200 group">
      <div className="flex items-start justify-between mb-1">
        <div>
          <p className="font-semibold text-foreground group-hover:text-primary transition-colors">{order.name}</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {new Date(order.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
            {" · "}{order.processedItems.length} item{order.processedItems.length !== 1 ? "s" : ""}
          </p>
        </div>
        <div className="text-right">
          <p className="font-semibold text-foreground">£{parseFloat(order.totalPriceSet.shopMoney.amount).toFixed(2)}</p>
          {getFulfillmentBadge(order.displayFulfillmentStatus)}
        </div>
      </div>

      <div className="flex items-center gap-1.5 mt-4">
        {images.map((url, i) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img key={i} src={url} alt="" className="w-10 h-10 rounded-lg object-cover border border-border" />
        ))}
        {extra > 0 && (
          <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center text-xs font-medium text-muted-foreground">
            +{extra}
          </div>
        )}
        <div className="ml-auto flex items-center gap-2">
          {hasEligible && <Badge variant="success" className="text-xs">Return Available</Badge>}
          <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
        </div>
      </div>
    </button>
  );
}

// ─── Order Detail ─────────────────────────────────────────────────────────────
function OrderDetail({ order, onBack }: { order: Order; onBack: () => void }) {
  const [selectedItems, setSelectedItems] = useState<Record<string, { selected: boolean; quantity: number; reason: string; description: string }>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const eligibleItems = order.processedItems.filter(i => i.returnStatus === "Eligible");
  const totalPrice = parseFloat(order.totalPriceSet.shopMoney.amount);

  // Calculate refund estimate
  const selectedCount = Object.values(selectedItems).filter(v => v.selected).length;
  const pricePerItem = order.processedItems.length > 0 ? totalPrice / order.processedItems.reduce((sum, i) => sum + i.quantity, 0) : 0;
  const estimatedRefund = Object.entries(selectedItems)
    .filter(([, v]) => v.selected)
    .reduce((sum, [id, v]) => {
      const item = order.processedItems.find(i => i.id === id);
      return sum + (item ? pricePerItem * v.quantity : 0);
    }, 0);

  const submitReturn = async () => {
    const items = Object.entries(selectedItems)
      .filter(([, v]) => v.selected)
      .map(([lineItemId, v]) => ({ lineItemId, quantity: v.quantity, reason: v.reason, description: v.description }));
    if (items.length === 0) return;

    setSubmitting(true);
    setSubmitError(null);
    try {
      const orderId = order.id.split("/").pop();
      const res = await fetch("/api/submit-return", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId, items }),
      });
      const result = await res.json();
      if (result.success) setSubmitted(true);
      else setSubmitError(result.error);
    } catch {
      setSubmitError("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const orderStatusUrl = `https://account.iblazevape.co.uk/orders/${order.id.split("/").pop()}`;

  if (submitted) {
    return (
      <div className="max-w-lg mx-auto py-16 text-center space-y-4 px-4">
        <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center mx-auto">
          <CheckCircle2 className="w-8 h-8 text-green-500" />
        </div>
        <h2 className="text-xl font-semibold">Return Requested</h2>
        <p className="text-muted-foreground text-sm">We&apos;ve sent a confirmation email. Our team will review your return and be in touch shortly.</p>
        <div className="flex gap-3 justify-center pt-2">
          <Button variant="outline" onClick={onBack}><ArrowLeft className="w-4 h-4" />Back to Orders</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">
      {/* Back */}
      <Button variant="ghost" size="sm" onClick={onBack} className="gap-2 -ml-2 text-muted-foreground hover:text-foreground">
        <ArrowLeft className="w-4 h-4" />Back to Orders
      </Button>

      {/* Order header */}
      <div className="bg-card border border-border rounded-xl p-5 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              {getFulfillmentIcon(order.displayFulfillmentStatus)}
              <div>
                <h1 className="text-xl font-semibold">{order.name}</h1>
                <p className="text-sm text-muted-foreground">
                  {new Date(order.createdAt).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              {getFulfillmentBadge(order.displayFulfillmentStatus)}
              <span className="text-sm font-semibold">£{totalPrice.toFixed(2)} GBP</span>
            </div>
          </div>

          <a href={orderStatusUrl} target="_blank" rel="noopener noreferrer">
            <Button variant="outline" size="sm" className="gap-2 w-full sm:w-auto">
              <ExternalLink className="w-4 h-4" />View Order Status
            </Button>
          </a>
        </div>

        {/* Order tracker */}
        <Separator className="my-5" />
        <div className="space-y-2">
          <p className="text-sm font-medium flex items-center gap-2">
            <Truck className="w-4 h-4 text-muted-foreground" />Order Status & Tracker
          </p>
          <p className="text-xs text-muted-foreground pl-6">
            View your live order status securely via Shopify.{" "}
            <a href={orderStatusUrl} target="_blank" rel="noopener noreferrer" className="text-primary underline underline-offset-4">
              View Order Status →
            </a>
          </p>
        </div>
      </div>

      {/* Items + Return form + Estimator */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Items list */}
        <div className="lg:col-span-2 space-y-4">
          <h2 className="font-semibold text-base">Order Items</h2>
          <div className="bg-card border border-border rounded-xl overflow-hidden divide-y divide-border">
            {order.processedItems.map((item) => {
              const sel = selectedItems[item.id];
              const isEligible = item.returnStatus === "Eligible";
              return (
                <div key={item.id} className={cn("p-4 sm:p-5 transition-colors", sel?.selected && "bg-primary/5")}>
                  <div className="flex items-start gap-4">
                    {/* Checkbox for eligible items */}
                    {isEligible && (
                      <Checkbox
                        checked={sel?.selected || false}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setSelectedItems(prev => ({ ...prev, [item.id]: { selected: true, quantity: item.quantity, reason: "CHANGED_MIND", description: "" } }));
                          } else {
                            setSelectedItems(prev => ({ ...prev, [item.id]: { ...prev[item.id], selected: false } }));
                          }
                        }}
                        className="mt-1"
                      />
                    )}

                    {/* Product image */}
                    <div className={cn("rounded-xl overflow-hidden bg-muted flex-shrink-0 border border-border", isEligible ? "w-14 h-14" : "w-12 h-12", !isEligible && "ml-7 sm:ml-0")}>
                      {item.image?.url && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={item.image.url} alt={item.title} className="w-full h-full object-cover" />
                      )}
                    </div>

                    {/* Item info */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{item.title}</p>
                      {item.variant?.title && item.variant.title !== "Default Title" && (
                        <p className="text-xs text-muted-foreground">{item.variant.title}</p>
                      )}
                      <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                        <span className="text-xs text-muted-foreground">Qty: {item.quantity}</span>
                        {getStatusBadge(item.returnStatus)}
                      </div>
                    </div>
                  </div>

                  {/* Return form - inline when selected */}
                  {sel?.selected && (
                    <div className="mt-4 ml-7 sm:ml-14 space-y-3 animate-fade-in">
                      <div>
                        <label className="text-xs font-medium text-foreground block mb-1.5">Return reason</label>
                        <Select value={sel.reason} onValueChange={(val) => setSelectedItems(prev => ({ ...prev, [item.id]: { ...prev[item.id], reason: val } }))}>
                          <SelectTrigger className="text-sm"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {RETURN_REASONS.map(r => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <label className="text-xs font-medium text-foreground block mb-1.5">Additional notes <span className="text-muted-foreground font-normal">(optional)</span></label>
                        <Textarea
                          value={sel.description}
                          onChange={(e) => setSelectedItems(prev => ({ ...prev, [item.id]: { ...prev[item.id], description: e.target.value } }))}
                          placeholder="Tell us more about the issue..."
                          className="text-sm"
                          rows={2}
                        />
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Policy info */}
          <div className="flex items-start gap-3 p-4 rounded-xl bg-muted/50 border border-border text-xs text-muted-foreground">
            <Info className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <p>Unwanted items can be returned within <strong className="text-foreground">30 days</strong> from delivery. Return postage is at your expense (tracked service required).</p>
          </div>
        </div>

        {/* Refund Estimator + Submit — sticky on desktop */}
        <div className="lg:col-span-1">
          <div className="lg:sticky lg:top-6 space-y-4">
            <div className="bg-card border border-border rounded-xl overflow-hidden">
              <div className="px-5 py-4 border-b border-border">
                <h3 className="font-semibold text-sm flex items-center gap-2">
                  <RotateCcw className="w-4 h-4 text-primary" />Refund Estimator
                </h3>
              </div>
              <div className="px-5 py-4 space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{selectedCount} item{selectedCount !== 1 ? "s" : ""} selected</span>
                  <span className="font-medium">£{estimatedRefund.toFixed(2)}</span>
                </div>
                <Separator />
                <div className="flex items-center justify-between text-sm font-semibold">
                  <span>Estimated total</span>
                  <span className="text-primary text-base">£{estimatedRefund.toFixed(2)}</span>
                </div>

                {selectedCount === 0 && (
                  <p className="text-xs text-muted-foreground text-center pt-1">Select items above to calculate your estimated refund</p>
                )}
              </div>

              {submitError && (
                <div className="mx-5 mb-4 flex items-start gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-xs text-destructive">
                  <XCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />{submitError}
                </div>
              )}

              <div className="px-5 pb-5 space-y-2">
                <Button
                  className="w-full gap-2"
                  disabled={selectedCount === 0 || submitting}
                  onClick={submitReturn}
                >
                  <RotateCcw className="w-4 h-4" />
                  {submitting ? "Submitting..." : "Submit Request"}
                </Button>
                <Button variant="ghost" className="w-full text-muted-foreground" onClick={() => setSelectedItems({})}>
                  Cancel
                </Button>
              </div>
            </div>

            {/* Order summary */}
            <div className="bg-card border border-border rounded-xl px-5 py-4 space-y-3 text-sm">
              <p className="font-semibold">Order Summary</p>
              <div className="flex justify-between text-muted-foreground">
                <span>Total paid</span>
                <span className="font-medium text-foreground">£{totalPrice.toFixed(2)} GBP</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>Items</span>
                <span>{order.processedItems.reduce((s, i) => s + i.quantity, 0)}</span>
              </div>
              {order.displayFulfillmentStatus === "FULFILLED" && (
                <div className="flex items-start gap-2 pt-1 p-3 rounded-lg bg-green-50 border border-green-100 text-xs text-green-700">
                  <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                  <span>This order has been delivered</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main Dashboard ───────────────────────────────────────────────────────────
export default function DashboardClient() {
  const router = useRouter();
  const [data, setData] = useState<OrdersData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [view, setView] = useState<"grid" | "list">("grid");
  const [search, setSearch] = useState("");
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    fetch("/api/get-orders")
      .then(r => r.json())
      .then(d => {
        if (d.error) {
          if (d.error.includes("Session")) router.push("/");
          else setError(d.error);
        } else setData(d);
      })
      .catch(() => setError("Failed to load orders."))
      .finally(() => setLoading(false));
  }, [router]);

  const initial = data?.firstName?.[0]?.toUpperCase() || "?";
  const profileUrl = "https://account.iblazevape.co.uk/profile";

  const filteredOrders = (data?.orders || []).filter(o =>
    o.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex h-screen bg-background overflow-hidden">

      {/* Desktop Sidebar */}
      <aside className={cn(
        "hidden md:flex flex-col flex-shrink-0 border-r border-border bg-card transition-all duration-300",
        sidebarCollapsed ? "w-16" : "w-56"
      )}>
        <SidebarNav collapsed={sidebarCollapsed} />
      </aside>

      {/* Mobile Sidebar via Sheet */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="w-64 p-0">
          <SidebarNav collapsed={false} onNavigate={() => setMobileOpen(false)} />
        </SheetContent>
      </Sheet>

      {/* Main area */}
      <div className="flex-1 flex flex-col overflow-hidden">

        {/* Header */}
        <header className="h-14 flex items-center px-4 gap-3 border-b border-border bg-card flex-shrink-0">
          {/* Mobile menu */}
          <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setMobileOpen(true)}>
            <Menu className="w-5 h-5" />
          </Button>

          {/* Desktop collapse */}
          <Button variant="ghost" size="icon" className="hidden md:flex" onClick={() => setSidebarCollapsed(!sidebarCollapsed)}>
            <Menu className="w-5 h-5" />
          </Button>

          {/* Breadcrumb */}
          <div className="flex items-center gap-2 text-sm text-muted-foreground hidden sm:flex">
            <span>Dashboard</span>
            <ChevronRight className="w-3.5 h-3.5" />
            <span className={cn("font-medium", selectedOrder ? "text-foreground" : "text-foreground")}>
              {selectedOrder ? selectedOrder.name : "My Orders"}
            </span>
          </div>

          {/* Search — only on orders list */}
          {!selectedOrder && (
            <div className="flex-1 max-w-xs ml-2 hidden sm:block">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search orders..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="pl-9 h-8 text-sm"
                />
              </div>
            </div>
          )}

          <div className="ml-auto flex items-center gap-2 sm:gap-3">
            <a
              href="https://iblazevape.co.uk"
              target="_blank"
              className="hidden sm:flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Back to Store <ExternalLink className="w-3.5 h-3.5" />
            </a>

            <Separator orientation="vertical" className="h-6 hidden sm:block" />

            <a href={profileUrl} target="_blank">
              <Avatar className="h-8 w-8 cursor-pointer hover:ring-2 hover:ring-primary/30 hover:ring-offset-1 transition-all">
                <AvatarFallback className="text-xs">{initial}</AvatarFallback>
              </Avatar>
            </a>
          </div>
        </header>

        {/* Mobile search */}
        {!selectedOrder && (
          <div className="sm:hidden px-4 py-2 border-b border-border bg-card">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="Search orders..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 h-8 text-sm" />
            </div>
          </div>
        )}

        {/* Page content */}
        <main className="flex-1 overflow-y-auto">
          {selectedOrder ? (
            <OrderDetail order={selectedOrder} onBack={() => setSelectedOrder(null)} />
          ) : (
            <div className="p-4 sm:p-6">
              <div className="flex items-start justify-between mb-6">
                <div>
                  <h1 className="text-xl font-semibold">
                    {data?.firstName ? `Hi, ${data.firstName}` : "Your Recent Orders"}
                  </h1>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    Select an order to initiate a return or log a claim.
                  </p>
                </div>
                <div className="flex items-center gap-1 bg-muted rounded-lg p-1">
                  <Button variant="ghost" size="icon" className={cn("h-7 w-7", view === "grid" && "bg-background shadow-sm")} onClick={() => setView("grid")}>
                    <LayoutGrid className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className={cn("h-7 w-7", view === "list" && "bg-background shadow-sm")} onClick={() => setView("list")}>
                    <List className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              {/* Error */}
              {error && (
                <div className="flex items-center gap-3 p-4 rounded-xl bg-destructive/10 border border-destructive/20 text-sm text-destructive mb-4">
                  <XCircle className="w-5 h-5 flex-shrink-0" />{error}
                </div>
              )}

              {/* Skeletons */}
              {loading && (
                <div className={cn(view === "grid" ? "grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4" : "space-y-3")}>
                  {Array.from({ length: 6 }).map((_, i) => <OrderCardSkeleton key={i} />)}
                </div>
              )}

              {/* Empty */}
              {!loading && filteredOrders.length === 0 && (
                <div className="text-center py-20">
                  <ShoppingBag className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
                  <p className="font-medium text-muted-foreground">No orders found</p>
                  <p className="text-sm text-muted-foreground/60 mt-1">Orders placed with this account will appear here</p>
                </div>
              )}

              {/* Grid */}
              {!loading && view === "grid" && (
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                  {filteredOrders.map(order => (
                    <OrderCard key={order.id} order={order} onClick={() => setSelectedOrder(order)} />
                  ))}
                </div>
              )}

              {/* List */}
              {!loading && view === "list" && (
                <div className="bg-card border border-border rounded-xl overflow-hidden divide-y divide-border">
                  {filteredOrders.map(order => (
                    <button key={order.id} onClick={() => setSelectedOrder(order)}
                      className="w-full px-5 py-4 flex items-center gap-4 hover:bg-accent transition-colors text-left">
                      <div className="flex -space-x-1.5">
                        {order.processedItems.slice(0, 3).map((item, i) => item.image?.url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img key={i} src={item.image.url} alt="" className="w-9 h-9 rounded-lg object-cover border-2 border-background" />
                        ) : null)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm">{order.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(order.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                          {" · "}{order.processedItems.length} items
                        </p>
                      </div>
                      {getFulfillmentBadge(order.displayFulfillmentStatus)}
                      <p className="font-semibold text-sm w-16 text-right">£{parseFloat(order.totalPriceSet.shopMoney.amount).toFixed(2)}</p>
                      <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
