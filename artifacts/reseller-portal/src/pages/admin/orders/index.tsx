import { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import {
  useAdminGetOrders,
  useAdminGetOrder,
  useAdminUpdateOrderStatus,
  Order,
  OrderDetail,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { ShoppingCart, Eye, ChevronDown, X, Package, Server, Clock } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { formatZar } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

function orderRef(id: number) {
  return `ORD-${String(id).padStart(6, "0")}`;
}

function formatDateTime(dt: string) {
  return format(new Date(dt), "dd MMM yyyy, HH:mm");
}

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
  processing: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  completed: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  cancelled: "bg-red-500/10 text-red-400 border-red-500/20",
};

const STATUS_OPTIONS = ["pending", "processing", "completed", "cancelled"];

export default function AdminOrders() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null);
  const [adminNotes, setAdminNotes] = useState("");

  const { data: orders = [], isLoading } = useAdminGetOrders(
    statusFilter ? { status: statusFilter } : {}
  );
  const { data: orderDetail } = useAdminGetOrder(
    selectedOrderId ?? 0,
    { query: { enabled: !!selectedOrderId } }
  );
  const updateStatus = useAdminUpdateOrderStatus();

  const openDetail = (order: Order) => {
    setSelectedOrderId(order.id);
    setAdminNotes((order as any).adminNotes || "");
  };

  const handleStatusChange = async (orderId: number, status: string) => {
    try {
      await updateStatus.mutateAsync({ id: orderId, data: { status: status as any } });
      toast({ title: `${orderRef(orderId)} marked as ${status}` });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/orders"] });
      queryClient.invalidateQueries({ queryKey: [`/api/admin/orders/${orderId}`] });
    } catch {
      toast({ title: "Failed to update status", variant: "destructive" });
    }
  };

  const handleSaveAdminNotes = async () => {
    if (!selectedOrderId) return;
    const detail = orderDetail as OrderDetail | undefined;
    try {
      await updateStatus.mutateAsync({
        id: selectedOrderId,
        data: { status: (detail?.status ?? "pending") as any, adminNotes }
      });
      toast({ title: "Notes saved" });
      queryClient.invalidateQueries({ queryKey: [`/api/admin/orders/${selectedOrderId}`] });
    } catch {
      toast({ title: "Failed to save notes", variant: "destructive" });
    }
  };

  return (
    <AppLayout role="admin" title="Orders">
      <div className="flex flex-col gap-6">

        {/* Header + Filters */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-2 flex-wrap">
            {["", ...STATUS_OPTIONS].map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all border ${
                  statusFilter === s
                    ? "bg-primary text-primary-foreground border-primary shadow-lg shadow-primary/25"
                    : "bg-card border-border text-muted-foreground hover:text-foreground hover:border-primary/40"
                }`}
              >
                {s === "" ? "All Orders" : s.charAt(0).toUpperCase() + s.slice(1)}
              </button>
            ))}
          </div>
          <p className="text-sm text-muted-foreground font-medium">{orders.length} orders</p>
        </div>

        {/* Table */}
        <div className="bg-card border border-border rounded-2xl shadow-lg overflow-hidden">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-muted-foreground uppercase bg-muted/10 sticky top-0 backdrop-blur-md">
              <tr>
                <th className="px-6 py-4 font-semibold">Order</th>
                <th className="px-6 py-4 font-semibold">Reseller</th>
                <th className="px-6 py-4 font-semibold">Items</th>
                <th className="px-6 py-4 font-semibold">Total incl VAT</th>
                <th className="px-6 py-4 font-semibold">Status</th>
                <th className="px-6 py-4 font-semibold">Date</th>
                <th className="px-6 py-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-muted-foreground">Loading orders...</td>
                </tr>
              ) : orders.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-16 text-center">
                    <ShoppingCart className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
                    <p className="text-muted-foreground">No orders yet</p>
                  </td>
                </tr>
              ) : (
                orders.map((order: Order, idx) => (
                  <motion.tr
                    key={order.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.04 }}
                    className="hover:bg-black/[0.03] transition-colors group"
                  >
                    <td className="px-6 py-4">
                      <span className="font-mono font-bold text-primary text-sm">{orderRef(order.id)}</span>
                    </td>
                    <td className="px-6 py-4">
                      <p className="font-semibold text-foreground">{order.resellerName || "—"}</p>
                      <p className="text-xs text-muted-foreground">{order.resellerEmail || ""}</p>
                    </td>
                    <td className="px-6 py-4 text-muted-foreground">
                      {(order as any).itemCount ?? 0} item{((order as any).itemCount ?? 0) !== 1 ? "s" : ""}
                    </td>
                    <td className="px-6 py-4 font-semibold text-foreground">{formatZar(order.totalInclVat)}</td>
                    <td className="px-6 py-4">
                      <div className="relative group/status inline-block">
                        <button className={`px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider border flex items-center gap-1.5 transition-all ${STATUS_COLORS[order.status] || "bg-black/5 text-foreground border-border"}`}>
                          {order.status}
                          <ChevronDown className="w-3 h-3 opacity-60" />
                        </button>
                        <div className="absolute left-0 top-full mt-1 z-30 hidden group-hover/status:flex flex-col bg-card border border-border rounded-xl shadow-2xl shadow-black/50 overflow-hidden min-w-[140px]">
                          {STATUS_OPTIONS.filter(s => s !== order.status).map(s => (
                            <button
                              key={s}
                              onClick={() => handleStatusChange(order.id, s)}
                              className="px-4 py-2.5 text-left text-xs font-semibold hover:bg-black/5 transition-colors capitalize"
                            >
                              {s}
                            </button>
                          ))}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-muted-foreground text-xs">
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-3 h-3 opacity-60 shrink-0" />
                        {formatDateTime(order.createdAt)}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => openDetail(order)}
                        className="p-2 hover:bg-primary/10 rounded-lg text-muted-foreground hover:text-primary transition-colors"
                        title="View details"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </td>
                  </motion.tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Order Detail Modal */}
      <Modal
        isOpen={!!selectedOrderId}
        onClose={() => setSelectedOrderId(null)}
        title={selectedOrderId ? orderRef(selectedOrderId) : "Order Detail"}
        maxWidth="max-w-3xl"
      >
        {orderDetail ? (
          <div className="space-y-5">
            {/* Order meta */}
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="bg-muted/10 rounded-xl p-4 border border-border/50">
                <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold mb-2">Reseller</p>
                <p className="font-bold text-foreground">{(orderDetail as any).resellerName || "—"}</p>
                <p className="text-muted-foreground text-xs">{(orderDetail as any).resellerEmail || ""}</p>
              </div>
              <div className="bg-muted/10 rounded-xl p-4 border border-border/50">
                <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold mb-2">Order Summary</p>
                <p className="text-xs text-muted-foreground">Excl VAT: <span className="text-foreground font-semibold">{formatZar(orderDetail.totalExclVat)}</span></p>
                <p className="text-xs text-muted-foreground">Incl VAT: <span className="text-foreground font-bold text-base">{formatZar(orderDetail.totalInclVat)}</span></p>
                <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                  <Clock className="w-3 h-3 shrink-0" />
                  {formatDateTime(orderDetail.createdAt)}
                </div>
              </div>
            </div>

            {/* Status update */}
            <div className="bg-muted/10 rounded-xl p-4 border border-border/50">
              <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold mb-3">Update Status</p>
              <div className="flex flex-wrap gap-2">
                {STATUS_OPTIONS.map(s => (
                  <button
                    key={s}
                    onClick={() => handleStatusChange(orderDetail.id, s)}
                    disabled={orderDetail.status === s || updateStatus.isPending}
                    className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider border transition-all disabled:opacity-40 ${
                      orderDetail.status === s
                        ? STATUS_COLORS[s] + " ring-2 ring-offset-2 ring-offset-background ring-current"
                        : "bg-card border-border text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            {/* Reseller notes */}
            {orderDetail.notes && (
              <div className="bg-muted/10 rounded-xl p-4 border border-border/50">
                <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold mb-2">Reseller Notes</p>
                <p className="text-sm text-foreground">{orderDetail.notes}</p>
              </div>
            )}

            {/* Admin notes */}
            <div className="bg-muted/10 rounded-xl p-4 border border-border/50">
              <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold mb-2">Admin Notes</p>
              <textarea
                value={adminNotes}
                onChange={e => setAdminNotes(e.target.value)}
                rows={3}
                placeholder="Add internal processing notes..."
                className="w-full px-3 py-2 rounded-lg bg-background border border-border text-sm text-foreground focus:ring-2 focus:ring-primary/50 outline-none resize-none"
              />
              <button
                onClick={handleSaveAdminNotes}
                disabled={updateStatus.isPending}
                className="mt-2 px-4 py-2 rounded-lg bg-primary/10 text-primary text-xs font-semibold hover:bg-primary/20 transition-colors disabled:opacity-50"
              >
                Save Notes
              </button>
            </div>

            {/* Line items */}
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold mb-3">
                Order Items ({(orderDetail as any).items?.length ?? 0})
              </p>
              <div className="rounded-xl border border-border/50 overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="text-xs text-muted-foreground uppercase bg-muted/10">
                    <tr>
                      <th className="px-4 py-3 font-semibold text-left">Item</th>
                      <th className="px-4 py-3 font-semibold text-center">Qty</th>
                      <th className="px-4 py-3 font-semibold text-right">Unit excl VAT</th>
                      <th className="px-4 py-3 font-semibold text-right">Unit incl VAT</th>
                      <th className="px-4 py-3 font-semibold text-right">Line Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/50">
                    {((orderDetail as any).items ?? []).map((item: any) => (
                      <tr key={item.id} className="hover:bg-black/[0.03]">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                              {item.itemType === "service" ? <Server className="w-3.5 h-3.5 text-primary" /> : <Package className="w-3.5 h-3.5 text-primary" />}
                            </div>
                            <div>
                              <p className="font-semibold text-foreground">{item.name}</p>
                              {item.sku && <p className="text-xs text-muted-foreground font-mono">{item.sku}</p>}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-center font-semibold">{item.quantity}</td>
                        <td className="px-4 py-3 text-right text-muted-foreground">{formatZar(item.unitPriceExclVat)}</td>
                        <td className="px-4 py-3 text-right">{formatZar(item.unitPriceInclVat)}</td>
                        <td className="px-4 py-3 text-right font-bold text-foreground">{formatZar(item.lineTotal)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-muted/10">
                    <tr>
                      <td colSpan={4} className="px-4 py-3 text-right font-semibold text-muted-foreground text-sm">Total incl VAT</td>
                      <td className="px-4 py-3 text-right font-bold text-primary text-base">{formatZar(orderDetail.totalInclVat)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          </div>
        ) : (
          <div className="py-12 text-center text-muted-foreground">Loading order details...</div>
        )}
      </Modal>
    </AppLayout>
  );
}
