import 'server-only'
import { getAyar } from './ayar'
import type { MaliyetOranlar } from './maliyet'

// Varsayılan maliyet parametreleri (Ayarlar'da yoksa kullanılır).
export const MALIYET_ORAN_VARSAYILAN = {
  sgkIsci: 0.14,
  issizlikIsci: 0.01,
  sgkIsveren: 0.155,
  issizlikIsveren: 0.02,
  gelirVergisi: 0.15,
  damgaVergisi: 0.00759,
} as const

export const MALIYET_ORAN_ANAHTAR: Record<keyof typeof MALIYET_ORAN_VARSAYILAN, string> = {
  sgkIsci: 'MALIYET_SGK_ISCI',
  issizlikIsci: 'MALIYET_ISSIZLIK_ISCI',
  sgkIsveren: 'MALIYET_SGK_ISVEREN',
  issizlikIsveren: 'MALIYET_ISSIZLIK_ISVEREN',
  gelirVergisi: 'MALIYET_GELIR_VERGISI',
  damgaVergisi: 'MALIYET_DAMGA_VERGISI',
}

export const PAYLASIM_LINK_GUN_ANAHTAR = 'PAYLASIM_LINK_GUN'
export const PAYLASIM_LINK_GUN_VARSAYILAN = 30

// Ayarlar'daki oranları oku (yoksa varsayılan). Değerler ondalık oran olarak saklanır.
export async function maliyetOranlariOku(): Promise<MaliyetOranlar> {
  const [sgkIsci, issizlikIsci, sgkIsveren, issizlikIsveren, gelirVergisi, damgaVergisi] =
    await Promise.all([
      getAyar(MALIYET_ORAN_ANAHTAR.sgkIsci, String(MALIYET_ORAN_VARSAYILAN.sgkIsci)),
      getAyar(MALIYET_ORAN_ANAHTAR.issizlikIsci, String(MALIYET_ORAN_VARSAYILAN.issizlikIsci)),
      getAyar(MALIYET_ORAN_ANAHTAR.sgkIsveren, String(MALIYET_ORAN_VARSAYILAN.sgkIsveren)),
      getAyar(MALIYET_ORAN_ANAHTAR.issizlikIsveren, String(MALIYET_ORAN_VARSAYILAN.issizlikIsveren)),
      getAyar(MALIYET_ORAN_ANAHTAR.gelirVergisi, String(MALIYET_ORAN_VARSAYILAN.gelirVergisi)),
      getAyar(MALIYET_ORAN_ANAHTAR.damgaVergisi, String(MALIYET_ORAN_VARSAYILAN.damgaVergisi)),
    ])
  return { sgkIsci, issizlikIsci, sgkIsveren, issizlikIsveren, gelirVergisi, damgaVergisi }
}

export async function paylasimLinkGunOku(): Promise<number> {
  const v = await getAyar(PAYLASIM_LINK_GUN_ANAHTAR, String(PAYLASIM_LINK_GUN_VARSAYILAN))
  const n = Number(v)
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : PAYLASIM_LINK_GUN_VARSAYILAN
}
