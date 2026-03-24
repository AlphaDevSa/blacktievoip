import { pgTable, text, serial, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const cybersecurityCategoriesTable = pgTable("cybersecurity_categories", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  parentId: integer("parent_id"),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertCybersecurityCategorySchema = createInsertSchema(cybersecurityCategoriesTable).omit({ id: true, createdAt: true });
export type InsertCybersecurityCategory = z.infer<typeof insertCybersecurityCategorySchema>;
export type CybersecurityCategory = typeof cybersecurityCategoriesTable.$inferSelect;
