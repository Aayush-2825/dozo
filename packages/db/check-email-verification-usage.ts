import pg from "pg";
import { env } from "./src/env";

async function main() {
  const client = new pg.Client({ connectionString: env.DATABASE_URL });
  await client.connect();
  const result = await client.query(`
    SELECT
      COUNT(*)::int AS total,
      COUNT(*) FILTER (WHERE used_at IS NOT NULL)::int AS used,
      COUNT(*) FILTER (WHERE expires_at < NOW())::int AS expired
    FROM email_verification_token
  `);
  console.table(result.rows);
  await client.end();
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
