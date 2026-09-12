CREATE TYPE "provider_type" AS ENUM('credentials', 'google');--> statement-breakpoint
CREATE TABLE "user" (
	"id" varchar(255) PRIMARY KEY,
	"name" varchar(255),
	"email" varchar(255) NOT NULL UNIQUE,
	"email_verified_at" timestamp,
	"last_login_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "account" (
	"id" varchar(255) PRIMARY KEY,
	"user_id" varchar(255) NOT NULL,
	"provider" "provider_type" NOT NULL,
	"provider_account_id" varchar(255),
	"access_token" text,
	"refresh_token" text,
	"password_hash" varchar(255),
	"last_used_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "account_provider_account_id_unq" UNIQUE("provider","provider_account_id"),
	CONSTRAINT "account_user_id_provider_unq" UNIQUE("user_id","provider"),
	CONSTRAINT "account_provider_fields_check" CHECK (("provider" = 'credentials' AND "password_hash" IS NOT NULL AND "provider_account_id" IS NULL) OR ("provider" <> 'credentials' AND "provider_account_id" IS NOT NULL))
);
--> statement-breakpoint
CREATE TABLE "session" (
	"id" varchar(255) PRIMARY KEY,
	"user_id" varchar(255) NOT NULL,
	"refresh_token_hash" varchar(255) NOT NULL,
	"ip_address" varchar(255),
	"user_agent" text,
	"last_active_at" timestamp DEFAULT now() NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "mfa_backup_code" (
	"id" varchar(255) PRIMARY KEY,
	"mfa_enrollment_id" varchar(255) NOT NULL,
	"code_hash" varchar(255) NOT NULL,
	"used_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "mfa_enrollment" (
	"id" varchar(255) PRIMARY KEY,
	"user_id" varchar(255) NOT NULL,
	"secret" varchar(255) NOT NULL,
	"is_verified" boolean DEFAULT false NOT NULL,
	"verified_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "consumer" DROP CONSTRAINT "consumer_email_key";--> statement-breakpoint
ALTER TABLE "helper" DROP CONSTRAINT "helper_email_key";--> statement-breakpoint
ALTER TABLE "consumer" ADD COLUMN "cancellation_count" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "booking" ALTER COLUMN "cancellation_reason" SET DATA TYPE text;--> statement-breakpoint
DROP TYPE "cancellation_reason";--> statement-breakpoint
CREATE TYPE "cancellation_reason" AS ENUM('consumer_cancelled', 'helper_cancelled', 'helper_no_show', 'system_timeout', 'admin_override', 'consumer_no_show');--> statement-breakpoint
ALTER TABLE "booking" ALTER COLUMN "cancellation_reason" SET DATA TYPE "cancellation_reason" USING "cancellation_reason"::"cancellation_reason";--> statement-breakpoint
ALTER TABLE "consumer" DROP COLUMN "name";--> statement-breakpoint
ALTER TABLE "consumer" DROP COLUMN "email";--> statement-breakpoint
ALTER TABLE "consumer" DROP COLUMN "email_verified";--> statement-breakpoint
ALTER TABLE "helper" DROP COLUMN "name";--> statement-breakpoint
ALTER TABLE "helper" DROP COLUMN "email";--> statement-breakpoint
ALTER TABLE "booking" ALTER COLUMN "price" SET DATA TYPE numeric(12,2) USING "price"::numeric(12,2);--> statement-breakpoint
ALTER TABLE "payment" ALTER COLUMN "amount_paid" SET DATA TYPE numeric(12,2) USING "amount_paid"::numeric(12,2);--> statement-breakpoint
ALTER TABLE "payment" ALTER COLUMN "platform_commission" SET DATA TYPE numeric(12,2) USING "platform_commission"::numeric(12,2);--> statement-breakpoint
ALTER TABLE "payment" ALTER COLUMN "helper_payout" SET DATA TYPE numeric(12,2) USING "helper_payout"::numeric(12,2);--> statement-breakpoint
CREATE INDEX "booking_consumer_id_idx" ON "booking" ("consumer_id");--> statement-breakpoint
CREATE INDEX "booking_organisation_id_idx" ON "booking" ("organisation_id");--> statement-breakpoint
CREATE INDEX "booking_status_scheduled_at_idx" ON "booking" ("status","scheduled_at");--> statement-breakpoint
CREATE UNIQUE INDEX "booking_checkpoint_booking_type_idx" ON "booking_checkpoint" ("booking_id","type");--> statement-breakpoint
CREATE INDEX "payment_booking_id_idx" ON "payment" ("booking_id");--> statement-breakpoint
CREATE INDEX "payment_status_idx" ON "payment" ("status");--> statement-breakpoint
CREATE INDEX "payment_escrow_status_idx" ON "payment" ("escrow_status");--> statement-breakpoint
CREATE INDEX "helper_availability_helper_day_idx" ON "helper_availability" ("helper_id","day_of_week");--> statement-breakpoint
CREATE INDEX "account_user_id_idx" ON "account" ("user_id");--> statement-breakpoint
CREATE INDEX "session_user_id_idx" ON "session" ("user_id");--> statement-breakpoint
CREATE INDEX "session_refresh_token_hash_idx" ON "session" ("refresh_token_hash");--> statement-breakpoint
CREATE INDEX "session_expires_at_idx" ON "session" ("expires_at");--> statement-breakpoint
CREATE INDEX "mfa_backup_code_enrollment_id_idx" ON "mfa_backup_code" ("mfa_enrollment_id");--> statement-breakpoint
CREATE INDEX "mfa_backup_code_hash_idx" ON "mfa_backup_code" ("code_hash");--> statement-breakpoint
CREATE INDEX "mfa_enrollment_user_id_idx" ON "mfa_enrollment" ("user_id");--> statement-breakpoint
ALTER TABLE "account" ADD CONSTRAINT "account_user_id_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_user_id_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "mfa_backup_code" ADD CONSTRAINT "mfa_backup_code_mfa_enrollment_id_mfa_enrollment_id_fkey" FOREIGN KEY ("mfa_enrollment_id") REFERENCES "mfa_enrollment"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "mfa_enrollment" ADD CONSTRAINT "mfa_enrollment_user_id_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "consumer" ADD CONSTRAINT "consumer_cancellation_count_check" CHECK ("cancellation_count" >= 0);--> statement-breakpoint
ALTER TABLE "booking" ADD CONSTRAINT "booking_price_check" CHECK ("price" >= 0);--> statement-breakpoint
ALTER TABLE "booking" ADD CONSTRAINT "booking_coordinates_check" CHECK ("service_latitude_snapshot" BETWEEN -90 AND 90 AND "service_longitude_snapshot" BETWEEN -180 AND 180);--> statement-breakpoint
ALTER TABLE "booking" ADD CONSTRAINT "booking_cancellation_state_check" CHECK (("status" = 'cancelled') = ("cancelled_at" IS NOT NULL));--> statement-breakpoint
ALTER TABLE "booking_checkpoint" ADD CONSTRAINT "booking_checkpoint_coordinates_check" CHECK ("latitude" BETWEEN -90 AND 90 AND "longitude" BETWEEN -180 AND 180);--> statement-breakpoint
ALTER TABLE "payment" ADD CONSTRAINT "payment_amounts_check" CHECK ("amount_paid" >= 0 AND "platform_commission" >= 0 AND "helper_payout" >= 0 AND "amount_paid" = "platform_commission" + "helper_payout");--> statement-breakpoint
ALTER TABLE "location" ADD CONSTRAINT "location_coordinates_check" CHECK ("latitude" BETWEEN -90 AND 90 AND "longitude" BETWEEN -180 AND 180);--> statement-breakpoint
ALTER TABLE "helper_availability" ADD CONSTRAINT "availability_day_of_week_check" CHECK ("day_of_week" BETWEEN 0 AND 6);