import {
  doublePrecision,
  pgTable,
  timestamp,
  uniqueIndex,
  varchar,
} from "drizzle-orm/pg-core";
import { consumer } from "./consumer";
import { helper } from "./helper";
import { organisation } from "./organisation";
import { bookingStatusEnum, cancellationReasonEnum } from "./enums";
import { sql } from "drizzle-orm/sql/sql";

export const booking = pgTable(
  "booking",
  {
    id: varchar("id", { length: 255 })
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),

    consumerId: varchar("consumer_id", { length: 255 })
      .notNull()
      .references(() => consumer.id),
    helperId: varchar("helper_id", { length: 255 }).references(() => helper.id),
    organisationId: varchar("organisation_id", { length: 255 }).references(
      () => organisation.id,
    ),

    status: bookingStatusEnum("status").notNull().default("requested"),

    serviceType: varchar("service_type", { length: 100 }).notNull(),
    subserviceType: varchar("subservice_type", { length: 100 }),

    // State Machine Timestamps
    acceptedAt: timestamp("accepted_at"),
    arrivedAt: timestamp("arrived_at"),
    inProgressAt: timestamp("in_progress_at"),
    awaitingConfirmationAt: timestamp("awaiting_confirmation_at"),
    completedAt: timestamp("completed_at"),
    cancelledAt: timestamp("cancelled_at"),
    scheduledAt: timestamp("scheduled_at"),

    // Cancellation
    cancellationReason: cancellationReasonEnum("cancellation_reason"),
    cancellationNote: varchar("cancellation_note", { length: 500 }),

    // Quoted/Agreed price (Payment table owns platformCommission & payouts)
    price: doublePrecision("price").notNull(),

    // Location & Identity Snapshots (Atomic with Coordinates)
    serviceAddressSnapshot: varchar("service_address_snapshot", {
      length: 500,
    }).notNull(),
    serviceLatitudeSnapshot: doublePrecision(
      "service_latitude_snapshot",
    ).notNull(),
    serviceLongitudeSnapshot: doublePrecision(
      "service_longitude_snapshot",
    ).notNull(),
    organisationNameSnapshot: varchar("organisation_name_snapshot", {
      length: 255,
    }),
    helperNameSnapshot: varchar("helper_name_snapshot", { length: 255 }),

    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .notNull()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    uniqueIndex("helper_one_active_booking_idx")
      .on(table.helperId)
      .where(sql`status IN ('accepted', 'arrived', 'in_progress')`),
  ],
);
