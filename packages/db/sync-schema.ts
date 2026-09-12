import pg from "pg";
import { env } from "./src/env";

const client = new pg.Client({ connectionString: env.DATABASE_URL });

async function main() {
  await client.connect();

  try {
    await client.query("BEGIN");
    await client.query('ALTER TABLE "consumer" ADD COLUMN IF NOT EXISTS "user_id" varchar(255)');
    await client.query('ALTER TABLE "helper" ADD COLUMN IF NOT EXISTS "user_id" varchar(255)');
    await client.query(`
      INSERT INTO "user" ("id", "email")
      SELECT "id", 'consumer-' || "id" || '@migration.invalid'
      FROM "consumer"
      ON CONFLICT ("id") DO NOTHING
    `);
    await client.query(`
      INSERT INTO "user" ("id", "email")
      SELECT "id", 'helper-' || "id" || '@migration.invalid'
      FROM "helper"
      ON CONFLICT ("id") DO NOTHING
    `);
    await client.query('UPDATE "consumer" SET "user_id" = "id" WHERE "user_id" IS NULL');
    await client.query('UPDATE "helper" SET "user_id" = "id" WHERE "user_id" IS NULL');
    await client.query('ALTER TABLE "consumer" ALTER COLUMN "user_id" SET NOT NULL');
    await client.query('ALTER TABLE "helper" ALTER COLUMN "user_id" SET NOT NULL');
    await client.query('ALTER TABLE "consumer" ADD CONSTRAINT "consumer_user_id_unq" UNIQUE ("user_id")');
    await client.query('ALTER TABLE "helper" ADD CONSTRAINT "helper_user_id_unq" UNIQUE ("user_id")');
    await client.query('CREATE INDEX IF NOT EXISTS "consumer_user_id_idx" ON "consumer" ("user_id")');
    await client.query('ALTER TABLE "consumer" ADD CONSTRAINT "consumer_user_id_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE');
    await client.query('ALTER TABLE "helper" ADD CONSTRAINT "helper_user_id_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE');
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  }

  await client.end();
}

main().catch(async (error) => {
  console.error(error);
  await client.end().catch(() => undefined);
  process.exitCode = 1;
});
