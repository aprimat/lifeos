import * as Crypto from 'expo-crypto';

/**
 * PLACEHOLDER AUTHENTICATION — local only.
 * Accounts are checked on this device with a salted SHA-256 hash. This is not a
 * substitute for real server-side authentication and will be replaced (with the
 * local hashes discarded) when the backend exists. See IMPLEMENTATION_PLAN.md §8.
 */

export function newId(): string {
  return Crypto.randomUUID();
}

export async function hashPassword(password: string, salt: string): Promise<string> {
  return Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, `${salt}:${password}`);
}

export function newSalt(): string {
  return Crypto.randomUUID();
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function validateEmail(email: string): string | null {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) ? null : 'Enter a valid email address.';
}

export function validatePassword(password: string): string | null {
  return password.length >= 8 ? null : 'Use at least 8 characters.';
}
