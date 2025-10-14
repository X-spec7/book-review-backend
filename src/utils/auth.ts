import crypto from 'crypto';
import argon2 from 'argon2';

export function generateRefreshTokenPlain(length = 64): string {
  return crypto.randomBytes(length).toString('hex'); // e.g. 128 hex chars
}

export async function hashRefreshToken(token: string): Promise<string> {
  // we use argon2id by default; this is a good cost for servers — tune in prod
  return argon2.hash(token);
}

export async function verifyRefreshTokenHash(hash: string, token: string): Promise<boolean> {
  try {
    return await argon2.verify(hash, token);
  } catch {
    return false;
  }
}

// password hashing
export async function hashPassword(password: string): Promise<string> {
  return argon2.hash(password);
}
export async function verifyPassword(hash: string, password: string): Promise<boolean> {
  try {
    return await argon2.verify(hash, password);
  } catch {
    return false;
  }
}
