import {
  useResellerGetStats,
  useGetNotices,
  useGetMyOrders,
  useGetCatalogNewItems,
  Notice,
} from "@workspace/api-client-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { formatZar } from "@/lib/utils";
import {
  Users, PhoneCall, CreditCard, ArrowUpRight,
  Bell, AlertTriangle, CheckCircle2, Info, X, ShoppingCart,
  Clock, Package, Server, Globe, Tag, ChevronRight, Sparkles,
} from "lucide-react";
import { motion } from "framer-motion";
import { useLocation } from "wouter";

const STATUS_STYLES: Record<string, { label: string; cls: string }> = {
  pending:    { label: "Pending",    cls: "bg-amber-500/10 text-amber-600 border-amber-300/30" },
  processing: { label: "Processing", cls: "bg-blue-500/10 text-blue-600 border-blue-300/30" },
  completed:  { label: "Completed",  cls: "bg-emerald-500/10 text-emerald-600 border-emerald-300/30" },
  cancelled:  { label: "Cancelled",  cls: "bg-red-500/10 text-red-500 border-red-300/30" },
};

const NOTICE_STYLES: Record<string, { icon: React.ElementType; bg: string; border: string; iconCls: string }> = {
  info:    { icon: Info,          bg: "bg-blue-50 dark:bg-blue-950/20",    border: "border-blue-200 dark:border-blue-800",    iconCls: "text-blue-500" },
  warning: { icon: AlertTriangle, bg: "bg-amber-50 dark:bg-amber-950/20",  border: "border-amber-200 dark:border-amber-800",  iconCls: "text-amber-500" },
  success: { icon: CheckCircle2,  bg: "bg-emerald-50 dark:bg-emerald-950/20", border: "border-emerald-200 dark:border-emerald-800", iconCls: "text-emerald-500" },
  danger:  { icon: AlertTriangle, bg: "bg-red-50 dark:bg-red-950/20",      border: "border-red-200 dark:border-red-800",      iconCls: "text-red-500" },
};

const CATALOG_TYPE_ICONS: Record<string, React.ElementType> = {
  service: Server,
  product: Package,
  hosting: Globe,
  domain:  Tag,
};

const CATALOG_TYPE_LABELS: Record<string, string> = {
  service: "Service",
  product: "Product",
  hosting: "Web Hosting",
  domain:  "Domain TLD",
};

export default function ResellerDashboard() {
  const [, setLocation] = useLocation();
  const { data: stats, isLoading } = useResellerGetStats();
  const { data: notices = [] } = useGetNotices();
  const { data: orders = [] } = useGetMyOrders();
  const { data: catalogItems } = useGetCatalogNewItems();

  const recentOrders = (orders as any[]).slice(0, 5);
  const newItems = catalogItems?.recentItems ?? [];

  const statCards = [
    {
      title: "My Clients",
      value: stats?.totalClients || 0,
      subValue: `${stats?.activeClients || 0} active`,
      icon: Users,
      color: "text-blue-400",
      bg: "bg-blue-500/10",
      border: "border-blue-500/20",
    },
    {
      title: "Total SIP Extensions",
      value: stats?.totalSipExtensions || 0,
      subValue: "Across all active clients",
      icon: PhoneCall,
      color: "text-emerald-400",
      bg: "bg-emerald-500/10",
      border: "border-emerald-500/20",
    },
    {
      title: "Monthly Billed",
      value: formatZar(stats?.monthlyRevenue || 0),
      subValue: "Total client billing",
      icon: CreditCard,
      color: "text-purple-400",
      bg: "bg-purple-500/10",
      border: "border-purple-500/20",
    },
  ];

  if (isLoading) {
    return (
      <AppLayout role="reseller" title="Dashboard">
        <div className="flex items-center justify-center h-64">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout role="reseller" title="My Dashboard">

      {/* ── Notices ──────────────────────────────────────────────────────── */}
      {(notices as Notice[]).length > 0 && (
        <div className="mb-6 space-y-3">
          {(notices as Notice[]).map((notice: Notice, idx) => {
            const style = NOTICE_STYLES[notice.type] ?? NOTICE_STYLES.info;
            const IconComp = style.icon;
            return (
              <motion.div
                key={notice.id}
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
                className={`flex items-start gap-3 p-4 rounded-xl border ${style.bg} ${style.border}`}
              >
                <IconComp className={`w-5 h-5 flex-shrink-0 mt-0.5 ${style.iconCls}`} />
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm text-foreground">{notice.title}</p>
                  <p className="text-sm text-muted-foreground mt-0.5 whitespace-pre-line">{notice.content}</p>
                  {notice.expiresAt && (
                    <p className="text-xs text-muted-foreground/60 mt-1">
                      Expires {new Date(notice.expiresAt).toLocaleDateString("en-ZA")}
                    </p>
                  )}
                </div>
                <Bell className={`w-4 h-4 flex-shrink-0 mt-0.5 opacity-40 ${style.iconCls}`} />
              </motion.div>
            );
          })}
        </div>
      )}

      {/* ── Stat Cards ────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 mb-8">
        {statCards.map((card, idx) => (
          <motion.div
            key={card.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.1 }}
            className={`p-6 rounded-2xl bg-card border ${card.border} shadow-lg shadow-black/20 hover:shadow-xl hover:-translate-y-1 transition-all duration-300`}
          >
            <div className="flex justify-between items-start mb-4">
              <div className={`p-3 rounded-xl ${card.bg} ${card.color}`}>
                <card.icon className="w-6 h-6" />
              </div>
              <ArrowUpRight className="w-5 h-5 text-muted-foreground/50" />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground mb-1">{card.title}</p>
              <h3 className="text-3xl font-display font-bold text-foreground tracking-tight">{card.value}</h3>
              <p className="text-xs text-muted-foreground mt-2 font-medium">{card.subValue}</p>
            </div>
          </motion.div>
        ))}
      </div>

      {/* ── Bottom Row: Orders + New Catalog Items ────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Recent Orders */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.45 }}
          className="bg-card border border-border rounded-2xl shadow-lg overflow-hidden"
        >
          <div className="p-5 border-b border-border/50 flex items-center justify-between bg-muted/10">
            <h3 className="font-display font-bold text-base flex items-center gap-2">
              <ShoppingCart className="w-4 h-4 text-primary" />
              My Orders
            </h3>
            <button
              onClick={() => setLocation("/reseller/orders")}
              className="flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
            >
              View all <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {recentOrders.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <ShoppingCart className="w-10 h-10 opacity-20 mb-3" />
              <p className="text-sm">No orders yet</p>
              <button
                onClick={() => setLocation("/reseller/orders/new")}
                className="mt-3 px-4 py-2 rounded-lg bg-primary/10 text-primary text-xs font-semibold hover:bg-primary/20 transition-colors"
              >
                Place Your First Order
              </button>
            </div>
          ) : (
            <div className="divide-y divide-border/40">
              {recentOrders.map((order: any) => {
                const st = STATUS_STYLES[order.status] ?? STATUS_STYLES.pending;
                return (
                  <div
                    key={order.id}
                    className="flex items-center justify-between px-5 py-3.5 hover:bg-muted/10 transition-colors cursor-pointer"
                    onClick={() => setLocation(`/reseller/orders/${order.id}`)}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <ShoppingCart className="w-4 h-4 text-primary" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-sm text-foreground font-mono">ORD-{String(order.id).padStart(6, "0")}</p>
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <Clock className="w-3 h-3" />
                          {new Date(order.createdAt).toLocaleDateString("en-ZA", { day: "2-digit", month: "short", year: "numeric" })}, {new Date(order.createdAt).toLocaleTimeString("en-ZA", { hour: "2-digit", minute: "2-digit" })}
                          <span className="text-muted-foreground/40">·</span>
                          {order.itemCount} item{order.itemCount !== 1 ? "s" : ""}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0 ml-2">
                      <span className="font-semibold text-sm text-foreground">{formatZar(order.totalInclVat)}</span>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${st.cls}`}>
                        {st.label}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {recentOrders.length > 0 && (
            <div className="p-4 border-t border-border/40">
              <button
                onClick={() => setLocation("/reseller/orders/new")}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-primary/10 text-primary text-sm font-semibold hover:bg-primary/20 transition-colors"
              >
                <ShoppingCart className="w-4 h-4" /> Place New Order
              </button>
            </div>
          )}
        </motion.div>

        {/* New Catalog Items */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.55 }}
          className="bg-card border border-border rounded-2xl shadow-lg overflow-hidden"
        >
          <div className="p-5 border-b border-border/50 flex items-center justify-between bg-muted/10">
            <h3 className="font-display font-bold text-base flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-primary" />
              Available Catalog
            </h3>
            <button
              onClick={() => setLocation("/reseller/catalog")}
              className="flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
            >
              Browse all <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="p-4 space-y-1">
            {/* Totals summary row */}
            {catalogItems && (
              <div className="grid grid-cols-4 gap-2 mb-4">
                {[
                  { label: "Services", count: catalogItems.totalServices, icon: Server, cls: "bg-blue-500/10 text-blue-500" },
                  { label: "Products", count: catalogItems.totalProducts, icon: Package, cls: "bg-amber-500/10 text-amber-500" },
                  { label: "Hosting", count: catalogItems.totalHosting, icon: Globe, cls: "bg-primary/10 text-primary" },
                  { label: "Domains", count: catalogItems.totalDomains, icon: Tag, cls: "bg-purple-500/10 text-purple-500" },
                ].map(item => (
                  <button
                    key={item.label}
                    onClick={() => setLocation("/reseller/catalog")}
                    className="flex flex-col items-center gap-1.5 p-3 rounded-xl bg-muted/10 border border-border/50 hover:border-primary/30 hover:bg-primary/5 transition-all"
                  >
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${item.cls}`}>
                      <item.icon className="w-4 h-4" />
                    </div>
                    <p className="text-lg font-bold text-foreground leading-none">{item.count}</p>
                    <p className="text-[10px] text-muted-foreground font-medium">{item.label}</p>
                  </button>
                ))}
              </div>
            )}

            {/* Recent additions */}
            {newItems.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-muted-foreground text-sm">
                <Package className="w-8 h-8 opacity-20 mb-2" />
                No recent additions
              </div>
            ) : (
              <div className="space-y-1">
                <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide px-1 mb-2">
                  Recently Added (last 30 days)
                </p>
                {newItems.slice(0, 6).map((item: any) => {
                  const Icon = CATALOG_TYPE_ICONS[item.type] ?? Package;
                  return (
                    <div key={`${item.type}-${item.id}`} className="flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-muted/10 transition-colors">
                      <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <Icon className="w-3.5 h-3.5 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm text-foreground truncate">{item.name}</p>
                        <p className="text-xs text-muted-foreground">{CATALOG_TYPE_LABELS[item.type]}</p>
                      </div>
                      <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-300/30 flex-shrink-0">New</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </motion.div>

      </div>
    </AppLayout>
  );
}
