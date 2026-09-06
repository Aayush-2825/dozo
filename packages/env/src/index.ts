import { config } from "dotenv";
import { existsSync } from "node:fs";
import path from "node:path";
import { z } from "zod";

let isLoaded = false;

function findWorkspaceRoot(startDirectory: string) {
  let directory = path.resolve(startDirectory);

  while (true) {
    if (existsSync(path.join(directory, "pnpm-workspace.yaml"))) {
      return directory;
    }

    const parentDirectory = path.dirname(directory);
    if (parentDirectory === directory) {
      return path.resolve(startDirectory);
    }

    directory = parentDirectory;
  }
}

export function loadEnv() {
  if (isLoaded) {
    return;
  }

  const rootDirectory = findWorkspaceRoot(process.cwd());
  const envFiles = [
    path.join(rootDirectory, ".env.local"),
    path.join(rootDirectory, ".env"),
  ].filter(existsSync);

  if (envFiles.length > 0) {
    config({ path: envFiles });
  }

  isLoaded = true;
}

export function createEnv<T extends z.ZodRawShape>(schema: z.ZodObject<T>) {
  loadEnv();

  const parsed = schema.safeParse(process.env);

  if (!parsed.success) {
    throw new Error(
      `Invalid environment variables:\n${JSON.stringify(parsed.error.format(), null, 2)}`,
    );
  }

  return parsed.data;
}