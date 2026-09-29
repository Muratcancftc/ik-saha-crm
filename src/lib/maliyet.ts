// Yevmiyeci (günlük) maliyet tablosu hesap motoru.
// Saf fonksiyonlar: UI, DB ve Next.js'ten bağımsızdır (yalnızca BigInt).
// Para her yerde KURUŞ bazlı tamsayı (BigInt) tutulur; float kullanılmaz.
// Not: tsconfig target'ı ES2017 olduğu için BigInt *literali* yerine BigInt() kullanılır.

const B0 = BigInt(0)
const B1 = BigInt(1)
const B2 = BigInt(2)
const B10 = BigInt(10)
const B100 = BigInt(100)
const B10000 = BigInt(10000)

export type KarModu = 'YUZDE' | 'HEDEF'

export type MaliyetGirdi = {
  brutUcret: string | number
  gvMatrahIstisnasi: string | number
  dvIstisnasi: string | number
  kidem: string | number
  ihbar: string | number
  yillikIzin: string | number
  yemek: string | number
  yol: string | number
  saglikOsgb: string | number
  kiyafet: string | number
  maliMesuliyet: string | number
  karModu: KarModu
  karOran?: string | number | null // YUZDE modunda oran (0.0822 = %8,22)
  hedefTeklif?: string | number | null // HEDEF modunda teklif bedeli
}

export type MaliyetOranlar = {
  sgkIsci: string | number // 0.14
  issizlikIsci: string | number // 0.01
  sgkIsveren: string | number // 0.155
  issizlikIsveren: string | number // 0.02
  gelirVergisi: string | number // 0.15
  damgaVergisi: string | number // 0.00759
}

export type MaliyetHesap = {
  sgkIsci: bigint
  issizlikIsci: bigint
  gvMatrahi: bigint
  gvMatrahiIndirimli: bigint
  gelirVergisi: bigint
  dvMatrahi: bigint
  dvMatrahiIndirimli: bigint
  damgaVergisi: bigint
  kesintilerToplami: bigint
  netUcret: bigint
  sgkIsveren: bigint
  issizlikIsveren: bigint
  yasalMaliyet: bigint
  toplamYasalMaliyet: bigint
  personelMaliyeti: bigint
  karPayi: bigint
  teklifBedeli: bigint
  karOran: string // ondalık string ("0.0822"); HEDEF modunda geri hesaplanır
}

// ---------------------------------------------------------------
// Oran ayrıştırma ve yuvarlama
// ---------------------------------------------------------------

// "0.0822" veya 0.0822 → { num: 822n, den: 10000n }
export function parseOran(oran: string | number | null | undefined): { num: bigint; den: bigint } {
  const s = typeof oran === 'number' ? oran.toString() : String(oran ?? '').trim()
  if (!s) return { num: B0, den: B1 }
  const neg = s.startsWith('-')
  const t = neg ? s.slice(1) : s
  const [i, f = ''] = t.split('.')
  const num = BigInt((i === '' ? '0' : i) + f)
  const den = B10 ** BigInt(f.length)
  return { num: neg ? -num : num, den }
}

// a/b → en yakın tam sayı, yarım yukarı (sıfırdan uzağa)
function yuvarla(a: bigint, b: bigint): bigint {
  const neg = (a < B0) !== (b < B0)
  const aa = a < B0 ? -a : a
  const bb = b < B0 ? -b : b
  if (bb === B0) return B0
  const q = aa / bb
  const r = aa % bb
  const yukari = r * B2 >= bb ? q + B1 : q
  return neg ? -yukari : yukari
}

// tutar × oran → kuruş (yarım yukarı)
export function oranUygula(tutarKurus: bigint, oran: string | number): bigint {
  const { num, den } = parseOran(oran)
  return yuvarla(tutarKurus * num, den)
}

// ---------------------------------------------------------------
// Para dönüşümleri
// ---------------------------------------------------------------

// Kullanıcı girdisi (number veya "2363.5"/"2.363,50") → kuruş BigInt.
// Ondalık ayırıcı olarak hem '.' hem ',' desteklenir; 2 basamaktan fazlası
// yarım yukarı yuvarlanır.
export function tlToKurus(v: string | number | null | undefined): bigint {
  if (v === null || v === undefined || v === '') return B0
  let s = typeof v === 'number' ? v.toString() : String(v).trim()
  if (!s) return B0
  let neg = false
  if (s.startsWith('-')) {
    neg = true
    s = s.slice(1)
  }
  // Türkçe biçimde binlik ayırıcı '.' + ondalık ',' → kanonikleştir
  if (s.includes(',')) s = s.replace(/\./g, '').replace(',', '.')
  const [iRaw, fRaw = ''] = s.split('.')
  const intPart = iRaw === '' ? '0' : iRaw.replace(/[^\d]/g, '')
  const frac = fRaw.replace(/[^\d]/g, '')
  let k = BigInt(intPart || '0') * B100 + BigInt((frac + '00').slice(0, 2) || '0')
  if (frac.length > 2 && Number(frac[2]) >= 5) k += B1
  return neg ? -k : k
}

// kuruş → "1.527,50"
export function kurusToTl(k: bigint): string {
  const neg = k < B0
  const a = neg ? -k : k
  const tl = (a / B100).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.')
  const kr = (a % B100).toString().padStart(2, '0')
  return `${neg ? '-' : ''}${tl},${kr}`
}

// kuruş → "1527.50" (DB Decimal / hesaplama için kanonik)
export function kurusToDecimal(k: bigint): string {
  const neg = k < B0
  const a = neg ? -k : k
  return `${neg ? '-' : ''}${a / B100}.${(a % B100).toString().padStart(2, '0')}`
}

// Oran → "%8,22" / "%14" / "%15,5"
export function oranYuzde(oran: string | number): string {
  const { num, den } = parseOran(oran)
  return '%' + ondalikGovde(num * B100, den)
}

// Oran → "0,00759" (damga gibi yüzdesiz gösterim)
export function oranOndalik(oran: string | number): string {
  const { num, den } = parseOran(oran)
  return ondalikGovde(num, den)
}

// n/d → virgüllü ondalık, gereksiz sıfırlar atılır (en fazla 6 basamak)
function ondalikGovde(n: bigint, d: bigint): string {
  if (d === B0) return '0'
  const neg = (n < B0) !== (d < B0)
  const nn = n < B0 ? -n : n
  const dd = d < B0 ? -d : d
  const int = nn / dd
  let rem = nn % dd
  let frac = ''
  for (let i = 0; i < 6 && rem > B0; i++) {
    rem *= B10
    frac += (rem / dd).toString()
    rem %= dd
  }
  frac = frac.replace(/0+$/, '')
  const intStr = int.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.')
  return `${neg ? '-' : ''}${intStr}${frac ? ',' + frac : ''}`
}

// ---------------------------------------------------------------
// Ana hesap
// ---------------------------------------------------------------

function kalan(tadil: bigint, istisna: bigint): bigint {
  const x = tadil - istisna
  return x > B0 ? x : B0
}

export function maliyetHesapla(girdi: MaliyetGirdi, oranlar: MaliyetOranlar): MaliyetHesap {
  const brutUcret = tlToKurus(girdi.brutUcret)
  const gvIstisnasi = tlToKurus(girdi.gvMatrahIstisnasi)
  const dvIstisnasi = tlToKurus(girdi.dvIstisnasi)
  const kidem = tlToKurus(girdi.kidem)
  const ihbar = tlToKurus(girdi.ihbar)
  const yillikIzin = tlToKurus(girdi.yillikIzin)
  const yemek = tlToKurus(girdi.yemek)
  const yol = tlToKurus(girdi.yol)
  const saglikOsgb = tlToKurus(girdi.saglikOsgb)
  const kiyafet = tlToKurus(girdi.kiyafet)
  const maliMesuliyet = tlToKurus(girdi.maliMesuliyet)

  const sgkIsci = oranUygula(brutUcret, oranlar.sgkIsci)
  const issizlikIsci = oranUygula(brutUcret, oranlar.issizlikIsci)
  const gvMatrahi = brutUcret - sgkIsci - issizlikIsci
  const gvMatrahiIndirimli = kalan(gvMatrahi, gvIstisnasi)
  const gelirVergisi = oranUygula(gvMatrahiIndirimli, oranlar.gelirVergisi)

  const dvMatrahi = brutUcret
  const dvMatrahiIndirimli = kalan(dvMatrahi, dvIstisnasi)
  const damgaVergisi = oranUygula(dvMatrahiIndirimli, oranlar.damgaVergisi)

  const kesintilerToplami = sgkIsci + issizlikIsci + gelirVergisi + damgaVergisi
  const netUcret = brutUcret - kesintilerToplami

  const sgkIsveren = oranUygula(brutUcret, oranlar.sgkIsveren)
  const issizlikIsveren = oranUygula(brutUcret, oranlar.issizlikIsveren)
  const yasalMaliyet = brutUcret + sgkIsveren + issizlikIsveren
  const toplamYasalMaliyet = yasalMaliyet + kidem + ihbar + yillikIzin
  const personelMaliyeti =
    toplamYasalMaliyet + yemek + yol + saglikOsgb + kiyafet + maliMesuliyet

  let karPayi: bigint
  let teklifBedeli: bigint
  let karOran: string

  if (girdi.karModu === 'HEDEF') {
    teklifBedeli = tlToKurus(girdi.hedefTeklif)
    karPayi = teklifBedeli - personelMaliyeti
    // karPayi / personelMaliyeti → 4 basamaklı ondalık string
    karOran = oranaGoreDecimal(karPayi, personelMaliyeti)
  } else {
    const oran = girdi.karOran ?? 0
    karPayi = oranUygula(personelMaliyeti, oran)
    teklifBedeli = personelMaliyeti + karPayi
    karOran = parseOranString(oran)
  }

  return {
    sgkIsci,
    issizlikIsci,
    gvMatrahi,
    gvMatrahiIndirimli,
    gelirVergisi,
    dvMatrahi,
    dvMatrahiIndirimli,
    damgaVergisi,
    kesintilerToplami,
    netUcret,
    sgkIsveren,
    issizlikIsveren,
    yasalMaliyet,
    toplamYasalMaliyet,
    personelMaliyeti,
    karPayi,
    teklifBedeli,
    karOran,
  }
}

// Oranı kanonik ondalık string'e çevir ("0.0822")
function parseOranString(oran: string | number | null | undefined): string {
  const { num, den } = parseOran(oran)
  return kesirToDecimal(num, den, 6)
}

// n/d → ondalık string ("0.0822"), en fazla `basamak` ondalık
function kesirToDecimal(n: bigint, d: bigint, basamak: number): string {
  if (d === B0) return '0'
  const neg = (n < B0) !== (d < B0)
  const nn = n < B0 ? -n : n
  const dd = d < B0 ? -d : d
  const int = nn / dd
  let rem = nn % dd
  let frac = ''
  for (let i = 0; i < basamak && rem > B0; i++) {
    rem *= B10
    frac += (rem / dd).toString()
    rem %= dd
  }
  frac = frac.replace(/0+$/, '')
  return `${neg ? '-' : ''}${int}${frac ? '.' + frac : ''}`
}

// Kâr tutarı / personel maliyeti → oran ondalık ("0.0822")
function oranaGoreDecimal(karPayi: bigint, personelMaliyeti: bigint): string {
  if (personelMaliyeti === B0) return '0'
  return kesirToDecimal(karPayi * B10000, personelMaliyeti, 4)
}

// ---------------------------------------------------------------
// Satır tanımları (tablo sırası + kalın satırlar + etiketler)
// Admin, public ve PDF görünümü aynı kaynağı kullanır.
// ---------------------------------------------------------------

export type MaliyetSatirKaynak = 'girdi' | 'hesap'
export type MaliyetSatir = {
  anahtar: keyof MaliyetGirdi | keyof MaliyetHesap
  etiket: string
  kaynak: MaliyetSatirKaynak
  kalin?: boolean
  oranGoster?: 'yuzde' | 'ondalik' // etikete oran eklenir
  oranSutunu?: boolean // oran sütununda gösterilir (yalnız kâr payı)
  oranAnahtar?: keyof MaliyetOranlar // oranGoster için oran kaynağı
}

// Kullanıcının verdiği BİREBİR sıra (kalın satırlar `kalin: true`).
export const MALIYET_SATIRLARI: MaliyetSatir[] = [
  { anahtar: 'netUcret', etiket: 'Net ödenecek ücret (bordro)', kaynak: 'hesap', kalin: true },
  { anahtar: 'brutUcret', etiket: 'Brüt ücret', kaynak: 'girdi' },
  { anahtar: 'sgkIsci', etiket: 'SGK işçi kesintisi', kaynak: 'hesap', oranGoster: 'yuzde', oranAnahtar: 'sgkIsci' },
  { anahtar: 'issizlikIsci', etiket: 'İşsizlik sig. işçi kesintisi', kaynak: 'hesap', oranGoster: 'yuzde', oranAnahtar: 'issizlikIsci' },
  { anahtar: 'gvMatrahi', etiket: 'Gelir vergisi matrahı', kaynak: 'hesap' },
  { anahtar: 'gvMatrahIstisnasi', etiket: 'Gelir vergisi matrah istisnası', kaynak: 'girdi' },
  { anahtar: 'gvMatrahiIndirimli', etiket: 'Gelir vergisi matrahı (indirimli)', kaynak: 'hesap' },
  { anahtar: 'gelirVergisi', etiket: 'Gelir vergisi', kaynak: 'hesap', oranGoster: 'yuzde', oranAnahtar: 'gelirVergisi' },
  { anahtar: 'dvMatrahi', etiket: 'Damga vergisi matrahı', kaynak: 'hesap' },
  { anahtar: 'dvIstisnasi', etiket: 'Damga vergisi istisnası', kaynak: 'girdi' },
  { anahtar: 'dvMatrahiIndirimli', etiket: 'Damga vergisi matrahı (indirimli)', kaynak: 'hesap' },
  { anahtar: 'damgaVergisi', etiket: 'Damga vergisi tutarı', kaynak: 'hesap', oranGoster: 'ondalik', oranAnahtar: 'damgaVergisi' },
  { anahtar: 'kesintilerToplami', etiket: 'Kesintiler toplamı', kaynak: 'hesap', kalin: true },
  { anahtar: 'sgkIsveren', etiket: 'SGK işveren payı', kaynak: 'hesap' },
  { anahtar: 'issizlikIsveren', etiket: 'İşsizlik sig. işveren payı', kaynak: 'hesap' },
  { anahtar: 'yasalMaliyet', etiket: 'Yasal maliyeti', kaynak: 'hesap', kalin: true },
  { anahtar: 'kidem', etiket: 'Kıdem tazminatı', kaynak: 'girdi' },
  { anahtar: 'ihbar', etiket: 'İhbar tazminatı', kaynak: 'girdi' },
  { anahtar: 'yillikIzin', etiket: 'Yıllık izin ücreti', kaynak: 'girdi' },
  { anahtar: 'toplamYasalMaliyet', etiket: 'Toplam yasal maliyeti', kaynak: 'hesap', kalin: true },
  { anahtar: 'yemek', etiket: 'Yemek', kaynak: 'girdi' },
  { anahtar: 'yol', etiket: 'Yol', kaynak: 'girdi' },
  { anahtar: 'saglikOsgb', etiket: 'Sağlık & OSGB', kaynak: 'girdi' },
  { anahtar: 'kiyafet', etiket: 'Kıyafet & ayakkabı', kaynak: 'girdi' },
  { anahtar: 'maliMesuliyet', etiket: 'Mali mesuliyet sigortası', kaynak: 'girdi' },
  { anahtar: 'personelMaliyeti', etiket: 'Personel maliyeti (günlük)', kaynak: 'hesap', kalin: true },
  { anahtar: 'karPayi', etiket: 'Kâr payı', kaynak: 'hesap', kalin: true, oranSutunu: true },
  { anahtar: 'teklifBedeli', etiket: 'Teklif bedeli (günlük)', kaynak: 'hesap', kalin: true },
]

// Etiketi, ayarlardaki güncel oranı içerecek şekilde üret.
// Örn: "%14 SGK işçi kesintisi", "Damga vergisi tutarı (0,00759)".
export function satirEtiket(satir: MaliyetSatir, oranlar: MaliyetOranlar): string {
  if (!satir.oranGoster || !satir.oranAnahtar) return satir.etiket
  const oran = oranlar[satir.oranAnahtar]
  return satir.oranGoster === 'yuzde'
    ? `${oranYuzde(oran)} ${satir.etiket}`
    : `${satir.etiket} (${oranOndalik(oran)})`
}

// Kâr payı satırı gizliyken tablodan tamamen çıkar.
export function gorunenSatirlar(karGizli: boolean): MaliyetSatir[] {
  return karGizli ? MALIYET_SATIRLARI.filter((s) => s.anahtar !== 'karPayi') : MALIYET_SATIRLARI
}

// Bir satırın gösterilecek kuruş değeri (girdi ise girdiden, hesap ise sonuçtan).
export function satirDegeri(satir: MaliyetSatir, girdi: MaliyetGirdi, hesap: MaliyetHesap): bigint {
  if (satir.kaynak === 'girdi') {
    const v = (girdi as unknown as Record<string, string | number>)[satir.anahtar as string]
    return tlToKurus(v ?? 0)
  }
  return (hesap as unknown as Record<string, bigint>)[satir.anahtar as string]
}
