import { booking, helper } from "@dozo/db";
import { eq, and, inArray } from "drizzle-orm";
import type { Transaction } from "@dozo/db";

/**
 * Fetches a booking by ID and acquires an exclusive row-level lock (`FOR UPDATE`).
 *
 * Must run within a transaction (`tx`). Prevents concurrent transactions from modifying
 * or re-locking this booking until the current transaction finishes.
 *
 * @param tx - Active database transaction handle.
 * @param bookingId - Unique identifier of the target booking.
 * @returns The locked booking entity, or `null` if not found.
 */
export async function findByIdForUpdate(tx: Transaction, bookingId: string) {
  // 1. Execute SELECT ... FOR UPDATE to lock the specific booking row
  const result = await tx
    .select()
    .from(booking)
    .where(eq(booking.id, bookingId))
    .for("update")
    .limit(1);
    
  return result[0] ?? null;
}

/**
 * Assigns a helper to a booking and updates its status to "accepted".
 *
 * Must run within a transaction context to ensure atomic execution alongside availability checks.
 *
 * @param tx - Active database transaction handle.
 * @param bookingId - Target booking to update.
 * @param helperId - ID of the helper accepting the job.
 * @returns The updated booking entity, or `null` if the update target was not found.
 */
export async function assignHelper(
  tx: Transaction,
  bookingId: string,
  helperId: string,
) {
  // 1. Update the booking status and assign the helper, returning the modified row
  const result = await tx
    .update(booking)
    .set({ status: "accepted", helperId: helperId, acceptedAt: new Date() })
    .where(eq(booking.id, bookingId))
    .returning();

  return result[0] ?? null;
}

/**
 * Searches for active bookings assigned to a helper and acquires a lock (`FOR UPDATE`).
 *
 * Active statuses include 'accepted', 'arrived', or 'in_progress'. Locking prevents
 * race conditions when checking helper availability prior to assigning new jobs.
 *
 * @param tx - Active database transaction handle.
 * @param helperId - Unique identifier of the helper.
 * @returns The existing active booking entity, or `null` if the helper is free.
 */
export async function findActiveBookingForHelper(
  tx: Transaction,
  helperId: string,
) {
  // 1. Query for any booking in an active state tied to this helper and lock it
  const result = await tx
    .select()
    .from(booking)
    .where(
      and(
        eq(booking.helperId, helperId),
        inArray(booking.status, ["accepted", "arrived", "in_progress"]),
      ),
    )
    .for("update")
    .limit(1);

  return result[0] ?? null;
}

/**
 * Acquires an exclusive lock (`FOR UPDATE`) on the helper record itself.
 *
 * Used to serialize concurrent assignment attempts for a single helper,
 * ensuring only one request can validate and assign an active job at a time.
 *
 * @param tx - Active database transaction handle.
 * @param helperId - Unique identifier of the helper.
 * @returns The locked helper entity, or `null` if not found.
 */
export async function lockHelperForUpdate(tx: Transaction, helperId: string) {
  // 1. Execute SELECT ... FOR UPDATE on the helper table to serialize helper-specific actions
  const result = await tx
    .select()
    .from(helper)
    .where(eq(helper.id, helperId))
    .for("update")
    .limit(1);

  return result[0] ?? null;
}

/**
 * Input parameter payload for recording a booking cancellation in the database.
 */
export interface CancelBookingInput {
  /** Unique identifier of the booking being cancelled. */
  bookingId: string;
  /** Timestamp recording when the cancellation was finalized. */
  cancelledAt: Date;
  /** Categorized system reason for the cancellation. */
  cancellationReason:
    | "consumer_cancelled"
    | "helper_cancelled"
    | "helper_no_show"
    | "system_timeout"
    | "admin_override"
    | "consumer_no_show";
  /** Optional contextual note provided during cancellation. */
  cancellationNote: string | null;
}

/**
 * Updates a booking's status to "cancelled" and persists the cancellation metadata.
 *
 * @param tx - Active database transaction handle.
 * @param input - The cancellation parameters including booking ID, reason, and timestamps.
 * @returns The updated cancelled booking entity, or `null` if not found.
 */
export async function updateBookingStatusToCancelled(
  tx: Transaction,
  input: CancelBookingInput,
) {
  const { bookingId, cancelledAt, cancellationNote, cancellationReason } =
    input;

  // 1. Apply cancellation payload and return the updated database record
  const result = await tx
    .update(booking)
    .set({
      status: "cancelled",
      cancelledAt,
      cancellationNote,
      cancellationReason,
    })
    .where(eq(booking.id, bookingId))
    .returning();

  return result[0] ?? null;
}

/**
 * Input parameter payload for marking a booking as currently in progress.
 */
export interface MarkBookingInProgressInput {
  /** Unique identifier of the target booking. */
  bookingId: string;
  /** Helper ID assigned to the booking, used as an extra safety filter. */
  helperId: string;
}

/**
 * Updates a booking's status to "in_progress" to indicate physical work has started.
 *
 * Applies a strict `where` clause matching both the booking ID and the assigned helper ID
 * to prevent unauthorized state transitions at the database level.
 *
 * @param tx - Active database transaction handle.
 * @param input - The payload containing the booking ID and authorized helper ID.
 * @returns The updated in-progress booking entity, or `null` if not found.
 */
export async function markBookingInProgress(
  tx: Transaction,
  input: MarkBookingInProgressInput,
) {
  const { bookingId, helperId } = input;

  // 1. Transition status to in_progress if the helper ID matches the current assignment
  const result = await tx
    .update(booking)
    .set({
      status: "in_progress",
      inProgressAt: new Date(),
    })
    .where(and(eq(booking.id, bookingId), eq(booking.helperId, helperId)))
    .returning();

  return result[0] ?? null;
}

/**
 * Input parameter payload for marking a booking as awaiting consumer confirmation.
 */
export interface markAwaitingConfirmationInput {
  /** Unique identifier of the target booking. */
  bookingId: string;
  /** Helper ID assigned to the booking, used as an extra safety filter. */
  helperId: string;
}

/**
 * Updates a booking's status to "awaiting_confirmation" when a helper finishes the work.
 *
 * Applies a strict `where` clause matching both the booking ID and the assigned helper ID.
 *
 * @param tx - Active database transaction handle.
 * @param input - The payload containing the booking ID and authorized helper ID.
 * @returns The updated awaiting-confirmation booking entity, or `null` if not found.
 */
export async function markAwaitingConfirmation(
  tx: Transaction,
  input: markAwaitingConfirmationInput,
) {
  const { bookingId, helperId } = input;

  // 1. Transition status to awaiting_confirmation if the helper ID matches the current assignment
  const result = await tx
    .update(booking)
    .set({
      status: "awaiting_confirmation",
      awaitingConfirmationAt: new Date(),
    })
    .where(and(eq(booking.id, bookingId), eq(booking.helperId, helperId)))
    .returning();

  return result[0] ?? null;
}

/**
 * Input parameter payload for marking a booking as officially completed.
 */
export interface MarkBookingAsCompletedInput {
  /** Unique identifier of the target booking. */
  bookingId: string;
  /** Consumer ID owning the booking, used as an extra safety filter. */
  consumerId: string;
}

/**
 * Updates a booking's status to "completed" after the consumer confirms the work.
 *
 * Applies a strict `where` clause matching both the booking ID and the owning consumer ID
 * to ensure only the authorizing consumer triggers completion at the database layer.
 *
 * @param tx - Active database transaction handle.
 * @param input - The payload containing the booking ID and authorized consumer ID.
 * @returns The final completed booking entity, or `null` if not found.
 */
export async function markBookingAsCompleted(
  tx: Transaction,
  input: MarkBookingAsCompletedInput,
) {
  const { bookingId, consumerId } = input;

  // 1. Transition status to completed if the consumer ID matches the booking owner
  const result = await tx
    .update(booking)
    .set({
      status: "completed",
      completedAt: new Date(),
    })
    .where(and(eq(booking.id, bookingId), eq(booking.consumerId, consumerId)))
    .returning();

  return result[0] ?? null;
}