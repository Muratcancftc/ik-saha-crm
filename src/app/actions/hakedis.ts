'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/db'
import { requireRoles } from '@/lib/dal'
import { startOfDay, addDays } from '@/lib/dates'
import type { AtamaDurum } from '@prisma/client'

// Bir atamanın hakedişini üret (puantaj + tamamlandı gerekir)
async function hakedisOlustur(atamaId: number) {
  const atama = await prisma.atama.findUnique({
    where: { id: atamaId },
    include: {
      isci: true,
      talep: { include: { kalemler: true } },
      puantaj: true,
    },
  })
  if (!atama || atama.durum !== 'tamamlandi' || !atama.puantaj) return null
  if (atama.puantaj.durum === 'gelmedi') return null // gelmedi = ödeme yok

  const mevcut = await prisma.hakedis.findUnique({ where: { atamaId: atama.id } })
  if (mevcut) return mevcut

  const meslekId = atama.meslekId ?? atama.talep.kalemler[0]?.meslekId ?? null
  let musteriGun = 0
  if (meslekId) {
    const fiyat = await prisma.firmaFiyat.findFirst({
      where: { firmaId: atama.talep.firmaId, meslekId },
    })
    musteriGun = fiyat ? Number(fiyat.kisiGunFiyat) : 0
  }

  const yevmiye = Number(atama.isci.gunlukUcretBeklentisi)
  const gun = 1
  const avansToplam = await prisma.avans.aggregate({
    where: { isciId: atama.isciId, durum: 'verildi' },
    _sum: { tutar: true },
  })
  const avans = Number(avansToplam._sum.tutar ?? 0)
  const kesinti = 0
  const isciNet = gun * yevmiye - avans - kesinti
  const musteriTutar = gun * musteriGun
  const marj = musteriTutar - gun * yevmiye

  return prisma.hakedis.create({
    data: {
      isciId: atama.isciId,
      firmaId: atama.talep.firmaId,
      atamaId: atama.id,
      donemBas: atama.talep.tarih,
      donemBitis: atama.talep.tarih,
      gun,
      yevmiye,
      avansToplam: avans,
      kesinti,
      isciNet,
      musteriTutar,
      marj,
    },
  })
}

// Atama "tamamlandı" olunca puantaj varsa hakedişi otomatik üret
export async function setAtamaDurumOtomatik(formData: FormData) {
  await requireRoles(['patron', 'operasyon'])
  const id = Number(formData.get('id'))
  const durum = String(formData.get('durum') ?? 'tamamlandi') as AtamaDurum

  await prisma.atama.update({ where: { id }, data: { durum } })
  if (durum === 'tamamlandi') {
    await hakedisOlustur(id)
  }

  revalidatePath('/talepler')
  revalidatePath('/hakedis')
  revalidatePath('/puantaj')
}

// Dönem hakedişlerini topluca üret (geriye dönük)
export async function hakedisUret(formData: FormData) {
  await requireRoles(['patron', 'muhasebe'])
  const bas = String(formData.get('donemBas') ?? '')
  const bit = String(formData.get('donemBitis') ?? '')
  if (!bas || !bit) return

  const basTarih = startOfDay(new Date(bas))
  const bitTarih = addDays(new Date(bit), 1)

  const atamalar = await prisma.atama.findMany({
    where: {
      durum: 'tamamlandi',
      tarih: { gte: basTarih, lt: bitTarih },
      puantaj: { isNot: null },
    },
  })

  let adet = 0
  for (const a of atamalar) {
    const h = await hakedisOlustur(a.id)
    if (h) adet++
  }

  revalidatePath('/hakedis')
  return
}

export async function silHakedis(formData: FormData) {
  await requireRoles(['patron', 'muhasebe'])
  const id = Number(formData.get('id'))
  await prisma.hakedis.delete({ where: { id } })
  revalidatePath('/hakedis')
  return
}