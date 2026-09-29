// Paylaşım modülünün UI ve sunucu tarafından ortak kullanılan saf tanımları.
// Node'a özgü hiçbir şey içermez → client component'lerden güvenle import edilir.

import type { MaliyetGirdi, MaliyetOranlar } from './maliyet'

export type PaylasimTurTip = 'SUNUM' | 'MALIYET'
export type PaylasimDurumTip = 'AKTIF' | 'IPTAL' | 'SURESI_DOLDU'
export type MaliyetGorunumTip = 'TAM' | 'KAR_GIZLI'

// Maliyet tablosu link oluşturulurken dondurulan anlık görüntü.
// Yalnızca girdiler + oranlar + görünüm saklanır; hesaplanan değerler
// render anında saf `maliyetHesapla` ile yeniden üretilir (birebir aynı sonuç).
export type MaliyetSnapshotPozisyon = {
  ad: string
  girdi: MaliyetGirdi
}

export type MaliyetSnapshot = {
  firmaAd: string
  tabloAd: string | null
  tarih: string
  gecerlilikTarihi: string | null
  oranlar: MaliyetOranlar
  gorunum: MaliyetGorunumTip
  pozisyonlar: MaliyetSnapshotPozisyon[]
}

// DB'deki durum + geçerlilik tarihine göre etkin durumu hesapla.
export function linkDurumHesapla(
  durum: PaylasimDurumTip,
  gecerlilikBitis: Date | string,
  now: Date = new Date()
): PaylasimDurumTip {
  if (durum === 'IPTAL') return 'IPTAL'
  return new Date(gecerlilikBitis).getTime() < now.getTime() ? 'SURESI_DOLDU' : 'AKTIF'
}

export const DURUM_ETIKET: Record<PaylasimDurumTip, string> = {
  AKTIF: 'Aktif',
  IPTAL: 'İptal',
  SURESI_DOLDU: 'Süresi doldu',
}

// KVKK: erişim kayıtları 1 yıl saklanır.
export const ERISIM_SAKLAMA_GUN = 365

// "alicikisi@firma.com" → "al***@firma.com"
export function maskeliEmail(email: string): string {
  const at = email.indexOf('@')
  if (at <= 0) return '***'
  const ilk = email.slice(0, Math.min(2, at))
  return `${ilk}***${email.slice(at)}`
}

// 4–6 haneli rastgele erişim şifresi (varsayılan 5 hane).
export function sifreGecerliMi(sifre: string): boolean {
  return /^\d{4,6}$/.test(sifre)
}
