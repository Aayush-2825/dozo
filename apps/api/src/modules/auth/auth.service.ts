import { db } from "@dozo/db";
import { ConflictError, ValidationError } from "@dozo/types";
import {
  createAccount,
  createUser,
  findUserByEmail,
  createConsumerProfile,
  createHelperProfile,
  createEmailVerificationToken,
  findAccountsByUserId,
  createSession,
} from "./auth.repository";
import { hashPassword, verifyPassword } from "./auth.hash";
import {
  generateVerificationToken,
  hashVerificationToken,
} from "./auth.verification";
import {
  generateAccessToken,
  generateRefreshToken,
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

