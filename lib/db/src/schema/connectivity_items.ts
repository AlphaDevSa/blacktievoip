import { pgTable, text, serial, integer, numeric, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const connectivityItemsTable = pgTable("connectivity_items", {
  id: serial("id").primaryKey(),
  categoryId: integer("category_id"),
  name: text("name").notNull(),
  description: text("description"),
  speed: text("speed"),
  provider: text("provider"),
  contention: text("contention"),
  contractMonths: integer("contract_months").default(12),
  setupFeeExclVat: numeric("setup_fee_excl_vat", { precision: 10, scale: 2 }),
  retailPriceExclVat: numeric("retail_price_excl_vat", { precision: 10, scale: 2 }),
  retailPriceInclVat: numeric("retail_price_incl_vat", { precision: 10, scale: 2 }),
  resellerPriceExclVat: numeric("reseller_price_excl_vat", { precision: 10, scale: 2 }),
  resellerPriceInclVat: numeric("reseller_price_incl_vat", { precision: 10, scale: 2 }),
  status: text("status").notNull().default("active"),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertConnectivityItemSchema = createInsertSchema(connectivityItemsTable).omit({ id: true, createdAt: true });
export type InsertConnectivityItem = z.infer<typeof insertConnectivityItemSchema>;
export type ConnectivityItem = typeof connectivityItemsTable.$inferSelect;
