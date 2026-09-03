import type { SessionUser } from './dal'
import { prisma } from './db'
import { startOfDay, addDays, daysUntil } from './dates'
import { maskTC, maskIBAN, decrypt } from './crypto'
import type { Prisma, TalepDurum } from '@prisma/client'

export type BugunAtama = Prisma.AtamaGetPayload<{
  include: {
    isci: { include: { meslekler: { include: { meslek: true } } } }
    talep: { include: { firma: true, lokasyon: true } }
    puantaj: true
  }
}>

export type AcikTalep = Prisma.TalepGetPayload<{
  include: {
    firma: true
    lokasyon: true
    kalemler: { include: { meslek: true } }
    atamalar: { include: { isci: true } }
  }
}>

// saha_sorumlusu yalnızca kendi lokasyonunu görür
export function lokasyonFilter(user: SessionUser): Prisma.TalepWhereInput {
  if (user.rol === 'saha_sorumlusu') return { lokasyonId: user.lokasyonId ?? -1 }
  return {}
}

export function atamaLokasyonFilter(user: SessionUser): Prisma.AtamaWhereInput {
  if (user.rol === 'saha_sorumlusu') return { talep: { lokasyonId: user.lokasyonId ?? -1 } }
  return {}
}

// KPI: ciro, alacak, saha işçi maliyeti, giderler — dönem bazlı (tüm sayfalar aynı kaynağı kullanır)
export async function getMaliVeri(bas?: Date, bit?: Date) {
  const faturaWhere = bas && bit ? { vadeTarihi: { gte: bas, lt: bit } } : {}
  const hakedisWhere = bas && bit ? { donemBitis: { gte: bas, lt: bit } } : {}
  const giderWhere = bas && bit ? { tarih: { gte: bas, lt: bit } } : {}

  const [faturalar, hakedislerList, giderler, personel, odemeler] = await Promise.all([
    prisma.fatura.findMany({ where: faturaWhere, include: { tahsilatlar: true } }),
    prisma.hakedis.findMany({ where: hakedisWhere }),
    prisma.gider.findMany({ where: giderWhere }),
    prisma.personel.aggregate({ _sum: { maas: true } }),
    prisma.resmiOdeme.findMany({
      where: bas && bit ? { durum: 'odendi', odemeTarihi: { gte: bas, lt: bit } } : { durum: 'odendi' },
    }),
  ])

  const ciro = faturalar.reduce((a, f) => a + Number(f.genelToplam), 0)
  const tahsilat = faturalar.reduce((a, f) => a + f.tahsilatlar.reduce((x, t) => x + Number(t.tutar), 0), 0)
  const alacak = ciro - tahsilat

  // Saha işçi maliyeti = hakediş gün × yevmiye
  const sahaIsciMaliyeti = hakedislerList.reduce((acc, h) => acc + Number(h.gun) * Number(h.yevmiye), 0)
  const brütMarj = hakedislerList.reduce((acc, h) => acc + Number(h.marj), 0)

  // Genel giderler = kira/ulaşım/yakıt/sarf/diğer (işçi yevmiye ve bordro ayrı sayılır)
  const genelGiderler = giderler
    .filter((g) => !['isci_yevmiye', 'personel_bordro'].includes(g.kategori))
    .reduce((acc, g) => acc + Number(g.tutar), 0)
  const isciYevmiyeGider = giderler
    .filter((g) => g.kategori === 'isci_yevmiye')
    .reduce((acc, g) => acc + Number(g.tutar), 0)
  const personelBordroGider = giderler
    .filter((g) => g.kategori === 'personel_bordro')
    .reduce((acc, g) => acc + Number(g.tutar), 0)

  // Dönemsel bordro tahmini (aylık personel maaş toplamı)
  const aylikBordro = Number(personel._sum.maas ?? 0)

  const odenenVergi = odemeler.reduce((acc, o) => acc + Number(o.tutar), 0)

  // Net kâr = ciro − (saha işçi maliyeti + genel giderler + bordro + ödenen resmi ödeme)
  const netKar = ciro - (sahaIsciMaliyeti + genelGiderler + personelBordroGider + odenenVergi)

  return {
    ciro,
    tahsilat,
    alacak,
    sahaIsciMaliyeti,
    brütMarj,
    genelGiderler,
    isciYevmiyeGider,
    personelBordroGider,
    aylikBordro,
    odenenVergi,
    netKar,
    hakedisAdet: hakedislerList.length,
  }
}

// Bugünün atamaları
export async function getBugunAtamalar(user: SessionUser): Promise<BugunAtama[]> {
  const bugun = startOfDay()
  return prisma.atama.findMany({
    where: {
      tarih: { gte: bugun, lt: addDays(bugun, 1) },
      durum: { not: 'iptal' },
      ...atamaLokasyonFilter(user),
    },
    include: {
      isci: { include: { meslekler: { include: { meslek: true } } } },
      talep: { include: { firma: true, lokasyon: true } },
      puantaj: true,
    },
    orderBy: { tarih: 'asc' },
  })
}

// Uyarılar: belge (dolan/yaklaşan), geciken fatura, SGK bildirimi eksik
export async function getUyarilar(user: SessionUser) {
  const bugun = startOfDay()
  const limit = addDays(bugun, 30)

  const [belgeler, gecikenFaturalar, sgkEksik] = await Promise.all([
    prisma.belge.findMany({
      where: { bitisTarihi: { lte: limit } },
      include: { isci: true },
      orderBy: { bitisTarihi: 'asc' },
    }),
    prisma.fatura.findMany({
      where: { durum: { in: ['gecikti'] } },
      include: { firma: true },
    }),
    prisma.atama.findMany({
      where: {
        sgkBildirildi: false,
        durum: { in: ['atandi', 'onaylandi'] },
        tarih: { gte: bugun, lt: addDays(bugun, 1) },
        ...atamaLokasyonFilter(user),
      },
      include: { isci: true, talep: { include: { firma: true } } },
    }),
  ])

  const suresiDolan = belgeler.filter((b) => b.bitisTarihi < bugun)
  const yaklasan = belgeler.filter((b) => b.bitisTarihi >= bugun)

  return { suresiDolan, yaklasan, gecikenFaturalar, sgkEksik }
}

// Açık talepler (dashboard + talepler sayfası için)
export async function getAcilTalepler(user: SessionUser): Promise<AcikTalep[]> {
  return prisma.talep.findMany({
    where: {
      durum: { in: ['acik', 'kismi'] },
      tarih: { gte: startOfDay() },
      ...lokasyonFilter(user),
    },
    include: {
      firma: true,
      lokasyon: true,
      kalemler: { include: { meslek: true } },
      atamalar: { include: { isci: true } },
    },
    orderBy: [{ aciliyet: 'desc' }, { tarih: 'asc' }],
  })
}

export type TalepListeItem = Prisma.TalepGetPayload<{
  include: {
    firma: true
    lokasyon: true
    kalemler: { include: { meslek: true } }
    atamalar: { include: { isci: { include: { belgeler: true } }, puantaj: true } }
  }
}>

export type TalepFiltre = {
  durum?: string
  firmaId?: number
  tarihBas?: string
  tarihBit?: string
  sadeceEksik?: boolean
  sablon?: boolean
}

export async function getTaleplerFiltreli(user: SessionUser, f: TalepFiltre): Promise<TalepListeItem[]> {
  const where: Prisma.TalepWhereInput = {
    ...lokasyonFilter(user),
    ...(f.durum ? { durum: f.durum as TalepDurum } : {}),
    ...(f.firmaId ? { firmaId: f.firmaId } : {}),
    ...(f.tarihBas ? { tarih: { gte: new Date(`${f.tarihBas}T00:00:00`) } } : {}),
    ...(f.sablon ? { sablon: true } : {}),
  }
  if (f.tarihBit) {
    const bit = new Date(`${f.tarihBit}T23:59:59`)
    where.tarih = where.tarih
      ? { ...(where.tarih as object), lte: bit }
      : { lte: bit }
  }
  if (f.sadeceEksik) {
    where.durum = { in: ['acik', 'kismi'] }
  }

  const list = await prisma.talep.findMany({
    where,
    include: {
      firma: true,
      lokasyon: true,
      kalemler: { include: { meslek: true } },
      atamalar: {
        include: {
          isci: { include: { belgeler: true } },
          puantaj: true,
        },
        orderBy: { createdAt: 'asc' },
      },
    },
    orderBy: [{ tarih: 'desc' }, { createdAt: 'desc' }],
  })
  return list
}

export async function getTalepDetay(user: SessionUser, id: number): Promise<TalepListeItem | null> {
  return prisma.talep.findFirst({
    where: { id, ...lokasyonFilter(user) },
    include: {
      firma: true,
      lokasyon: true,
      kalemler: { include: { meslek: true } },
      atamalar: {
        include: {
          isci: { include: { belgeler: true } },
          puantaj: true,
        },
        orderBy: { createdAt: 'asc' },
      },
    },
  })
}

// ---- İşçi detayı (havuzda tıklayınca açılan kart) ----
export type IsciDetay = {
  id: number
  ad: string
  telefon: string
  tcMasked: string
  ibanMasked: string
  tcKimlik: string
  iban: string
  ilce: string
  puan: number
  noShow: number
  guvenilirlik: number
  beklenti: number
  durum: string
  tercihBolgeler: string[]
  meslekler: string[]
  dogumTarihi: string
  belgeler: Array<{ id: number; tip: string; bitisTarihi: string; kalanGun: number; durum: string }>
  musaitlik: Array<{ id: number; tarih: string; eVadesiGun: number; durum: string }>
  avanslar: Array<{ id: number; tutar: number; tarih: string; durum: string }>
  gecmis: Array<{ id: number; tarih: string; firma: string; lokasyon: string; durum: string; puantaj: string | null }>
}

export async function getIsciDetay(isciId: number): Promise<IsciDetay | null> {
  const isci = await prisma.isci.findUnique({
    where: { id: isciId },
    include: {
      meslekler: { include: { meslek: true } },
      belgeler: true,
      musaitlikler: true,
      avanslar: true,
      atamalar: {
        include: {
          puantaj: true,
          talep: { include: { firma: true, lokasyon: true } },
        },
        orderBy: { tarih: 'desc' },
        take: 20,
      },
    },
  })
  if (!isci) return null

  const bugun = startOfDay()
  const noShow = await prisma.puantaj.count({
    where: { atama: { isciId: isci.id }, durum: 'gelmedi' },
  })
  const guvenilirlik = Math.max(0, Math.min(100, isci.puan - noShow * 5))

  return {
    id: isci.id,
    ad: isci.ad,
    telefon: isci.telefon,
    tcMasked: maskTC(decrypt(isci.tcKimlik)),
    ibanMasked: maskIBAN(decrypt(isci.iban)),
    tcKimlik: decrypt(isci.tcKimlik),
    iban: decrypt(isci.iban),
    ilce: isci.ilce,
    puan: isci.puan,
    noShow,
    guvenilirlik,
    beklenti: Number(isci.gunlukUcretBeklentisi),
    durum: isci.durum,
    tercihBolgeler: isci.tercihBolgeler,
    meslekler: isci.meslekler.map((m) => m.meslek.ad),
    dogumTarihi: isci.dogumTarihi.toISOString().slice(0, 10),
    belgeler: isci.belgeler.map((b) => ({
      id: b.id,
      tip: b.tip,
      bitisTarihi: b.bitisTarihi.toISOString().slice(0, 10),
      kalanGun: daysUntil(b.bitisTarihi),
      durum: b.bitisTarihi < bugun ? 'doldu' : daysUntil(b.bitisTarihi) <= 30 ? 'yaklasiyor' : 'gecerli',
    })),
    musaitlik: isci.musaitlikler.map((m) => ({
      id: m.id,
      tarih: m.tarih.toISOString().slice(0, 10),
      eVadesiGun: m.eVadesiGun,
      durum: m.durum,
    })),
    avanslar: isci.avanslar.map((a) => ({
      id: a.id,
      tutar: Number(a.tutar),
      tarih: a.tarih.toISOString().slice(0, 10),
      durum: a.durum,
    })),
    gecmis: isci.atamalar.map((a) => ({
      id: a.id,
      tarih: a.tarih.toISOString().slice(0, 10),
      firma: a.talep.firma.ad,
      lokasyon: a.talep.lokasyon.ad,
      durum: a.durum,
      puantaj: a.puantaj?.durum ?? null,
    })),
  }
}

// ---- Operasyon özeti (dashboard) ----
export async function getOperasyonOzeti(user: SessionUser) {
  const bugun = startOfDay()
  const yarin = addDays(bugun, 1)

  const [yarinTalepler, acikTalepler, belgeler] = await Promise.all([
    prisma.talep.findMany({
      where: {
        tarih: { gte: yarin, lt: addDays(yarin, 1) },
        ...lokasyonFilter(user),
      },
      include: {
        kalemler: true,
        atamalar: { where: { durum: { not: 'iptal' } } },
      },
    }),
    prisma.talep.findMany({
      where: {
        durum: { in: ['acik', 'kismi'] },
        tarih: { gte: bugun },
        ...lokasyonFilter(user),
      },
      include: { kalemler: true, atamalar: { where: { durum: { not: 'iptal' } } } },
    }),
    prisma.belge.findMany({
      where: { bitisTarihi: { lte: addDays(bugun, 30) } },
      include: { isci: true },
    }),
  ])

  const yarinIhtiyac = yarinTalepler.reduce((a, t) => a + t.kalemler.reduce((x, k) => x + k.adet, 0), 0)
  const yarinAtanan = yarinTalepler.reduce((a, t) => a + t.atamalar.length, 0)

  const acikAdet = acikTalepler.reduce((a, t) => a + t.kalemler.reduce((x, k) => x + k.adet, 0), 0)
  const acikAtanan = acikTalepler.reduce((a, t) => a + t.atamalar.length, 0)

  const belgesiDolan = belgeler.filter((b) => b.bitisTarihi < bugun).length
  const belgesiYaklasan = belgeler.filter((b) => b.bitisTarihi >= bugun).length

  return {
    yarin: { ihtiyac: yarinIhtiyac, atanan: yarinAtanan, eksik: yarinIhtiyac - yarinAtanan },
    acik: { talepSayisi: acikTalepler.length, adet: acikAdet, atanan: acikAtanan, eksik: acikAdet - acikAtanan },
    belge: { dolan: belgesiDolan, yaklasan: belgesiYaklasan },
  }
}