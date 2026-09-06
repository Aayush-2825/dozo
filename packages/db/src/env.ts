import { createEnv } from "@dozo/env";
import { z } from "zod";

export const env = createEnv(
  z.object({
    DATABASE_URL: z.url(),
  }),
);