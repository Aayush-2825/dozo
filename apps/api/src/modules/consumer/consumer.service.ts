import { Transaction } from "@dozo/db";
import {
  findByIdForUpdate,
  findByUserId,
  hasProfile,
  updateConsumerCancellationCount,
} from "./consumer.repository";
import { NotFoundError } from "@dozo/types";

export { findByUserId, hasProfile };

export async function recordConsumerCancellation(
  tx: Transaction,
  input: { consumerId: string; bookingStatus: string },
) {
  const { consumerId } = input;

  const existingConsumer = await findByIdForUpdate(tx, consumerId);

  if (!existingConsumer) {
    throw new NotFoundError("Consumer not found");
  }

  const updatedConsumer = await updateConsumerCancellationCount(tx, consumerId);

  return updatedConsumer;
}