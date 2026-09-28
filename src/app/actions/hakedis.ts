'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/db'
import { requireRoles } from '@/lib/dal'
import { startOfDay, addDays } from '@/lib/dates'
import { parseLocalDate } from '@/lib/donem'
import type { AtamaDurum } from '@prisma/client'

// Bir atamanın hakedişini üret: işçi+firma+ay bazında TOPLA.
// Idempotent: dönemdeki TÜM uygun atamalar her seferinde baştan sayılır;
// "Üret"e kaç kez basılırsa basılsın gün/tutarlar aynı kalır. Atama iptal
// edilirse ya da puantajı "gelmedi"ye çekilirse bir sonraki üretimde düşer.
export async function hakedisOlustur(atamaId: number) {
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

  const firmaId = atama.talep.firmaId
  const isciId = atama.isciId
  const tarih = atama.talep.tarih
  const donemKey = `${tarih.getFullYear()}-${tarih.getMonth() + 1}`
  const donemBas = new Date(tarih.getFullYear(), tarih.getMonth(), 1)
  const donemBitis = new Date(tarih.getFullYear(), tarih.getMonth() + 1, 1)

  // Aynı işçi+firma+ay içindeki tüm uygun atamaları baştan topla
  const dönemAtamalar = await prisma.atama.findMany({
    where: {
      isciId,
      talep: { firmaId },
      durum: 'tamamlandi',
      puantaj: { isNot: null },
      tarih: { gte: donemBas, lt: donemBitis },
    },
    include: { puantaj: true, talep: { include: { kalemler: true } } },
  })
  const uygun = dönemAtamalar.filter((a) => a.puantaj && a.puantaj.durum !== 'gelmedi')
  if (uygun.length === 0) return null

  const fiyatlar = await prisma.firmaFiyat.findMany({ where: { firmaId } })
  const fiyatMap = new Map(fiyatlar.map((f) => [f.meslekId, Number(f.kisiGunFiyat)]))

  let gun = 0
  let musteri = 0
  let sonTarih = uygun[0].tarih
  for (const a of uygun) {
    gun++
    const meslekId = a.meslekId ?? a.talep.kalemler[0]?.meslekId ?? null
    musteri += meslekId ? (fiyatMap.get(meslekId) ?? 0) : 0
    if (a.tarih > sonTarih) sonTarih = a.tarih
  }

  const yevmiye = Number(atama.isci.gunlukUcretBeklentisi)

  const avansToplam = await prisma.avans.aggregate({
    where: { isciId, durum: 'verildi' },
    _sum: { tutar: true },
  })
  const avans = Number(avansToplam._sum.tutar ?? 0)
  const kesinti = 0

  const isciNet = gun * yevmiye - avans - kesinti
  const marj = musteri - gun * yevmiye

  return prisma.hakedis.upsert({
    where: { isciId_firmaId_donemKey: { isciId, firmaId, donemKey } },
    update: {
      atamaId,
      donemBitis: sonTarih,
      gun,
      yevmiye,
      avansToplam: avans,
      kesinti,
      isciNet,
      musteriTutar: musteri,
      marj,
    },
    create: {
      isciId,
      firmaId,
      atamaId,
      donemKey,
      donemBas,
      donemBitis: sonTarih,
      gun,
      yevmiye,
      avansToplam: avans,
      kesinti,
      isciNet,
      musteriTutar: musteri,
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
  revalidatePath('/takvim')
  revalidatePath('/hakedis')
  revalidatePath('/puantaj')
}

export type HakedisUretState = { olusturulan?: number; kayitSayisi?: number } | undefined

// Dönem hakedişlerini topluca üret (geriye dönük)
export async function hakedisUret(_prev: HakedisUretState, formData: FormData): Promise<HakedisUretState> {
  await requireRoles(['patron', 'muhasebe'])
  const bas = String(formData.get('donemBas') ?? '')
  const bit = String(formData.get('donemBitis') ?? '')
  if (!bas || !bit) return { olusturulan: 0 }

  const basTarih = startOfDay(parseLocalDate(bas))
  const bitTarih = addDays(parseLocalDate(bit), 1)

  const atamalar = await prisma.atama.findMany({
    where: {
      durum: 'tamamlandi',
      tarih: { gte: basTarih, lt: bitTarih },
      puantaj: { isNot: null },
    },
  })

  let olusturulan = 0
  for (const a of atamalar) {
    const h = await hakedisOlustur(a.id)
    if (h) olusturulan++
  }

  revalidatePath('/hakedis')
  return { olusturulan, kayitSayisi: atamalar.length }
}

export async function silHakedis(formData: FormData) {
  await requireRoles(['patron', 'muhasebe'])
  const id = Number(formData.get('id'))
  await prisma.hakedis.delete({ where: { id } })
  revalidatePath('/hakedis')
  return
}