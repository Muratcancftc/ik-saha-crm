'use server'

import { prisma } from '@/lib/db'
import { requireRoles } from '@/lib/dal'
import { startOfDay, daysUntil } from '@/lib/dates'

// Belirli bir günde boşta olan (ataması olmayan) aktif işçiler
export async function musaitIsciler(tarihIso: string, meslekId?: number) {
  await requireRoles(['patron', 'operasyon', 'saha_sorumlusu'])

  const gun = startOfDay(new Date(`${tarihIso}T00:00:00`))
  const ertesi = new Date(gun)
  ertesi.setDate(ertesi.getDate() + 1)

  const atamali = await prisma.atama.findMany({
    where: { tarih: { gte: gun, lt: ertesi }, durum: { not: 'iptal' } },
    select: { isciId: true },
  })
  const atanmis = new Set(atamali.map((a) => a.isciId))

  const adaylar = await prisma.isci.findMany({
    where: {
      durum: 'aktif',
      ...(meslekId ? { meslekler: { some: { meslekId } } } : {}),
    },
    include: {
      meslekler: { include: { meslek: true } },
      belgeler: true,
    },
  })

  const bugun = startOfDay()
  return adaylar
    .filter((i) => !atanmis.has(i.id))
    .filter((i) => !i.belgeler.some((b) => b.bitisTarihi < bugun))
    .map((i) => ({
      id: i.id,
      ad: i.ad,
      ilce: i.ilce,
      telefon: i.telefon,
      puan: i.puan,
      beklenti: Number(i.gunlukUcretBeklentisi),
      meslekler: i.meslekler.map((m) => m.meslek.ad),
      belgeYaklasan: i.belgeler.some((b) => b.bitisTarihi >= bugun && daysUntil(b.bitisTarihi) <= 30),
    }))
}