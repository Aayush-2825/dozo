import {
  check,
  index,
  pgTable,
  text,
  timestamp,
  unique,
  varchar,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { providerTypeEnum } from "./enums";
import { user } from "./user";

export const accountSchema = pgTable(
  "account",
  {
    id: varchar("id", { length: 255 })
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: varchar("user_id", { length: 255 })
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    provider: providerTypeEnum("provider").notNull(),
    providerAccountId: varchar("provider_account_id", { length: 255 }),
    // Encrypted at application layer (AES-256-GCM) prior to insertion
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    passwordHash: varchar("password_hash", { length: 255 }),
    lastUsedAt: timestamp("last_used_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .notNull()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    check(
      "account_provider_fields_check",
      sql`(${table.provider} = 'credentials' AND ${table.passwordHash} IS NOT NULL AND ${table.providerAccountId} IS NULL) OR (${table.provider} <> 'credentials' AND ${table.providerAccountId} IS NOT NULL)`,
    ),
    // Prevents linking the same external provider account to multiple user identities
    unique("account_provider_account_id_unq").on(
      table.provider,
      table.providerAccountId,
    ),
    // Limits each user to at most one account entry per provider type (e.g. one 'local', one 'google')
    unique("account_user_id_provider_unq").on(table.userId, table.provider),
    index("account_user_id_idx").on(table.userId),
  ],
);
