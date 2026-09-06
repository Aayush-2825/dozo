import {
    check,
  integer,
  pgTable,
  time,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core";
import { helper } from "./helper";
import { sql } from "drizzle-orm/sql/sql";

export const helperAvailability = pgTable(
  "helper_availability",
  {
    id: varchar("id", { length: 255 })
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    helperId: varchar("helper_id", { length: 255 })
      .notNull()
      .references(() => helper.id, { onDelete: "cascade" }),
    dayOfWeek: integer("day_of_week").notNull(), // 0 (Sunday) - 6 (Saturday)
    startTime: time("start_time").notNull(),
    endTime: time("end_time").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    check(
      "availability_time_order_check",
      sql`${table.startTime} < ${table.endTime}`,
    ),
  ],
);
