import bcrypt from "bcryptjs";
import { eq, sql } from "drizzle-orm";
import {
  db,
  adminsTable,
  resellersTable,
  companySettingsTable,
  areaCodesTable,
} from "@workspace/db";

export async function ensureReferenceData() {
  await ensureAdmin();
  await ensureReseller();
  await ensureCompanySettings();
  await ensureAreaCodes();
}

async function ensureReseller() {
  const existing = await db
    .select({ id: resellersTable.id })
    .from(resellersTable)
    .where(eq(resellersTable.email, "reseller@blacktievoip.co.za"));

  if (existing.length === 0) {
    const passwordHash = await bcrypt.hash("Reseller1234!", 10);
    await db.insert(resellersTable).values({
      email: "reseller@blacktievoip.co.za",
      passwordHash,
      companyName: "Black Tie VoIP Demo",
      contactName: "Demo Reseller",
      phone: "+27 11 000 0001",
      status: "active",
    });
    console.log("[seed] Default reseller account created");
  }
}

async function ensureAdmin() {
  const existing = await db
    .select({ id: adminsTable.id })
    .from(adminsTable)
    .where(eq(adminsTable.email, "admin@blacktievoip.co.za"));

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
    console.log("[seed] Default admin account created");
  }
}

async function ensureCompanySettings() {
  const [count] = await db
    .select({ cnt: sql<number>`count(*)::int` })
    .from(companySettingsTable);

  if ((count?.cnt ?? 0) === 0) {
    await db.insert(companySettingsTable).values({
      companyName: "Black Tie VoIP",
      email: "info@blacktievoip.co.za",
      phone: "+27 11 000 0000",
      country: "South Africa",
      primaryColor: "#1a1a2e",
      smtpPort: "587",
      smtpSecure: false,
    });
    console.log("[seed] Company settings created");
  }
}

async function ensureAreaCodes() {
  const areaCodes = [
    { code: "010", region: "Johannesburg", province: "Gauteng" },
    { code: "011", region: "Johannesburg", province: "Gauteng" },
    { code: "012", region: "Pretoria", province: "Gauteng" },
    { code: "013", region: "Mpumalanga", province: "Mpumalanga" },
    { code: "014", region: "Rustenburg", province: "North West" },
    { code: "015", region: "Polokwane", province: "Limpopo" },
    { code: "016", region: "Vaal Triangle", province: "Gauteng" },
    { code: "017", region: "Ermelo", province: "Mpumalanga" },
    { code: "018", region: "Potchefstroom", province: "North West" },
    { code: "021", region: "Cape Town", province: "Western Cape" },
    { code: "022", region: "Malmesbury", province: "Western Cape" },
    { code: "023", region: "Worcester", province: "Western Cape" },
    { code: "027", region: "Springbok", province: "Northern Cape" },
    { code: "028", region: "Hermanus", province: "Western Cape" },
    { code: "031", region: "Durban", province: "KwaZulu-Natal" },
    { code: "032", region: "KwaDukuza", province: "KwaZulu-Natal" },
    { code: "033", region: "Pietermaritzburg", province: "KwaZulu-Natal" },
    { code: "034", region: "Newcastle", province: "KwaZulu-Natal" },
    { code: "035", region: "Richards Bay", province: "KwaZulu-Natal" },
    { code: "036", region: "Ladysmith", province: "KwaZulu-Natal" },
    { code: "039", region: "Port Shepstone", province: "KwaZulu-Natal" },
    { code: "041", region: "Gqeberha", province: "Eastern Cape" },
    { code: "042", region: "Humansdorp", province: "Eastern Cape" },
    { code: "043", region: "East London", province: "Eastern Cape" },
    { code: "044", region: "George", province: "Western Cape" },
    { code: "045", region: "Queenstown", province: "Eastern Cape" },
    { code: "046", region: "Makhanda", province: "Eastern Cape" },
    { code: "047", region: "Mthatha", province: "Eastern Cape" },
    { code: "048", region: "Cathcart", province: "Eastern Cape" },
    { code: "049", region: "Graaff-Reinet", province: "Eastern Cape" },
    { code: "051", region: "Bloemfontein", province: "Free State" },
    { code: "053", region: "Kimberley", province: "Northern Cape" },
    { code: "054", region: "Upington", province: "Northern Cape" },
    { code: "056", region: "Welkom", province: "Free State" },
    { code: "057", region: "Odendaalsrus", province: "Free State" },
    { code: "058", region: "Bethlehem", province: "Free State" },
    { code: "086", region: "National", province: "Virtual" },
    { code: "087", region: "National VoIP", province: "Virtual" },
  ];

  const inserted = await db
    .insert(areaCodesTable)
    .values(areaCodes)
    .onConflictDoNothing()
    .returning({ id: areaCodesTable.id });

  if (inserted.length > 0) {
    console.log(`[seed] ${inserted.length} area code(s) added`);
  }
}

