import { requireUser } from '@/lib/dal'
import { prisma } from '@/lib/db'
import { startOfDay, addDays } from '@/lib/dates'
import { Takvim } from './takvim-client'

export const dynamic = 'force-dynamic'

// Haftanın pazartesini bul
function haftaBaslangici(fromIso?: string): Date {
  const bugun = startOfDay()
  if (fromIso) return startOfDay(new Date(`${fromIso}T00:00:00`))
  const gun = (bugun.getDay() + 6) % 7 // Pazartesi=0
  return addDays(bugun, -gun)
}

const AY_ADLARI = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık']

export default async function TakvimPage({
  searchParams,
}: {
  searchParams: Promise<{ bas?: string; gun?: string }>
}) {
  const user = await requireUser()
  const sp = await searchParams
  const bas = haftaBaslangici(sp.bas)
  const bit = addDays(bas, 7)

  const lokFiltre = user.rol === 'saha_sorumlusu' ? { lokasyonId: user.lokasyonId ?? -1 } : {}

  // hafta + ay verilerini paralel çek
  const [haftaTalepler, ayTalepler] = await Promise.all([
    prisma.talep.findMany({
      where: { tarih: { gte: bas, lt: bit }, ...lokFiltre },
      include: {
        lokasyon: { include: { firma: true } },
        kalemler: { include: { meslek: true } },
        atamalar: { where: { durum: { not: 'iptal' } } },
      },
      orderBy: { tarih: 'asc' },
    }),
    prisma.talep.findMany({
      where: {
        tarih: { gte: new Date(bas.getFullYear(), bas.getMonth(), 1), lt: new Date(bas.getFullYear(), bas.getMonth() + 1, 1) },
        ...lokFiltre,
      },
      include: {
        kalemler: true,
        atamalar: { where: { durum: { not: 'iptal' } } },
      },
    }),
  ])

  // satırlar: firma/lokasyon
  const lokHarita = new Map<number, { lokasyonId: number; ad: string; firma: string }>()
  for (const t of haftaTalepler) {
    if (!lokHarita.has(t.lokasyonId)) {
      lokHarita.set(t.lokasyonId, { lokasyonId: t.lokasyonId, ad: t.lokasyon.ad, firma: t.lokasyon.firma.ad })
    }
  }
  const satirlar = Array.from(lokHarita.values())

  // günler
  const gunler = Array.from({ length: 7 }, (_, i) => {
    const d = addDays(bas, i)
    return { iso: d.toISOString().slice(0, 10), etiket: new Intl.DateTimeFormat('tr-TR', { weekday: 'short', day: 'numeric' }).format(d) }
  })

  const talepSeri = haftaTalepler.map((t) => ({
    id: t.id,
    lokasyonId: t.lokasyonId,
    tarih: t.tarih.toISOString().slice(0, 10),
    vardiya: t.vardiya,
    durum: t.durum,
    aciliyet: t.aciliyet,
    kalemler: t.kalemler.map((k) => ({
      meslekId: k.meslekId,
      meslekAd: k.meslek.ad,
      adet: k.adet,
      atanan: t.atamalar.filter((a) => a.meslekId === k.meslekId).length,
    })),
  }))

  // ay görünümü verisi
  const gunSayisi = new Date(bas.getFullYear(), bas.getMonth() + 1, 0).getDate()
  const ayGunler = []
  for (let gun = 1; gun <= gunSayisi; gun++) {
    const iso = new Date(bas.getFullYear(), bas.getMonth(), gun).toISOString().slice(0, 10)
    const gunTalepler = ayTalepler.filter((t) => t.tarih.toISOString().slice(0, 10) === iso)
    const ihtiyac = gunTalepler.reduce((a, t) => a + t.kalemler.reduce((x, k) => x + k.adet, 0), 0)
    const atanan = gunTalepler.reduce((a, t) => a + t.atamalar.length, 0)
    ayGunler.push({
      iso,
      gun,
      ihtiyac,
      atanan,
      acil: gunTalepler.some((t) => t.aciliyet === 'acil'),
      talepSayisi: gunTalepler.length,
    })
  }

  const ayEtiket = `${AY_ADLARI[bas.getMonth()]} ${bas.getFullYear()}`
  const ayIlkGun = new Date(bas.getFullYear(), bas.getMonth(), 1).getDay() // 0=Sun

  return (
    <Takvim
      bas={bas.toISOString().slice(0, 10)}
      gunler={gunler}
      satirlar={satirlar}
      talepler={talepSeri}
      ayGunler={ayGunler}
      ayEtiket={ayEtiket}
      ayIlkGun={ayIlkGun}
      ayBas={bas.getFullYear() * 100 + bas.getMonth()}
      seciliGunBaslangic={Number(sp.gun) || -1}
    />
  )
}