import { Router, type IRouter, type Request, type Response, type NextFunction } from "express";
import { db } from "@workspace/db";
import { ordersTable, orderItemsTable, resellersTable, didsTable, adminsTable, clientsTable } from "@workspace/db";
import { eq, desc, sql, and, inArray } from "drizzle-orm";
import { sendOrderEmails } from "../lib/email";

const router: IRouter = Router();

function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const session = req.session as any;
  if (!session.userId || session.userRole !== "admin") {
    return res.status(401).json({ error: "Admin access required" });
  }
  next();
}

function requireReseller(req: Request, res: Response, next: NextFunction) {
  const session = req.session as any;
  if (!session.userId || session.userRole !== "reseller") {
    return res.status(401).json({ error: "Reseller access required" });
  }
  next();
}

function serializeOrder(o: any) {
  return {
    ...o,
    totalExclVat: Number(o.totalExclVat ?? 0),
    totalInclVat: Number(o.totalInclVat ?? 0),
    createdAt: o.createdAt instanceof Date ? o.createdAt.toISOString() : o.createdAt,
    updatedAt: o.updatedAt instanceof Date ? o.updatedAt.toISOString() : o.updatedAt,
  };
}

function serializeItem(i: any) {
  return {
    ...i,
    unitPriceExclVat: Number(i.unitPriceExclVat ?? 0),
    unitPriceInclVat: Number(i.unitPriceInclVat ?? 0),
    lineTotal: Number(i.lineTotal ?? 0),
    createdAt: i.createdAt instanceof Date ? i.createdAt.toISOString() : i.createdAt,
  };
}

// ── Admin: list all orders ────────────────────────────────────────────────────

router.get("/admin/orders", requireAdmin, async (req, res) => {
  try {
    const { status } = req.query;
    const rows = await db
      .select({
        id: ordersTable.id,
        resellerId: ordersTable.resellerId,
        resellerName: resellersTable.companyName,
        resellerEmail: resellersTable.email,
        status: ordersTable.status,
        notes: ordersTable.notes,
        adminNotes: ordersTable.adminNotes,
        totalExclVat: ordersTable.totalExclVat,
        totalInclVat: ordersTable.totalInclVat,
        itemCount: sql<number>`(select count(*) from order_items where order_id = ${ordersTable.id})::int`,
        createdAt: ordersTable.createdAt,
        updatedAt: ordersTable.updatedAt,
      })
      .from(ordersTable)
      .leftJoin(resellersTable, eq(ordersTable.resellerId, resellersTable.id))
      .where(status ? eq(ordersTable.status, String(status)) : undefined)
      .orderBy(desc(ordersTable.createdAt));
    return res.json(rows.map(serializeOrder));
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// ── Admin: get order detail with items ───────────────────────────────────────

router.get("/admin/orders/:id", requireAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const [order] = await db
      .select({
        id: ordersTable.id,
        resellerId: ordersTable.resellerId,
        resellerName: resellersTable.companyName,
        resellerEmail: resellersTable.email,
        status: ordersTable.status,
        notes: ordersTable.notes,
        adminNotes: ordersTable.adminNotes,
        totalExclVat: ordersTable.totalExclVat,
        totalInclVat: ordersTable.totalInclVat,
        createdAt: ordersTable.createdAt,
        updatedAt: ordersTable.updatedAt,
      })
      .from(ordersTable)
      .leftJoin(resellersTable, eq(ordersTable.resellerId, resellersTable.id))
      .where(eq(ordersTable.id, id));
    if (!order) return res.status(404).json({ error: "Order not found" });
    const items = await db
      .select()
      .from(orderItemsTable)
      .where(eq(orderItemsTable.orderId, id));
    return res.json({ ...serializeOrder(order), items: items.map(serializeItem) });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// ── Admin: update order status ────────────────────────────────────────────────

router.put("/admin/orders/:id/status", requireAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { status, adminNotes } = req.body;
    const allowed = ["pending", "processing", "completed", "cancelled"];
    if (!allowed.includes(status)) {
      return res.status(400).json({ error: "Invalid status" });
    }

    // Fetch current order + DID items before updating
    const [order] = await db.select().from(ordersTable).where(eq(ordersTable.id, id));
    if (!order) return res.status(404).json({ error: "Order not found" });

    const didItems = await db
      .select()
      .from(orderItemsTable)
      .where(and(eq(orderItemsTable.orderId, id), eq(orderItemsTable.itemType, "did")));

    if (status === "cancelled") {
      // Release any reserved DIDs back to available
      for (const item of didItems) {
        if (item.referenceId) {
          await db
            .update(didsTable)
            .set({ status: "available", reservedByOrderId: null })
            .where(and(eq(didsTable.id, item.referenceId), eq(didsTable.status, "reserved")));
        }
      }
    } else if (status === "completed") {
      // Assign reserved DIDs to the reseller
      for (const item of didItems) {
        if (item.referenceId) {
          await db
            .update(didsTable)
            .set({
              status: "assigned",
              resellerId: order.resellerId,
              assignedAt: new Date(),
              reservedByOrderId: null,
            })
            .where(eq(didsTable.id, item.referenceId));
        }
      }
    }

    const upd: any = { status, updatedAt: new Date() };
    if (adminNotes !== undefined) upd.adminNotes = adminNotes;
    const [updated] = await db
      .update(ordersTable)
      .set(upd)
      .where(eq(ordersTable.id, id))
      .returning();
    if (!updated) return res.status(404).json({ error: "Order not found" });
    return res.json(serializeOrder(updated));
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// ── Reseller: list my orders ──────────────────────────────────────────────────

router.get("/orders", requireReseller, async (req, res) => {
  try {
    const session = req.session as any;
    const rows = await db
      .select({
        id: ordersTable.id,
        resellerId: ordersTable.resellerId,
        clientId: ordersTable.clientId,
        clientName: clientsTable.companyName,
        status: ordersTable.status,
        notes: ordersTable.notes,
        adminNotes: ordersTable.adminNotes,
        totalExclVat: ordersTable.totalExclVat,
        totalInclVat: ordersTable.totalInclVat,
        itemCount: sql<number>`(select count(*) from order_items where order_id = ${ordersTable.id})::int`,
        createdAt: ordersTable.createdAt,
        updatedAt: ordersTable.updatedAt,
      })
      .from(ordersTable)
      .leftJoin(clientsTable, eq(ordersTable.clientId, clientsTable.id))
      .where(eq(ordersTable.resellerId, session.userId))
      .orderBy(desc(ordersTable.createdAt));
    return res.json(rows.map(serializeOrder));
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// ── Reseller: get order detail ────────────────────────────────────────────────

router.get("/orders/:id", requireReseller, async (req, res) => {
  try {
    const session = req.session as any;
    const id = parseInt(req.params.id);
    const [order] = await db
      .select()
      .from(ordersTable)
      .where(eq(ordersTable.id, id));
    if (!order || order.resellerId !== session.userId) {
      return res.status(404).json({ error: "Order not found" });
    }
    const items = await db
      .select()
      .from(orderItemsTable)
      .where(eq(orderItemsTable.orderId, id));
    return res.json({ ...serializeOrder(order), items: items.map(serializeItem) });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// ── Reseller: place new order ─────────────────────────────────────────────────

router.post("/orders", requireReseller, async (req, res) => {
  try {
    const session = req.session as any;
    const { notes, items, clientId } = req.body;
    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: "Order must have at least one item" });
    }

    let totalExclVat = 0;
    let totalInclVat = 0;
    for (const item of items) {
      const qty = item.quantity || 1;
      const excl = Number(item.unitPriceExclVat || 0);
      const incl = Number(item.unitPriceInclVat || excl * 1.15);
      totalExclVat += excl * qty;
      totalInclVat += incl * qty;
    }

    const [order] = await db
      .insert(ordersTable)
      .values({
        resellerId: session.userId,
        clientId: clientId ? parseInt(clientId) : null,
        status: "pending",
        notes: notes || null,
        totalExclVat: totalExclVat.toFixed(2),
        totalInclVat: totalInclVat.toFixed(2),
      })
      .returning();

    const itemRows = items.map((item: any) => {
      const qty = item.quantity || 1;
      const excl = Number(item.unitPriceExclVat || 0);
      const incl = Number(item.unitPriceInclVat || excl * 1.15);
      return {
        orderId: order.id,
        itemType: item.itemType || "product",
        referenceId: item.referenceId || null,
        name: item.name,
        sku: item.sku || null,
        quantity: qty,
        unitPriceExclVat: excl.toFixed(2),
        unitPriceInclVat: incl.toFixed(2),
        lineTotal: (incl * qty).toFixed(2),
      };
    });

    const savedItems = await db.insert(orderItemsTable).values(itemRows).returning();

    // Reserve any DIDs included in this order
    const didItems = savedItems.filter((item) => item.itemType === "did" && item.referenceId);
    for (const didItem of didItems) {
      const updated = await db
        .update(didsTable)
        .set({ status: "reserved", reservedByOrderId: order.id })
        .where(and(eq(didsTable.id, didItem.referenceId!), eq(didsTable.status, "available")))
        .returning();
      if (updated.length === 0) {
        // DID was not available — rollback by deleting the order
        await db.delete(ordersTable).where(eq(ordersTable.id, order.id));
        return res.status(409).json({ error: `DID ${didItem.name} is no longer available` });
      }
    }

    // Send order notification emails (non-blocking)
    try {
      const [reseller] = await db.select().from(resellersTable).where(eq(resellersTable.id, session.userId));
      const adminRows = await db.select({ email: adminsTable.email }).from(adminsTable).where(eq(adminsTable.isActive, true));
      const adminEmails = adminRows.map(r => r.email).filter(Boolean) as string[];

      await sendOrderEmails(
        {
          orderId: order.id,
          resellerName: reseller?.companyName ?? "Reseller",
          resellerEmail: reseller?.email ?? "",
          notes: order.notes,
          items: savedItems.map(i => ({
            name: i.name,
            itemType: i.itemType,
            quantity: i.quantity,
            unitPriceExclVat: Number(i.unitPriceExclVat),
            unitPriceInclVat: Number(i.unitPriceInclVat),
            lineTotal: Number(i.lineTotal),
          })),
          totalExclVat: totalExclVat,
          totalInclVat: totalInclVat,
        },
        adminEmails,
      );
    } catch (emailErr) {
      console.error("[email] Failed to send order emails:", emailErr);
    }

    return res.status(201).json({
      ...serializeOrder(order),
      items: savedItems.map(serializeItem),
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// ── Reseller: get active services for a specific client ───────────────────────

router.get("/clients/:clientId/services", requireReseller, async (req, res) => {
  try {
    const session = req.session as any;
    const clientId = parseInt(req.params.clientId);

    // Verify the client belongs to this reseller
    const [client] = await db
      .select()
      .from(clientsTable)
      .where(and(eq(clientsTable.id, clientId), eq(clientsTable.resellerId, session.userId)));
    if (!client) return res.status(404).json({ error: "Client not found" });

    // Get all completed orders for this client
    const completedOrders = await db
      .select({ id: ordersTable.id })
      .from(ordersTable)
      .where(and(
        eq(ordersTable.clientId, clientId),
        eq(ordersTable.resellerId, session.userId),
        eq(ordersTable.status, "completed"),
      ));

    if (completedOrders.length === 0) return res.json([]);

    const orderIds = completedOrders.map(o => o.id);
    const items = await db
      .select({
        id: orderItemsTable.id,
        orderId: orderItemsTable.orderId,
        itemType: orderItemsTable.itemType,
        referenceId: orderItemsTable.referenceId,
        name: orderItemsTable.name,
        sku: orderItemsTable.sku,
        quantity: orderItemsTable.quantity,
        unitPriceExclVat: orderItemsTable.unitPriceExclVat,
        unitPriceInclVat: orderItemsTable.unitPriceInclVat,
        lineTotal: orderItemsTable.lineTotal,
        createdAt: orderItemsTable.createdAt,
      })
      .from(orderItemsTable)
      .where(inArray(orderItemsTable.orderId, orderIds))
      .orderBy(orderItemsTable.itemType, orderItemsTable.name);

    return res.json(items.map(serializeItem));
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
