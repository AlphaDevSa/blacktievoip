import { ensureReferenceData } from "./ensureReferenceData";
import app from "./app";
import cron from "node-cron";
import { db, companySettingsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { performGSheetsImport } from "./routes/dids";

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

async function runScheduledSheetImport() {
  try {
    const [settings] = await db.select({
      id: companySettingsTable.id,
      didSheetUrl: companySettingsTable.didSheetUrl,
      didSheetEnabled: companySettingsTable.didSheetEnabled,
    }).from(companySettingsTable).limit(1);

    if (!settings?.didSheetEnabled || !settings.didSheetUrl) return;

    console.log("[cron] Running scheduled Google Sheets DID import...");
    const result = await performGSheetsImport(settings.didSheetUrl, false);

    const summary = result.ok
      ? `created: ${result.created ?? 0}, skipped: ${result.skipped ?? 0}, areaCodes: ${result.areaCodesCreated ?? 0}`
      : `error: ${result.error}`;

    await db.update(companySettingsTable)
      .set({ didSheetLastRunAt: new Date(), didSheetLastRunResult: summary })
      .where(eq(companySettingsTable.id, settings.id));

    console.log(`[cron] Sheet import done — ${summary}`);
  } catch (err) {
    console.error("[cron] Sheet import failed:", err);
  }
}

ensureReferenceData().then(() => {
  app.listen(port, () => {
    console.log(`Server listening on port ${port}`);
  });

  // Run Google Sheets DID import every 30 minutes
  cron.schedule("*/30 * * * *", runScheduledSheetImport);
  console.log("Scheduled Google Sheets import cron job (every 30 minutes)");
}).catch((err) => {
  console.error("Failed to seed reference data:", err);
  process.exit(1);
});
