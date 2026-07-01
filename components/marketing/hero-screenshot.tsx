import { LayoutDashboard, Package, Search, Store, CheckCircle2, Clock, Truck } from "lucide-react"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"

const ORDERS = [
  { id: "#1035", total: "£493.00", meta: "26 Jun 2026 · 92 items", status: "Confirmed", statusColor: "text-zinc-900", icon: Clock },
  { id: "#1034", total: "£72.00", meta: "6 Jun 2026 · 18 items", status: "4 delivered", statusColor: "text-green-600", icon: CheckCircle2 },
  { id: "#1033", total: "£148.00", meta: "27 May 2026 · 37 items", status: "Delivered", statusColor: "text-green-600", icon: CheckCircle2 },
  { id: "#1032", total: "£260.00", meta: "27 May 2026 · 65 items", status: "21 on its way", statusColor: "text-slate-600", icon: Truck },
  { id: "#1030", total: "£372.00", meta: "26 May 2026 · 93 items", status: "Delivered", statusColor: "text-green-600", icon: CheckCircle2 },
  { id: "#1029", total: "£72.00", meta: "15 May 2026 · 18 items", status: "Delivered", statusColor: "text-green-600", icon: CheckCircle2 },
]

export function HeroPortalScreenshot() {
  return (
    <Card className="light w-full overflow-hidden bg-white py-0 gap-0 shadow-2xl">
      <div className="flex items-center gap-3 border-b px-5 py-3">
        <span className="flex size-6 items-center justify-center rounded bg-foreground text-background text-[10px] font-bold">R</span>
        <span className="text-sm font-medium">Reflow Returns</span>
        <div className="relative ml-6 hidden flex-1 max-w-xs sm:block">
          <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input readOnly placeholder="Search orders..." className="h-8 pl-8 text-xs" />
        </div>
        <Store className="ml-auto size-4 text-muted-foreground" />
        <Avatar className="size-7">
          <AvatarFallback className="bg-foreground text-background text-[10px] font-semibold">NG</AvatarFallback>
        </Avatar>
      </div>

      <div className="flex">
        <div className="hidden w-40 shrink-0 flex-col gap-1 border-r p-3 sm:flex">
          <div className="flex items-center gap-2 rounded-md px-2 py-1.5 text-xs font-medium text-muted-foreground">
            <LayoutDashboard className="size-3.5" /> Dashboard
          </div>
          <div className="flex items-center gap-2 rounded-md bg-muted px-2 py-1.5 text-xs font-medium">
            <Package className="size-3.5" /> My Orders
          </div>
        </div>

        <div className="flex-1 p-4">
          <p className="mb-3 text-sm font-semibold">Hi, Northfield Goods</p>
          <div className="grid grid-cols-2 gap-2.5 md:grid-cols-3">
            {ORDERS.map((order) => (
              <div key={order.id} className="rounded-lg border p-2.5">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold">{order.id}</p>
                  <p className="text-xs font-semibold">{order.total}</p>
                </div>
                <p className="mt-0.5 text-[10px] text-muted-foreground">{order.meta}</p>
                <div className={`mt-2 flex items-center gap-1 text-[10px] font-medium ${order.statusColor}`}>
                  <order.icon className="size-3" /> {order.status}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Card>
  )
}
