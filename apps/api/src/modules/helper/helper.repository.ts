import { helper, Transaction } from "@dozo/db";
import { eq, sql } from "drizzle-orm";

export async function findById(tx: Transaction, helperId: string) {
  const result = await tx
    .select()
    .from(helper)
    .where(eq(helper.id, helperId))
    .limit(1);
  return result[0] ?? null;
}

export async function hasProfile(tx: Transaction, userId: string) {
  const result = await tx
    .select({ id: helper.id })
    .from(helper)
    .where(eq(helper.userId, userId))
    .limit(1);
  return result.length > 0;
}

export async function findByUserId(tx: Transaction, userId: string) {
  const result = await tx
    .select()
    .from(helper)
    .where(eq(helper.userId, userId))
    .limit(1);
  return result[0] ?? null;
}

export async function findByIdForUpdate(tx: Transaction, helperId: string) {
  const result = await tx
    .select()
    .from(helper)
    .where(eq(helper.id, helperId))
    .for("update")
    .limit(1);
  return result[0] ?? null;
}

export async function updateHelperCancellationCount(
  tx: Transaction,
  helperId: string,
) {
  const result = await tx
    .update(helper)
    .set({ cancellationCount: sql`cancellation_count + 1` })
    .where(eq(helper.id, helperId))
    .returning();
  return result[0] ?? null;
}
