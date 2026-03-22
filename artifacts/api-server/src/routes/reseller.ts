import { Router, type IRouter, type Request, type Response, type NextFunction } from "express";
import { db } from "@workspace/db";
import { resellersTable, clientsTable, didsTable } from "@workspace/db";
import { eq, sql } from "drizzle-orm";

const router: IRouter = Router();

function requireReseller(req: Request, res: Response, next: NextFunction) {
  const session = req.session as any;
  if (!session.userId || session.userRole !== "reseller") {
    return res.status(401).json({ error: "Reseller access required" });
  }
  next();
}

router.use(requireReseller);

router.get("/stats", async (req, res) => {
  try {
    const resellerId = (req.session as any).userId;

    const [reseller] = await db.select().from(resellersTable).where(eq(resellersTable.id, resellerId));
    if (!reseller) return res.status(404).json({ error: "Reseller not found" });

    const [counts] = await db
      .select({
        total: sql<number>`count(*)::int`,
        active: sql<number>`count(*) filter (where status = 'active')::int`,
        revenue: sql<number>`coalesce(sum(monthly_fee::numeric), 0)::float`,
        totalExtensions: sql<number>`coalesce(sum(sip_extensions), 0)::int`,
      })
      .from(clientsTable)
      .where(eq(clientsTable.resellerId, resellerId));

    const monthlyRevenue = Number(counts.revenue || 0);
    const commissionEarned = monthlyRevenue * (Number(reseller.commissionRate) / 100);

    const [{ didCount }] = await db
      .select({ didCount: sql<number>`count(*)::int` })
      .from(didsTable)
      .where(eq(didsTable.resellerId, resellerId));

    return res.json({
      totalClients: counts.total,
      activeClients: counts.active,
      monthlyRevenue,
      commissionEarned,
      totalSipExtensions: counts.totalExtensions,
      assignedDids: didCount,
    });
  } catch (err) {
    console.error("Reseller stats error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/profile", async (req, res) => {
  try {
    const resellerId = (req.session as any).userId;
    const [reseller] = await db.select().from(resellersTable).where(eq(resellersTable.id, resellerId));
    if (!reseller) return res.status(404).json({ error: "Reseller not found" });

    const [counts] = await db
      .select({
        total: sql<number>`count(*)::int`,
        revenue: sql<number>`coalesce(sum(monthly_fee::numeric), 0)::float`,
      })
      .from(clientsTable)
      .where(eq(clientsTable.resellerId, resellerId));

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
    console.error("Reseller profile error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.put("/profile", async (req, res) => {
  try {
    const resellerId = (req.session as any).userId;
    const { companyName, contactName, email, phone, unitStreetNumber, buildingComplex, streetName, address, address2, city, province } = req.body;

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

    const [reseller] = await db.update(resellersTable).set(updateData).where(eq(resellersTable.id, resellerId)).returning();
    if (!reseller) return res.status(404).json({ error: "Reseller not found" });

    const [counts] = await db
      .select({
        total: sql<number>`count(*)::int`,
        revenue: sql<number>`coalesce(sum(monthly_fee::numeric), 0)::float`,
      })
      .from(clientsTable)
      .where(eq(clientsTable.resellerId, resellerId));

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
    console.error("Reseller update profile error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/clients", async (req, res) => {
  try {
    const resellerId = (req.session as any).userId;
    const clients = await db.select().from(clientsTable).where(eq(clientsTable.resellerId, resellerId));

    return res.json(
      clients.map((c) => ({
        id: c.id,
        resellerId: c.resellerId,
        resellerName: null,
        companyName: c.companyName,
        contactName: c.contactName,
        email: c.email,
        phone: c.phone,
        unitStreetNumber: c.unitStreetNumber,
        buildingComplex: c.buildingComplex,
        streetName: c.streetName,
        address: c.address,
        address2: c.address2,
        city: c.city,
        province: c.province,
        sipExtensions: c.sipExtensions,
        monthlyFee: Number(c.monthlyFee),
        status: c.status,
        notes: c.notes,
        createdAt: c.createdAt.toISOString(),
      }))
    );
  } catch (err) {
    console.error("Reseller get clients error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/clients", async (req, res) => {
  try {
    const resellerId = (req.session as any).userId;
    const { companyName, contactName, email, phone, unitStreetNumber, buildingComplex, streetName, address, address2, city, province, sipExtensions, monthlyFee, notes } = req.body;

    if (!companyName || !contactName || !email) {
      return res.status(400).json({ error: "Required fields missing" });
    }

    const [client] = await db
      .insert(clientsTable)
      .values({
        resellerId,
        companyName,
        contactName,
        email,
        phone,
        unitStreetNumber,
        buildingComplex,
        streetName,
        address,
        address2,
        city,
        province,
        sipExtensions: sipExtensions || 1,
        monthlyFee: String(monthlyFee || 0),
        notes,
        status: "active",
      })
      .returning();

    return res.status(201).json({
      id: client.id,
      resellerId: client.resellerId,
      resellerName: null,
      companyName: client.companyName,
      contactName: client.contactName,
      email: client.email,
      phone: client.phone,
      unitStreetNumber: client.unitStreetNumber,
      buildingComplex: client.buildingComplex,
      streetName: client.streetName,
      address: client.address,
      address2: client.address2,
      city: client.city,
      province: client.province,
      sipExtensions: client.sipExtensions,
      monthlyFee: Number(client.monthlyFee),
      status: client.status,
      notes: client.notes,
      createdAt: client.createdAt.toISOString(),
    });
  } catch (err) {
    console.error("Create client error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/clients/:id", async (req, res) => {
  try {
    const resellerId = (req.session as any).userId;
    const id = parseInt(req.params.id);

    const [client] = await db
      .select()
      .from(clientsTable)
      .where(eq(clientsTable.id, id));

    if (!client || client.resellerId !== resellerId) {
      return res.status(404).json({ error: "Client not found" });
    }

    return res.json({
      id: client.id,
      resellerId: client.resellerId,
      resellerName: null,
      companyName: client.companyName,
      contactName: client.contactName,
      email: client.email,
      phone: client.phone,
      unitStreetNumber: client.unitStreetNumber,
      buildingComplex: client.buildingComplex,
      streetName: client.streetName,
      address: client.address,
      address2: client.address2,
      city: client.city,
      province: client.province,
      sipExtensions: client.sipExtensions,
      monthlyFee: Number(client.monthlyFee),
      status: client.status,
      notes: client.notes,
      createdAt: client.createdAt.toISOString(),
    });
  } catch (err) {
    console.error("Get client error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.put("/clients/:id", async (req, res) => {
  try {
    const resellerId = (req.session as any).userId;
    const id = parseInt(req.params.id);

    const [existing] = await db.select().from(clientsTable).where(eq(clientsTable.id, id));
    if (!existing || existing.resellerId !== resellerId) {
      return res.status(404).json({ error: "Client not found" });
    }

    const { companyName, contactName, email, phone, unitStreetNumber, buildingComplex, streetName, address, address2, city, province, sipExtensions, monthlyFee, status, notes } = req.body;
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
    if (sipExtensions !== undefined) updateData.sipExtensions = sipExtensions;
    if (monthlyFee !== undefined) updateData.monthlyFee = String(monthlyFee);
    if (status !== undefined) updateData.status = status;
    if (notes !== undefined) updateData.notes = notes;

    const [client] = await db.update(clientsTable).set(updateData).where(eq(clientsTable.id, id)).returning();

    return res.json({
      id: client.id,
      resellerId: client.resellerId,
      resellerName: null,
      companyName: client.companyName,
      contactName: client.contactName,
      email: client.email,
      phone: client.phone,
      unitStreetNumber: client.unitStreetNumber,
      buildingComplex: client.buildingComplex,
      streetName: client.streetName,
      address: client.address,
      address2: client.address2,
      city: client.city,
      province: client.province,
      sipExtensions: client.sipExtensions,
      monthlyFee: Number(client.monthlyFee),
      status: client.status,
      notes: client.notes,
      createdAt: client.createdAt.toISOString(),
    });
  } catch (err) {
    console.error("Update client error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/clients/:id", async (req, res) => {
  try {
    const resellerId = (req.session as any).userId;
    const id = parseInt(req.params.id);

    const [existing] = await db.select().from(clientsTable).where(eq(clientsTable.id, id));
    if (!existing || existing.resellerId !== resellerId) {
      return res.status(404).json({ error: "Client not found" });
    }

    await db.delete(clientsTable).where(eq(clientsTable.id, id));
    return res.json({ success: true, message: "Client deleted" });
  } catch (err) {
    console.error("Delete client error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// ── Domain Availability Check ────────────────────────────────────────────────

router.get("/check-domain", async (req, res) => {
  const domain = (req.query.domain as string || "").trim().toLowerCase();
  if (!domain || !/^[a-z0-9][a-z0-9\-\.]{1,61}[a-z0-9]\.[a-z]{2,}$/.test(domain)) {
    return res.status(400).json({ error: "Invalid domain name" });
  }
  try {
    const rdapUrl = `https://rdap.org/domain/${domain}`;
    const response = await fetch(rdapUrl, {
      headers: { Accept: "application/rdap+json" },
      signal: AbortSignal.timeout(8000),
    });
    if (response.status === 404) {
      return res.json({ domain, available: true, status: "available" });
    }
    if (response.ok) {
      const data = await response.json() as any;
      const regStatus = data.status ?? [];
      return res.json({
        domain,
        available: false,
        status: "registered",
        registrar: data.entities?.find((e: any) => e.roles?.includes("registrar"))?.vcardArray?.[1]?.find((f: any) => f[0] === "fn")?.[3] ?? null,
        expiresAt: data.events?.find((e: any) => e.eventAction === "expiration")?.eventDate ?? null,
        registrationStatus: Array.isArray(regStatus) ? regStatus.join(", ") : regStatus,
      });
    }
    return res.json({ domain, available: false, status: "unknown" });
  } catch (err: any) {
    if (err?.name === "TimeoutError") {
      return res.json({ domain, available: false, status: "timeout" });
    }
    console.error("Domain check error:", err);
    return res.status(500).json({ error: "Domain check failed" });
  }
});

export default router;
