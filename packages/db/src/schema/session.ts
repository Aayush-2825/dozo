import { index, pgTable, text, timestamp, varchar } from "drizzle-orm/pg-core";
import { user } from "./user";

export const session = pgTable(
  "session",
  {
    id: varchar("id", { length: 255 })
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: varchar("user_id", { length: 255 })
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    refreshTokenHash: varchar("refresh_token_hash", { length: 255 }).notNull(),
    ipAddress: varchar("ip_address", { length: 255 }),
    userAgent: text("user_agent"),
    lastActiveAt: timestamp("last_active_at").defaultNow().notNull(),
    expiresAt: timestamp("expires_at").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .notNull()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    index("session_user_id_idx").on(table.userId),
    index("session_refresh_token_hash_idx").on(table.refreshTokenHash),
    index("session_expires_at_idx").on(table.expiresAt),
  ],
);
