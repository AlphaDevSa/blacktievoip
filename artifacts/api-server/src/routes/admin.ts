import { Router, type IRouter, type Request, type Response, type NextFunction } from "express";
import bcrypt from "bcryptjs";
import { db } from "@workspace/db";
import { adminsTable, resellersTable, clientsTable } from "@workspace/db";
import { eq, sql, ne } from "drizzle-orm";

const router: IRouter = Router();

function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const session = req.session as any;
  if (!session.userId || session.userRole !== "admin") {
    return res.status(401).json({ error: "Admin access required" });
  }
  next();
}

router.use(requireAdmin);

router.get("/stats", async (_req, res) => {
  try {
    const [resellerCounts] = await db
      .select({
        total: sql<number>`count(*)::int`,
        active: sql<number>`count(*) filter (where status = 'active')::int`,
      })
      .from(resellersTable);

    const [clientCounts] = await db
      .select({
        total: sql<number>`count(*)::int`,
        active: sql<number>`count(*) filter (where status = 'active')::int`,
        totalRevenue: sql<number>`coalesce(sum(monthly_fee::numeric), 0)::float`,
      })
      .from(clientsTable);

    const totalRevenue = Number(clientCounts.totalRevenue || 0);
    
    // Approximate commissions: each reseller's commission rate applied to their clients' revenue
    const [commissionData] = await db
      .select({
        totalCommissions: sql<number>`coalesce(sum("clients"."monthly_fee"::numeric * "resellers"."commission_rate"::numeric / 100), 0)::float`,
      })
      .from(clientsTable)
      .leftJoin(resellersTable, eq(clientsTable.resellerId, resellersTable.id));

    return res.json({
      totalResellers: resellerCounts.total,
      activeResellers: resellerCounts.active,
      totalClients: clientCounts.total,
      activeClients: clientCounts.active,
      totalMonthlyRevenue: totalRevenue,
      totalCommissionsPaid: Number(commissionData?.totalCommissions || 0),
    });
  } catch (err) {
    console.error("Admin stats error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/resellers", async (_req, res) => {
  try {
    const resellers = await db
      .select()
      .from(resellersTable)
      .where(ne(resellersTable.status, "pending"));

    const result = await Promise.all(
      resellers.map(async (r) => {
        const [counts] = await db
          .select({
            total: sql<number>`count(*)::int`,
            revenue: sql<number>`coalesce(sum(monthly_fee::numeric), 0)::float`,
          })
          .from(clientsTable)
          .where(eq(clientsTable.resellerId, r.id));

        return {
          id: r.id,
          companyName: r.companyName,
          contactName: r.contactName,
          email: r.email,
          phone: r.phone,
          unitStreetNumber: r.unitStreetNumber,
          buildingComplex: r.buildingComplex,
          streetName: r.streetName,
          address: r.address,
          address2: r.address2,
          city: r.city,
          province: r.province,
          commissionRate: Number(r.commissionRate),
          status: r.status,
          totalClients: counts.total,
          monthlyRevenue: Number(counts.revenue),
          createdAt: r.createdAt.toISOString(),
        };
      })
    );

    return res.json(result);
  } catch (err) {
    console.error("Get resellers error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/resellers", async (req, res) => {
  try {
    const { companyName, contactName, email, password, phone, unitStreetNumber, buildingComplex, streetName, address, address2, city, province, commissionRate } = req.body;
    if (!companyName || !contactName || !email || !password) {
      return res.status(400).json({ error: "Required fields missing" });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const [reseller] = await db
      .insert(resellersTable)
      .values({
        companyName,
        contactName,
        email,
        passwordHash,
        phone,
        unitStreetNumber,
        buildingComplex,
        streetName,
        address,
        address2,
        city,
        province,
        commissionRate: String(commissionRate || 15),
        status: "active",
      })
      .returning();

    return res.status(201).json({
      id: reseller.id,
      companyName: reseller.companyName,
      contactName: reseller.contactName,
      email: reseller.email,
      phone: reseller.phone,
      unitStreetNumber: reseller.unitStreetNumber,
      buildingComplex: reseller.buildingComplex,
      streetName: reseller.streetName,
      address: reseller.address,
      address2: reseller.address2,
      city: reseller.city,
      province: reseller.province,
      commissionRate: Number(reseller.commissionRate),
      status: reseller.status,
      totalClients: 0,
      monthlyRevenue: 0,
      createdAt: reseller.createdAt.toISOString(),
    });
  } catch (err: any) {
    console.error("Create reseller error:", err);
    if (err.code === "23505") return res.status(400).json({ error: "Email already exists" });
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/resellers/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const [reseller] = await db.select().from(resellersTable).where(eq(resellersTable.id, id));
    if (!reseller) return res.status(404).json({ error: "Reseller not found" });

    const [counts] = await db
      .select({
        total: sql<number>`count(*)::int`,
        revenue: sql<number>`coalesce(sum(monthly_fee::numeric), 0)::float`,
      })
      .from(clientsTable)
      .where(eq(clientsTable.resellerId, id));

    return res.json({
      id: reseller.id,
      companyName: reseller.companyName,
      contactName: reseller.contactName,
      email: reseller.email,
      phone: reseller.phone,
      unitStreetNumber: reseller.unitStreetNumber,
      buildingComplex: reseller.buildingComplex,
      streetName: reseller.streetName,
      address: reseller.address,
      address2: reseller.address2,
      city: reseller.city,
      province: reseller.province,
      commissionRate: Number(reseller.commissionRate),
      status: reseller.status,
      totalClients: counts.total,
      monthlyRevenue: Number(counts.revenue),
      createdAt: reseller.createdAt.toISOString(),
    });
  } catch (err) {
    console.error("Get reseller error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.put("/resellers/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { companyName, contactName, email, phone, unitStreetNumber, buildingComplex, streetName, address, address2, city, province, commissionRate, status } = req.body;

    const updateData: any = {};
    if (companyName !== undefined) updateData.companyName = companyName;
    if (contactName !== undefined) updateData.contactName = contactName;
    if (email !== undefined) updateData.email = email;
    if (phone !== undefined) updateData.phone = phone;
    if (unitStreetNumber !== undefined) updateData.unitStreetNumber = unitStreetNumber;
    if (buildingComplex !== undefined) updateData.buildingComplex = buildingComplex;
    if (streetName !== undefined) updateData.streetName = streetName;
    if (address !== undefined) updateData.address = address;
    if (address2 !== undefined) updateData.address2 = address2;
    if (city !== undefined) updateData.city = city;
    if (province !== undefined) updateData.province = province;
    if (commissionRate !== undefined) updateData.commissionRate = String(commissionRate);
    if (status !== undefined) updateData.status = status;

    const [reseller] = await db.update(resellersTable).set(updateData).where(eq(resellersTable.id, id)).returning();
    if (!reseller) return res.status(404).json({ error: "Reseller not found" });

    const [counts] = await db
      .select({
        total: sql<number>`count(*)::int`,
        revenue: sql<number>`coalesce(sum(monthly_fee::numeric), 0)::float`,
      })
      .from(clientsTable)
      .where(eq(clientsTable.resellerId, id));

    return res.json({
      id: reseller.id,
      companyName: reseller.companyName,
      contactName: reseller.contactName,
      email: reseller.email,
      phone: reseller.phone,
      unitStreetNumber: reseller.unitStreetNumber,
      buildingComplex: reseller.buildingComplex,
      streetName: reseller.streetName,
      address: reseller.address,
      address2: reseller.address2,
      city: reseller.city,
      province: reseller.province,
      commissionRate: Number(reseller.commissionRate),
      status: reseller.status,
      totalClients: counts.total,
      monthlyRevenue: Number(counts.revenue),
      createdAt: reseller.createdAt.toISOString(),
    });
  } catch (err) {
    console.error("Update reseller error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/resellers/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await db.delete(clientsTable).where(eq(clientsTable.resellerId, id));
    await db.delete(resellersTable).where(eq(resellersTable.id, id));
    return res.json({ success: true, message: "Reseller deleted" });
  } catch (err) {
    console.error("Delete reseller error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// ── Reseller Applications ──────────────────────────────────────────────────────

router.get("/reseller-applications", async (_req, res) => {
  try {
    const pending = await db
      .select({
        id: resellersTable.id,
        companyName: resellersTable.companyName,
        contactName: resellersTable.contactName,
        email: resellersTable.email,
        phone: resellersTable.phone,
        status: resellersTable.status,
        createdAt: resellersTable.createdAt,
      })
      .from(resellersTable)
      .where(eq(resellersTable.status, "pending"));

    return res.json(
      pending.map((r) => ({ ...r, createdAt: r.createdAt.toISOString() }))
    );
  } catch (err) {
    console.error("Get applications error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/reseller-applications/count", async (_req, res) => {
  try {
    const [row] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(resellersTable)
      .where(eq(resellersTable.status, "pending"));
    return res.json({ count: row.count });
  } catch (err) {
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.patch("/resellers/:id/approve", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { commissionRate } = req.body;
    const updateData: any = { status: "active" };
    if (commissionRate !== undefined) updateData.commissionRate = String(commissionRate);
    const [reseller] = await db
      .update(resellersTable)
      .set(updateData)
      .where(eq(resellersTable.id, id))
      .returning();
    if (!reseller) return res.status(404).json({ error: "Reseller not found" });
    return res.json({ success: true, reseller: { id: reseller.id, status: reseller.status } });
  } catch (err) {
    console.error("Approve reseller error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.patch("/resellers/:id/reject", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const [reseller] = await db
      .update(resellersTable)
      .set({ status: "rejected" })
      .where(eq(resellersTable.id, id))
      .returning();
    if (!reseller) return res.status(404).json({ error: "Reseller not found" });
    return res.json({ success: true, reseller: { id: reseller.id, status: reseller.status } });
  } catch (err) {
    console.error("Reject reseller error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/clients", async (_req, res) => {
  try {
    const clients = await db
      .select({
        id: clientsTable.id,
        resellerId: clientsTable.resellerId,
        resellerName: resellersTable.companyName,
        companyName: clientsTable.companyName,
        contactName: clientsTable.contactName,
        email: clientsTable.email,
        phone: clientsTable.phone,
        unitStreetNumber: clientsTable.unitStreetNumber,
        buildingComplex: clientsTable.buildingComplex,
        streetName: clientsTable.streetName,
        address: clientsTable.address,
        address2: clientsTable.address2,
        city: clientsTable.city,
        province: clientsTable.province,
        sipExtensions: clientsTable.sipExtensions,
        monthlyFee: clientsTable.monthlyFee,
        status: clientsTable.status,
        notes: clientsTable.notes,
        createdAt: clientsTable.createdAt,
      })
      .from(clientsTable)
      .leftJoin(resellersTable, eq(clientsTable.resellerId, resellersTable.id));

    return res.json(
      clients.map((c) => ({
        ...c,
        monthlyFee: Number(c.monthlyFee),
        createdAt: c.createdAt.toISOString(),
      }))
    );
  } catch (err) {
    console.error("Admin get clients error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
