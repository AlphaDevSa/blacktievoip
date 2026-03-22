import { useAdminGetStats } from "@workspace/api-client-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { formatZar } from "@/lib/utils";
import { Building2, Users, CreditCard, ArrowUpRight } from "lucide-react";
import { motion } from "framer-motion";

export default function AdminDashboard() {
  const { data: stats, isLoading } = useAdminGetStats();

  if (isLoading) {
    return (
      <AppLayout role="admin" title="Dashboard">
        <div className="flex items-center justify-center h-64">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
        </div>
      </AppLayout>
    );
  }

  const statCards = [
    {
      title: "Total Resellers",
      value: stats?.totalResellers || 0,
      subValue: `${stats?.activeResellers || 0} active`,
      icon: Building2,
      color: "text-blue-400",
      bg: "bg-blue-500/10",
      border: "border-blue-500/20"
    },
    {
      title: "Total Clients",
      value: stats?.totalClients || 0,
      subValue: `${stats?.activeClients || 0} active`,
      icon: Users,
      color: "text-emerald-400",
      bg: "bg-emerald-500/10",
      border: "border-emerald-500/20"
    },
    {
      title: "Monthly Revenue",
      value: formatZar(stats?.totalMonthlyRevenue || 0),
      subValue: "Total across all resellers",
      icon: CreditCard,
      color: "text-purple-400",
      bg: "bg-purple-500/10",
      border: "border-purple-500/20"
    },
  ];

  return (
    <AppLayout role="admin" title="System Overview">
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

      {/* Decorative placeholder for future charts */}
      <div className="bg-card border border-border rounded-2xl p-6 shadow-lg shadow-black/10">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-display font-bold">Revenue Growth</h3>
          <select className="bg-background border border-border rounded-lg px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-primary/50">
            <option>Last 6 Months</option>
            <option>This Year</option>
          </select>
        </div>
        <div className="h-72 w-full bg-gradient-to-t from-primary/5 to-transparent rounded-xl border border-primary/10 flex items-center justify-center">
          <p className="text-muted-foreground font-medium flex items-center gap-2">
            <CreditCard className="w-5 h-5" /> Analytics module loading...
          </p>
        </div>
      </div>
    </AppLayout>
  );
}
