'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/db'
import { requireRoles } from '@/lib/dal'
import { bolgeGecerli } from '@/lib/bolge'
import type { ServisciDurum } from '@prisma/client'

export type ServisciState = { error?: string; ok?: boolean } | undefined

export async function createServisci(_prev: ServisciState, formData: FormData): Promise<ServisciState> {
  await requireRoles(['patron', 'operasyon', 'muhasebe'])
  const ad = String(formData.get('ad') ?? '').trim()
  if (!ad) return { error: 'Servisçi adı zorunludur.' }

  await prisma.servisci.create({
    data: {
      ad,
      telefon: String(formData.get('telefon') ?? '').trim(),
      bolge: bolgeGecerli(String(formData.get('bolge') ?? '')) ?? 'kocaeli',
      not: String(formData.get('not') ?? '').trim() || null,
      durum: 'aktif',
    },
  })
  revalidatePath('/servisciler')
  return { ok: true }
}

export async function updateServisci(_prev: ServisciState, formData: FormData): Promise<ServisciState> {
  await requireRoles(['patron', 'operasyon', 'muhasebe'])
  const id = Number(formData.get('id'))
  if (!id) return { error: 'Kayıt bulunamadı.' }
  const mevcut = await prisma.servisci.findUnique({ where: { id } })
  if (!mevcut) return { error: 'Kayıt bulunamadı.' }

  await prisma.servisci.update({
    where: { id },
    data: {
      ad: String(formData.get('ad') ?? mevcut.ad).trim() || mevcut.ad,
      telefon: String(formData.get('telefon') ?? mevcut.telefon),
      bolge: bolgeGecerli(String(formData.get('bolge') ?? '')) ?? mevcut.bolge,
      durum: (String(formData.get('durum') ?? mevcut.durum) as ServisciDurum) || mevcut.durum,
      not: String(formData.get('not') ?? '') ? String(formData.get('not')) : null,
    },
  })
  revalidatePath('/servisciler')
  return { ok: true }
}

export async function toggleServisciDurum(formData: FormData) {
  await requireRoles(['patron', 'operasyon', 'muhasebe'])
  const id = Number(formData.get('id'))
  const hedef = String(formData.get('hedef') ?? 'pasif') as ServisciDurum
  await prisma.servisci.update({ where: { id }, data: { durum: hedef } })
  revalidatePath('/servisciler')
  return
}

export async function silServisci(formData: FormData) {
  await requireRoles(['patron'])
  const id = Number(formData.get('id'))
  await prisma.servisci.delete({ where: { id } })
  revalidatePath('/servisciler')
  return
}

// Servis kaydı ekle: kavli tutar (KDV'siz) + ne yaptı açıklaması
export async function servisEkle(formData: FormData) {
  await requireRoles(['patron', 'operasyon', 'muhasebe'])
  const servisciId = Number(formData.get('servisciId'))
  const tutar = Number(formData.get('tutar'))
  const tarih = String(formData.get('tarih') ?? '')
  if (!servisciId || !tarih || Number.isNaN(tutar) || tutar <= 0) return

  await prisma.servis.create({
    data: {
      servisciId,
      tarih: new Date(`${tarih}T00:00:00`),
      guzergah: String(formData.get('guzergah') ?? '').trim() || null,
      tutar,
      not: String(formData.get('not') ?? '').trim() || null,
    },
  })
  revalidatePath('/servisciler')
  return
}

export async function silServis(formData: FormData) {
  await requireRoles(['patron', 'operasyon', 'muhasebe'])
  const id = Number(formData.get('id'))
  await prisma.servis.delete({ where: { id } })
  revalidatePath('/servisciler')
  return
}