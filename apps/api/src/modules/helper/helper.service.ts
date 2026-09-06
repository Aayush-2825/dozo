import { Transaction } from "@dozo/db";
import { NotFoundError } from "@dozo/types";
import { findById, updateHelperCancellationCount } from "./helper.repository";

export async function applyCancellationPenalty(
  tx: Transaction,
  input: { helperId: string; bookingStatus: string },
) {
  const { helperId, bookingStatus } = input;

  const existingHelper = await findById(tx, helperId);

  if (!existingHelper) {
    throw new NotFoundError("Helper not found");
  }

  const updatedHelper = await updateHelperCancellationCount(tx, helperId);

  return updatedHelper;
}
