import { Router, type IRouter, type Request, type Response, type NextFunction } from "express";
import { db } from "@workspace/db";
import { areaCodesTable, didsTable, resellersTable, clientsTable, companySettingsTable } from "@workspace/db";
import { eq, sql, and, inArray } from "drizzle-orm";

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

function requireAuth(req: Request, res: Response, next: NextFunction) {
  const session = req.session as any;
  if (!session.userId) {
    return res.status(401).json({ error: "Authentication required" });
  }
  next();
}

function formatDid(d: any, ac?: any, reseller?: any) {
  return {
    id: d.id,
    areaCodeId: d.areaCodeId,
    areaCode: ac?.code ?? null,
    region: ac?.region ?? null,
    number: d.number,
    status: d.status,
    resellerId: d.resellerId,
    resellerName: reseller?.companyName ?? null,
    assignedAt: d.assignedAt ? d.assignedAt.toISOString() : null,
    reservedByOrderId: d.reservedByOrderId ?? null,
    notes: d.notes,
    createdAt: d.createdAt.toISOString(),
  };
}

// ── Admin: Area Codes ─────────────────────────────────────────────────────────

router.get("/admin/area-codes", requireAdmin, async (_req, res) => {
  try {
    const codes = await db.select().from(areaCodesTable).orderBy(areaCodesTable.code);
    const result = await Promise.all(
      codes.map(async (ac) => {
        const [stats] = await db
          .select({
            total: sql<number>`count(*)::int`,
            available: sql<number>`count(*) filter (where status = 'available')::int`,
            assigned: sql<number>`count(*) filter (where status = 'assigned')::int`,
          })
          .from(didsTable)
          .where(eq(didsTable.areaCodeId, ac.id));
        return {
          id: ac.id,
          code: ac.code,
          region: ac.region,
          province: ac.province,
          totalDids: stats.total,
          availableDids: stats.available,
          assignedDids: stats.assigned,
          createdAt: ac.createdAt.toISOString(),
        };
      })
    );
    return res.json(result);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/admin/area-codes", requireAdmin, async (req, res) => {
  try {
    const { code, region, province } = req.body;
    if (!code || !region || !province) return res.status(400).json({ error: "Code, region and province required" });
    const [ac] = await db.insert(areaCodesTable).values({ code, region, province }).returning();
    return res.status(201).json({ ...ac, totalDids: 0, availableDids: 0, assignedDids: 0, createdAt: ac.createdAt.toISOString() });
  } catch (err: any) {
    if (err.code === "23505") return res.status(400).json({ error: "Area code already exists" });
    console.error(err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.put("/admin/area-codes/:id", requireAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { code, region, province } = req.body;
    const upd: any = {};
    if (code !== undefined) upd.code = code;
    if (region !== undefined) upd.region = region;
    if (province !== undefined) upd.province = province;
    const [ac] = await db.update(areaCodesTable).set(upd).where(eq(areaCodesTable.id, id)).returning();
    if (!ac) return res.status(404).json({ error: "Not found" });
    return res.json({ ...ac, totalDids: 0, availableDids: 0, assignedDids: 0, createdAt: ac.createdAt.toISOString() });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/admin/area-codes/:id", requireAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await db.delete(areaCodesTable).where(eq(areaCodesTable.id, id));
    return res.json({ success: true, message: "Deleted" });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// ── Admin: DIDs ───────────────────────────────────────────────────────────────

router.get("/admin/dids", requireAdmin, async (req, res) => {
  try {
    const areaCodeIdFilter = req.query.areaCodeId ? parseInt(req.query.areaCodeId as string) : null;
    const statusFilter = req.query.status as string | null;
    const resellerIdFilter = req.query.resellerId ? parseInt(req.query.resellerId as string) : null;

    const dids = await db
      .select({
        id: didsTable.id,
        areaCodeId: didsTable.areaCodeId,
        areaCode: areaCodesTable.code,
        region: areaCodesTable.region,
        number: didsTable.number,
        status: didsTable.status,
        resellerId: didsTable.resellerId,
        resellerName: resellersTable.companyName,
        assignedAt: didsTable.assignedAt,
        reservedByOrderId: didsTable.reservedByOrderId,
        notes: didsTable.notes,
        createdAt: didsTable.createdAt,
      })
      .from(didsTable)
      .leftJoin(areaCodesTable, eq(didsTable.areaCodeId, areaCodesTable.id))
      .leftJoin(resellersTable, eq(didsTable.resellerId, resellersTable.id))
      .orderBy(areaCodesTable.code, didsTable.number);

    const filtered = dids.filter((d) => {
      if (areaCodeIdFilter && d.areaCodeId !== areaCodeIdFilter) return false;
      if (statusFilter && statusFilter !== "all" && d.status !== statusFilter) return false;
      if (resellerIdFilter && d.resellerId !== resellerIdFilter) return false;
      return true;
    });

    return res.json(
      filtered.map((d) => ({
        ...d,
        assignedAt: d.assignedAt ? d.assignedAt.toISOString() : null,
        reservedByOrderId: d.reservedByOrderId ?? null,
        createdAt: d.createdAt.toISOString(),
      }))
    );
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/admin/dids", requireAdmin, async (req, res) => {
  try {
    const { areaCodeId, number, notes } = req.body;
    if (!areaCodeId || !number) return res.status(400).json({ error: "Area code and number required" });
    const [did] = await db.insert(didsTable).values({ areaCodeId, number, notes, status: "available" }).returning();
    const [ac] = await db.select().from(areaCodesTable).where(eq(areaCodesTable.id, did.areaCodeId));
    return res.status(201).json(formatDid(did, ac));
  } catch (err: any) {
    if (err.code === "23505") return res.status(400).json({ error: "DID number already exists" });
    console.error(err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// ── Google Sheets CSV import ──────────────────────────────────────────────────

export function sheetsUrlToCsv(url: string): string {
  const match = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/);
  if (!match) throw new Error("Invalid Google Sheets URL — could not extract sheet ID");
  const id = match[1];
  const gidMatch = url.match(/[?&#]gid=(\d+)/);
  const gid = gidMatch ? gidMatch[1] : "0";
  return `https://docs.google.com/spreadsheets/d/${id}/export?format=csv&gid=${gid}`;
}

function parseSimpleCsv(text: string): string[][] {
  const rows: string[][] = [];
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line) continue;
    const fields: string[] = [];
    let cur = "";
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (inQuotes) {
        if (ch === '"' && line[i + 1] === '"') { cur += '"'; i++; }
        else if (ch === '"') inQuotes = false;
        else cur += ch;
      } else {
        if (ch === '"') inQuotes = true;
        else if (ch === ',') { fields.push(cur); cur = ""; }
        else cur += ch;
      }
    }
    fields.push(cur);
    rows.push(fields.map(f => f.trim()));
  }
  return rows;
}

function detectColumns(headers: string[]): Record<string, number> {
  const norm = headers.map(h => h.toLowerCase().replace(/[^a-z0-9]/g, ""));
  const find = (...names: string[]) => {
    for (const n of names) {
      const idx = norm.indexOf(n);
      if (idx !== -1) return idx;
    }
    return -1;
  };
  return {
    areaCode: find("areacode", "area_code", "code", "prefix", "dialcode"),
    number:   find("number", "did", "phone", "phonenumber", "telephone", "tel"),
    region:   find("region", "area", "city"),
    province: find("province", "state", "prov"),
    notes:    find("notes", "note", "comment", "comments"),
  };
}

// Reusable import function (also called by cron job)
export async function performGSheetsImport(url: string, dryRun = false): Promise<{
  ok: boolean; totalRows: number; created?: number; skipped?: number; areaCodesCreated?: number;
  sample?: object[]; headers?: string[]; error?: string;
}> {
  let csvUrl: string;
  try { csvUrl = sheetsUrlToCsv(url); } catch (e: any) { return { ok: false, totalRows: 0, error: e.message }; }

  let text: string;
  try {
    const resp = await fetch(csvUrl);
    if (!resp.ok) return { ok: false, totalRows: 0, error: `Could not fetch sheet (${resp.status}) — make sure it is publicly shared ("Anyone with the link can view")` };
    text = await resp.text();
  } catch {
    return { ok: false, totalRows: 0, error: "Network error fetching Google Sheet — check the URL and sharing settings" };
  }

  const rows = parseSimpleCsv(text);
  if (rows.length < 2) return { ok: false, totalRows: 0, error: "Sheet appears empty or has only a header row" };

  const headers = rows[0];
  const cols = detectColumns(headers);
  if (cols.areaCode === -1) return { ok: false, totalRows: 0, error: 'Sheet must have an "area_code" column (aliases: code, prefix)' };
  if (cols.number === -1)   return { ok: false, totalRows: 0, error: 'Sheet must have a "number" column (aliases: did, phone, telephone)' };

  const dataRows = rows.slice(1).filter(r => r[cols.areaCode] && r[cols.number]);
  if (dataRows.length === 0) return { ok: false, totalRows: 0, error: "No valid data rows found" };

  if (dryRun) {
    const sample = dataRows.slice(0, 5).map(r => ({
      areaCode: r[cols.areaCode], number: r[cols.number],
      region: cols.region >= 0 ? r[cols.region] : undefined,
      province: cols.province >= 0 ? r[cols.province] : undefined,
      notes: cols.notes >= 0 ? r[cols.notes] : undefined,
    }));
    return { ok: true, totalRows: dataRows.length, sample, headers };
  }

  let created = 0, skipped = 0, areaCodesCreated = 0;
  const areaCodeCache = new Map<string, number>();
  const existing = await db.select().from(areaCodesTable);
  for (const ac of existing) areaCodeCache.set(ac.code, ac.id);

  for (const row of dataRows) {
    const code     = row[cols.areaCode].trim();
    const number   = row[cols.number].trim();
    const region   = cols.region   >= 0 ? (row[cols.region]   || "").trim() : "";
    const province = cols.province >= 0 ? (row[cols.province] || "").trim() : "";
    const notes    = cols.notes    >= 0 ? (row[cols.notes]    || "").trim() : "";
    if (!code || !number) continue;

    let areaCodeId = areaCodeCache.get(code);
    if (!areaCodeId) {
      const [ac] = await db.insert(areaCodesTable).values({ code, region: region || code, province: province || "Unknown" }).returning();
      areaCodeId = ac.id;
      areaCodeCache.set(code, ac.id);
      areaCodesCreated++;
    }

    try {
      await db.insert(didsTable).values({ areaCodeId, number, notes: notes || undefined, status: "available" });
      created++;
    } catch (e: any) {
      if (e.code === "23505") skipped++;
      else throw e;
    }
  }

  return { ok: true, created, skipped, areaCodesCreated, totalRows: dataRows.length };
}

// ── Sheet config: get/save the scheduled import URL ──────────────────────────

router.get("/admin/dids/sheet-config", requireAdmin, async (_req, res) => {
  try {
    const [settings] = await db.select({
      didSheetUrl: companySettingsTable.didSheetUrl,
      didSheetEnabled: companySettingsTable.didSheetEnabled,
      didSheetLastRunAt: companySettingsTable.didSheetLastRunAt,
      didSheetLastRunResult: companySettingsTable.didSheetLastRunResult,
    }).from(companySettingsTable).limit(1);
    return res.json(settings ?? { didSheetUrl: null, didSheetEnabled: false, didSheetLastRunAt: null, didSheetLastRunResult: null });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.patch("/admin/dids/sheet-config", requireAdmin, async (req, res) => {
  try {
    const { didSheetUrl, didSheetEnabled } = req.body as { didSheetUrl?: string; didSheetEnabled?: boolean };
    const [settings] = await db.select({ id: companySettingsTable.id }).from(companySettingsTable).limit(1);
    if (!settings) return res.status(404).json({ error: "Company settings not found" });

    const updates: Record<string, unknown> = {};
    if (typeof didSheetUrl !== "undefined") updates.didSheetUrl = didSheetUrl || null;
    if (typeof didSheetEnabled !== "undefined") updates.didSheetEnabled = didSheetEnabled;

    const [updated] = await db.update(companySettingsTable)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(companySettingsTable.id, settings.id))
      .returning({
        didSheetUrl: companySettingsTable.didSheetUrl,
        didSheetEnabled: companySettingsTable.didSheetEnabled,
        didSheetLastRunAt: companySettingsTable.didSheetLastRunAt,
        didSheetLastRunResult: companySettingsTable.didSheetLastRunResult,
      });
    return res.json(updated);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/admin/dids/import-gsheets", requireAdmin, async (req, res) => {
  try {
    const { url, dryRun = false } = req.body as { url: string; dryRun?: boolean };
    if (!url) return res.status(400).json({ error: "Google Sheets URL is required" });
    const result = await performGSheetsImport(url, dryRun);
    if (!result.ok) return res.status(400).json({ error: result.error });
    return res.json(result);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/admin/dids/bulk", requireAdmin, async (req, res) => {
  try {
    const { areaCodeId, numbers } = req.body;
    if (!areaCodeId || !numbers?.length) return res.status(400).json({ error: "Area code and numbers required" });
    let created = 0;
    let skipped = 0;
    for (const number of numbers) {
      const trimmed = number.trim();
      if (!trimmed) continue;
      try {
        await db.insert(didsTable).values({ areaCodeId, number: trimmed, status: "available" });
        created++;
      } catch (e: any) {
        if (e.code === "23505") skipped++;
        else throw e;
      }
    }
    return res.status(201).json({ success: true, message: `Created ${created} DIDs, skipped ${skipped} duplicates` });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.put("/admin/dids/:id", requireAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { notes, status } = req.body;
    const upd: any = {};
    if (notes !== undefined) upd.notes = notes;
    if (status !== undefined) upd.status = status;
    const [did] = await db.update(didsTable).set(upd).where(eq(didsTable.id, id)).returning();
    if (!did) return res.status(404).json({ error: "Not found" });
    const [ac] = await db.select().from(areaCodesTable).where(eq(areaCodesTable.id, did.areaCodeId));
    return res.json(formatDid(did, ac));
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/admin/dids/:id", requireAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await db.delete(didsTable).where(eq(didsTable.id, id));
    return res.json({ success: true, message: "Deleted" });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/admin/dids/:id/assign", requireAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { resellerId } = req.body;
    if (!resellerId) return res.status(400).json({ error: "Reseller ID required" });
    const [did] = await db
      .update(didsTable)
      .set({ resellerId, status: "assigned", assignedAt: new Date() })
      .where(eq(didsTable.id, id))
      .returning();
    if (!did) return res.status(404).json({ error: "Not found" });
    const [ac] = await db.select().from(areaCodesTable).where(eq(areaCodesTable.id, did.areaCodeId));
    const [reseller] = await db.select().from(resellersTable).where(eq(resellersTable.id, resellerId));
    return res.json(formatDid(did, ac, reseller));
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/admin/dids/:id/unassign", requireAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const [did] = await db
      .update(didsTable)
      .set({ resellerId: null, status: "available", assignedAt: null })
      .where(eq(didsTable.id, id))
      .returning();
    if (!did) return res.status(404).json({ error: "Not found" });
    const [ac] = await db.select().from(areaCodesTable).where(eq(areaCodesTable.id, did.areaCodeId));
    return res.json(formatDid(did, ac));
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// ── Reseller: DIDs ────────────────────────────────────────────────────────────

router.get("/reseller/area-codes", requireReseller, async (_req, res) => {
  try {
    const codes = await db.select().from(areaCodesTable).orderBy(areaCodesTable.code);
    const result = await Promise.all(
      codes.map(async (ac) => {
        const [{ count }] = await db
          .select({ count: sql<number>`count(*)::int` })
          .from(didsTable)
          .where(and(eq(didsTable.areaCodeId, ac.id), eq(didsTable.status, "available")));
        return { id: ac.id, code: ac.code, region: ac.region, province: ac.province, availableCount: count };
      })
    );
    return res.json(result);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/reseller/dids/request-bulk", requireReseller, async (req, res) => {
  try {
    const resellerId = (req.session as any).userId;
    const { areaCodeId, quantity } = req.body;

    if (!areaCodeId || !quantity || quantity < 1) {
      return res.status(400).json({ error: "Area code and quantity are required" });
    }
    if (quantity > 50) {
      return res.status(400).json({ error: "Maximum 50 DIDs per request" });
    }

    const available = await db
      .select()
      .from(didsTable)
      .where(and(eq(didsTable.areaCodeId, areaCodeId), eq(didsTable.status, "available")))
      .limit(quantity)
      .orderBy(didsTable.number);

    if (available.length === 0) {
      return res.status(400).json({ error: "No available DIDs for this area code. Please contact your administrator." });
    }
    if (available.length < quantity) {
      return res.status(400).json({ error: `Only ${available.length} DID(s) available for this area code` });
    }

    const ids = available.map((d) => d.id);
    await db
      .update(didsTable)
      .set({ resellerId, status: "assigned", assignedAt: new Date() })
      .where(inArray(didsTable.id, ids));

    return res.json({
      success: true,
      message: `Successfully claimed ${available.length} DID(s)`,
      count: available.length,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/reseller/dids", requireReseller, async (req, res) => {
  try {
    const resellerId = (req.session as any).userId;
    const dids = await db
      .select({
        id: didsTable.id,
        areaCodeId: didsTable.areaCodeId,
        areaCode: areaCodesTable.code,
        region: areaCodesTable.region,
        province: areaCodesTable.province,
        number: didsTable.number,
        status: didsTable.status,
        resellerId: didsTable.resellerId,
        resellerName: resellersTable.companyName,
        clientId: didsTable.clientId,
        clientName: clientsTable.companyName,
        assignedAt: didsTable.assignedAt,
        notes: didsTable.notes,
        createdAt: didsTable.createdAt,
      })
      .from(didsTable)
      .leftJoin(areaCodesTable, eq(didsTable.areaCodeId, areaCodesTable.id))
      .leftJoin(resellersTable, eq(didsTable.resellerId, resellersTable.id))
      .leftJoin(clientsTable, eq(didsTable.clientId, clientsTable.id))
      .where(eq(didsTable.resellerId, resellerId))
      .orderBy(areaCodesTable.code, didsTable.number);

    return res.json(
      dids.map((d) => ({
        ...d,
        assignedAt: d.assignedAt ? d.assignedAt.toISOString() : null,
        createdAt: d.createdAt.toISOString(),
      }))
    );
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.put("/reseller/dids/:id/set-client", requireReseller, async (req, res) => {
  try {
    const resellerId = (req.session as any).userId;
    const id = parseInt(req.params.id);
    const { clientId } = req.body;

    const [existing] = await db.select().from(didsTable).where(and(eq(didsTable.id, id), eq(didsTable.resellerId, resellerId)));
    if (!existing) return res.status(404).json({ error: "DID not found" });

    if (clientId) {
      const [client] = await db.select().from(clientsTable).where(and(eq(clientsTable.id, clientId), eq(clientsTable.resellerId, resellerId)));
      if (!client) return res.status(400).json({ error: "Client not found" });
    }

    const [updated] = await db
      .update(didsTable)
      .set({ clientId: clientId || null })
      .where(eq(didsTable.id, id))
      .returning();

    return res.json({ id: updated.id, clientId: updated.clientId });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/reseller/dids/available", requireReseller, async (req, res) => {
  try {
    const areaCodeId = parseInt(req.query.areaCodeId as string);
    if (!areaCodeId) return res.status(400).json({ error: "areaCodeId required" });

    const dids = await db
      .select({
        id: didsTable.id,
        areaCodeId: didsTable.areaCodeId,
        areaCode: areaCodesTable.code,
        region: areaCodesTable.region,
        number: didsTable.number,
        status: didsTable.status,
        resellerId: didsTable.resellerId,
        assignedAt: didsTable.assignedAt,
        reservedByOrderId: didsTable.reservedByOrderId,
        notes: didsTable.notes,
        createdAt: didsTable.createdAt,
      })
      .from(didsTable)
      .leftJoin(areaCodesTable, eq(didsTable.areaCodeId, areaCodesTable.id))
      .where(and(eq(didsTable.areaCodeId, areaCodeId), eq(didsTable.status, "available")))
      .orderBy(didsTable.number);

    return res.json(
      dids.map((d) => ({
        ...d,
        assignedAt: d.assignedAt ? d.assignedAt.toISOString() : null,
        createdAt: d.createdAt.toISOString(),
      }))
    );
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/reseller/dids/:id/request", requireReseller, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const resellerId = (req.session as any).userId;

    const [existing] = await db.select().from(didsTable).where(eq(didsTable.id, id));
    if (!existing) return res.status(404).json({ error: "DID not found" });
    if (existing.status !== "available") return res.status(400).json({ error: "DID is not available" });

    const [did] = await db
      .update(didsTable)
      .set({ resellerId, status: "assigned", assignedAt: new Date() })
      .where(eq(didsTable.id, id))
      .returning();

    const [ac] = await db.select().from(areaCodesTable).where(eq(areaCodesTable.id, did.areaCodeId));
    const [reseller] = await db.select().from(resellersTable).where(eq(resellersTable.id, resellerId));
    return res.json(formatDid(did, ac, reseller));
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
