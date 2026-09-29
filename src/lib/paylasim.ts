import 'server-only'
import crypto from 'node:crypto'
import { cookies, headers } from 'next/headers'
import { SignJWT, jwtVerify } from 'jose'
import bcrypt from 'bcryptjs'

// ---------------------------------------------------------------
// Token üretimi / hash
// ---------------------------------------------------------------

// 32 bayt kriptografik rastgele → base64url (URL'de güvenli, ~43 karakter).
export function tokenUret(): string {
  return crypto.randomBytes(32).toString('base64url')
}

// DB'de yalnızca hash saklanır; düz token asla tutulmaz.
export function tokenHash(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex')
}

// ---------------------------------------------------------------
// Erişim şifresi (opsiyonel, 4–6 hane)
// ---------------------------------------------------------------

export async function sifreHashle(sifre: string): Promise<string> {
  return bcrypt.hash(sifre, 10)
}

export async function sifreDogrula(sifre: string, hash: string): Promise<boolean> {
  return bcrypt.compare(sifre, hash)
}

// 5 haneli rastgele şifre (kolay okunur, 0 ile başlayabilir).
export function sifreRastgele(uzunluk = 5): string {
  let s = ''
  for (let i = 0; i < uzunluk; i++) s += crypto.randomInt(0, 10).toString()
  return s
}

// ---------------------------------------------------------------
// Açılmış link oturumu (httpOnly + secure çerez, 24 saat)
// ---------------------------------------------------------------

export const PAYLASIM_COOKIE = 'paylasim_oturum'
const OTURUM_SURESI_SAAT = 24

type PaylasimOturum = { linkId: number }

export async function oturumImzala(linkId: number): Promise<string> {
  const key = new TextEncoder().encode(process.env.SESSION_SECRET)
  return new SignJWT({ linkId })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${OTURUM_SURESI_SAAT}h`)
    .sign(key)
}

export async function oturumCoz(token: string | undefined): Promise<PaylasimOturum | null> {
  if (!token) return null
  try {
    const key = new TextEncoder().encode(process.env.SESSION_SECRET)
    const { payload } = await jwtVerify(token, key, { algorithms: ['HS256'] })
    const linkId = Number((payload as { linkId?: unknown }).linkId)
    return Number.isFinite(linkId) && linkId > 0 ? { linkId } : null
  } catch {
    return null
  }
}

export async function oturumKur(linkId: number): Promise<void> {
  const store = await cookies()
  store.set(PAYLASIM_COOKIE, await oturumImzala(linkId), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: OTURUM_SURESI_SAAT * 60 * 60,
  })
}

export async function oturumOku(linkId: number): Promise<boolean> {
  const store = await cookies()
  const oturum = await oturumCoz(store.get(PAYLASIM_COOKIE)?.value)
  return oturum?.linkId === linkId
}

// ---------------------------------------------------------------
// İstek meta bilgisi (erişim kaydı için)
// ---------------------------------------------------------------

export async function istekMeta(): Promise<{ ip: string | null; userAgent: string | null }> {
  const h = await headers()
  const ip =
    h.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    h.get('x-real-ip') ||
    null
  return { ip, userAgent: h.get('user-agent') }
}

export function metaFromRequest(req: Request): { ip: string | null; userAgent: string | null } {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || req.headers.get('x-real-ip') || null
  return { ip, userAgent: req.headers.get('user-agent') }
}

// ---------------------------------------------------------------
// Paylaşım linkinin temel URL'i (mail ile paylaşılır)
// ---------------------------------------------------------------

export function paylasimBaseUrl(): string {
  return (
    process.env.PAYLASIM_BASE_URL?.replace(/\/$/, '') ||
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '') ||
    'https://crm.atalayik.com.tr'
  )
}

export async function paylasimBaseUrlIstek(): Promise<string> {
  const h = await headers()
  const host = h.get('x-forwarded-host') || h.get('host')
  if (host) {
    const proto = h.get('x-forwarded-proto') || (process.env.NODE_ENV === 'production' ? 'https' : 'http')
    return `${proto}://${host}`
  }
  return paylasimBaseUrl()
}

export function paylasimLink(token: string, base?: string): string {
  return `${base ?? paylasimBaseUrl()}/p/${token}`
}
