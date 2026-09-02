import type { SessionUser } from './dal'
import { prisma } from './db'
import { startOfDay, addDays } from './dates'
import type { Prisma } from '@prisma/client'

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

// KPI: ciro, alacak, saha işçi maliyeti, giderler
export async function getMaliVeri(user: SessionUser) {
  const [faturalar, tahsilatlar, hakedisler, giderler, personel, odemeler] = await Promise.all([
    prisma.fatura.aggregate({ _sum: { genelToplam: true } }),
    prisma.tahsilat.aggregate({ _sum: { tutar: true } }),
    prisma.hakedis.aggregate({ _sum: { marj: true }, _count: true }),
    prisma.gider.findMany(),
    prisma.personel.aggregate({ _sum: { maas: true } }),
    prisma.resmiOdeme.findMany({ where: { durum: 'odendi' } }),
  ])

  const ciro = Number(faturalar._sum.genelToplam ?? 0)
  const tahsilat = Number(tahsilatlar._sum.tutar ?? 0)
  const alacak = ciro - tahsilat

  // Saha işçi maliyeti = hakediş gün × yevmiye
  const hakedislerList = await prisma.hakedis.findMany()
  const sahaIsciMaliyeti = hakedislerList.reduce(
    (acc, h) => acc + Number(h.gun) * Number(h.yevmiye),
    0
  )
  const brütMarj = Number(hakedislerList.reduce((acc, h) => acc + Number(h.marj), 0))

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
    hakedisAdet: hakedisler._count,
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