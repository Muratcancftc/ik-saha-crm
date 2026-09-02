import crypto from 'node:crypto'

const ALGO = 'aes-256-gcm'

function getKey(): Buffer {
  const key = process.env.ENCRYPTION_KEY
  if (!key) throw new Error('ENCRYPTION_KEY ortam değişkeni eksik')
  return Buffer.from(key, 'hex')
}

export function encrypt(plain: string): string {
  const iv = crypto.randomBytes(12)
  const cipher = crypto.createCipheriv(ALGO, getKey(), iv)
  const enc = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  return `${iv.toString('hex')}:${tag.toString('hex')}:${enc.toString('hex')}`
}

export function decrypt(payload: string): string {
  const [ivHex, tagHex, dataHex] = payload.split(':')
  if (!ivHex || !tagHex || !dataHex) throw new Error('Geçersiz şifreli veri')
  const decipher = crypto.createDecipheriv(ALGO, getKey(), Buffer.from(ivHex, 'hex'))
  decipher.setAuthTag(Buffer.from(tagHex, 'hex'))
  return Buffer.concat([
    decipher.update(Buffer.from(dataHex, 'hex')),
    decipher.final(),
  ]).toString('utf8')
}

// Görüntüleme için maskeleme. TC: son 3 hane + baştaki ilk hane gösterilir.
export function maskTC(tc: string): string {
  if (tc.length !== 11) return '•••••••••••'
  return `${tc[0]}•••••••${tc.slice(-3)}`
}

// IBAN: TR + son 4 hane gösterilir.
export function maskIBAN(iban: string): string {
  const clean = iban.replace(/\s+/g, '')
  if (clean.length < 8) return '••••••'
  return `••••••${clean.slice(-4)}`
}