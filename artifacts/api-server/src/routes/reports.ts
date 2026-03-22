import { Router } from "express";
import { db } from "@workspace/db";
import { ordersTable, resellersTable } from "@workspace/db";
import { sql, desc, eq, and, gte } from "drizzle-orm";

const router = Router();

function requireAdmin(req: any, res: any, next: any) {
  if (!req.session?.userId || req.session?.userRole !== "admin") {
    return res.status(401).json({ error: "Unauthorized" });
  }
  next();
}

// ── Summary stats ─────────────────────────────────────────────────────────────
router.get("/admin/reports/summary", requireAdmin, async (_req, res) => {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);

  const [totals] = await db
    .select({
      totalOrders: sql<number>`count(*)::int`,
      totalRevenue: sql<string>`coalesce(sum(total_incl_vat) filter (where status = 'completed'), 0)::numeric`,
      pendingCount: sql<number>`count(*) filter (where status = 'pending')::int`,
      processingCount: sql<number>`count(*) filter (where status = 'processing')::int`,
      completedCount: sql<number>`count(*) filter (where status = 'completed')::int`,
      cancelledCount: sql<number>`count(*) filter (where status = 'cancelled')::int`,
    })
    .from(ordersTable);

  const [thisMonth] = await db
    .select({
      orderCount: sql<number>`count(*)::int`,
      revenue: sql<string>`coalesce(sum(total_incl_vat), 0)::numeric`,
      completedRevenue: sql<string>`coalesce(sum(total_incl_vat) filter (where status = 'completed'), 0)::numeric`,
    })
    .from(ordersTable)
    .where(gte(ordersTable.createdAt, startOfMonth));

  const [lastMonth] = await db
    .select({
      orderCount: sql<number>`count(*)::int`,
      revenue: sql<string>`coalesce(sum(total_incl_vat), 0)::numeric`,
    })
    .from(ordersTable)
    .where(
      and(
        gte(ordersTable.createdAt, startOfLastMonth),
        sql`${ordersTable.createdAt} <= ${endOfLastMonth.toISOString()}`,
      ),
    );

  const [resellerCount] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(resellersTable)
    .where(eq(resellersTable.status, "active"));

  res.json({
    totalOrders: totals.totalOrders,
    totalRevenue: totals.totalRevenue,
    pendingCount: totals.pendingCount,
    processingCount: totals.processingCount,
    completedCount: totals.completedCount,
    cancelledCount: totals.cancelledCount,
    thisMonth: {
      orderCount: thisMonth.orderCount,
      revenue: thisMonth.revenue,
      completedRevenue: thisMonth.completedRevenue,
    },
    lastMonth: {
      orderCount: lastMonth.orderCount,
      revenue: lastMonth.revenue,
    },
    activeResellers: resellerCount.count,
  });
});

// ── Monthly breakdown (last 12 months) ────────────────────────────────────────
router.get("/admin/reports/monthly", requireAdmin, async (_req, res) => {
  const twelveMonthsAgo = new Date();
  twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 11);
  twelveMonthsAgo.setDate(1);
  twelveMonthsAgo.setHours(0, 0, 0, 0);

  const rows = await db
    .select({
      month: sql<string>`to_char(date_trunc('month', created_at), 'YYYY-MM')`,
      monthLabel: sql<string>`to_char(date_trunc('month', created_at), 'Mon YYYY')`,
      orderCount: sql<number>`count(*)::int`,
      totalRevenue: sql<string>`coalesce(sum(total_incl_vat), 0)::numeric`,
      completedRevenue: sql<string>`coalesce(sum(total_incl_vat) filter (where status = 'completed'), 0)::numeric`,
      pendingCount: sql<number>`count(*) filter (where status = 'pending')::int`,
      completedCount: sql<number>`count(*) filter (where status = 'completed')::int`,
      cancelledCount: sql<number>`count(*) filter (where status = 'cancelled')::int`,
    })
    .from(ordersTable)
    .where(gte(ordersTable.createdAt, twelveMonthsAgo))
    .groupBy(sql`date_trunc('month', created_at)`)
    .orderBy(sql`date_trunc('month', created_at)`);

  res.json(rows);
});

// ── Orders by status ──────────────────────────────────────────────────────────
router.get("/admin/reports/orders-by-status", requireAdmin, async (_req, res) => {
  const rows = await db
    .select({
      status: ordersTable.status,
      count: sql<number>`count(*)::int`,
      total: sql<string>`coalesce(sum(total_incl_vat), 0)::numeric`,
    })
    .from(ordersTable)
    .groupBy(ordersTable.status)
    .orderBy(desc(sql`count(*)`));

  res.json(rows);
});

// ── Reseller performance ──────────────────────────────────────────────────────
router.get("/admin/reports/resellers", requireAdmin, async (_req, res) => {
  const result = await db.execute(sql`
    SELECT
      r.id,
      r.company_name AS "companyName",
      r.contact_name AS "contactName",
      r.email,
      r.commission_rate AS "commissionRate",
      r.status,
      r.created_at AS "createdAt",
      count(o.id)::int AS "totalOrders",
      count(o.id) FILTER (WHERE o.status = 'completed')::int AS "completedOrders",
      count(o.id) FILTER (WHERE o.status = 'pending')::int AS "pendingOrders",
      coalesce(sum(o.total_incl_vat), 0)::numeric AS "totalRevenue",
      coalesce(sum(o.total_incl_vat) FILTER (WHERE o.status = 'completed'), 0)::numeric AS "completedRevenue"
    FROM resellers r
    LEFT JOIN orders o ON o.reseller_id = r.id
    GROUP BY r.id
    ORDER BY sum(o.total_incl_vat) DESC NULLS LAST
  `);
  res.json(result.rows);
});

export default router;
