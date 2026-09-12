import { db } from "@dozo/db";
import { RedisClient } from "@dozo/redis";
import {
  findByIdForUpdate,
  lockHelperForUpdate,
  findActiveBookingForHelper,
  assignHelper,
  updateBookingStatusToCancelled,
  markBookingInProgress,
  markAwaitingConfirmation,
  markBookingAsCompleted,
} from "./booking.repository";
import { NotFoundError, ConflictError, ForbiddenError } from "@dozo/types";
import * as helperService from "../helper/helper.service";
import * as consumerService from "../consumer/consumer.service";
import { processBookingCancellationRefund } from "../payment/payment.service";
import { verifyOtpWithAttempts } from "./booking.otp";

/**
 * Orchestrates the acceptance of a booking request by a helper.
 *
 * Executes within an isolated database transaction using row-level locking (`FOR UPDATE`)
 * on both the booking and helper records. This guarantees strict concurrency control,
 * preventing race conditions where:
 * 1. Multiple helpers attempt to accept the same booking simultaneously.
 * 2. A single helper attempts to accept multiple jobs concurrently.
 *
 * @param bookingId - Unique identifier of the target booking to accept.
 * @param userId - Authenticated account ID of the helper accepting the job.
 * @returns The updated booking entity with "accepted" status.
 * @throws {NotFoundError} If either the booking or the helper record does not exist.
 * @throws {ConflictError} If the booking is no longer available, the helper already has an active job, or assignment fails.
 */
export async function acceptBooking(bookingId: string, userId: string) {
  return await db.transaction(async (tx) => {
    const helper = await helperService.findByUserId(tx, userId);
    if (!helper) {
      throw new NotFoundError("Helper profile not found");
    }

    // 1. Acquire row-level lock on the target booking and verify availability
    const existingBooking = await findByIdForUpdate(tx, bookingId);
    if (!existingBooking) {
      throw new NotFoundError("Booking not found");
    }

    if (existingBooking.status !== "requested") {
      throw new ConflictError("Booking is no longer available");
    }

    // 2. Acquire row-level lock on the helper to serialize concurrent acceptance requests
    const activeHelper = await lockHelperForUpdate(tx, helper.id);
    if (!activeHelper) {
      throw new NotFoundError("Helper not found");
    }

    // 3. Verify helper availability while holding the helper lock
    const activeBooking = await findActiveBookingForHelper(tx, helper.id);
    if (activeBooking) {
      throw new ConflictError("Helper already has an active booking");
    }

    // 4. Assign the booking to the helper and return the updated record
    const updatedBooking = await assignHelper(tx, bookingId, helper.id);
    if (!updatedBooking) {
      throw new ConflictError("Failed to accept booking");
    }

    return updatedBooking;
  });
}

/**
 * Input parameter payload for canceling an existing booking.
 */
export interface CancelBookingInput {
  /** Unique identifier of the target booking to cancel. */
  bookingId: string;
  /** Entity details initiating the cancellation request. */
  initiatedBy: {
    id: string;
    role: "consumer" | "helper" | "admin" | "system";
  };
  /** Categorized reason code for the cancellation. */
  reason:
    | "consumer_cancelled"
    | "helper_cancelled"
    | "helper_no_show"
    | "system_timeout"
    | "admin_override"
    | "consumer_no_show";
  /** Optional descriptive note explaining the cancellation context. */
  note?: string;
}

/**
 * Handles the cancellation of an active or pending booking.
 *
 * Runs inside a database transaction to ensure atomic state updates. Performs
 * authorization checks, applies penalty rules for helpers or consumers, processes
 * payment refunds according to the cancellation reason, and transitions the booking status.
 *
 * @param input - The cancellation parameters including booking ID, initiator, reason, and optional note.
 * @returns The updated booking entity with "cancelled" status.
 * @throws {NotFoundError} If the specified booking cannot be found.
 * @throws {ConflictError} If the booking is in a non-cancellation state.
 * @throws {ForbiddenError} If the actor initiating cancellation lacks ownership of the booking.
 */
export async function cancelBooking(input: CancelBookingInput) {
  const { bookingId, initiatedBy, reason, note } = input;

  return await db.transaction(async (tx) => {
    let actorId = initiatedBy.id;
    if (initiatedBy.role === "consumer") {
      const consumer = await consumerService.findByUserId(tx, initiatedBy.id);
      if (!consumer) {
        throw new NotFoundError("Consumer profile not found");
      }
      actorId = consumer.id;
    } else if (initiatedBy.role === "helper") {
      const helper = await helperService.findByUserId(tx, initiatedBy.id);
      if (!helper) {
        throw new NotFoundError("Helper profile not found");
      }
      actorId = helper.id;
    }

    // 1. Fetch and acquire row-level lock on the target booking
    const existingBooking = await findByIdForUpdate(tx, bookingId);
    if (!existingBooking) {
      throw new NotFoundError("Booking not found");
    }

    // 2. Validate that the current booking status permits cancellation
    const cancelableStatuses = [
      "requested",
      "searching",
      "accepted",
      "arrived",
    ];

    if (!cancelableStatuses.includes(existingBooking.status)) {
      throw new ConflictError(
        `Booking cannot be canceled in state '${existingBooking.status}'`,
      );
    }

    // 3. Enforce role-based access control based on initiator identity
    if (
      initiatedBy.role === "consumer" &&
      existingBooking.consumerId !== actorId
    ) {
      throw new ForbiddenError("You are not authorized to cancel this booking");
    }

    if (
      initiatedBy.role === "helper" &&
      existingBooking.helperId !== actorId
    ) {
      throw new ForbiddenError("You are not authorized to cancel this booking");
    }

    // 4. Evaluate and apply penalization rules for helper or consumer
    const requiresHelperPenalty =
      initiatedBy.role === "helper" ||
      (initiatedBy.role === "system" && reason === "helper_no_show");

    const requiresConsumerPenalty =
      initiatedBy.role === "consumer" ||
      (initiatedBy.role === "system" && reason === "consumer_no_show");

    if (requiresHelperPenalty && existingBooking.helperId) {
      await helperService.applyCancellationPenalty(tx, {
        helperId: existingBooking.helperId,
        bookingStatus: existingBooking.status,
      });
    }

    if (requiresConsumerPenalty) {
      await consumerService.recordConsumerCancellation(tx, {
        consumerId: existingBooking.consumerId,
        bookingStatus: existingBooking.status,
      });
    }

    // 5. Calculate and execute refund processing if applicable
    await processBookingCancellationRefund(
      tx,
      bookingId,
      reason,
    );

    // 6. Update booking status to cancelled and persist metadata
    const updatedBooking = await updateBookingStatusToCancelled(tx, {
      bookingId,
      cancelledAt: new Date(),
      cancellationReason: reason,
      cancellationNote: note ?? null,
    });

    return updatedBooking;
  });
}

/**
 * Initiates the active work phase for a booking by validating a start OTP.
 *
 * Verifies that the assigned helper is authorized and that the booking is in the
 * 'arrived' state. Uses a rate-limited OTP verification mechanism stored in Redis 
 * to prevent brute-force attacks. Upon success, transitions the booking to "in_progress".
 *
 * @param bookingId - Unique identifier of the booking to start.
 * @param userId - Authenticated account ID of the helper starting the job.
 * @param startOtp - The One-Time Password provided by the consumer to verify job start.
 * @param redis - Redis client instance used to fetch and track OTP attempts.
 * @returns The updated booking entity in "in_progress" status.
 * @throws {NotFoundError} If the target booking does not exist.
 * @throws {ForbiddenError} If the requesting helper is not assigned to the booking.
 * @throws {ConflictError} If the booking is not in 'arrived' status or the OTP is missing/invalid.
 */
export async function startJob(
  bookingId: string,
  userId: string,
  startOtp: string,
  redis: RedisClient,
) {
  const otpKey = `booking::otp:start:${bookingId}`;
  const attemptsKey = `booking::otp:attempts:${bookingId}`;
  const MAX_ATTEMPTS = 3;

  return await db.transaction(async (tx) => {
    const helper = await helperService.findByUserId(tx, userId);
    if (!helper) {
      throw new NotFoundError("Helper profile not found");
    }

    // 1. Fetch and acquire row-level lock on the booking record
    const booking = await findByIdForUpdate(tx, bookingId);

    if (!booking) {
      throw new NotFoundError("Booking not found");
    }

    // 2. Authorize helper assignment
    if (booking.helperId !== helper.id) {
      throw new ForbiddenError("You are not authorized to start this booking");
    }

    // 3. Ensure the booking is in a valid state to begin execution
    if (booking.status !== "arrived") {
      throw new ConflictError(
        `Cannot start job from state '${booking.status}'`,
      );
    }

    // 4. Verify OTP against Redis, enforcing the maximum attempt limit
    await verifyOtpWithAttempts(
      otpKey,
      attemptsKey,
      startOtp,
      redis,
      MAX_ATTEMPTS,
    );

    // 5. Update booking status to in-progress
    return await markBookingInProgress(tx, {
      bookingId,
      helperId: helper.id,
    });
  });
}

/**
 * Concludes the active work phase for a booking by validating an end OTP.
 *
 * Ensures the helper is authorized and the job is currently "in_progress". Utilizes
 * a rate-limited OTP verification to confirm the consumer agrees the physical work 
 * has concluded. Transitions the booking status to "awaiting_confirmation".
 *
 * @param bookingId - Unique identifier of the booking to end.
 * @param userId - Authenticated account ID of the helper ending the job.
 * @param endOtp - The One-Time Password provided by the consumer to verify job end.
 * @param redis - Redis client instance used to fetch and track OTP attempts.
 * @returns The updated booking entity in "awaiting_confirmation" status.
 * @throws {NotFoundError} If the target booking does not exist.
 * @throws {ForbiddenError} If the requesting helper is not assigned to the booking.
 * @throws {ConflictError} If the booking is not in 'in_progress' status or the OTP is invalid.
 */
export async function endJob(
  bookingId: string,
  userId: string,
  endOtp: string,
  redis: RedisClient,
) {
  const otpKey = `booking::otp:end:${bookingId}`;
  const attemptsKey = `booking::otp:attempts:${bookingId}`;
  const MAX_ATTEMPTS = 3;

  return await db.transaction(async (tx) => {
    const helper = await helperService.findByUserId(tx, userId);
    if (!helper) {
      throw new NotFoundError("Helper profile not found");
    }

    // 1. Fetch and acquire row-level lock on the booking record
    const booking = await findByIdForUpdate(tx, bookingId);

    if (!booking) {
      throw new NotFoundError("Booking not found");
    }

    // 2. Authorize helper assignment
    if (booking.helperId !== helper.id) {
      throw new ForbiddenError("You are not authorized to end this booking");
    }

    // 3. Ensure the booking is currently in progress
    if (booking.status !== "in_progress") {
      throw new ConflictError(`Cannot end job from state '${booking.status}'`);
    }

    // 4. Verify OTP against Redis, enforcing the maximum attempt limit
    await verifyOtpWithAttempts(
      otpKey,
      attemptsKey,
      endOtp,
      redis,
      MAX_ATTEMPTS,
    );

    // 5. Update booking status to signal it is ready for consumer sign-off
    return await markAwaitingConfirmation(tx, {
      bookingId,
      helperId: helper.id,
    });
  });
}

/**
 * Finalizes a booking after the consumer confirms the work is satisfactorily completed.
 *
 * Acts as the final step in the job lifecycle. Verifies consumer authorization,
 * ensures the booking is awaiting confirmation, and transitions the state to "completed".
 *
 * @param bookingId - Unique identifier of the booking to confirm.
 * @param userId - Authenticated account ID of the consumer confirming completion.
 * @returns The final updated booking entity in "completed" status.
 * @throws {NotFoundError} If the target booking does not exist.
 * @throws {ForbiddenError} If the requesting consumer does not own the booking.
 * @throws {ConflictError} If the booking is not in 'awaiting_confirmation' status.
 */
export async function confirmCompletion(bookingId: string, userId: string) {
  return await db.transaction(async (tx) => {
    const consumer = await consumerService.findByUserId(tx, userId);
    if (!consumer) {
      throw new NotFoundError("Consumer profile not found");
    }

    // 1. Fetch and acquire row-level lock on the booking record
    const existingBooking = await findByIdForUpdate(tx, bookingId);
    if (!existingBooking) {
      throw new NotFoundError("Booking not found");
    }
    
    // 2. Enforce role-based access control based on consumer identity
    if (existingBooking.consumerId !== consumer.id) {
      throw new ForbiddenError(
        "You are not authorized to confirm this booking",
      );
    }
    
    // 3. Validate that the job has been marked as ended by the helper
    if (existingBooking.status !== "awaiting_confirmation") {
      throw new ConflictError(
        `Cannot confirm completion from state '${existingBooking.status}'`,
      );
    }
    
    // 4. Finalize the booking status to completed
    const updatedBooking = await markBookingAsCompleted(tx, {
      bookingId,
      consumerId: consumer.id,
    });
    
    return updatedBooking;
  });
}