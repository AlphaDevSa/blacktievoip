import bcrypt from "bcryptjs";
import { eq, sql } from "drizzle-orm";
import {
  db,
  adminsTable,
  companySettingsTable,
  areaCodesTable,
  serviceCategoriesTable,
  servicesTable,
  productCategoriesTable,
  productsTable,
} from "@workspace/db";

export async function ensureReferenceData() {
  await ensureAdmin();
  await ensureCompanySettings();
  await ensureAreaCodes();
  await ensureServiceCatalog();
  await ensureProductCatalog();
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

async function ensureServiceCatalog() {
  const [count] = await db
    .select({ cnt: sql<number>`count(*)::int` })
    .from(serviceCategoriesTable);

  if ((count?.cnt ?? 0) > 0) return;

  console.log("[seed] Seeding service catalog...");

  const [scVoip] = await db
    .insert(serviceCategoriesTable)
    .values({ name: "VoIP Calling", description: "Voice over IP calling plans and bundles", sortOrder: 1 })
    .returning();

  const [scHosted] = await db
    .insert(serviceCategoriesTable)
    .values({ name: "Hosted PBX", description: "Cloud-hosted PBX services", sortOrder: 2 })
    .returning();

  const [scConnectivity] = await db
    .insert(serviceCategoriesTable)
    .values({ name: "Connectivity", description: "Internet and fibre connectivity services", sortOrder: 3 })
    .returning();

  const [scSupport] = await db
    .insert(serviceCategoriesTable)
    .values({ name: "Support & Maintenance", description: "Professional support services", sortOrder: 4 })
    .returning();

  if (scVoip) {
    await db.insert(serviceCategoriesTable).values([
      { name: "Local Calling", parentId: scVoip.id, sortOrder: 1 },
      { name: "International Calling", parentId: scVoip.id, sortOrder: 2 },
    ]);

    await db.insert(servicesTable).values([
      { categoryId: scVoip.id, name: "Standard VoIP Line", description: "Single VoIP line with local calling included", price: "250", unit: "month", status: "active", sortOrder: 1 },
      { categoryId: scVoip.id, name: "Business VoIP Bundle (5 lines)", description: "5 VoIP lines with 1000 local minutes", price: "999", unit: "month", status: "active", sortOrder: 2 },
      { categoryId: scVoip.id, name: "Toll-Free Number", description: "0800 toll-free number rental", price: "350", unit: "month", status: "active", sortOrder: 3 },
    ]);
  }

  if (scHosted) {
    await db.insert(serviceCategoriesTable).values([
      { name: "Extensions", parentId: scHosted.id, sortOrder: 1 },
      { name: "IVR & Auto-Attendant", parentId: scHosted.id, sortOrder: 2 },
    ]);

    await db.insert(servicesTable).values([
      { categoryId: scHosted.id, name: "Hosted PBX - Starter (10 ext)", description: "Cloud PBX for up to 10 extensions", price: "799", unit: "month", status: "active", sortOrder: 1 },
      { categoryId: scHosted.id, name: "Hosted PBX - Business (25 ext)", description: "Cloud PBX for up to 25 extensions with call recording", price: "1599", unit: "month", status: "active", sortOrder: 2 },
      { categoryId: scHosted.id, name: "Hosted PBX - Enterprise (50 ext)", description: "Enterprise cloud PBX with advanced IVR and reporting", price: "2999", unit: "month", status: "active", sortOrder: 3 },
      { categoryId: scHosted.id, name: "Additional Extension", description: "Add an extra SIP extension to any PBX plan", price: "75", unit: "month", status: "active", sortOrder: 4 },
    ]);
  }

  if (scSupport) {
    await db.insert(servicesTable).values([
      { categoryId: scSupport.id, name: "Remote Support (1 hour)", description: "Dedicated remote technical support", price: "450", unit: "once-off", status: "active", sortOrder: 1 },
      { categoryId: scSupport.id, name: "Monthly Managed Support", description: "Ongoing managed support contract", price: "999", unit: "month", status: "active", sortOrder: 2 },
    ]);
  }

  console.log("[seed] Service catalog seeded");
}

async function ensureProductCatalog() {
  const [count] = await db
    .select({ cnt: sql<number>`count(*)::int` })
    .from(productCategoriesTable);

  if ((count?.cnt ?? 0) > 0) return;

  console.log("[seed] Seeding product catalog...");

  const [pcPhones] = await db
    .insert(productCategoriesTable)
    .values({ name: "VoIP Phones", description: "IP desk phones and handsets", sortOrder: 1 })
    .returning();

  const [pcAdapters] = await db
    .insert(productCategoriesTable)
    .values({ name: "ATA Adapters", description: "Analogue Telephone Adapters", sortOrder: 2 })
    .returning();

  await db.insert(productCategoriesTable).values({ name: "Routers & Switches", description: "Network hardware for VoIP deployment", sortOrder: 3 });

  const [pcHeadsets] = await db
    .insert(productCategoriesTable)
    .values({ name: "Headsets", description: "Professional headsets for call centres", sortOrder: 4 })
    .returning();

  await db.insert(productCategoriesTable).values({ name: "Accessories", description: "Cables, stands and accessories", sortOrder: 5 });

  if (pcPhones) {
    await db.insert(productCategoriesTable).values([
      { name: "Entry Level", parentId: pcPhones.id, sortOrder: 1 },
      { name: "Mid-Range", parentId: pcPhones.id, sortOrder: 2 },
      { name: "Executive", parentId: pcPhones.id, sortOrder: 3 },
    ]);

    await db.insert(productsTable).values([
      { categoryId: pcPhones.id, name: "Yealink T31P IP Phone", description: "Entry-level 2-line SIP phone with HD voice", sku: "YEA-T31P", price: "1299", stockCount: 25, status: "active", sortOrder: 1 },
      { categoryId: pcPhones.id, name: "Grandstream GXP2135", description: "8-line mid-range gigabit IP phone", sku: "GXP-2135", price: "2499", stockCount: 15, status: "active", sortOrder: 2 },
      { categoryId: pcPhones.id, name: "Yealink T54W IP Phone", description: "Executive 16-line colour display phone with WiFi", sku: "YEA-T54W", price: "3999", stockCount: 10, status: "active", sortOrder: 3 },
      { categoryId: pcPhones.id, name: "Fanvil X3S IP Phone", description: "2-line entry IP phone", sku: "FAN-X3S", price: "899", stockCount: 30, status: "active", sortOrder: 4 },
    ]);
  }

  if (pcAdapters) {
    await db.insert(productsTable).values([
      { categoryId: pcAdapters.id, name: "Grandstream HT801 ATA", description: "1-port analogue telephone adapter", sku: "HT801", price: "599", stockCount: 20, status: "active", sortOrder: 1 },
      { categoryId: pcAdapters.id, name: "Grandstream HT802 ATA", description: "2-port analogue telephone adapter", sku: "HT802", price: "799", stockCount: 18, status: "active", sortOrder: 2 },
    ]);
  }

  if (pcHeadsets) {
    await db.insert(productsTable).values([
      { categoryId: pcHeadsets.id, name: "Jabra Evolve 20 Headset", description: "Professional USB corded headset", sku: "JAB-E20", price: "1199", stockCount: 12, status: "active", sortOrder: 1 },
      { categoryId: pcHeadsets.id, name: "Plantronics Voyager Focus", description: "Wireless Bluetooth headset with ANC", sku: "PLT-VF", price: "3499", stockCount: 6, status: "active", sortOrder: 2 },
    ]);
  }

  console.log("[seed] Product catalog seeded");
}
