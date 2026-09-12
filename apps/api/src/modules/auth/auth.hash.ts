import * as argon2 from "argon2";

export async function hashPassword(password: string) {
  return await argon2.hash(password, {
    type: argon2.argon2id,
    memoryCost: 1 << 16, // 65536 KB
    timeCost: 3,
    parallelism: 4,
    hashLength: 32,
  });
}

export async function verifyPassword(password: string, hash: string) {
  try {
    return await argon2.verify(hash, password);
  } catch (error) {
    return false;
  }
}