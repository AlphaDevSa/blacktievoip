import { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { useGetMyOrders, useGetMyOrder, Order, OrderDetail } from "@workspace/api-client-react";
import { motion } from "framer-motion";
import { ShoppingCart, Plus, Eye, Package, Server, Hash, Clock } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { formatZar } from "@/lib/utils";
import { Link } from "wouter";
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

const STATUS_LABELS: Record<string, string> = {
  pending: "Pending Review",
  processing: "Being Processed",
  completed: "Completed",
  cancelled: "Cancelled",
};

export default function ResellerOrders() {
  const { data: orders = [], isLoading } = useGetMyOrders();
  const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null);

  const { data: orderDetail } = useGetMyOrder(
    selectedOrderId ?? 0,
    { query: { enabled: !!selectedOrderId } }
  );

  return (
    <AppLayout role="reseller" title="My Orders">
      <div className="flex flex-col gap-6">

        {/* Header action */}
        <div className="flex justify-end">
          <Link
            href="/reseller/orders/new"
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground font-semibold text-sm shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 hover:-translate-y-0.5 transition-all"
          >
            <Plus className="w-4 h-4" /> Place New Order
          </Link>
        </div>

        {/* Orders list */}
        <div className="bg-card border border-border rounded-2xl shadow-lg overflow-hidden">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-muted-foreground uppercase bg-muted/10 sticky top-0 backdrop-blur-md">
              <tr>
                <th className="px-6 py-4 font-semibold">Order #</th>
                <th className="px-6 py-4 font-semibold">Items</th>
                <th className="px-6 py-4 font-semibold">Total incl VAT</th>
                <th className="px-6 py-4 font-semibold">Status</th>
                <th className="px-6 py-4 font-semibold">Date Placed</th>
                <th className="px-6 py-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {isLoading ? (
                <tr><td colSpan={6} className="px-6 py-12 text-center text-muted-foreground">Loading orders...</td></tr>
              ) : orders.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-20 text-center">
                    <ShoppingCart className="w-12 h-12 text-muted-foreground/20 mx-auto mb-4" />
                    <p className="text-muted-foreground font-medium mb-2">No orders yet</p>
                    <Link href="/reseller/orders/new" className="text-primary text-sm font-semibold hover:underline">
                      Place your first order →
                    </Link>
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
                    <td className="px-6 py-4 text-muted-foreground">
                      {(order as any).itemCount ?? 0} item{((order as any).itemCount ?? 0) !== 1 ? "s" : ""}
                    </td>
                    <td className="px-6 py-4 font-semibold text-foreground">{formatZar(order.totalInclVat)}</td>
                    <td className="px-6 py-4">
                      <span className={`px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider border ${STATUS_COLORS[order.status] || "bg-black/5 text-foreground border-border"}`}>
                        {STATUS_LABELS[order.status] ?? order.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-muted-foreground text-xs">
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-3 h-3 opacity-60 shrink-0" />
                        {formatDateTime(order.createdAt)}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => setSelectedOrderId(order.id)}
                        className="p-2 hover:bg-primary/10 rounded-lg text-muted-foreground hover:text-primary transition-colors"
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
        maxWidth="max-w-2xl"
      >
        {orderDetail ? (
          <div className="space-y-5">
            {/* Summary */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-muted/10 rounded-xl p-4 border border-border/50">
                <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold mb-2">Totals</p>
                <p className="text-xs text-muted-foreground">Excl VAT: <span className="text-foreground font-semibold">{formatZar(orderDetail.totalExclVat)}</span></p>
                <p className="text-xs text-muted-foreground">Incl VAT: <span className="text-primary font-bold text-lg">{formatZar(orderDetail.totalInclVat)}</span></p>
              </div>
              <div className="bg-muted/10 rounded-xl p-4 border border-border/50">
                <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold mb-2">Status</p>
                <span className={`px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider border ${STATUS_COLORS[orderDetail.status] || "bg-black/5 text-foreground border-border"}`}>
                  {STATUS_LABELS[orderDetail.status] ?? orderDetail.status}
                </span>
                <div className="flex items-center gap-1 text-xs text-muted-foreground mt-2">
                  <Clock className="w-3 h-3" />
                  {formatDateTime(orderDetail.createdAt)}
                </div>
              </div>
            </div>

            {/* Notes */}
            {orderDetail.notes && (
              <div className="bg-muted/10 rounded-xl p-4 border border-border/50">
                <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold mb-2">Your Notes</p>
                <p className="text-sm text-foreground">{orderDetail.notes}</p>
              </div>
            )}
            {orderDetail.adminNotes && (
              <div className="bg-primary/5 rounded-xl p-4 border border-primary/20">
                <p className="text-xs text-primary uppercase tracking-wider font-semibold mb-2">Message from Black Tie VoIP</p>
                <p className="text-sm text-foreground">{orderDetail.adminNotes}</p>
              </div>
            )}

            {/* Line Items */}
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold mb-3">
                Items ({(orderDetail as any).items?.length ?? 0})
              </p>
              <div className="rounded-xl border border-border/50 overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="text-xs text-muted-foreground uppercase bg-muted/10">
                    <tr>
                      <th className="px-4 py-3 font-semibold text-left">Item</th>
                      <th className="px-4 py-3 font-semibold text-center">Qty</th>
                      <th className="px-4 py-3 font-semibold text-right">Unit</th>
                      <th className="px-4 py-3 font-semibold text-right">Total</th>
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
                        <td className="px-4 py-3 text-right text-muted-foreground">{formatZar(item.unitPriceInclVat)}</td>
                        <td className="px-4 py-3 text-right font-bold text-foreground">{formatZar(item.lineTotal)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-muted/10">
                    <tr>
                      <td colSpan={3} className="px-4 py-3 text-right font-semibold text-muted-foreground text-sm">Total incl VAT</td>
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
