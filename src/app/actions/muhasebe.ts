'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/db'
import { requireRoles } from '@/lib/dal'
import { getAyarSayi } from '@/lib/ayar'
import type { GiderKategori, OdemeTip, ResmiOdemeDurum } from '@prisma/client'

export type MuhasebeState = { error?: string; ok?: boolean } | undefined

// ---- Gider ----
export async function createGider(_prev: MuhasebeState, formData: FormData): Promise<MuhasebeState> {
  await requireRoles(['patron', 'muhasebe'])
  const tutar = Number(formData.get('tutar'))
  if (!tutar || tutar <= 0) return { error: 'Geçerli bir tutar girin.' }
  await prisma.gider.create({
    data: {
      kategori: (String(formData.get('kategori') ?? 'diger') as GiderKategori) || 'diger',
      aciklama: String(formData.get('aciklama') ?? '') || null,
      tutar,
      tarih: formData.get('tarih') ? new Date(String(formData.get('tarih'))) : new Date(),
    },
  })
  revalidatePath('/gelir-gider')
  revalidatePath('/')
  return { ok: true }
}

export async function silGider(formData: FormData) {
  await requireRoles(['patron', 'muhasebe'])
  await prisma.gider.delete({ where: { id: Number(formData.get('id')) } })
  revalidatePath('/gelir-gider')
  revalidatePath('/')
  return
}

// ---- Fatura ----
export async function createFatura(_prev: MuhasebeState, formData: FormData): Promise<MuhasebeState> {
  await requireRoles(['patron', 'muhasebe'])
  const firmaId = Number(formData.get('firmaId'))
  const araToplam = Number(formData.get('araToplam'))
  const donem = String(formData.get('donem') ?? '')
  const vadeTarihi = String(formData.get('vadeTarihi') ?? '')
  if (!firmaId || !araToplam || araToplam <= 0 || !donem || !vadeTarihi) {
    return { error: 'Firma, net tutar, dönem ve vade zorunludur.' }
  }

  // İş kuralı 5: kdvTutar = araToplam × kdvOran (ayarlardan); genelToplam = araToplam + kdv
  const kdvOran = await getAyarSayi('KDV_ORANI', 0.2)
  const kdvTutar = Math.round(araToplam * kdvOran * 100) / 100
  const genelToplam = Math.round((araToplam + kdvTutar) * 100) / 100

  const no = String(formData.get('no') ?? '').trim() || `IKR-${Date.now()}`
  await prisma.fatura.create({
    data: {
      firmaId,
      no,
      donem,
      araToplam,
      kdvOran,
      kdvTutar,
      genelToplam,
      vadeTarihi: new Date(`${vadeTarihi}T23:59:00`),
      durum: 'vadede',
    },
  })
  revalidatePath('/faturalar')
  revalidatePath('/vergi-odemeler')
  revalidatePath('/')
  return { ok: true }
}

export async function createTahsilat(formData: FormData) {
  await requireRoles(['patron', 'muhasebe'])
  const faturaId = Number(formData.get('faturaId'))
  const tutar = Number(formData.get('tutar'))
  if (!faturaId || !tutar || tutar <= 0) return
  await prisma.tahsilat.create({ data: { faturaId, tutar, tarih: new Date() } })

  // Ödendi durumu güncelle
  const fatura = await prisma.fatura.findUnique({ where: { id: faturaId }, include: { tahsilatlar: true } })
  if (fatura) {
    const toplam = fatura.tahsilatlar.reduce((a, t) => a + Number(t.tutar), 0) + tutar
    if (toplam >= Number(fatura.genelToplam)) {
      await prisma.fatura.update({ where: { id: faturaId }, data: { durum: 'odendi' } })
    }
  }
  revalidatePath('/faturalar')
  revalidatePath('/')
  return
}

export async function faturaDurumDegistir(formData: FormData) {
  await requireRoles(['patron', 'muhasebe'])
  const id = Number(formData.get('id'))
  const durum = String(formData.get('durum') ?? 'vadede') as 'vadede' | 'odendi' | 'gecikti'
  await prisma.fatura.update({ where: { id }, data: { durum } })
  revalidatePath('/faturalar')
  return
}

// ---- Resmi Ödeme (vergi & SGK) ----
export async function createResmiOdeme(_prev: MuhasebeState, formData: FormData): Promise<MuhasebeState> {
  await requireRoles(['patron', 'muhasebe'])
  const tutar = Number(formData.get('tutar'))
  const sonOdemeTarihi = String(formData.get('sonOdemeTarihi') ?? '')
  if (!tutar || tutar <= 0 || !sonOdemeTarihi) return { error: 'Tutar ve son ödeme tarihi zorunludur.' }
  await prisma.resmiOdeme.create({
    data: {
      tip: (String(formData.get('tip') ?? 'kdv') as OdemeTip) || 'kdv',
      tutar,
      sonOdemeTarihi: new Date(`${sonOdemeTarihi}T23:59:00`),
      durum: 'beklemede',
    },
  })
  revalidatePath('/vergi-odemeler')
  revalidatePath('/')
  return { ok: true }
}

export async function resmiOdemeDurum(formData: FormData) {
  await requireRoles(['patron', 'muhasebe'])
  const id = Number(formData.get('id'))
  const durum = String(formData.get('durum') ?? 'odendi') as ResmiOdemeDurum
  await prisma.resmiOdeme.update({
    where: { id },
    data: {
      durum,
      odemeTarihi: durum === 'odendi' ? new Date() : null,
    },
  })
  revalidatePath('/vergi-odemeler')
  revalidatePath('/')
  return
}

export async function silResmiOdeme(formData: FormData) {
  await requireRoles(['patron', 'muhasebe'])
  await prisma.resmiOdeme.delete({ where: { id: Number(formData.get('id')) } })
  revalidatePath('/vergi-odemeler')
  return
}