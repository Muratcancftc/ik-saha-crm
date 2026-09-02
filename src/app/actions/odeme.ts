'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/db'
import { requireRoles } from '@/lib/dal'
import { startOfDay } from '@/lib/dates'
import type { OdemeKaynak } from '@prisma/client'

// Dönem için ödeme kayıtlarını üret (işçi hakediş net + personel maaş)
export async function odemeUret(formData: FormData) {
  await requireRoles(['patron', 'muhasebe'])
  const donem = String(formData.get('donem') ?? '').trim()
  if (!/^\d{4}-\d{2}$/.test(donem)) return

  const [yil, ay] = donem.split('-').map(Number)
  const bas = startOfDay(new Date(yil, ay - 1, 1))
  const bit = startOfDay(new Date(yil, ay, 1))

  // işçi hakedişleri
  const hakedisler = await prisma.hakedis.findMany({
    where: { donemBitis: { gte: bas, lt: bit } },
    include: { isci: true },
  })
  const isciNet = new Map<number, number>()
  for (const h of hakedisler) {
    isciNet.set(h.isciId, (isciNet.get(h.isciId) ?? 0) + Number(h.isciNet))
  }

  for (const [isciId, tutar] of isciNet) {
    const varMi = await prisma.odeme.findFirst({ where: { tip: 'isci', isciId, donem } })
    if (!varMi) {
      await prisma.odeme.create({ data: { tip: 'isci', isciId, donem, tutar } })
    }
  }

  // personel maaşları
  const personeller = await prisma.personel.findMany({ where: { durum: 'aktif' } })
  for (const p of personeller) {
    const varMi = await prisma.odeme.findFirst({ where: { tip: 'personel', personelId: p.id, donem } })
    if (!varMi) {
      await prisma.odeme.create({ data: { tip: 'personel', personelId: p.id, donem, tutar: p.maas } })
    }
  }

  revalidatePath('/odeme')
  return
}

export async function odemeOdendi(formData: FormData) {
  await requireRoles(['patron', 'muhasebe'])
  const id = Number(formData.get('id'))
  await prisma.odeme.update({ where: { id }, data: { durum: 'odendi', odemeTarihi: new Date() } })
  revalidatePath('/odeme')
  return
}

export async function odemeGeriAl(formData: FormData) {
  await requireRoles(['patron', 'muhasebe'])
  const id = Number(formData.get('id'))
  await prisma.odeme.update({ where: { id }, data: { durum: 'bekliyor', odemeTarihi: null } })
  revalidatePath('/odeme')
  return
}

export async function odemeSil(formData: FormData) {
  await requireRoles(['patron', 'muhasebe'])
  const id = Number(formData.get('id'))
  await prisma.odeme.delete({ where: { id } })
  revalidatePath('/odeme')
  return
}

export async function odemeleriOdi(formData: FormData) {
  await requireRoles(['patron', 'muhasebe'])
  const donem = String(formData.get('donem') ?? '')
  if (donem) {
    await prisma.odeme.updateMany({ where: { donem, durum: 'bekliyor' }, data: { durum: 'odendi', odemeTarihi: new Date() } })
  } else {
    await prisma.odeme.updateMany({ where: { durum: 'bekliyor' }, data: { durum: 'odendi', odemeTarihi: new Date() } })
  }
  revalidatePath('/odeme')
  return
}

export type { OdemeKaynak }