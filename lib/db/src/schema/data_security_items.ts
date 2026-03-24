import { pgTable, text, serial, integer, timestamp, numeric } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { dataSecurityCategoriesTable } from "./data_security_categories";

export const dataSecurityItemsTable = pgTable("data_security_items", {
  id: serial("id").primaryKey(),
  categoryId: integer("category_id").references(() => dataSecurityCategoriesTable.id),
  name: text("name").notNull(),
  description: text("description"),
  price: numeric("price", { precision: 10, scale: 2 }).notNull().default("0"),
  retailPriceExclVat: numeric("retail_price_excl_vat", { precision: 10, scale: 2 }),
  resellerPriceExclVat: numeric("reseller_price_excl_vat", { precision: 10, scale: 2 }),
  resellerPriceInclVat: numeric("reseller_price_incl_vat", { precision: 10, scale: 2 }),
  priceInclVat: numeric("price_incl_vat", { precision: 10, scale: 2 }),
  unit: text("unit").notNull().default("month"),
  status: text("status").notNull().default("active"),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertDataSecurityItemSchema = createInsertSchema(dataSecurityItemsTable).omit({ id: true, createdAt: true });
export type InsertDataSecurityItem = z.infer<typeof insertDataSecurityItemSchema>;
export type DataSecurityItem = typeof dataSecurityItemsTable.$inferSelect;
