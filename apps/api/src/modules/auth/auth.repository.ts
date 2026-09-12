import {
  user,
  session,
  accountSchema,
  consumer,
  emailVerificationToken,
  type Transaction,
  helper,
} from "@dozo/db";
import { and, eq, gt } from "drizzle-orm";

export async function findUserByEmail(tx: Transaction, email: string) {
  const result = await tx
    .select()
    .from(user)
    .where(eq(user.email, email.trim().toLowerCase()))
    .limit(1);
  return result[0] ?? null;
}

export async function createUser(tx: Transaction, email: string, name: string) {
  const result = await tx
    .insert(user)
    .values({
      name: name,
      email: email.trim().toLowerCase(),
    })
    .returning();
  if (!result[0]) {
    throw new Error("User could not be created");
  }
  return result[0];
}

export async function createAccount(
  tx: Transaction,
  userId: string,
  provider: "credentials" | "google",
  passwordHash: string,
) {
  const result = await tx
    .insert(accountSchema)
    .values({
      userId: userId,
      provider: provider,
      passwordHash: passwordHash,
    })
    .returning();
  if (!result[0]) {
    throw new Error("Account could not be created");
  }
  return result[0];
}

export async function createConsumerProfile(
  tx: Transaction,
  userId: string,
  phone: string,
) {
  const result = await tx
    .insert(consumer)
    .values({
      userId,
      phone: phone,
    })
    .returning();
  if (!result[0]) {
    throw new Error("Consumer profile could not be created");
  }
  return result[0];
}

export async function createHelperProfile(
  tx: Transaction,
  userId: string,
  phone: string,
) {
  const result = await tx
    .insert(helper)
    .values({
      userId,
      phone,
    })
    .returning();
  if (!result[0]) {
    throw new Error("Helper profile could not be created");
  }
  return result[0];
}

export async function createEmailVerificationToken(
  tx: Transaction,
  userId: string,
  tokenHash: string,
  expiresAt: Date,
) {
  const result = await tx
    .insert(emailVerificationToken)
    .values({ userId, tokenHash, expiresAt })
    .returning();

  if (!result[0]) {
    throw new Error("Email verification token could not be created");
  }
  return result[0];
}

export async function findAccountsByUserId(
  tx: Transaction,
  userId: string,
) {
  return await tx
    .select()
    .from(accountSchema)
    .where(eq(accountSchema.userId, userId));
}

export async function createSession(
  tx: Transaction,
  userId: string,
  refreshTokenHash: string,
  expiresAt: Date,
) {
  const result = await tx
    .insert(session)
    .values({
      userId,
      expiresAt,
      refreshTokenHash,
    })
    .returning();
  if (!result[0]) {
    throw new Error("Session could not be created");
  }
  return result[0];
}

export async function findActiveSessionByRefreshTokenHash(
  tx: Transaction,
  refreshTokenHash: string,
) {
  const result = await tx
    .select()
    .from(session)
    .where(
      and(
        eq(session.refreshTokenHash, refreshTokenHash),
        gt(session.expiresAt, new Date()),
      ),
    )
    .limit(1);
  return result[0] ?? null;
}