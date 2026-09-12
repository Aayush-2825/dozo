import { pgEnum } from "drizzle-orm/pg-core";

export const bookingStatusEnum = pgEnum("booking_status", [
  "requested",
  "searching",
  "match_failed",
  "accepted",
  "arrived",
  "in_progress",
  "awaiting_confirmation",
  "completed",
  "cancelled",
]);

export const kycStatusEnum = pgEnum("kyc_status", [
  "pending",
  "verified",
  "rejected",
  "document_review",
  "video_review",
  "expired",
]);

export const cancellationReasonEnum = pgEnum("cancellation_reason", [
  "consumer_cancelled",
  "helper_cancelled",
  "helper_no_show",
  "system_timeout",
  "admin_override",
  "consumer_no_show",
]);

export const checkpointTypeEnum = pgEnum("checkpoint_type", [
  "start",
  "mid_job",
  "end",
]);

export const locationTypeEnum = pgEnum("location_type", [
  "home",
  "work",
  "other",
]);

export const paymentStatusEnum = pgEnum("payment_status", [
  "created",
  "pending",
  "authorized",
  "captured",
  "failed",
  "refund_pending",
  "refunded",
  "partially_refunded",
]);

export const paymentMethodEnum = pgEnum("payment_method", [
  "card",
  "bank_transfer",
  "paypal",
  "crypto",
  "cash",
  "other",
]);

export const escrowStatusEnum = pgEnum("escrow_status", [
  "not_held",
  "held",
  "released",
  "refund_pending",
  "refunded",
]);


export const providerTypeEnum = pgEnum("provider_type", [
  "credentials",
  "google",
])