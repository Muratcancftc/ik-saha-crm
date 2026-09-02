'use server'

import { prisma } from '@/lib/db'
import { requireRoles } from '@/lib/dal'
import { startOfDay, daysUntil } from '@/lib/dates'

// Takvimde bir talebin detayı (hücreye girince)
export async function takvimTalepDetay(talepId: number) {
  await requireRoles(['patron', 'operasyon', 'saha_sorumlusu'])

  const talep = await prisma.talep.findUnique({
    where: { id: talepId },
    include: {
      firma: true,
      lokasyon: true,
      kalemler: { include: { meslek: true } },
      atamalar: {
        where: { durum: { not: 'iptal' } },
        include: { isci: true, puantaj: true },
        orderBy: { createdAt: 'asc' },
      },
    },
  })
  if (!talep) return null

  return {
    id: talep.id,
    firma: talep.firma.ad,
    lokasyon: talep.lokasyon.ad,
    tarih: talep.tarih.toISOString().slice(0, 10),
    vardiya: talep.vardiya,
    aciliyet: talep.aciliyet,
    durum: talep.durum,
    not: talep.not,
    kalemler: talep.kalemler.map((k) => ({
      id: k.id,
      meslekId: k.meslekId,
      meslekAd: k.meslek.ad,
      adet: k.adet,
      atanan: talep.atamalar.filter((a) => a.meslekId === k.meslekId).length,
    })),
    atamalar: talep.atamalar.map((a) => ({
      id: a.id,
      isciId: a.isci.id,
      isciAd: a.isci.ad,
      meslekId: a.meslekId,
      durum: a.durum,
      puantaj: a.puantaj?.durum ?? null,
      sgkBildirildi: a.sgkBildirildi,
    })),
  }
}

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