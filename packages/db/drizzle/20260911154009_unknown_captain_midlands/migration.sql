CREATE TABLE "email_verification_token" (
	"id" varchar(255) PRIMARY KEY,
	"user_id" varchar(255) NOT NULL,
	"token_hash" varchar(255) NOT NULL,
	"expires_at" timestamp NOT NULL,
	"used_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "consumer" ADD COLUMN "user_id" varchar(255);--> statement-breakpoint
ALTER TABLE "helper" ADD COLUMN "user_id" varchar(255);--> statement-breakpoint
INSERT INTO "user" ("id", "email")
SELECT "id", 'consumer-' || "id" || '@migration.invalid'
FROM "consumer"
ON CONFLICT ("id") DO NOTHING;--> statement-breakpoint
INSERT INTO "user" ("id", "email")
SELECT "id", 'helper-' || "id" || '@migration.invalid'
FROM "helper"
ON CONFLICT ("id") DO NOTHING;--> statement-breakpoint
UPDATE "consumer" SET "user_id" = "id" WHERE "user_id" IS NULL;--> statement-breakpoint
UPDATE "helper" SET "user_id" = "id" WHERE "user_id" IS NULL;--> statement-breakpoint
ALTER TABLE "consumer" ALTER COLUMN "user_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "helper" ALTER COLUMN "user_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "consumer" ADD CONSTRAINT "consumer_user_id_unq" UNIQUE("user_id");--> statement-breakpoint
ALTER TABLE "helper" ADD CONSTRAINT "helper_user_id_unq" UNIQUE("user_id");--> statement-breakpoint
CREATE INDEX "consumer_user_id_idx" ON "consumer" ("user_id");--> statement-breakpoint
CREATE INDEX "email_verification_token_user_id_idx" ON "email_verification_token" ("user_id");--> statement-breakpoint
CREATE INDEX "email_verification_token_hash_idx" ON "email_verification_token" ("token_hash");--> statement-breakpoint
CREATE INDEX "email_verification_token_expires_at_idx" ON "email_verification_token" ("expires_at");--> statement-breakpoint
ALTER TABLE "consumer" ADD CONSTRAINT "consumer_user_id_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "helper" ADD CONSTRAINT "helper_user_id_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "email_verification_token" ADD CONSTRAINT "email_verification_token_user_id_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE;