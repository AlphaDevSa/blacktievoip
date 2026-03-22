import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { db } from "@workspace/db";
import { adminsTable } from "@workspace/db";
import app from "./app";

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

async function ensureAdminExists() {
  try {
    const existing = await db.select({ id: adminsTable.id }).from(adminsTable).where(eq(adminsTable.email, "admin@blacktievoip.co.za"));
    if (existing.length === 0) {
      const passwordHash = await bcrypt.hash("Admin1234!", 10);
      await db.insert(adminsTable).values({
        email: "admin@blacktievoip.co.za",
        passwordHash,
        name: "Super Admin",
        phone: "+27 11 000 0000",
        role: "admin",
        isActive: true,
      });
      console.log("Default admin account created: admin@blacktievoip.co.za");
    }
  } catch (err) {
    console.error("Failed to ensure admin exists:", err);
  }
}

ensureAdminExists().then(() => {
  app.listen(port, () => {
    console.log(`Server listening on port ${port}`);
  });
});
