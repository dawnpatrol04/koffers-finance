/**
 * Encryption Utility for Sensitive Data
 *
 * Uses AES-256-GCM encryption to securely store sensitive data like Plaid access tokens.
 * IMPORTANT: This module should only be used server-side (API routes, server actions).
 */

import crypto from 'crypto';

const algorithm = 'aes-256-gcm';
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY;

if (!ENCRYPTION_KEY) {
  throw new Error(
    'ENCRYPTION_KEY environment variable is required. Generate one with: openssl rand -hex 32'
  );
}

// Convert hex string to Buffer (32 bytes for AES-256)
const key = Buffer.from(ENCRYPTION_KEY, 'hex');

if (key.length !== 32) {
  throw new Error('ENCRYPTION_KEY must be a 64-character hex string (32 bytes)');
}

/**
 * Encrypts a plaintext string using AES-256-GCM
 *
 * @param text - The plaintext to encrypt
 * @returns Encrypted string in format: iv:authTag:encrypted
 */
export function encrypt(text: string): string {
  // Generate a random initialization vector (16 bytes)
  const iv = crypto.randomBytes(16);

  // Create cipher
  const cipher = crypto.createCipheriv(algorithm, key, iv);

  // Encrypt the text
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  // Get authentication tag for GCM mode
  const authTag = cipher.getAuthTag();

  // Return all components concatenated with colons
  // Format: iv:authTag:encrypted
  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
}

/**
 * Decrypts an encrypted string using AES-256-GCM
 *
 * @param encryptedText - The encrypted string in format: iv:authTag:encrypted
 * @returns Decrypted plaintext string
 */
export function decrypt(encryptedText: string): string {
  // Split the encrypted text into its components
  const [ivHex, authTagHex, encrypted] = encryptedText.split(':');

  if (!ivHex || !authTagHex || !encrypted) {
    throw new Error('Invalid encrypted text format');
  }

  // Convert hex strings back to Buffers
  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');

  // Create decipher
  const decipher = crypto.createDecipheriv(algorithm, key, iv);

  // Set authentication tag
  decipher.setAuthTag(authTag);

  // Decrypt the text
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}

/**
 * Generates a secure encryption key
 *
 * @returns A 64-character hex string suitable for ENCRYPTION_KEY
 */
export function generateEncryptionKey(): string {
  return crypto.randomBytes(32).toString('hex');
}

// Example usage:
// const encrypted = encrypt('my-plaid-access-token-xyz');
// console.log(encrypted); // "a1b2c3...:d4e5f6...:g7h8i9..."
//
// const decrypted = decrypt(encrypted);
// console.log(decrypted); // "my-plaid-access-token-xyz"
