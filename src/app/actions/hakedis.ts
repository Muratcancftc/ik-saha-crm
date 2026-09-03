'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/db'
import { requireRoles } from '@/lib/dal'
import { startOfDay, addDays } from '@/lib/dates'
import type { AtamaDurum } from '@prisma/client'

// Bir atamanın hakedişini üret: işçi+firma+ay bazında TOPLA (upsert)
// Avans dönemde yalnızca bir kez düşülür; tekrar "Üret" ile mükerrer kayıt oluşmaz.
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

  const meslekId = atama.meslekId ?? atama.talep.kalemler[0]?.meslekId ?? null
  let musteriGun = 0
  if (meslekId) {
    const fiyat = await prisma.firmaFiyat.findFirst({
      where: { firmaId: atama.talep.firmaId, meslekId },
    })
    musteriGun = fiyat ? Number(fiyat.kisiGunFiyat) : 0
  }

  const yevmiye = Number(atama.isci.gunlukUcretBeklentisi)
  const tarih = atama.talep.tarih
  const donemKey = `${tarih.getFullYear()}-${tarih.getMonth() + 1}`

  const avansToplam = await prisma.avans.aggregate({
    where: { isciId: atama.isciId, durum: 'verildi' },
    _sum: { tutar: true },
  })
  const avans = Number(avansToplam._sum.tutar ?? 0)
  const kesinti = 0

  const mevcut = await prisma.hakedis.findFirst({
    where: { isciId: atama.isciId, firmaId: atama.talep.firmaId, donemKey },
  })

  if (mevcut) {
    const gun = mevcut.gun + 1
    const musteri = Number(mevcut.musteriTutar) + musteriGun
    const isciNet = gun * yevmiye - avans - kesinti
    return prisma.hakedis.update({
      where: { id: mevcut.id },
      data: {
        atamaId: atama.id,
        donemBitis: tarih,
        gun,
        yevmiye,
        avansToplam: avans,
        kesinti,
        isciNet,
        musteriTutar: musteri,
        marj: musteri - gun * yevmiye,
      },
    })
  }

  const gun = 1
  const musteri = gun * musteriGun
  const isciNet = gun * yevmiye - avans - kesinti
  return prisma.hakedis.create({
    data: {
      isciId: atama.isciId,
      firmaId: atama.talep.firmaId,
      atamaId: atama.id,
      donemKey,
      donemBas: new Date(tarih.getFullYear(), tarih.getMonth(), 1),
      donemBitis: tarih,
      gun,
      yevmiye,
      avansToplam: avans,
      kesinti,
      isciNet,
      musteriTutar: musteri,
      marj: musteri - gun * yevmiye,
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
  revalidatePath('/takvim')
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

  for (const a of atamalar) {
    await hakedisOlustur(a.id)
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