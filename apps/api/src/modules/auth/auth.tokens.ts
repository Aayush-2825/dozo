import jwt from "jsonwebtoken";
import { createHash } from "node:crypto";
import type { Transaction } from "@dozo/db";
import { UnauthorizedError } from "@dozo/types";
import { env } from "../../utils/env";
import { findActiveSessionByRefreshTokenHash } from "./auth.repository";

const ACCESS_TOKEN_SECRET = env.JWT_ACCESS_SECRET;
const REFRESH_TOKEN_SECRET = env.JWT_REFRESH_SECRET;

export type ProfileType = "consumer" | "helper";

export interface TokenPayload {
  userId: string;
  profileTypes: ProfileType[];
}

export function generateAccessToken(payload: TokenPayload): string {
  return jwt.sign(payload, ACCESS_TOKEN_SECRET, {
    expiresIn: "15m",
  });
}

export function generateRefreshToken(payload: TokenPayload): {
  rawToken: string;
  hashedToken: string;
  expiresAt: Date;
} {
  const rawToken = jwt.sign(payload, REFRESH_TOKEN_SECRET, {
    expiresIn: "7d",
  });

  const hashedToken = hashRefreshToken(rawToken);

  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

  return {
    rawToken,
    hashedToken,
    expiresAt,
  };
}

export function hashRefreshToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function verifyAccessToken(token: string): TokenPayload {
  try {
    return jwt.verify(token, ACCESS_TOKEN_SECRET) as TokenPayload;
  } catch {
    throw new UnauthorizedError("Invalid or expired access token");
  }
}

export async function verifyRefreshToken(
  tx: Transaction,
  token: string,
): Promise<TokenPayload> {
  let payload: TokenPayload;
  try {
    payload = jwt.verify(token, REFRESH_TOKEN_SECRET) as TokenPayload;
  } catch {
    throw new UnauthorizedError("Invalid or expired refresh token");
  }

  const activeSession = await findActiveSessionByRefreshTokenHash(
    tx,
    hashRefreshToken(token),
  );

  if (!activeSession || activeSession.userId !== payload.userId) {
    throw new UnauthorizedError("Invalid or revoked refresh token");
  }

  return payload;
}

export function hasProfileType(
  payload: TokenPayload,
  profileType: ProfileType,
): boolean {
  return payload.profileTypes.includes(profileType);
}
