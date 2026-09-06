import { payment, Transaction } from "@dozo/db";
import { and, eq } from "drizzle-orm";

export async function findPaymentByBookingIdAndStatusForUpdate(
  tx: Transaction,
  bookingId: string,
  status:
    | "created"
    | "pending"
    | "authorized"
    | "captured"
    | "failed"
    | "refund_pending"
    | "refunded"
    | "partially_refunded",
) {
  const result = await tx
    .select()
    .from(payment)
    .where(and(eq(payment.bookingId, bookingId), eq(payment.status, status)))
    .for("update")
    .limit(1);
  return result[0] ?? null;
}

export async function updatePaymentStatus(
  tx: Transaction,
  paymentId: string,
  status:
    | "created"
    | "pending"
    | "authorized"
    | "captured"
    | "failed"
    | "refund_pending"
    | "refunded"
    | "partially_refunded",
) {
  const result = await tx
    .update(payment)
    .set({ status })
    .where(eq(payment.id, paymentId))
    .returning();

  return result[0] ?? null;
}
