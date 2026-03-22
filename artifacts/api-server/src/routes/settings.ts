import { Router, type IRouter, type Request, type Response, type NextFunction } from "express";
import bcrypt from "bcryptjs";
import nodemailer from "nodemailer";
import { db } from "@workspace/db";
import { adminsTable, companySettingsTable } from "@workspace/db";
import { eq, ne } from "drizzle-orm";

const router: IRouter = Router();

function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const session = req.session as any;
  if (!session.userId || session.userRole !== "admin") {
    return res.status(401).json({ error: "Admin access required" });
  }
  next();
}

router.use(requireAdmin);

// ── Staff ─────────────────────────────────────────────────────────────────────

function formatStaff(a: typeof adminsTable.$inferSelect) {
  return {
    id: a.id,
    name: a.name,
    email: a.email,
    phone: a.phone ?? null,
    role: a.role,
    isActive: a.isActive,
    createdAt: a.createdAt.toISOString(),
  };
}

router.get("/staff", async (_req, res) => {
  try {
    const staff = await db.select().from(adminsTable).orderBy(adminsTable.createdAt);
    return res.json(staff.map(formatStaff));
  } catch (err) {
    console.error("Get staff error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/staff", async (req, res) => {
  try {
    const { name, email, password, phone, role } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ error: "Name, email and password are required" });
    }
    const passwordHash = await bcrypt.hash(password, 10);
    const [staff] = await db
      .insert(adminsTable)
      .values({ name, email, passwordHash, phone: phone || null, role: role || "staff", isActive: true })
      .returning();
    return res.status(201).json(formatStaff(staff));
  } catch (err: any) {
    console.error("Create staff error:", err);
    if (err.code === "23505") return res.status(400).json({ error: "Email already exists" });
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.put("/staff/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { name, email, phone, role, isActive } = req.body;
    const update: any = {};
    if (name !== undefined) update.name = name;
    if (email !== undefined) update.email = email;
    if (phone !== undefined) update.phone = phone;
    if (role !== undefined) update.role = role;
    if (isActive !== undefined) update.isActive = isActive;

    const [staff] = await db.update(adminsTable).set(update).where(eq(adminsTable.id, id)).returning();
    if (!staff) return res.status(404).json({ error: "Staff member not found" });
    return res.json(formatStaff(staff));
  } catch (err: any) {
    console.error("Update staff error:", err);
    if (err.code === "23505") return res.status(400).json({ error: "Email already exists" });
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/staff/:id/reset-password", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { password } = req.body;
    if (!password || password.length < 6) {
      return res.status(400).json({ error: "Password must be at least 6 characters" });
    }
    const passwordHash = await bcrypt.hash(password, 10);
    const [staff] = await db
      .update(adminsTable)
      .set({ passwordHash })
      .where(eq(adminsTable.id, id))
      .returning();
    if (!staff) return res.status(404).json({ error: "Staff member not found" });
    return res.json({ success: true });
  } catch (err) {
    console.error("Reset password error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/staff/:id", async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const session = req.session as any;
    if (session.userId === id) {
      return res.status(400).json({ error: "Cannot delete your own account" });
    }
    const remaining = await db
      .select()
      .from(adminsTable)
      .where(ne(adminsTable.id, id));
    if (remaining.length === 0) {
      return res.status(400).json({ error: "Cannot delete the only admin account" });
    }
    await db.delete(adminsTable).where(eq(adminsTable.id, id));
    return res.json({ success: true });
  } catch (err) {
    console.error("Delete staff error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// ── Company Settings ───────────────────────────────────────────────────────────

async function ensureSettings() {
  const rows = await db.select().from(companySettingsTable).limit(1);
  if (rows.length === 0) {
    const [row] = await db.insert(companySettingsTable).values({}).returning();
    return row;
  }
  return rows[0];
}

router.get("/company-settings", async (_req, res) => {
  try {
    const settings = await ensureSettings();
    return res.json(settings);
  } catch (err) {
    console.error("Get company settings error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.put("/company-settings", async (req, res) => {
  try {
    const settings = await ensureSettings();
    const {
      companyName, email, phone, unitStreetNumber, buildingComplex, streetName, address, address2,
      city, province, postalCode, country, vatNumber, website, logoUrl, primaryColor,
      smtpHost, smtpPort, smtpUser, smtpPass, smtpFrom, smtpSecure,
      bankName, bankAccountHolder, bankAccountNumber, bankAccountType,
      bankBranchCode, bankSwiftCode, bankReference,
      didResellerPriceExclVat, didResellerPriceInclVat,
    } = req.body;

    const update: any = { updatedAt: new Date() };
    if (companyName !== undefined) update.companyName = companyName;
    if (email !== undefined) update.email = email;
    if (phone !== undefined) update.phone = phone;
    if (unitStreetNumber !== undefined) update.unitStreetNumber = unitStreetNumber;
    if (buildingComplex !== undefined) update.buildingComplex = buildingComplex;
    if (streetName !== undefined) update.streetName = streetName;
    if (address !== undefined) update.address = address;
    if (address2 !== undefined) update.address2 = address2;
    if (city !== undefined) update.city = city;
    if (province !== undefined) update.province = province;
    if (postalCode !== undefined) update.postalCode = postalCode;
    if (country !== undefined) update.country = country;
    if (vatNumber !== undefined) update.vatNumber = vatNumber;
    if (website !== undefined) update.website = website;
    if (logoUrl !== undefined) update.logoUrl = logoUrl;
    if (primaryColor !== undefined) update.primaryColor = primaryColor;
    if (smtpHost !== undefined) update.smtpHost = smtpHost || null;
    if (smtpPort !== undefined) update.smtpPort = smtpPort || "587";
    if (smtpUser !== undefined) update.smtpUser = smtpUser || null;
    if (smtpPass !== undefined) update.smtpPass = smtpPass || null;
    if (smtpFrom !== undefined) update.smtpFrom = smtpFrom || null;
    if (smtpSecure !== undefined) update.smtpSecure = Boolean(smtpSecure);
    if (bankName !== undefined) update.bankName = bankName || null;
    if (bankAccountHolder !== undefined) update.bankAccountHolder = bankAccountHolder || null;
    if (bankAccountNumber !== undefined) update.bankAccountNumber = bankAccountNumber || null;
    if (bankAccountType !== undefined) update.bankAccountType = bankAccountType || null;
    if (bankBranchCode !== undefined) update.bankBranchCode = bankBranchCode || null;
    if (bankSwiftCode !== undefined) update.bankSwiftCode = bankSwiftCode || null;
    if (bankReference !== undefined) update.bankReference = bankReference || null;
    if (didResellerPriceExclVat !== undefined) update.didResellerPriceExclVat = didResellerPriceExclVat != null && didResellerPriceExclVat !== "" ? String(didResellerPriceExclVat) : null;
    if (didResellerPriceInclVat !== undefined) update.didResellerPriceInclVat = didResellerPriceInclVat != null && didResellerPriceInclVat !== "" ? String(didResellerPriceInclVat) : null;

    const [updated] = await db
      .update(companySettingsTable)
      .set(update)
      .where(eq(companySettingsTable.id, settings.id))
      .returning();
    return res.json(updated);
  } catch (err) {
    console.error("Update company settings error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// ── Test SMTP ────────────────────────────────────────────────────────────────

router.post("/company-settings/test-smtp", async (req, res) => {
  try {
    const settings = await ensureSettings();

    const host = settings.smtpHost || process.env.SMTP_HOST;
    const port = parseInt(settings.smtpPort || process.env.SMTP_PORT || "587");
    const user = settings.smtpUser || process.env.SMTP_USER;
    const pass = settings.smtpPass || process.env.SMTP_PASS;
    const from = settings.smtpFrom || settings.smtpUser || process.env.SMTP_FROM || process.env.SMTP_USER;
    const secure = settings.smtpSecure ?? process.env.SMTP_SECURE === "true";

    if (!host || !user || !pass) {
      return res.status(400).json({ error: "SMTP is not fully configured. Please fill in Host, Username and Password." });
    }

    const toEmail = req.body.toEmail || settings.email || user;

    const transporter = nodemailer.createTransport({
      host,
      port,
      secure,
      auth: { user, pass },
    });

    await transporter.verify();
    await transporter.sendMail({
      from: `"Black Tie VoIP" <${from}>`,
      to: toEmail,
      subject: "✅ SMTP Test — Black Tie VoIP Portal",
      html: `
        <div style="font-family:'Segoe UI',Helvetica,Arial,sans-serif;max-width:480px;margin:0 auto;padding:32px;">
          <div style="background:#4BA3E3;border-radius:12px;padding:20px 24px;margin-bottom:24px;text-align:center;">
            <h1 style="margin:0;color:#fff;font-size:20px;font-weight:800;">Black Tie VoIP</h1>
            <p style="margin:4px 0 0;color:rgba(255,255,255,0.85);font-size:13px;">Reseller Portal</p>
          </div>
          <h2 style="color:#1e3a5f;font-size:18px;margin:0 0 12px;">SMTP Test Successful ✅</h2>
          <p style="color:#555;font-size:14px;margin:0 0 16px;">Your SMTP settings are working correctly. Order notification emails will be delivered to resellers and staff.</p>
          <table style="width:100%;border-collapse:collapse;font-size:13px;border:1px solid #eee;border-radius:8px;overflow:hidden;">
            <tr style="background:#f7f9fc;"><td style="padding:8px 12px;color:#888;font-weight:600;">Host</td><td style="padding:8px 12px;color:#333;">${host}</td></tr>
            <tr><td style="padding:8px 12px;color:#888;font-weight:600;">Port</td><td style="padding:8px 12px;color:#333;">${port}</td></tr>
            <tr style="background:#f7f9fc;"><td style="padding:8px 12px;color:#888;font-weight:600;">From</td><td style="padding:8px 12px;color:#333;">${from}</td></tr>
            <tr><td style="padding:8px 12px;color:#888;font-weight:600;">Secure (TLS)</td><td style="padding:8px 12px;color:#333;">${secure ? "Yes" : "No"}</td></tr>
          </table>
          <p style="color:#aaa;font-size:11px;margin:24px 0 0;text-align:center;">© ${new Date().getFullYear()} Black Tie VoIP. This is an automated test email.</p>
        </div>
      `,
    });

    return res.json({ success: true, message: `Test email sent to ${toEmail}` });
  } catch (err: any) {
    console.error("SMTP test error:", err);
    return res.status(400).json({ error: err.message ?? "SMTP test failed" });
  }
});

export default router;
