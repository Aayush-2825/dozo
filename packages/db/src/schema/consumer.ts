import { boolean, integer, pgTable, timestamp, varchar } from "drizzle-orm/pg-core";

export const consumer = pgTable("consumer", {
  id: varchar("id", { length: 255 }).primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: varchar("name", { length: 255 }).notNull(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  emailVerified: boolean("email_verified").default(false).notNull(),
  phone: varchar("phone", { length: 20 }),
  phoneVerified: boolean("phone_verified").default(false).notNull(),
  cancellationCount: integer("cancellation_count").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull().$onUpdate(() => new Date()),
});