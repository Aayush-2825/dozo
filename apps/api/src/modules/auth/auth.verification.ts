import { createHash } from 'node:crypto';


export async function generateVerificationToken() {
  const token = crypto.randomUUID();

  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

  return {
    token,
    expiresAt,
  };
}


export function hashVerificationToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}
