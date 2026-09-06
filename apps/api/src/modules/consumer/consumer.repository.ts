import { consumer, Transaction } from "@dozo/db";
import { eq, sql } from "drizzle-orm";

export async function findById(tx: Transaction, consumerId: string) {
  const result = await tx
    .select()
    .from(consumer)
    .where(eq(consumer.id, consumerId))
    .limit(1);
  return result[0] ?? null;
}

export async function findByIdForUpdate(tx: Transaction, consumerId: string) {
  const result = await tx
    .select()
    .from(consumer)
    .where(eq(consumer.id, consumerId))
    .for("update")
    .limit(1);
  return result[0] ?? null;
}

export async function updateConsumerCancellationCount(
  tx: Transaction,
  consumerId: string,
) {
  const result = await tx
    .update(consumer)
    .set({ cancellationCount: sql`cancellation_count + 1` })
    .where(eq(consumer.id, consumerId))
    .returning();
  return result[0] ?? null;
}
