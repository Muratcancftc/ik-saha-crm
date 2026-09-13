import crypto from 'node:crypto'

// Website entegrasyonu için sunucu-tarafı yardımcılar.
// WEBSITE_INTEGRATION_SECRET kesinlikle client'a sızmaz; timing-safe karşılaştırma kullanılır.

const SECRET = process.env.WEBSITE_INTEGRATION_SECRET ?? ''
const MODE = process.env.WEBSITE_INTEGRATION_MODE ?? 'test'
const ALLOWED_ORIGINS = (process.env.WEBSITE_ALLOWED_ORIGINS ?? '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean)

// Sabit-zamanlı string karşılaştırma (timing attack koruması)
export function timingSafeEqualStr(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  const ba = Buffer.from(a)
  const bb = Buffer.from(b)
  return crypto.timingSafeEqual(ba, bb)
}

// Authorization: Bearer <secret> doğrula
export function integrationSecretOk(header: string | null): boolean {
  if (!SECRET || !header) return false
  const token = header.startsWith('Bearer ') ? header.slice('Bearer '.length) : header
  return timingSafeEqualStr(token, SECRET)
}

// Kaynak etiketi: istek source göndermezse mode'a göre website / website_test
export function kaynakBelirle(bodySource?: string): string {
  if (bodySource) return bodySource
  return MODE === 'production' ? 'website' : 'website_test'
}

// Basit IP tabanlı in-memory rate limit (dakikada ~20 istek — gerçek kullanıcıyı engellemez)
const hits = new Map<string, { count: number; resetAt: number }>()
export function rateLimitOk(key: string, limit = 20, windowMs = 60_000): boolean {
  const now = Date.now()
  const cur = hits.get(key)
  if (!cur || now > cur.resetAt) {
    hits.set(key, { count: 1, resetAt: now + windowMs })
    return true
  }
  cur.count += 1
  return cur.count <= limit
}

// Yalnızca güvenilir origin'lere CORS
export function corsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get('origin')
  if (origin && ALLOWED_ORIGINS.includes(origin)) {
    return {
      'Access-Control-Allow-Origin': origin,
      'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Idempotency-Key',
    }
  }
  return {}
}

export function json(data: unknown, status = 200, extra: Record<string, string> = {}) {
  return Response.json(data, { status, headers: extra })
}

// ---------- Basit doğrulama yardımcıları ----------
const EPOSTA = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function temizle(v: unknown, max = 255): string {
  return typeof v === 'string' ? v.trim().slice(0, max) : ''
}

export function geçerliEposta(v: string): boolean {
  return !v || EPOSTA.test(v)
}

export function geçerliTelefon(v: string): boolean {
  if (!v) return true
  return /^[+0-9][0-9 ()-]{6,20}$/.test(v)
}

// CV dosyası doğrulama (tip + boyut)
export const CV_IZINLI = new Set(['pdf', 'doc', 'docx'])
export const CV_MAX_BYTE = 5 * 1024 * 1024

export function cvUzanti(dosyaAdi: string): string {
  const i = dosyaAdi.lastIndexOf('.')
  return i >= 0 ? dosyaAdi.slice(i + 1).toLowerCase() : ''
}

export function cvGeçerli(dosyaAdi: string, byte: number): string | null {
  const uz = cvUzanti(dosyaAdi)
  if (!CV_IZINLI.has(uz)) return 'Yalnızca PDF, DOC veya DOCX yüklenebilir.'
  if (byte > CV_MAX_BYTE) return 'CV dosyası 5MB sınırını aşıyor.'
  if (byte === 0) return 'Boş dosya yüklenemez.'
  return null
}