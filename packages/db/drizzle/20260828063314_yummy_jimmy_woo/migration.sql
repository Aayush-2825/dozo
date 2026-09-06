CREATE TYPE "booking_status" AS ENUM('requested', 'searching', 'match_failed', 'accepted', 'arrived', 'in_progress', 'awaiting_confirmation', 'completed', 'cancelled');--> statement-breakpoint
CREATE TYPE "cancellation_reason" AS ENUM('consumer', 'helper', 'no_show', 'system', 'payment_failure');--> statement-breakpoint
CREATE TYPE "checkpoint_type" AS ENUM('start', 'mid_job', 'end');--> statement-breakpoint
CREATE TYPE "escrow_status" AS ENUM('not_held', 'held', 'released', 'refund_pending', 'refunded');--> statement-breakpoint
CREATE TYPE "kyc_status" AS ENUM('pending', 'verified', 'rejected', 'document_review', 'video_review', 'expired');--> statement-breakpoint
CREATE TYPE "location_type" AS ENUM('home', 'work', 'other');--> statement-breakpoint
CREATE TYPE "payment_method" AS ENUM('card', 'bank_transfer', 'paypal', 'crypto', 'cash', 'other');--> statement-breakpoint
CREATE TYPE "payment_status" AS ENUM('created', 'pending', 'authorized', 'captured', 'failed', 'refund_pending', 'refunded', 'partially_refunded');--> statement-breakpoint
CREATE TABLE "consumer" (
	"id" varchar(255) PRIMARY KEY,
	"name" varchar(255) NOT NULL,
	"email" varchar(255) NOT NULL UNIQUE,
	"email_verified" boolean DEFAULT false NOT NULL,
	"phone" varchar(20),
	"phone_verified" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "helper" (
	"id" varchar(255) PRIMARY KEY,
	"name" varchar(255) NOT NULL,
	"email" varchar(255) NOT NULL UNIQUE,
	"phone" varchar(50) NOT NULL UNIQUE,
	"organisation_id" varchar(255),
	"is_live" boolean DEFAULT false NOT NULL,
	"banned_until" timestamp,
	"cancellation_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "organisation" (
	"id" varchar(255) PRIMARY KEY,
	"name" varchar(255) NOT NULL,
	"email" varchar(255) NOT NULL UNIQUE,
	"email_verified" boolean DEFAULT false NOT NULL,
	"phone" varchar(50),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "booking" (
	"id" varchar(255) PRIMARY KEY,
	"consumer_id" varchar(255) NOT NULL,
	"helper_id" varchar(255),
	"organisation_id" varchar(255),
	"status" "booking_status" DEFAULT 'requested'::"booking_status" NOT NULL,
	"service_type" varchar(100) NOT NULL,
	"subservice_type" varchar(100),
	"accepted_at" timestamp,
	"arrived_at" timestamp,
	"in_progress_at" timestamp,
	"awaiting_confirmation_at" timestamp,
	"completed_at" timestamp,
	"cancelled_at" timestamp,
	"scheduled_at" timestamp,
	"cancellation_reason" "cancellation_reason",
	"cancellation_note" varchar(500),
	"price" double precision NOT NULL,
	"service_address_snapshot" varchar(500) NOT NULL,
	"service_latitude_snapshot" double precision NOT NULL,
	"service_longitude_snapshot" double precision NOT NULL,
	"organisation_name_snapshot" varchar(255),
	"helper_name_snapshot" varchar(255),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "booking_checkpoint" (
	"id" varchar(255) PRIMARY KEY,
	"booking_id" varchar(255) NOT NULL,
	"type" "checkpoint_type" NOT NULL,
	"latitude" double precision NOT NULL,
	"longitude" double precision NOT NULL,
	"captured_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payment" (
	"id" varchar(255) PRIMARY KEY,
	"booking_id" varchar(255) NOT NULL,
	"consumer_id" varchar(255) NOT NULL,
	"helper_id" varchar(255),
	"organisation_id" varchar(255),
	"amount_paid" double precision NOT NULL,
	"platform_commission" double precision NOT NULL,
	"helper_payout" double precision NOT NULL,
	"status" "payment_status" DEFAULT 'pending'::"payment_status" NOT NULL,
	"escrow_status" "escrow_status" DEFAULT 'not_held'::"escrow_status" NOT NULL,
	"payment_method" "payment_method" NOT NULL,
	"gateway_id" varchar(255),
	"gateway_transaction_id" varchar(255) UNIQUE,
	"gateway_payment_method" varchar(100),
	"gateway_payment_status" varchar(100),
	"idempotency_key" varchar(255) UNIQUE,
	"authorized_at" timestamp,
	"captured_at" timestamp,
	"released_at" timestamp,
	"refunded_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "valid_escrow_state" CHECK (
        CASE 
          WHEN "escrow_status" = 'not_held' 
            THEN "status" IN ('created', 'pending', 'authorized', 'failed')
          WHEN "escrow_status" = 'held' 
            THEN "status" IN ('authorized', 'captured')
          WHEN "escrow_status" = 'released' 
            THEN "status" = 'captured'
          WHEN "escrow_status" IN ('refund_pending', 'refunded') 
            THEN "status" IN ('refund_pending', 'refunded', 'partially_refunded')
          ELSE FALSE
        END
      )
);
--> statement-breakpoint
CREATE TABLE "location" (
	"id" varchar(255) PRIMARY KEY,
	"name" "location_type" DEFAULT 'home'::"location_type" NOT NULL,
	"address" varchar(500) NOT NULL,
	"latitude" double precision NOT NULL,
	"longitude" double precision NOT NULL,
	"consumer_id" varchar(255),
	"organisation_id" varchar(255) UNIQUE,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "location_owner_check" CHECK (("consumer_id" IS NOT NULL AND "organisation_id" IS NULL) OR ("consumer_id" IS NULL AND "organisation_id" IS NOT NULL))
);
--> statement-breakpoint
CREATE TABLE "kyc" (
	"id" varchar(255) PRIMARY KEY,
	"organisation_id" varchar(255),
	"helper_id" varchar(255),
	"document_type" varchar(100),
	"document_url" varchar(500),
	"video_kyc_url" varchar(500),
	"document_status" "kyc_status" DEFAULT 'pending'::"kyc_status" NOT NULL,
	"video_kyc_status" "kyc_status" DEFAULT 'pending'::"kyc_status" NOT NULL,
	"overall_status" "kyc_status" DEFAULT 'pending'::"kyc_status" NOT NULL,
	"rejection_reason" varchar(500),
	"submitted_at" timestamp DEFAULT now() NOT NULL,
	"document_reviewed_at" timestamp,
	"video_reviewed_at" timestamp,
	"overall_reviewed_at" timestamp,
	CONSTRAINT "kyc_owner_check" CHECK (("helper_id" IS NOT NULL AND "organisation_id" IS NULL) OR ("helper_id" IS NULL AND "organisation_id" IS NOT NULL))
);
--> statement-breakpoint
CREATE TABLE "helper_availability" (
	"id" varchar(255) PRIMARY KEY,
	"helper_id" varchar(255) NOT NULL,
	"day_of_week" integer NOT NULL,
	"start_time" time NOT NULL,
	"end_time" time NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "availability_time_order_check" CHECK ("start_time" < "end_time")
);
--> statement-breakpoint
CREATE UNIQUE INDEX "helper_one_active_booking_idx" ON "booking" ("helper_id") WHERE status IN ('accepted', 'arrived', 'in_progress');--> statement-breakpoint
ALTER TABLE "helper" ADD CONSTRAINT "helper_organisation_id_organisation_id_fkey" FOREIGN KEY ("organisation_id") REFERENCES "organisation"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "booking" ADD CONSTRAINT "booking_consumer_id_consumer_id_fkey" FOREIGN KEY ("consumer_id") REFERENCES "consumer"("id");--> statement-breakpoint
ALTER TABLE "booking" ADD CONSTRAINT "booking_helper_id_helper_id_fkey" FOREIGN KEY ("helper_id") REFERENCES "helper"("id");--> statement-breakpoint
ALTER TABLE "booking" ADD CONSTRAINT "booking_organisation_id_organisation_id_fkey" FOREIGN KEY ("organisation_id") REFERENCES "organisation"("id");--> statement-breakpoint
ALTER TABLE "booking_checkpoint" ADD CONSTRAINT "booking_checkpoint_booking_id_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "booking"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "payment" ADD CONSTRAINT "payment_booking_id_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "booking"("id");--> statement-breakpoint
ALTER TABLE "payment" ADD CONSTRAINT "payment_consumer_id_consumer_id_fkey" FOREIGN KEY ("consumer_id") REFERENCES "consumer"("id");--> statement-breakpoint
ALTER TABLE "payment" ADD CONSTRAINT "payment_helper_id_helper_id_fkey" FOREIGN KEY ("helper_id") REFERENCES "helper"("id");--> statement-breakpoint
ALTER TABLE "payment" ADD CONSTRAINT "payment_organisation_id_organisation_id_fkey" FOREIGN KEY ("organisation_id") REFERENCES "organisation"("id");--> statement-breakpoint
ALTER TABLE "location" ADD CONSTRAINT "location_consumer_id_consumer_id_fkey" FOREIGN KEY ("consumer_id") REFERENCES "consumer"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "location" ADD CONSTRAINT "location_organisation_id_organisation_id_fkey" FOREIGN KEY ("organisation_id") REFERENCES "organisation"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "kyc" ADD CONSTRAINT "kyc_organisation_id_organisation_id_fkey" FOREIGN KEY ("organisation_id") REFERENCES "organisation"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "kyc" ADD CONSTRAINT "kyc_helper_id_helper_id_fkey" FOREIGN KEY ("helper_id") REFERENCES "helper"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "helper_availability" ADD CONSTRAINT "helper_availability_helper_id_helper_id_fkey" FOREIGN KEY ("helper_id") REFERENCES "helper"("id") ON DELETE CASCADE;