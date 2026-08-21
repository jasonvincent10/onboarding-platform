import { describe, it, expect, beforeAll } from 'vitest'
import { encryptField, decryptField, isEncryptedValue, safeDecryptField } from './encryption'

// Dummy 64-hex-char (32-byte) key used only within this test process — has
// no relationship to any real ENCRYPTION_KEY and is not used to encrypt
// anything outside this file's own round-trip assertions.
const TEST_KEY = 'a1b2c3d4'.repeat(8)

beforeAll(() => {
  process.env.ENCRYPTION_KEY = TEST_KEY
})

describe('encryptField / decryptField', () => {
  it('round-trips plaintext through encrypt then decrypt', () => {
    const plaintext = 'AB123456C'
    const ciphertext = encryptField(plaintext)
    expect(decryptField(ciphertext)).toBe(plaintext)
  })

  it('produces a different ciphertext each time (random IV per call)', () => {
    const a = encryptField('same input')
    const b = encryptField('same input')
    expect(a).not.toBe(b)
    expect(decryptField(a)).toBe('same input')
    expect(decryptField(b)).toBe('same input')
  })

  it('stores ciphertext as three dot-separated base64 parts', () => {
    const ciphertext = encryptField('hello')
    expect(ciphertext.split('.')).toHaveLength(3)
  })

  it('throws when encrypting an empty string', () => {
    expect(() => encryptField('')).toThrow()
    expect(() => encryptField('   ')).toThrow()
  })

  it('throws on a malformed ciphertext (wrong number of parts)', () => {
    expect(() => decryptField('only.two')).toThrow()
    expect(() => decryptField('no-dots-at-all')).toThrow()
  })

  it('throws when the ciphertext has been tampered with (GCM auth failure)', () => {
    const ciphertext = encryptField('sensitive value')
    const [iv, authTag, data] = ciphertext.split('.')
    // Flip the ciphertext bytes without touching the auth tag
    const tampered = [iv, authTag, Buffer.from(data, 'base64').reverse().toString('base64')].join('.')
    expect(() => decryptField(tampered)).toThrow()
  })
})

describe('isEncryptedValue', () => {
  it('recognises a genuine encrypted value', () => {
    expect(isEncryptedValue(encryptField('AB123456C'))).toBe(true)
  })

  it('rejects plain text', () => {
    expect(isEncryptedValue('AB123456C')).toBe(false)
    expect(isEncryptedValue('')).toBe(false)
  })
})

describe('safeDecryptField', () => {
  it('returns null for null or undefined input without throwing', () => {
    expect(safeDecryptField(null)).toBeNull()
    expect(safeDecryptField(undefined)).toBeNull()
  })

  it('returns null (not throw) for garbage input', () => {
    expect(safeDecryptField('not.valid.ciphertext')).toBeNull()
  })

  it('returns the decrypted value for valid ciphertext', () => {
    const ciphertext = encryptField('12 AB 34 56 C')
    expect(safeDecryptField(ciphertext)).toBe('12 AB 34 56 C')
  })
})
