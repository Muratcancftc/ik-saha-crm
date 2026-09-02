export const ISCI_DURUM: Record<string, { label: string; tone: string }> = {
  aktif: { label: 'Aktif', tone: 'green' },
  pasif: { label: 'Pasif', tone: 'slate' },
  kara_liste: { label: 'Kara Liste', tone: 'red' },
}

export const ATAMA_DURUM: Record<string, { label: string; tone: string }> = {
  atandi: { label: 'Atandı', tone: 'blue' },
  onaylandi: { label: 'Onaylandı', tone: 'indigo' },
  tamamlandi: { label: 'Tamamlandı', tone: 'green' },
  iptal: { label: 'İptal', tone: 'red' },
}

export const PUANTAJ_DURUM: Record<string, { label: string; tone: string }> = {
  geldi: { label: 'Geldi', tone: 'green' },
  gec: { label: 'Geç', tone: 'amber' },
  gelmedi: { label: 'Gelmedi', tone: 'red' },
  yarim: { label: 'Yarım', tone: 'blue' },
}

export const TALEP_DURUM: Record<string, { label: string; tone: string }> = {
  acik: { label: 'Açık', tone: 'amber' },
  kismi: { label: 'Kısmi', tone: 'blue' },
  dolu: { label: 'Dolu', tone: 'indigo' },
  kapandi: { label: 'Kapandı', tone: 'green' },
}

export const FATURA_DURUM: Record<string, { label: string; tone: string }> = {
  vadede: { label: 'Vadede', tone: 'blue' },
  odendi: { label: 'Ödendi', tone: 'green' },
  gecikti: { label: 'Gecikti', tone: 'red' },
}

export const VARDIYA: Record<string, string> = {
  gunduz: 'Gündüz',
  gece: 'Gece',
}

export const ACILEYET: Record<string, { label: string; tone: string }> = {
  normal: { label: 'Normal', tone: 'slate' },
  acil: { label: 'Acil', tone: 'red' },
}

export const RESMI_ODEME_TIP: Record<string, string> = {
  kdv: 'KDV',
  muhtasar_sgk: 'Muhtasar & SGK',
  maas: 'Maaş',
  gecici_vergi: 'Geçici Vergi',
}

export const ODEME_DURUM: Record<string, { label: string; tone: string }> = {
  beklemede: { label: 'Beklemede', tone: 'amber' },
  odendi: { label: 'Ödendi', tone: 'green' },
  gecikti: { label: 'Gecikti', tone: 'red' },
}

export const GIDER_KATEGORI: Record<string, string> = {
  isci_yevmiye: 'Saha İşçi Yevmiye',
  personel_bordro: 'Personel Bordro',
  kira: 'Kira',
  ulasim: 'Ulaşım',
  yakit: 'Yakıt',
  sarf_malzeme: 'Sarf Malzeme',
  diger: 'Diğer',
}

export const AVANS_DURUM: Record<string, { label: string; tone: string }> = {
  verildi: { label: 'Verildi', tone: 'amber' },
  mahsup: { label: 'Mahsup', tone: 'green' },
}

export const MUSIATLIK_DURUM: Record<string, { label: string; tone: string }> = {
  aktif: { label: 'Aktif', tone: 'green' },
  yenilenecek: { label: 'Yenilenecek', tone: 'amber' },
}