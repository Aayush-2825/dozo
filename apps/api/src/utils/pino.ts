// apps/api/src/utils/pino.ts
import { env } from "./env";

export const appLogger = {
  development: {
    transport: {
      target: "pino-pretty",
      options: {
        translateTime: "HH:MM:ss Z",
        ignore: "pid,hostname",
      },
    },
  },
  production: true,
  test: false,
} as const;

export const currentLogger = appLogger[env.NODE_ENV];
