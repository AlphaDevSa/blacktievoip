import { Router, type IRouter } from "express";
import bcrypt from "bcryptjs";
import { db } from "@workspace/db";
import { adminsTable, resellersTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router: IRouter = Router();

router.post("/login", async (req, res) => {
  try {
    const { email, password, role } = req.body;
    if (!email || !password || !role) {
      return res.status(400).json({ error: "Email, password and role are required" });
    }

    if (role === "admin") {
      const [admin] = await db.select().from(adminsTable).where(eq(adminsTable.email, email));
      if (!admin) return res.status(401).json({ error: "Invalid credentials" });

      const valid = await bcrypt.compare(password, admin.passwordHash);
      if (!valid) return res.status(401).json({ error: "Invalid credentials" });

      await new Promise<void>((resolve, reject) =>
        req.session.regenerate(err => (err ? reject(err) : resolve()))
      );
      (req.session as any).userId = admin.id;
      (req.session as any).userRole = "admin";

      return res.json({
        success: true,
        role: "admin",
        user: { id: admin.id, email: admin.email, name: admin.name, role: "admin" },
      });
    } else if (role === "reseller") {
      const [reseller] = await db.select().from(resellersTable).where(eq(resellersTable.email, email));
      if (!reseller) return res.status(401).json({ error: "Invalid credentials" });

      const valid = await bcrypt.compare(password, reseller.passwordHash);
      if (!valid) return res.status(401).json({ error: "Invalid credentials" });

      if (reseller.status === "pending") {
        return res.status(403).json({ error: "Your application is pending admin approval. You will be notified once approved." });
      }
      if (reseller.status === "rejected") {
        return res.status(403).json({ error: "Your application was not approved. Please contact us for more information." });
      }
      if (reseller.status === "suspended") {
        return res.status(403).json({ error: "Account suspended. Contact admin." });
      }

      await new Promise<void>((resolve, reject) =>
        req.session.regenerate(err => (err ? reject(err) : resolve()))
      );
      (req.session as any).userId = reseller.id;
      (req.session as any).userRole = "reseller";

      return res.json({
        success: true,
        role: "reseller",
        user: { id: reseller.id, email: reseller.email, name: reseller.contactName, role: "reseller" },
      });
    } else {
      return res.status(400).json({ error: "Invalid role" });
    }
  } catch (err) {
    console.error("Login error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/register", async (req, res) => {
  try {
    const { companyName, contactName, email, password, phone } = req.body;
    if (!companyName || !contactName || !email || !password) {
      return res.status(400).json({ error: "Company name, contact name, email and password are required" });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: "Password must be at least 6 characters" });
    }

    const [existing] = await db.select({ id: resellersTable.id }).from(resellersTable).where(eq(resellersTable.email, email));
    if (existing) {
      return res.status(409).json({ error: "An account with this email already exists" });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    await db.insert(resellersTable).values({
      companyName,
      contactName,
      email,
      passwordHash,
      phone: phone || null,
      status: "pending",
      commissionRate: "15",
    });

    return res.json({ success: true, message: "Registration submitted. Your account is pending admin approval." });
  } catch (err) {
    console.error("Register error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/logout", (req, res) => {
  req.session.destroy(() => {
    res.json({ success: true, message: "Logged out" });
  });
});

router.get("/me", async (req, res) => {
  try {
    const session = req.session as any;
    if (!session.userId || !session.userRole) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    if (session.userRole === "admin") {
      const [admin] = await db.select().from(adminsTable).where(eq(adminsTable.id, session.userId));
      if (!admin) return res.status(401).json({ error: "Not authenticated" });
      return res.json({ id: admin.id, email: admin.email, name: admin.name, role: "admin" });
    } else {
      const [reseller] = await db.select().from(resellersTable).where(eq(resellersTable.id, session.userId));
      if (!reseller) return res.status(401).json({ error: "Not authenticated" });
      return res.json({ id: reseller.id, email: reseller.email, name: reseller.contactName, role: "reseller" });
    }
  } catch (err) {
    console.error("Me error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
