'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/db'
import { requireRoles } from '@/lib/dal'

export type FirmaActionState = { error?: string; ok?: boolean } | undefined

export async function createFirma(_prev: FirmaActionState, formData: FormData): Promise<FirmaActionState> {
  await requireRoles(['patron', 'operasyon'])
  const ad = String(formData.get('ad') ?? '').trim()
  if (!ad) return { error: 'Firma adı zorunludur.' }

  await prisma.musteriFirma.create({
    data: {
      ad,
      vergiNo: String(formData.get('vergiNo') ?? '').trim() || null,
      telefon: String(formData.get('telefon') ?? '').trim() || null,
      email: String(formData.get('email') ?? '').trim() || null,
      adres: String(formData.get('adres') ?? '').trim() || null,
    },
  })
  revalidatePath('/musteri-firmalar')
  return { ok: true }
}

export async function addLokasyon(formData: FormData) {
  await requireRoles(['patron', 'operasyon'])
  const firmaId = Number(formData.get('firmaId'))
  const ad = String(formData.get('ad') ?? '').trim()
  const adres = String(formData.get('adres') ?? '').trim()
  if (!firmaId || !ad) return
  await prisma.lokasyon.create({ data: { firmaId, ad, adres: adres || null } })
  revalidatePath('/musteri-firmalar')
  return
}

export async function addYetkili(formData: FormData) {
  await requireRoles(['patron', 'operasyon'])
  const firmaId = Number(formData.get('firmaId'))
  const ad = String(formData.get('ad') ?? '').trim()
  if (!firmaId || !ad) return
  await prisma.yetkili.create({
    data: {
      firmaId,
      ad,
      unvan: String(formData.get('unvan') ?? '').trim() || null,
      telefon: String(formData.get('telefon') ?? '').trim() || null,
    },
  })
  revalidatePath('/musteri-firmalar')
  return
}

export async function setFirmaFiyat(formData: FormData) {
  await requireRoles(['patron', 'operasyon'])
  const firmaId = Number(formData.get('firmaId'))
  const meslekId = Number(formData.get('meslekId'))
  const fiyat = Number(formData.get('fiyat'))
  if (!firmaId || !meslekId || Number.isNaN(fiyat)) return
  await prisma.firmaFiyat.upsert({
    where: { firmaId_meslekId: { firmaId, meslekId } },
    update: { kisiGunFiyat: fiyat },
    create: { firmaId, meslekId, kisiGunFiyat: fiyat },
  })
  revalidatePath('/musteri-firmalar')
  return
}

export async function silFirma(formData: FormData) {
  await requireRoles(['patron'])
  const id = Number(formData.get('id'))
  await prisma.musteriFirma.delete({ where: { id } })
  revalidatePath('/musteri-firmalar')
  return
}