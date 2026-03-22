import { Router, type IRouter, type Request, type Response, type NextFunction } from "express";
import bcrypt from "bcryptjs";
import nodemailer from "nodemailer";
import { db } from "@workspace/db";
import { adminsTable, resellersTable, clientsTable, companySettingsTable } from "@workspace/db";
import { eq, sql, ne, inArray } from "drizzle-orm";

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

    return res.json({
      totalResellers: resellerCounts.total,
      activeResellers: resellerCounts.active,
      totalClients: clientCounts.total,
      activeClients: clientCounts.active,
      totalMonthlyRevenue: totalRevenue,
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
    const { companyName, contactName, email, password, phone, unitStreetNumber, buildingComplex, streetName, address, address2, city, province } = req.body;
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
    const { companyName, contactName, email, phone, unitStreetNumber, buildingComplex, streetName, address, address2, city, province, status } = req.body;

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
    const applications = await db
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
      .where(inArray(resellersTable.status, ["pending", "info_requested", "rejected"]));

    return res.json(
      applications.map((r) => ({ ...r, createdAt: r.createdAt.toISOString() }))
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
      .where(inArray(resellersTable.status, ["pending", "info_requested"]));
    return res.json({ count: row.count });
  } catch (err) {
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.patch("/resellers/:id/request-info", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { message } = req.body;
    if (!message?.trim()) {
      return res.status(400).json({ error: "Message is required" });
    }

    const [reseller] = await db
      .update(resellersTable)
      .set({ status: "info_requested" })
      .where(eq(resellersTable.id, id))
      .returning();
    if (!reseller) return res.status(404).json({ error: "Reseller not found" });

    // Send email via SMTP if configured
    const [settings] = await db.select().from(companySettingsTable).limit(1);
    if (settings) {
      const host = settings.smtpHost || process.env.SMTP_HOST;
      const port = parseInt(settings.smtpPort || process.env.SMTP_PORT || "587");
      const user = settings.smtpUser || process.env.SMTP_USER;
      const pass = settings.smtpPass || process.env.SMTP_PASS;
      const from = settings.smtpFrom || settings.smtpUser || process.env.SMTP_FROM || process.env.SMTP_USER;
      const secure = settings.smtpSecure ?? process.env.SMTP_SECURE === "true";
      const companyName = settings.companyName || "Black Tie VoIP";

      if (host && user && pass) {
        const transporter = nodemailer.createTransport({ host, port, secure, auth: { user, pass } });
        await transporter.sendMail({
          from: `"${companyName}" <${from}>`,
          to: reseller.email,
          subject: `Additional Information Required — ${companyName} Reseller Application`,
          html: `
            <div style="font-family:'Segoe UI',Helvetica,Arial,sans-serif;max-width:520px;margin:0 auto;padding:32px;">
              <div style="background:#4BA3E3;border-radius:12px;padding:20px 24px;margin-bottom:24px;text-align:center;">
                <h1 style="margin:0;color:#fff;font-size:20px;font-weight:800;">${companyName}</h1>
                <p style="margin:4px 0 0;color:rgba(255,255,255,0.85);font-size:13px;">Reseller Portal</p>
              </div>
              <h2 style="color:#1e3a5f;font-size:18px;margin:0 0 8px;">Hi ${reseller.contactName},</h2>
              <p style="color:#555;font-size:14px;margin:0 0 16px;">
                Thank you for your reseller application. We need a little more information before we can proceed with your review.
              </p>
              <div style="background:#f7f9fc;border-left:4px solid #4BA3E3;border-radius:6px;padding:16px 20px;margin-bottom:20px;">
                <p style="color:#333;font-size:14px;margin:0;white-space:pre-line;">${message.trim()}</p>
              </div>
              <p style="color:#555;font-size:14px;margin:0 0 8px;">
                Please reply to this email with the requested information and we will continue with your application.
              </p>
              <p style="color:#aaa;font-size:11px;margin:24px 0 0;text-align:center;">© ${new Date().getFullYear()} ${companyName}. This is an automated notification.</p>
            </div>
          `,
        });
      }
    }

    return res.json({ success: true });
  } catch (err) {
    console.error("Request info error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.patch("/resellers/:id/approve", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const [reseller] = await db
      .update(resellersTable)
      .set({ status: "active" })
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
