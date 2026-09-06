import { Transaction } from "@dozo/db";
import { findById, updateConsumerCancellationCount } from "./consumer.repository";
import { NotFoundError } from "@dozo/types";

export async function recordConsumerCancellation(
  tx: Transaction,
  input: { consumerId: string; bookingStatus: string },
) {
  const { consumerId } = input;

  const existingConsumer = await findById(tx, consumerId);

  if (!existingConsumer) {
    throw new NotFoundError("Consumer not found");
  }

  const updatedConsumer = await updateConsumerCancellationCount(tx, consumerId);

  return updatedConsumer;
}