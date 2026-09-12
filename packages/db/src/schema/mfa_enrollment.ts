import {
  boolean,
  index,
  pgTable,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core";
import { user } from "./user";

export const mfaEnrollment = pgTable(
  "mfa_enrollment",
  {
    id: varchar("id", { length: 255 })
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: varchar("user_id", { length: 255 })
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    // Encrypted at application layer (AES-256-GCM) prior to insertion
    secret: varchar("secret", { length: 255 }).notNull(),
    isVerified: boolean("is_verified").default(false).notNull(),
    verifiedAt: timestamp("verified_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .notNull()
      .$onUpdate(() => new Date()),
  },
  (table) => [index("mfa_enrollment_user_id_idx").on(table.userId)],
);

export const mfaBackupCode = pgTable(
  "mfa_backup_code",
  {
    id: varchar("id", { length: 255 })
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    mfaEnrollmentId: varchar("mfa_enrollment_id", { length: 255 })
      .notNull()
      .references(() => mfaEnrollment.id, { onDelete: "cascade" }),
    codeHash: varchar("code_hash", { length: 255 }).notNull(),
    usedAt: timestamp("used_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("mfa_backup_code_enrollment_id_idx").on(table.mfaEnrollmentId),
    index("mfa_backup_code_hash_idx").on(table.codeHash),
  ],
);
