import {
  check,
  doublePrecision,
  pgTable,
  timestamp,
  uniqueIndex,
  varchar,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { booking } from "./booking";
import { checkpointTypeEnum } from "./enums";

export const bookingCheckpoint = pgTable(
  "booking_checkpoint",
  {
    id: varchar("id", { length: 255 })
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),

    bookingId: varchar("booking_id", { length: 255 })
      .notNull()
      .references(() => booking.id, { onDelete: "cascade" }),

    type: checkpointTypeEnum("type").notNull(),
    latitude: doublePrecision("latitude").notNull(),
    longitude: doublePrecision("longitude").notNull(),

    capturedAt: timestamp("captured_at").defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("booking_checkpoint_booking_type_idx").on(table.bookingId, table.type),
    check(
      "booking_checkpoint_coordinates_check",
      sql`${table.latitude} BETWEEN -90 AND 90 AND ${table.longitude} BETWEEN -180 AND 180`,
    ),
  ],
);
