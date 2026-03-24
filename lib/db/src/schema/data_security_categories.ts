import { pgTable, text, serial, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const dataSecurityCategoriesTable = pgTable("data_security_categories", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  parentId: integer("parent_id"),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertDataSecurityCategorySchema = createInsertSchema(dataSecurityCategoriesTable).omit({ id: true, createdAt: true });
export type InsertDataSecurityCategory = z.infer<typeof insertDataSecurityCategorySchema>;
export type DataSecurityCategory = typeof dataSecurityCategoriesTable.$inferSelect;
