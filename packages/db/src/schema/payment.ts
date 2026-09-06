import {
  check,
  doublePrecision,
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

    amountPaid: doublePrecision("amount_paid").notNull(),
    platformCommission: doublePrecision("platform_commission").notNull(),
    helperPayout: doublePrecision("helper_payout").notNull(),

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
