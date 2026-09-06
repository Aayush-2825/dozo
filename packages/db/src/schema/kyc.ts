import { check, pgTable, timestamp, varchar } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { helper } from "./helper";
import { organisation } from "./organisation";
import { kycStatusEnum } from "./enums";

export const kyc = pgTable(
  "kyc",
  {
    id: varchar("id", { length: 255 })
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),

    organisationId: varchar("organisation_id", { length: 255 }).references(
      () => organisation.id,
      { onDelete: "cascade" },
    ),

    helperId: varchar("helper_id", { length: 255 }).references(
      () => helper.id,
      { onDelete: "cascade" },
    ),

    documentType: varchar("document_type", { length: 100 }),
    documentUrl: varchar("document_url", { length: 500 }),
    videoKycUrl: varchar("video_kyc_url", { length: 500 }),

    documentStatus: kycStatusEnum("document_status")
      .notNull()
      .default("pending"),
    videoKycStatus: kycStatusEnum("video_kyc_status")
      .notNull()
      .default("pending"),
    overallStatus: kycStatusEnum("overall_status").notNull().default("pending"),

    rejectionReason: varchar("rejection_reason", { length: 500 }),

    submittedAt: timestamp("submitted_at").defaultNow().notNull(),

    documentReviewedAt: timestamp("document_reviewed_at"),
    videoReviewedAt: timestamp("video_reviewed_at"),
    overallReviewedAt: timestamp("overall_reviewed_at"),
  },
  (table) => [
    check(
      "kyc_owner_check",
      sql`(${table.helperId} IS NOT NULL AND ${table.organisationId} IS NULL) OR (${table.helperId} IS NULL AND ${table.organisationId} IS NOT NULL)`,
    ),
  ],
);
