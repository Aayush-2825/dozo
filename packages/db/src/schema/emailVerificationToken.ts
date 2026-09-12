import { index, pgTable, timestamp, varchar } from "drizzle-orm/pg-core";
import { user } from "./user";

export const emailVerificationToken = pgTable(
  "email_verification_token",
  {
    id: varchar("id", { length: 255 })
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: varchar("user_id", { length: 255 })
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    tokenHash: varchar("token_hash", { length: 255 }).notNull(),
    expiresAt: timestamp("expires_at").notNull(),
    usedAt: timestamp("used_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("email_verification_token_user_id_idx").on(table.userId),
    index("email_verification_token_hash_idx").on(table.tokenHash),
    index("email_verification_token_expires_at_idx").on(table.expiresAt),
  ],
);