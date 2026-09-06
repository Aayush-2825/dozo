import { drizzle } from "drizzle-orm/node-postgres";
import { env } from "./env";
export const db = drizzle(env.DATABASE_URL);


export type Transaction = Parameters<
  Parameters<typeof db.transaction>[0]
>[0];