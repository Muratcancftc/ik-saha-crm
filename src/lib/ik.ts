import { prisma } from '@/lib/db'
import { getAyarSayi } from '@/lib/ayar'
import { startOfDay, addDays } from '@/lib/dates'
import type { CalismaTipi, OdemeYontemi, OdemePeriyot } from '@prisma/client'

// ---- Ayarlar ----
export const AYAR_VARSAYILAN_UCRET = 'GUNLUK_UCRET_VARSAYILAN'
export const AYAR_SAATLIK_UCRET = 'SAATLIK_UCRET_VARSAYILAN'
export const AYAR_MESAI_CARPAN = 'MESAI_CARPAN'

export async function varsayilanUcret(): Promise<number> {
  return getAyarSayi(AYAR_VARSAYILAN_UCRET, 1800)
}

export async function varsayilanSaatlikUcret(): Promise<number> {
  return getAyarSayi(AYAR_SAATLIK_UCRET, 225)
}

export async function mesaiCarpan(): Promise<number> {
  return getAyarSayi(AYAR_MESAI_CARPAN, 1.5)
}

// ---- Ödeme periyodu ----
export function periyotEtiket(p: OdemePeriyot | null | undefined, gunAraligi?: number | null): string {
  if (p === 'GUN_ARALIGI') return `${gunAraligi ?? 0} günde bir`
  if (p === 'HAFTALIK') return 'Haftalık'
  if (p === 'SERBEST') return 'Serbest'
  return 'Aylık'
}

// Periyoda göre ardışık ödeme dönemlerini üret. Dönem [baslangic, bitis) şeklindedir
// (bitis DIŞLAYICI = son çalışma gününün ertesi). Sonraki dönem bitis'ten başlar.
export function periyotUret(p: OdemePeriyot, gunAraligi: number, bas: Date, adet: number): Array<{ baslangic: Date; bitis: Date }> {
  const sonuclar: Array<{ baslangic: Date; bitis: Date }> = []
  let cur = startOfDay(bas)
  for (let i = 0; i < adet; i++) {
    let bitis: Date
    if (p === 'GUN_ARALIGI') bitis = addDays(cur, Math.max(1, gunAraligi))
    else if (p === 'HAFTALIK') bitis = addDays(cur, 7)
    else if (p === 'AYLIK') bitis = new Date(cur.getFullYear(), cur.getMonth() + 1, 1)
    else bitis = addDays(cur, 7) // SERBEST: 7 günlük varsayılan (elle düzenlenir)
    sonuclar.push({ baslangic: cur, bitis })
    cur = bitis
  }
  return sonuclar
}

// Bugünü içeren güncel ödeme dönemini bul (bitis dışlayıcı)
export function guncelDonem(periyot: OdemePeriyot, gunAraligi: number, bugun: Date): { baslangic: Date; bitis: Date } {
  const y = bugun.getFullYear()
  const m = bugun.getMonth()
  if (periyot === 'AYLIK') return { baslangic: new Date(y, m, 1), bitis: new Date(y, m + 1, 1) }
  if (periyot === 'HAFTALIK') {
    const gun = (bugun.getDay() + 6) % 7
    const bas = addDays(startOfDay(bugun), -gun)
    return { baslangic: bas, bitis: addDays(bas, 7) }
  }
  if (periyot === 'GUN_ARALIGI') {
    const n = Math.max(1, gunAraligi)
    const araliklar = periyotUret('GUN_ARALIGI', n, new Date(y, m, 1), 60)
    return araliklar.find((a) => a.baslangic <= bugun && a.bitis > bugun) ?? araliklar[araliklar.length - 1]
  }
  // SERBEST: içinde bulunulan ay (elle yönetilir)
  return { baslangic: new Date(y, m, 1), bitis: new Date(y, m + 1, 1) }
}

// ---- Para / format ----
export const tl = (n: number | string) =>
  new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(Number(n) || 0)

export function yuvarla(n: number): number {
  return Math.round((Number(n) + Number.EPSILON) * 100) / 100
}

export function tarihTr(d: Date): string {
  return new Intl.DateTimeFormat('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(d)
}

export function tarihSaatTr(d: Date): string {
  return new Intl.DateTimeFormat('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(d)
}

// ---- IBAN doğrulama (TR + mod97 checksum) ----
export function ibanGecerli(iban: string): boolean {
  const i = iban.replace(/\s+/g, '').toUpperCase()
  if (!/^TR\d{24}$/.test(i)) return false
  const rearranged = i.slice(4) + i.slice(0, 4)
  let num = ''
  for (const ch of rearranged) {
    const c = ch.charCodeAt(0)
    num += c >= 48 && c <= 57 ? ch : String(c - 55)
  }
  let rem = BigInt(0)
  for (let k = 0; k < num.length; k += 7) {
    const parca = num.slice(k, k + 7)
    rem = (rem * BigInt(10) ** BigInt(parca.length) + BigInt(parca)) % BigInt(97)
  }
  return rem === BigInt(1)
}

export function ibanGrup(iban: string): string {
  return iban.replace(/\s+/g, '').toUpperCase().slice(0, 26).replace(/(.{4})/g, '$1 ').trim()
}

// ---- Ücret çözümleme: personel > firma > sistem (o tarihteki geçerli kayıt) ----
export async function ucretCozumle(isciId: number, firmaId: number, tarih: Date): Promise<{
  gunlukUcret: number
  saatlikUcret: number
  kaynak: 'personel' | 'firma' | 'sistem'
  calismaTipi: CalismaTipi
  odemeYontemi: OdemeYontemi
}> {
  const gun = startOfDay(tarih)

  const [personel, firmaUcret, sistemGunluk, sistemSaatlik, isci] = await Promise.all([
    prisma.personelUcret.findFirst({
      where: {
        isciId,
        gecerlilikBaslangic: { lte: gun },
        OR: [{ gecerlilikBitis: null }, { gecerlilikBitis: { gte: gun } }],
      },
      orderBy: { gecerlilikBaslangic: 'desc' },
    }),
    prisma.firmaUcret.findFirst({
      where: {
        firmaId,
        gecerlilikBaslangic: { lte: gun },
        OR: [{ gecerlilikBitis: null }, { gecerlilikBitis: { gte: gun } }],
      },
      orderBy: { gecerlilikBaslangic: 'desc' },
    }),
    varsayilanUcret(),
    varsayilanSaatlikUcret(),
    prisma.isci.findUnique({ where: { id: isciId } }),
  ])

  if (personel) {
    return {
      gunlukUcret: yuvarla(Number(personel.gunlukUcret)),
      saatlikUcret: yuvarla(Number(personel.saatlikUcret)),
      kaynak: 'personel',
      calismaTipi: isci?.calismaTipi ?? 'GUNLUK',
      odemeYontemi: isci?.varsayilanOdemeYontemi ?? 'ELDEN',
    }
  }
  if (firmaUcret) {
    return {
      gunlukUcret: yuvarla(Number(firmaUcret.gunlukUcret)),
      saatlikUcret: yuvarla(Number(firmaUcret.saatlikUcret)),
      kaynak: 'firma',
      calismaTipi: isci?.calismaTipi ?? 'GUNLUK',
      odemeYontemi: isci?.varsayilanOdemeYontemi ?? 'ELDEN',
    }
  }
  return {
    gunlukUcret: yuvarla(sistemGunluk),
    saatlikUcret: yuvarla(sistemSaatlik),
    kaynak: 'sistem',
    calismaTipi: isci?.calismaTipi ?? 'GUNLUK',
    odemeYontemi: isci?.varsayilanOdemeYontemi ?? 'ELDEN',
  }
}

// ---- Puantaj satırı tutarı: günlük/yarım + saatlik + mesai×çarpan ----
export async function puantajTutarHesapla(input: {
  fsi: number
  calismaTipi: CalismaTipi
  calisilanSaat: number
  mesaiSaat: number
  gunlukUcret: number
  saatlikUcret: number
}): Promise<{ tutar: number; saatlikGunluk: number }> {
  const { fsi, calismaTipi, calisilanSaat, mesaiSaat, gunlukUcret, saatlikUcret } = input
  const carpan = await mesaiCarpan()

  let tutar = 0
  if (calismaTipi === 'SAATLIK') {
    const normalSaat = Math.max(0, calisilanSaat - mesaiSaat)
    tutar = normalSaat * saatlikUcret + mesaiSaat * saatlikUcret * carpan
    return { tutar: yuvarla(tutar), saatlikGunluk: 0 }
  }

  // GUNLUK: fsi (1 / 0.5) × günlük + mesai saati saatlik ücret üzerinden (çarpımlı)
  const gunlukKatsayi = fsi
  const mesaiUcret = saatlikUcret > 0 ? saatlikUcret * mesaiSaat * carpan : 0
  tutar = gunlukKatsayi * gunlukUcret + mesaiUcret
  return { tutar: yuvarla(tutar), saatlikGunluk: 0 }
}

// ---- Dönem: avans + kesinti toplamları ----
export async function donemAvansKesinti(isciId: number, bas: Date, bit: Date) {
  const [avans, kesinti] = await Promise.all([
    prisma.avans.aggregate({
      where: { isciId, tarih: { gte: bas, lt: bit }, durum: 'verildi' },
      _sum: { tutar: true },
    }),
    prisma.kesinti.aggregate({
      where: { isciId, tarih: { gte: bas, lt: bit } },
      _sum: { tutar: true },
    }),
  ])
  return {
    avans: yuvarla(Number(avans._sum.tutar ?? 0)),
    kesinti: yuvarla(Number(kesinti._sum.tutar ?? 0)),
  }
}

// ---- Audit log ----
export async function ucretLog(kayitTipi: string, ilgiliId: number | null, alan: string, eskiDeger: string | null, yeniDeger: string | null, kullaniciId?: number) {
  await prisma.ucretLog.create({
    data: { kayitTipi, ilgiliId, alan, eskiDeger, yeniDeger, kullaniciId: kullaniciId ?? null },
  })
}