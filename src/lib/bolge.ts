import type { Bolge } from '@prisma/client'

export const BOLGE_LIST: Bolge[] = ['kocaeli', 'balikesir']

export const BOLGE_ETIKET: Record<Bolge, string> = {
  kocaeli: 'Kocaeli',
  balikesir: 'Balıkesir',
}

export const BOLGE_TONE: Record<Bolge, 'indigo' | 'amber'> = {
  kocaeli: 'indigo',
  balikesir: 'amber',
}

export function bolgeEtiket(b: Bolge | null | undefined): string {
  if (!b) return '—'
  return BOLGE_ETIKET[b]
}

export function bolgeGecerli(v: string | undefined): Bolge | null {
  if (v === 'kocaeli' || v === 'balikesir') return v
  return null
}

const KOCAELI_ANAHTARLARI = [
  'kocaeli', 'gebze', 'izmit', 'derince', 'korfez', 'kartepe', 'golcuk', 'basiskele',
  'cayirova', 'darica', 'kandira', 'dilovasi',
]

const BALIKESIR_ANAHTARLARI = [
  'balikesir', 'karesi', 'altieylul', 'bandirma', 'edremit', 'burhaniye', 'gonen',
  'susurluk', 'bigadic', 'erdek', 'sindirgi', 'manyas', 'ivrindi', 'gomec', 'havran', 'savaştepe',
]

// Website formundaki il/ilçe metninden bölgeyi tahmin et (eşleşmezse null → panelden atanır)
export function bolgeCikarim(metin?: string | null): Bolge | null {
  if (!metin) return null
  const t = metin.toLocaleLowerCase('tr-TR')
  if (KOCAELI_ANAHTARLARI.some((k) => t.includes(k))) return 'kocaeli'
  if (BALIKESIR_ANAHTARLARI.some((k) => t.includes(k))) return 'balikesir'
  return null
}