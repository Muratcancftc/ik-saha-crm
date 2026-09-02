'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/db'
import { requireRoles } from '@/lib/dal'
import { encrypt } from '@/lib/crypto'
import type { AdayDurum } from '@prisma/client'

export type AdayState = { error?: string; ok?: boolean } | undefined

export async function createAday(_prev: AdayState, formData: FormData): Promise<AdayState> {
  await requireRoles(['patron', 'operasyon'])
  const ad = String(formData.get('ad') ?? '').trim()
  const telefon = String(formData.get('telefon') ?? '').trim()
  if (!ad || !telefon) return { error: 'Ad ve telefon zorunludur.' }

  const meslekId = Number(formData.get('meslekId')) || null
  await prisma.aday.create({
    data: {
      ad,
      telefon,
      email: String(formData.get('email') ?? '').trim() || null,
      meslekId,
      durum: 'basvurdu',
      puan: Number(formData.get('puan') ?? 50) || 50,
      not: String(formData.get('not') ?? '') || null,
    },
  })
  revalidatePath('/adaylar')
  return { ok: true }
}

export async function adayDurumDegistir(formData: FormData) {
  await requireRoles(['patron', 'operasyon'])
  const id = Number(formData.get('id'))
  const durum = String(formData.get('durum') ?? 'basvurdu') as AdayDurum
  await prisma.aday.update({ where: { id }, data: { durum } })
  revalidatePath('/adaylar')
  return
}

// Onaylanan adayı tek tıkla işçi havuzuna aktar
export async function adayAktar(formData: FormData) {
  await requireRoles(['patron', 'operasyon'])
  const id = Number(formData.get('id'))
  const aday = await prisma.aday.findUnique({ where: { id } })
  if (!aday) return

  // mock TC/IBAN (adayda yoksa üretilir)
  const genTC = () => {
    const d = [1, ...Array.from({ length: 8 }, () => Math.floor(Math.random() * 10))]
    const d10 = ((d[0] + d[2] + d[4] + d[6] + d[8]) * 7 - (d[1] + d[3] + d[5] + d[7])) % 10
    const d11 = (d.reduce((a, b) => a + b, 0) + Math.abs(d10)) % 10
    return `${d.join('')}${Math.abs(d10)}${d11}`
  }
  const genIBAN = () => 'TR00' + Array.from({ length: 22 }, () => Math.floor(Math.random() * 10)).join('')

  await prisma.isci.create({
    data: {
      ad: aday.ad,
      telefon: aday.telefon,
      tcKimlik: encrypt(genTC()),
      ilce: 'İstanbul',
      iban: encrypt(genIBAN()),
      dogumTarihi: new Date(1990, 0, 1),
      puan: aday.puan,
      gunlukUcretBeklentisi: 1500,
      durum: 'aktif',
      tercihBolgeler: [],
      not: 'Aday havuzundan aktarıldı',
      meslekler: aday.meslekId ? { create: [{ meslekId: aday.meslekId }] } : undefined,
    },
  })

  await prisma.aday.update({ where: { id }, data: { durum: 'onaylandi' } })

  revalidatePath('/adaylar')
  revalidatePath('/isci-havuzu')
  return
}

export async function adaySil(formData: FormData) {
  await requireRoles(['patron', 'operasyon'])
  const id = Number(formData.get('id'))
  await prisma.aday.delete({ where: { id } })
  revalidatePath('/adaylar')
  return
}