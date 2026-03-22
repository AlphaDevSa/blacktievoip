import {
  db,
  adminsTable,
  resellersTable,
  clientsTable,
  serviceCategoriesTable,
  servicesTable,
  productCategoriesTable,
  productsTable,
  areaCodesTable,
  didsTable,
} from "@workspace/db";
import bcrypt from "bcryptjs";

async function seed() {
  console.log("Seeding database...");

  // Create admin
  const adminHash = await bcrypt.hash("admin123", 10);
  const [admin] = await db
    .insert(adminsTable)
    .values({ email: "admin@blacktievoip.co.za", passwordHash: adminHash, name: "Black Tie Admin" })
    .onConflictDoNothing()
    .returning();
  console.log(admin ? "Created admin" : "Admin already exists");

  // Create demo resellers
  const resellerHash = await bcrypt.hash("reseller123", 10);
  const [reseller1] = await db
    .insert(resellersTable)
    .values({
      companyName: "Cape Connect Solutions", contactName: "Thandi Nkosi",
      email: "thandi@capeconnect.co.za", passwordHash: resellerHash,
      phone: "021 555 0100", address: "12 Long Street", city: "Cape Town",
      province: "Western Cape", commissionRate: "18", status: "active",
    })
    .onConflictDoNothing().returning();

  const [reseller2] = await db
    .insert(resellersTable)
    .values({
      companyName: "Joburg Telecom", contactName: "Marco van der Berg",
      email: "marco@jouburgtelecom.co.za", passwordHash: resellerHash,
      phone: "011 555 0200", address: "45 Commissioner Street", city: "Johannesburg",
      province: "Gauteng", commissionRate: "20", status: "active",
    })
    .onConflictDoNothing().returning();

  if (reseller1) {
    await db.insert(clientsTable).values([
      { resellerId: reseller1.id, companyName: "Stellenbosch Winery", contactName: "Johan du Plessis", email: "johan@stellwine.co.za", phone: "021 888 0100", city: "Stellenbosch", province: "Western Cape", sipExtensions: 8, monthlyFee: "1200", status: "active" },
      { resellerId: reseller1.id, companyName: "Cape Town Hotels", contactName: "Sarah Mitchell", email: "sarah@cthotels.co.za", phone: "021 999 0200", city: "Cape Town", province: "Western Cape", sipExtensions: 25, monthlyFee: "3500", status: "active" },
    ]).onConflictDoNothing();
  }

  if (reseller2) {
    await db.insert(clientsTable).values([
      { resellerId: reseller2.id, companyName: "Sandton Accountants", contactName: "Priya Naidoo", email: "priya@sandtonacc.co.za", phone: "011 777 0300", city: "Sandton", province: "Gauteng", sipExtensions: 12, monthlyFee: "1800", status: "active" },
      { resellerId: reseller2.id, companyName: "Midrand Tech Park", contactName: "Sipho Dlamini", email: "sipho@midrandtech.co.za", phone: "011 555 0400", city: "Midrand", province: "Gauteng", sipExtensions: 40, monthlyFee: "5600", status: "active" },
      { resellerId: reseller2.id, companyName: "Pretoria Law Firm", contactName: "Annika Botha", email: "annika@pretorialaw.co.za", phone: "012 333 0500", city: "Pretoria", province: "Gauteng", sipExtensions: 6, monthlyFee: "900", status: "suspended" },
    ]).onConflictDoNothing();
  }

  // ── Service Categories ────────────────────────────────────────────────────
  console.log("Seeding service categories...");
  const [scVoip] = await db.insert(serviceCategoriesTable).values({ name: "VoIP Calling", description: "Voice over IP calling plans and bundles", sortOrder: 1 }).onConflictDoNothing().returning();
  const [scHosted] = await db.insert(serviceCategoriesTable).values({ name: "Hosted PBX", description: "Cloud-hosted PBX services", sortOrder: 2 }).onConflictDoNothing().returning();
  const [scConnectivity] = await db.insert(serviceCategoriesTable).values({ name: "Connectivity", description: "Internet and fibre connectivity services", sortOrder: 3 }).onConflictDoNothing().returning();
  const [scSupport] = await db.insert(serviceCategoriesTable).values({ name: "Support & Maintenance", description: "Professional support services", sortOrder: 4 }).onConflictDoNothing().returning();

  // Sub-categories
  if (scVoip) {
    await db.insert(serviceCategoriesTable).values([
      { name: "Local Calling", parentId: scVoip.id, sortOrder: 1 },
      { name: "International Calling", parentId: scVoip.id, sortOrder: 2 },
    ]).onConflictDoNothing();
  }
  if (scHosted) {
    await db.insert(serviceCategoriesTable).values([
      { name: "Extensions", parentId: scHosted.id, sortOrder: 1 },
      { name: "IVR & Auto-Attendant", parentId: scHosted.id, sortOrder: 2 },
    ]).onConflictDoNothing();
  }

  // ── Services ─────────────────────────────────────────────────────────────
  console.log("Seeding services...");
  if (scVoip) {
    await db.insert(servicesTable).values([
      { categoryId: scVoip.id, name: "Standard VoIP Line", description: "Single VoIP line with local calling included", price: "250", unit: "month", status: "active", sortOrder: 1 },
      { categoryId: scVoip.id, name: "Business VoIP Bundle (5 lines)", description: "5 VoIP lines with 1000 local minutes", price: "999", unit: "month", status: "active", sortOrder: 2 },
      { categoryId: scVoip.id, name: "Toll-Free Number", description: "0800 toll-free number rental", price: "350", unit: "month", status: "active", sortOrder: 3 },
    ]).onConflictDoNothing();
  }
  if (scHosted) {
    await db.insert(servicesTable).values([
      { categoryId: scHosted.id, name: "Hosted PBX - Starter (10 ext)", description: "Cloud PBX for up to 10 extensions", price: "799", unit: "month", status: "active", sortOrder: 1 },
      { categoryId: scHosted.id, name: "Hosted PBX - Business (25 ext)", description: "Cloud PBX for up to 25 extensions with call recording", price: "1599", unit: "month", status: "active", sortOrder: 2 },
      { categoryId: scHosted.id, name: "Hosted PBX - Enterprise (50 ext)", description: "Enterprise cloud PBX with advanced IVR and reporting", price: "2999", unit: "month", status: "active", sortOrder: 3 },
      { categoryId: scHosted.id, name: "Additional Extension", description: "Add an extra SIP extension to any PBX plan", price: "75", unit: "month", status: "active", sortOrder: 4 },
    ]).onConflictDoNothing();
  }
  if (scSupport) {
    await db.insert(servicesTable).values([
      { categoryId: scSupport.id, name: "Remote Support (1 hour)", description: "Dedicated remote technical support", price: "450", unit: "once-off", status: "active", sortOrder: 1 },
      { categoryId: scSupport.id, name: "Monthly Managed Support", description: "Ongoing managed support contract", price: "999", unit: "month", status: "active", sortOrder: 2 },
    ]).onConflictDoNothing();
  }

  // ── Product Categories ────────────────────────────────────────────────────
  console.log("Seeding product categories...");
  const [pcPhones] = await db.insert(productCategoriesTable).values({ name: "VoIP Phones", description: "IP desk phones and handsets", sortOrder: 1 }).onConflictDoNothing().returning();
  const [pcAdapters] = await db.insert(productCategoriesTable).values({ name: "ATA Adapters", description: "Analogue Telephone Adapters", sortOrder: 2 }).onConflictDoNothing().returning();
  const [pcRouters] = await db.insert(productCategoriesTable).values({ name: "Routers & Switches", description: "Network hardware for VoIP deployment", sortOrder: 3 }).onConflictDoNothing().returning();
  const [pcHeadsets] = await db.insert(productCategoriesTable).values({ name: "Headsets", description: "Professional headsets for call centres", sortOrder: 4 }).onConflictDoNothing().returning();
  const [pcAccessories] = await db.insert(productCategoriesTable).values({ name: "Accessories", description: "Cables, stands and accessories", sortOrder: 5 }).onConflictDoNothing().returning();

  // Sub-categories
  if (pcPhones) {
    await db.insert(productCategoriesTable).values([
      { name: "Entry Level", parentId: pcPhones.id, sortOrder: 1 },
      { name: "Mid-Range", parentId: pcPhones.id, sortOrder: 2 },
      { name: "Executive", parentId: pcPhones.id, sortOrder: 3 },
    ]).onConflictDoNothing();
  }

  // ── Products ─────────────────────────────────────────────────────────────
  console.log("Seeding products...");
  if (pcPhones) {
    await db.insert(productsTable).values([
      { categoryId: pcPhones.id, name: "Yealink T31P IP Phone", description: "Entry-level 2-line SIP phone with HD voice", sku: "YEA-T31P", price: "1299", stockCount: 25, status: "active", sortOrder: 1 },
      { categoryId: pcPhones.id, name: "Grandstream GXP2135", description: "8-line mid-range gigabit IP phone", sku: "GXP-2135", price: "2499", stockCount: 15, status: "active", sortOrder: 2 },
      { categoryId: pcPhones.id, name: "Yealink T54W IP Phone", description: "Executive 16-line colour display phone with WiFi", sku: "YEA-T54W", price: "3999", stockCount: 10, status: "active", sortOrder: 3 },
      { categoryId: pcPhones.id, name: "Fanvil X3S IP Phone", description: "2-line entry IP phone", sku: "FAN-X3S", price: "899", stockCount: 30, status: "active", sortOrder: 4 },
    ]).onConflictDoNothing();
  }
  if (pcAdapters) {
    await db.insert(productsTable).values([
      { categoryId: pcAdapters.id, name: "Grandstream HT801 ATA", description: "1-port analogue telephone adapter", sku: "HT801", price: "599", stockCount: 20, status: "active", sortOrder: 1 },
      { categoryId: pcAdapters.id, name: "Grandstream HT802 ATA", description: "2-port analogue telephone adapter", sku: "HT802", price: "799", stockCount: 18, status: "active", sortOrder: 2 },
    ]).onConflictDoNothing();
  }
  if (pcHeadsets) {
    await db.insert(productsTable).values([
      { categoryId: pcHeadsets.id, name: "Jabra Evolve 20 Headset", description: "Professional USB corded headset", sku: "JAB-E20", price: "1199", stockCount: 12, status: "active", sortOrder: 1 },
      { categoryId: pcHeadsets.id, name: "Plantronics Voyager Focus", description: "Wireless Bluetooth headset with ANC", sku: "PLT-VF", price: "3499", stockCount: 6, status: "active", sortOrder: 2 },
    ]).onConflictDoNothing();
  }

  // ── Area Codes ─────────────────────────────────────────────────────────────
  console.log("Seeding area codes and DIDs...");
  const areaCodes = [
    { code: "010", region: "Johannesburg", province: "Gauteng" },
    { code: "011", region: "Johannesburg", province: "Gauteng" },
    { code: "012", region: "Pretoria", province: "Gauteng" },
    { code: "021", region: "Cape Town", province: "Western Cape" },
    { code: "031", region: "Durban", province: "KwaZulu-Natal" },
    { code: "041", region: "Port Elizabeth", province: "Eastern Cape" },
    { code: "051", region: "Bloemfontein", province: "Free State" },
    { code: "087", region: "National VoIP", province: "National" },
  ];

  const createdAreaCodes: Record<string, number> = {};
  for (const ac of areaCodes) {
    const [created] = await db.insert(areaCodesTable).values(ac).onConflictDoNothing().returning();
    if (created) createdAreaCodes[ac.code] = created.id;
    else {
      const [existing] = await db.select().from(areaCodesTable).where(db => (db as any).eq((db as any).areaCodesTable.code, ac.code));
    }
  }

  // Look up any that were skipped
  const allCodes = await db.select().from(areaCodesTable);
  for (const ac of allCodes) {
    createdAreaCodes[ac.code] = ac.id;
  }

  // Seed DID numbers
  const didSeeds: Array<{ code: string; numbers: string[] }> = [
    {
      code: "011", numbers: [
        "0110001000","0110001001","0110001002","0110001003","0110001004",
        "0110001005","0110001006","0110001007","0110001008","0110001009",
      ]
    },
    {
      code: "021", numbers: [
        "0210001000","0210001001","0210001002","0210001003","0210001004",
        "0210001005","0210001006","0210001007","0210001008","0210001009",
      ]
    },
    {
      code: "012", numbers: [
        "0120001000","0120001001","0120001002","0120001003","0120001004",
      ]
    },
    {
      code: "087", numbers: [
        "0870001000","0870001001","0870001002","0870001003","0870001004",
        "0870001005","0870001006","0870001007","0870001008","0870001009",
        "0870001010","0870001011","0870001012",
      ]
    },
  ];

  // Get IDs of resellers to assign some DIDs to
  const allResellers = await db.select().from(resellersTable);

  let didAssignIndex = 0;
  for (const { code, numbers } of didSeeds) {
    const areaCodeId = createdAreaCodes[code];
    if (!areaCodeId) continue;
    for (let i = 0; i < numbers.length; i++) {
      const num = numbers[i];
      // Assign first 2 of each area code to resellers for demo
      const shouldAssign = i < 2 && allResellers.length > 0;
      const reseller = shouldAssign ? allResellers[didAssignIndex % allResellers.length] : null;
      didAssignIndex++;
      await db.insert(didsTable).values({
        areaCodeId,
        number: num,
        status: reseller ? "assigned" : "available",
        resellerId: reseller?.id ?? null,
        assignedAt: reseller ? new Date() : null,
      }).onConflictDoNothing();
    }
  }

  console.log("Seeding complete!");
  process.exit(0);
}

seed().catch((err) => {
  console.error("Seed error:", err);
  process.exit(1);
});
