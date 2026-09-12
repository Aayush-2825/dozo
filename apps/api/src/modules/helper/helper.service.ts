import { Transaction } from "@dozo/db";
import { NotFoundError } from "@dozo/types";
import {
  findByIdForUpdate,
  findByUserId,
  hasProfile,
  updateHelperCancellationCount,
} from "./helper.repository";

export { findByUserId, hasProfile };

export async function applyCancellationPenalty(
  tx: Transaction,
  input: { helperId: string; bookingStatus: string },
) {
  const { helperId, bookingStatus } = input;

  const existingHelper = await findByIdForUpdate(tx, helperId);

  if (!existingHelper) {
    throw new NotFoundError("Helper not found");
  }

  const updatedHelper = await updateHelperCancellationCount(tx, helperId);

  return updatedHelper;
}
