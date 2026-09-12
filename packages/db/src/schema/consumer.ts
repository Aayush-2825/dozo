import { boolean, check, integer, index, pgTable, timestamp, unique, varchar } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { user } from "./user";

export const consumer = pgTable(
  "consumer",
  {
    id: varchar("id", { length: 255 }).primaryKey().$defaultFn(() => crypto.randomUUID()),
    userId: varchar("user_id", { length: 255 })
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    phone: varchar("phone", { length: 20 }),
    phoneVerified: boolean("phone_verified").default(false).notNull(),
    cancellationCount: integer("cancellation_count").default(0).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull().$onUpdate(() => new Date()),
  },
  (table) => [
    unique("consumer_user_id_unq").on(table.userId),
    index("consumer_user_id_idx").on(table.userId),
    check("consumer_cancellation_count_check", sql`${table.cancellationCount} >= 0`),
  ],
);