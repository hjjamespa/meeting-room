import { createCipheriv, createDecipheriv, randomBytes } from 'crypto'

const ALGORITHM = 'aes-256-gcm'

function getEncryptionKey(): Buffer {
  const key = process.env.SETTINGS_ENCRYPTION_KEY
  if (!key || key.length < 32) {
    throw new Error('SETTINGS_ENCRYPTION_KEY must be at least 32 characters')
  }
  // 32 bytes for AES-256
  return Buffer.from(key.slice(0, 32), 'utf-8')
}

/**
 * AES-256-GCM 암호화
 * 반환: iv:authTag:encrypted (hex)
 */
export function encrypt(plaintext: string): string {
  const key = getEncryptionKey()
  const iv = randomBytes(16)
  const cipher = createCipheriv(ALGORITHM, key, iv)
  let encrypted = cipher.update(plaintext, 'utf8', 'hex')
  encrypted += cipher.final('hex')
  const authTag = cipher.getAuthTag().toString('hex')
  return `${iv.toString('hex')}:${authTag}:${encrypted}`
}

/**
 * AES-256-GCM 복호화
 */
export function decrypt(ciphertext: string): string {
  const key = getEncryptionKey()
  const [ivHex, authTagHex, encrypted] = ciphertext.split(':')
  if (!ivHex || !authTagHex || !encrypted) {
    throw new Error('Invalid encrypted format')
  }
  const decipher = createDecipheriv(ALGORITHM, key, Buffer.from(ivHex, 'hex'))
  decipher.setAuthTag(Buffer.from(authTagHex, 'hex'))
  let decrypted = decipher.update(encrypted, 'hex', 'utf8')
  decrypted += decipher.final('utf8')
  return decrypted
}

/**
 * 키 마스킹: sk-ant-...abc1 → sk-ant-****abc1
 */
export function maskApiKey(key: string): string {
  if (key.length <= 8) return '****'
  return key.slice(0, 7) + '****' + key.slice(-4)
}
