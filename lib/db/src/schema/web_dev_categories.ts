import { pgTable, text, serial, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const webDevCategoriesTable = pgTable("web_dev_categories", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  parentId: integer("parent_id"),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertWebDevCategorySchema = createInsertSchema(webDevCategoriesTable).omit({ id: true, createdAt: true });
export type InsertWebDevCategory = z.infer<typeof insertWebDevCategorySchema>;
export type WebDevCategory = typeof webDevCategoriesTable.$inferSelect;
