import {
  boolean,
  check,
  integer,
  pgTable,
  timestamp,
  unique,
  varchar,
} from "drizzle-orm/pg-core";
import { organisation } from "./organisation";
import { user } from "./user";
import { sql } from "drizzle-orm/sql/sql";

export const helper = pgTable(
  "helper",
  {
    id: varchar("id", { length: 255 })
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: varchar("user_id", { length: 255 })
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    phone: varchar("phone", { length: 50 }).notNull().unique(),
    organisationId: varchar("organisation_id", { length: 255 }).references(
      () => organisation.id,
      { onDelete: "set null" },
    ),
    // Meaningful only when organisationId IS NULL (individual/live helpers).
    // Org-type on-shift status comes from helper_availability instead.
    isLive: boolean("is_live").default(false).notNull(),
    bannedUntil: timestamp("banned_until"), // "currently banned" = bannedUntil IS NOT NULL AND bannedUntil > now(), computed at read time
    cancellationCount: integer("cancellation_count").default(0).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .notNull()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    sql`CHECK (${table.cancellationCount} >= 0)`,
    unique("helper_user_id_unq").on(table.userId),
  ],
);
