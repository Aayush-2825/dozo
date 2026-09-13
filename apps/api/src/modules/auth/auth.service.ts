import { db } from "@dozo/db";
import { ConflictError, UnauthorizedError, ValidationError } from "@dozo/types";
import {
  createAccount,
  createUser,
  findUserByEmail,
  createConsumerProfile,
  createHelperProfile,
  createEmailVerificationToken,
  findAccountsByUserId,
  createSession,
  consumeEmailVerificationToken,
  deleteSessionByRefreshToken,
  rotateSessionByRefreshToken,
  deleteSessionsByUserId,
  findUserById,
  markUserEmailVerified,
} from "./auth.repository";
import { hashPassword, verifyPassword } from "./auth.hash";
import {
  generateVerificationToken,
  hashVerificationToken,
} from "./auth.verification";
import {
  generateAccessToken,
  generateRefreshToken,
  hashRefreshToken,
  verifyRefreshToken,
} from "./auth.tokens";
import * as consumerService from "../consumer/consumer.service";
import * as helperService from "../helper/helper.service";

export interface inputRegisterUser {
  profileType: "consumer" | "helper" | "admin" | "organization";
  email: string;
  password: string;
  name: string;
  phone: string;
}

export async function registerUser(input: inputRegisterUser) {
  const { profileType, email, password, name, phone } = input;

  if (profileType !== "consumer" && profileType !== "helper") {
    throw new ValidationError(
      `Registration for ${profileType} is not supported`,
    );
  }

  const hashedPassword = await hashPassword(password);
  const { token: rawVerificationToken, expiresAt } =
    await generateVerificationToken();
  const hashedToken = hashVerificationToken(rawVerificationToken);

  return await db.transaction(async (tx) => {
    const existingUser = await findUserByEmail(tx, email);
    if (existingUser) {
      throw new ConflictError("User with this email already exists");
    }

    const newUser = await createUser(tx, email, name);
    await createAccount(tx, newUser.id, "credentials", hashedPassword);
    await createEmailVerificationToken(tx, newUser.id, hashedToken, expiresAt);

    switch (profileType) {
      case "consumer":
        await createConsumerProfile(tx, newUser.id, phone);
        break;
      case "helper":
        await createHelperProfile(tx, newUser.id, phone);
        break;
    }

    return {
      userId: newUser.id,
      profileType,
      rawVerificationToken,
    };
  });
}

export async function loginUser(email: string, password: string) {
  return await db.transaction(async (tx) => {
    const existingUser = await findUserByEmail(tx, email);
    if (!existingUser) {
      throw new ValidationError("Invalid email or password");
    }

    const existingAccounts = await findAccountsByUserId(tx, existingUser.id);
    const existingAccountWithCredentials = existingAccounts.find(
      (account) => account.provider === "credentials",
    );
    if (existingAccounts.length === 0) {
      throw new ValidationError("Invalid email or password");
    } else if (!existingAccountWithCredentials) {
      throw new ValidationError(
        "This account is registered with a different provider. Please use the appropriate login method.",
      );
    }
    const isPasswordValid = await verifyPassword(
      password,
      existingAccountWithCredentials.passwordHash ?? "",
    );
    if (!isPasswordValid) {
      throw new ValidationError("Invalid email or password");
    }

    const emailVerified = existingUser.emailVerifiedAt !== null;
    if (!emailVerified) {
      throw new ValidationError("Email not verified");
      // send email verification token again
    }

    const profileTypes = [] as ("consumer" | "helper")[];
    if (await consumerService.hasProfile(tx, existingUser.id)) {
      profileTypes.push("consumer");
    }
    if (await helperService.hasProfile(tx, existingUser.id)) {
      profileTypes.push("helper");
    }
    const accessToken = generateAccessToken({
      userId: existingUser.id,
      profileTypes,
    });
    const refreshToken = generateRefreshToken({
      userId: existingUser.id,
      profileTypes,
    });
    await createSession(
      tx,
      existingUser.id,
      refreshToken.hashedToken,
      refreshToken.expiresAt,
    );

    return {
      user: existingUser,
      accessToken,
      refreshToken: refreshToken.rawToken,
    };
  });
}

export async function logoutUser(refreshToken: string) {
  return await db.transaction(async (tx) => {
    await verifyRefreshToken(tx, refreshToken);
    await deleteSessionByRefreshToken(tx, hashRefreshToken(refreshToken));
  });
}

export async function refreshAccessToken(refreshToken: string) {
  return await db.transaction(async (tx) => {
    const payload = await verifyRefreshToken(tx, refreshToken);
    const replacedSession = await rotateSessionByRefreshToken(
      tx,
      hashRefreshToken(refreshToken),
      payload.userId,
    );
    if (!replacedSession) {
      throw new UnauthorizedError("Invalid or revoked refresh token");
    }

    const profileTypes = [] as ("consumer" | "helper")[];
    if (await consumerService.hasProfile(tx, payload.userId)) {
      profileTypes.push("consumer");
    }
    if (await helperService.hasProfile(tx, payload.userId)) {
      profileTypes.push("helper");
    }

    const nextPayload = {
      userId: payload.userId,
      profileTypes,
    };
    const accessToken = generateAccessToken(nextPayload);
    const nextRefreshToken = generateRefreshToken(nextPayload);
    await createSession(
      tx,
      payload.userId,
      nextRefreshToken.hashedToken,
      nextRefreshToken.expiresAt,
    );

    return {
      accessToken,
      refreshToken: nextRefreshToken.rawToken,
    };
  });
}

export async function logoutAllDevices(userId: string) {
  return await db.transaction((tx) => deleteSessionsByUserId(tx, userId));
}

export async function verifyEmail(rawToken: string) {
  if (!rawToken.trim()) {
    throw new ValidationError("Email verification token is required");
  }

  const tokenHash = hashVerificationToken(rawToken);
  return await db.transaction(async (tx) => {
    const token = await consumeEmailVerificationToken(tx, tokenHash);
    if (!token) {
      throw new ValidationError("Invalid or expired email verification token");
    }

    const verifiedUser = await markUserEmailVerified(tx, token.userId);
    if (!verifiedUser) {
      throw new ValidationError("Unable to verify email address");
    }

    return {
      userId: verifiedUser.id,
      emailVerifiedAt: verifiedUser.emailVerifiedAt,
    };
  });
}

export async function getUserProfile(userId: string) {
  return await db.transaction(async (tx) => {
    const existingUser = await findUserById(tx, userId);
    if (!existingUser) {
      throw new ValidationError("User not found");
    }

    const consumerProfile = await consumerService.findByUserId(tx, userId);
    const helperProfile = await helperService.findByUserId(tx, userId);
    const profiles = [] as Array<{
      type: "consumer" | "helper";
      details: Record<string, unknown>;
    }>;

    if (consumerProfile) {
      profiles.push({
        type: "consumer",
        details: {
          id: consumerProfile.id,
          phone: consumerProfile.phone,
          phoneVerified: consumerProfile.phoneVerified,
        },
      });
    }

    if (helperProfile) {
      profiles.push({
        type: "helper",
        details: {
          id: helperProfile.id,
          phone: helperProfile.phone,
          organisationId: helperProfile.organisationId,
          isLive: helperProfile.isLive,
          bannedUntil: helperProfile.bannedUntil,
        },
      });
    }

    return {
      user: {
        id: existingUser.id,
        name: existingUser.name,
        email: existingUser.email,
      },
      profileTypes: profiles.map((profile) => profile.type),
      profiles,
    };
  });
}