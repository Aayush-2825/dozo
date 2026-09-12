import {
  check,
  index,
  numeric,
  pgTable,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { booking } from "./booking";
import { consumer } from "./consumer";
import { helper } from "./helper";
import { organisation } from "./organisation";
import {
  escrowStatusEnum,
  paymentMethodEnum,
  paymentStatusEnum,
} from "./enums";

export const payment = pgTable(
  "payment",
  {
    id: varchar("id", { length: 255 })
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),

    bookingId: varchar("booking_id", { length: 255 })
      .notNull()
      .references(() => booking.id),

    consumerId: varchar("consumer_id", { length: 255 })
      .notNull()
      .references(() => consumer.id),
    helperId: varchar("helper_id", { length: 255 }).references(() => helper.id),
    organisationId: varchar("organisation_id", { length: 255 }).references(
      () => organisation.id,
    ),

    amountPaid: numeric("amount_paid", { precision: 12, scale: 2, mode: "number" }).notNull(),
    platformCommission: numeric("platform_commission", { precision: 12, scale: 2, mode: "number" }).notNull(),
    helperPayout: numeric("helper_payout", { precision: 12, scale: 2, mode: "number" }).notNull(),

    status: paymentStatusEnum("status").notNull().default("pending"),
    escrowStatus: escrowStatusEnum("escrow_status")
      .notNull()
      .default("not_held"),
    paymentMethod: paymentMethodEnum("payment_method").notNull(),

    gatewayId: varchar("gateway_id", { length: 255 }),
    gatewayTransactionId: varchar("gateway_transaction_id", {
      length: 255,
    }).unique(),
    gatewayPaymentMethod: varchar("gateway_payment_method", { length: 100 }),
    gatewayPaymentStatus: varchar("gateway_payment_status", { length: 100 }),

    idempotencyKey: varchar("idempotency_key", { length: 255 }).unique(),

    authorizedAt: timestamp("authorized_at"),
    capturedAt: timestamp("captured_at"),
    releasedAt: timestamp("released_at"),
    refundedAt: timestamp("refunded_at"),

    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .notNull()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    index("payment_booking_id_idx").on(table.bookingId),
    index("payment_status_idx").on(table.status),
    index("payment_escrow_status_idx").on(table.escrowStatus),
    check(
      "payment_amounts_check",
      sql`${table.amountPaid} >= 0 AND ${table.platformCommission} >= 0 AND ${table.helperPayout} >= 0 AND ${table.amountPaid} = ${table.platformCommission} + ${table.helperPayout}`,
    ),
    check(
      "valid_escrow_state",
      sql`
        CASE 
          WHEN ${table.escrowStatus} = 'not_held' 
            THEN ${table.status} IN ('created', 'pending', 'authorized', 'failed')
          WHEN ${table.escrowStatus} = 'held' 
            THEN ${table.status} IN ('authorized', 'captured')
          WHEN ${table.escrowStatus} = 'released' 
            THEN ${table.status} = 'captured'
          WHEN ${table.escrowStatus} IN ('refund_pending', 'refunded') 
            THEN ${table.status} IN ('refund_pending', 'refunded', 'partially_refunded')
          ELSE FALSE
        END
      `,
    ),
  ],
);
