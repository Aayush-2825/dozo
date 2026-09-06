import { Transaction } from "@dozo/db";
import {
  findPaymentByBookingIdAndStatusForUpdate,
  updatePaymentStatus,
} from "./payment.repository";

export async function processBookingCancellationRefund(
  tx: Transaction,
  bookingId: string,
  reason: string,
) {
  const existingPayment = await findPaymentByBookingIdAndStatusForUpdate(
    tx,
    bookingId,
    "captured",
  );

  if (!existingPayment) {
    return null;
  }

  const updatedPayment = await updatePaymentStatus(
    tx,
    existingPayment.id,
    "refund_pending",
  );

  return updatedPayment;
}
