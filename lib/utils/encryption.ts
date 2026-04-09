const ALGORITHM = 'AES-GCM'
const KEY_LENGTH = 256
const IV_LENGTH = 12

function hexToBuffer(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2)
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.slice(i, i + 2), 16)
  }
  return bytes
}

function bufferToHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
}

async function getKey(): Promise<CryptoKey> {
  const keyHex = process.env.FIELD_ENCRYPTION_KEY
  if (!keyHex || keyHex.length !== 64) {
    throw new Error(
      'FIELD_ENCRYPTION_KEY must be a 64-character hex string (32 bytes). ' +
      'Generate with: openssl rand -hex 32'
    )
  }
  const keyBytes = hexToBuffer(keyHex)
  return crypto.subtle.importKey('raw', keyBytes.buffer as ArrayBuffer, { name: ALGORITHM, length: KEY_LENGTH }, false, ['encrypt', 'decrypt'])
}

export async function encrypt(plaintext: string): Promise<string> {
  const key = await getKey()
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH))
  const encoded = new TextEncoder().encode(plaintext)
  const ciphertext = await crypto.subtle.encrypt({ name: ALGORITHM, iv }, key, encoded)
  return `${bufferToHex(iv.buffer as ArrayBuffer)}:${bufferToHex(ciphertext)}`
}

export async function decrypt(ciphertext: string): Promise<string> {
  const [ivHex, ctHex] = ciphertext.split(':')
  if (!ivHex || !ctHex) throw new Error('Invalid ciphertext format')
  const key = await getKey()
  const iv = hexToBuffer(ivHex)
  const ct = hexToBuffer(ctHex)
  const plaintext = await crypto.subtle.decrypt({ name: ALGORITHM, iv: iv.buffer as ArrayBuffer }, key, ct.buffer as ArrayBuffer)
  return new TextDecoder().decode(plaintext)
}