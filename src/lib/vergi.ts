import type { VergiTuru, VergiOdemeYontemi } from '@prisma/client'

// Durum computed — DB'de tutulmaz: sonOdemeTarihi + odenenTutar'dan türetilir
export type VergiDurum = 'ODENMEDI' | 'ODENDI' | 'KISMI_ODENDI' | 'GECIKMIS'

export function vergiDurum(v: {
  odenenTutar: unknown
  tahakkukTutari: unknown
  sonOdemeTarihi: Date
}): VergiDurum {
  const odenen = Number(v.odenenTutar ?? 0)
  const tahakkuk = Number(v.tahakkukTutari)
  const bugun = new Date()
  bugun.setHours(0, 0, 0, 0)
  const son = new Date(v.sonOdemeTarihi)
  son.setHours(0, 0, 0, 0)

  if (odenen <= 0) return son < bugun ? 'GECIKMIS' : 'ODENMEDI'
  if (odenen >= tahakkuk) return 'ODENDI'
  return 'KISMI_ODENDI'
}

export const VERGI_TUR_ETIKET: Record<VergiTuru, string> = {
  KDV: 'KDV',
  MUHTASAR: 'Muhtasar',
  STOPAJ: 'Stopaj',
  GECICI_VERGI: 'Geçici Vergi',
  KURUMLAR: 'Kurumlar',
  SGK: 'SGK Primi',
  BAGKUR: 'BAĞ-KUR',
  DAMGA: 'Damga Vergisi',
  DIGER: 'Diğer',
}

export const VERGI_YONTEM_ETIKET: Record<VergiOdemeYontemi, string> = {
  BANKA: 'Banka',
  KREDI_KARTI: 'Kredi Kartı',
  NAKIT: 'Nakit',
}

export const VERGI_DURUM_ETIKET: Record<VergiDurum, string> = {
  ODENMEDI: 'Ödenmedi',
  ODENDI: 'Ödendi',
  KISMI_ODENDI: 'Kısmi Ödendi',
  GECIKMIS: 'Gecikmiş',
}

export const VERGI_DURUM_TONE: Record<VergiDurum, 'red' | 'green' | 'amber' | 'slate'> = {
  ODENMEDI: 'slate',
  ODENDI: 'green',
  KISMI_ODENDI: 'amber',
  GECIKMIS: 'red',
}

export const tl = (n: number | string) =>
  new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(Number(n) || 0)

export function yuvarla(n: number): number {
  return Math.round((Number(n) + Number.EPSILON) * 100) / 100
}

export function tarihTr(d: Date): string {
  return new Intl.DateTimeFormat('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(d)
}

// Aynı dönem etiketi: "2026-09" → bir sonraki ay "2026-10"
export function sonrakiDonem(donem: string): string {
  const m = donem.trim().match(/^(\d{4})-(\d{2})$/)
  if (m) {
    const y = Number(m[1])
    const ay = Number(m[2])
    const sonra = new Date(y, ay, 1) // ay 12 → yıl+1
    return `${sonra.getFullYear()}-${String(sonra.getMonth() + 1).padStart(2, '0')}`
  }
  return donem
}

export function gecmisDonem(donem: string): string {
  const m = donem.trim().match(/^(\d{4})-(\d{2})$/)
  if (m) {
    const y = Number(m[1])
    const ay = Number(m[2])
    const once = new Date(y, ay - 2, 1)
    return `${once.getFullYear()}-${String(once.getMonth() + 1).padStart(2, '0')}`
  }
  return donem
}