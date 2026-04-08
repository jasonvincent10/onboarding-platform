import crypto from 'crypto';

// ============================================================================
// AES-256-GCM Field-Level Encryption
// ============================================================================
// SERVER-SIDE ONLY — never import this in a client component.
//
// Usage:
//   import { encryptField, decryptField } from '@/lib/encryption';
//   const ciphertext = encryptField('AB123456C');       // store this in _encrypted column
//   const plaintext  = decryptField(ciphertext);        // read it back
//
// Storage format in DB: "iv.authTag.ciphertext" (base64-encoded, dot-separated)
// ============================================================================

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;        // 12 bytes is the recommended IV length for GCM
const AUTH_TAG_LENGTH = 16;  // 16 bytes (128 bits) authentication tag

/**
 * Get the encryption key from environment variables.
 * Must be a 64-character hex string (32 bytes).
 */
function getEncryptionKey(): Buffer {
  const keyHex = process.env.ENCRYPTION_KEY;

  if (!keyHex) {
    throw new Error(
      'ENCRYPTION_KEY environment variable is not set. ' +
      'Generate one with: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"'
    );
  }

  if (keyHex.length !== 64 || !/^[0-9a-fA-F]+$/.test(keyHex)) {
    throw new Error(
      'ENCRYPTION_KEY must be exactly 64 hex characters (32 bytes). ' +
      'Generate one with: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"'
    );
  }

  return Buffer.from(keyHex, 'hex');
}

/**
 * Encrypt a plaintext string using AES-256-GCM.
 * Returns a string in the format: "iv.authTag.ciphertext" (all base64-encoded).
 *
 * Each call generates a unique random IV, so encrypting the same plaintext
 * twice produces different ciphertext. This is correct and expected.
 */
export function encryptField(plaintext: string): string {
  if (!plaintext || plaintext.trim() === '') {
    throw new Error('Cannot encrypt empty string');
  }

  const key = getEncryptionKey();
  const iv = crypto.randomBytes(IV_LENGTH);

  const cipher = crypto.createCipheriv(ALGORITHM, key, iv, {
    authTagLength: AUTH_TAG_LENGTH,
  });

  const encrypted = Buffer.concat([
    cipher.update(plaintext, 'utf8'),
    cipher.final(),
  ]);

  const authTag = cipher.getAuthTag();

  // Store as: iv.authTag.ciphertext (dot-separated base64)
  return [
    iv.toString('base64'),
    authTag.toString('base64'),
    encrypted.toString('base64'),
  ].join('.');
}

/**
 * Decrypt a ciphertext string that was encrypted with encryptField().
 * Expects the format: "iv.authTag.ciphertext" (all base64-encoded).
 *
 * Throws if the data has been tampered with (GCM authentication failure).
 */
export function decryptField(encryptedValue: string): string {
  if (!encryptedValue || !encryptedValue.includes('.')) {
    throw new Error('Invalid encrypted value format — expected iv.authTag.ciphertext');
  }

  const parts = encryptedValue.split('.');
  if (parts.length !== 3) {
    throw new Error(
      `Invalid encrypted value format — expected 3 dot-separated parts, got ${parts.length}`
    );
  }

  const key = getEncryptionKey();
  const iv = Buffer.from(parts[0], 'base64');
  const authTag = Buffer.from(parts[1], 'base64');
  const ciphertext = Buffer.from(parts[2], 'base64');

  if (iv.length !== IV_LENGTH) {
    throw new Error(`Invalid IV length: expected ${IV_LENGTH}, got ${iv.length}`);
  }

  if (authTag.length !== AUTH_TAG_LENGTH) {
    throw new Error(`Invalid auth tag length: expected ${AUTH_TAG_LENGTH}, got ${authTag.length}`);
  }

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv, {
    authTagLength: AUTH_TAG_LENGTH,
  });

  decipher.setAuthTag(authTag);

  const decrypted = Buffer.concat([
    decipher.update(ciphertext),
    decipher.final(), // This throws if auth tag verification fails (tampered data)
  ]);

  return decrypted.toString('utf8');
}

/**
 * Check if a string looks like an encrypted field value.
 * Useful for determining whether a value needs decryption.
 */
export function isEncryptedValue(value: string): boolean {
  if (!value || !value.includes('.')) return false;
  const parts = value.split('.');
  if (parts.length !== 3) return false;

  // Check each part is valid base64
  const base64Regex = /^[A-Za-z0-9+/]+=*$/;
  return parts.every((part) => base64Regex.test(part));
}

/**
 * Safely attempt to decrypt a field. Returns null if the value is empty/null,
 * or if decryption fails (logs warning instead of throwing).
 * Use this when reading from the DB where the field might be null.
 */
export function safeDecryptField(encryptedValue: string | null | undefined): string | null {
  if (!encryptedValue) return null;

  try {
    return decryptField(encryptedValue);
  } catch (error) {
    console.error('Failed to decrypt field:', error instanceof Error ? error.message : error);
    return null;
  }
}
