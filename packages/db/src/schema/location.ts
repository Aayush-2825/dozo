import {
  check,
  doublePrecision,
  pgTable,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { consumer } from "./consumer";
import { organisation } from "./organisation";
import { locationTypeEnum } from "./enums";

export const location = pgTable(
  "location",
  {
    id: varchar("id", { length: 255 })
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    name: locationTypeEnum("name").notNull().default("home"),
    address: varchar("address", { length: 500 }).notNull(),
    latitude: doublePrecision("latitude").notNull(),
    longitude: doublePrecision("longitude").notNull(),

    consumerId: varchar("consumer_id", { length: 255 }).references(
      () => consumer.id,
      { onDelete: "cascade" }
    ),

    organisationId: varchar("organisation_id", { length: 255 }).unique().references(
      () => organisation.id,
      { onDelete: "cascade" }
    ),

    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .notNull()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    check(
      "location_owner_check",
      sql`(${table.consumerId} IS NOT NULL AND ${table.organisationId} IS NULL) OR (${table.consumerId} IS NULL AND ${table.organisationId} IS NOT NULL)`
    ),
  ]
);