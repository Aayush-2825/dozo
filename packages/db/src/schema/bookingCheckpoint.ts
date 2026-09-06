import {
  doublePrecision,
  pgTable,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core";
import { booking } from "./booking";
import { checkpointTypeEnum } from "./enums";

export const bookingCheckpoint = pgTable("booking_checkpoint", {
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
});
