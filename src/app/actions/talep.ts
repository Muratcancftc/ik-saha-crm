'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/db'
import { requireRoles } from '@/lib/dal'
import { startOfDay, daysUntil } from '@/lib/dates'
import type { TalepDurum, AtamaDurum, PuantajDurum, Vardiya, Aciliyet } from '@prisma/client'

export type TalepActionState = { error?: string; ok?: boolean; uyari?: string } | undefined

export async function createTalep(_prev: TalepActionState, formData: FormData): Promise<TalepActionState> {
  await requireRoles(['patron', 'operasyon'])

  const firmaId = Number(formData.get('firmaId'))
  const lokasyonId = Number(formData.get('lokasyonId'))
  const tarih = String(formData.get('tarih') ?? '')
  if (!firmaId || !lokasyonId || !tarih) return { error: 'Firma, lokasyon ve tarih zorunludur.' }

  const meslekIds = formData.getAll('meslekId').map(Number)
  const adetler = formData.getAll('adet').map((v) => Number(v) || 0)

  const kalemler: Array<{ meslekId: number; adet: number }> = []
  for (let i = 0; i < meslekIds.length; i++) {
    if (meslekIds[i] && adetler[i] > 0) kalemler.push({ meslekId: meslekIds[i], adet: adetler[i] })
  }
  if (kalemler.length === 0) return { error: 'En az bir talep kalemi girin.' }

  const talep = await prisma.talep.create({
    data: {
      firmaId,
      lokasyonId,
      tarih: new Date(`${tarih}T08:00:00`),
      vardiya: (String(formData.get('vardiya') ?? 'gunduz') as Vardiya) || 'gunduz',
      aciliyet: (String(formData.get('aciliyet') ?? 'normal') as Aciliyet) || 'normal',
      not: String(formData.get('not') ?? '') || null,
      kalemler: { create: kalemler },
    },
  })

  revalidatePath('/talepler')
  redirect(`/talepler?talep=${talep.id}`)
}

// ---- Çakışma + belge kontrolü ile atama ----
export async function createAtama(_prev: TalepActionState, formData: FormData): Promise<TalepActionState> {
  const user = await requireRoles(['patron', 'operasyon'])
  void user

  const talepId = Number(formData.get('talepId'))
  const isciId = Number(formData.get('isciId'))
  const meslekId = Number(formData.get('meslekId')) || null
  const talep = await prisma.talep.findUnique({
    where: { id: talepId },
    include: { kalemler: true, atamalar: true },
  })
  if (!talep) return { error: 'Talep bulunamadı.' }

  // belge kontrolü: süresi dolmuş belge → engelle
  const isci = await prisma.isci.findUnique({
    where: { id: isciId },
    include: { belgeler: true },
  })
  if (!isci) return { error: 'İşçi bulunamadı.' }
  if (isci.durum !== 'aktif') return { error: `${isci.ad} aktif değil, atanamaz.` }

  const bugun = startOfDay()
  const dolmus = isci.belgeler.filter((b) => b.bitisTarihi < bugun)
  if (dolmus.length > 0) {
    return { error: `${isci.ad} belgesi süresi dolmuş (${dolmus[0].tip}), atanamaz.` }
  }
  const yaklasan = isci.belgeler.some((b) => b.bitisTarihi >= bugun && daysUntil(b.bitisTarihi) <= 30)

  try {
    await prisma.atama.create({
      data: {
        talepId,
        isciId,
        meslekId,
        tarih: talep.tarih,
        durum: 'atandi',
        sgkBildirildi: false,
      },
    })
  } catch (e: unknown) {
    if ((e as { code?: string }).code === 'P2002') {
      return { error: `${isci.ad} bu güne zaten atanmış (çakışma).` }
    }
    throw e
  }

  revalidatePath('/talepler')
  return { ok: true, uyari: yaklasan ? 'Belgesi 30 gün içinde doluyor — yenilemeyi unutmayın.' : undefined }
}

// ---- Puantaj durumu (canlı güncelleme) ----
export async function updatePuantaj(formData: FormData) {
  const user = await requireRoles(['patron', 'operasyon', 'saha_sorumlusu'])
  void user

  const atamaId = Number(formData.get('atamaId'))
  const durum = String(formData.get('durum') ?? 'geldi') as PuantajDurum

  const atama = await prisma.atama.findUnique({ where: { id: atamaId }, include: { talep: true } })
  if (!atama) return

  // saha_sorumlusu yalnızca kendi lokasyonunda
  if (user.rol === 'saha_sorumlusu' && atama.talep.lokasyonId !== user.lokasyonId) return

  const calisilan: Record<PuantajDurum, number> = {
    geldi: 8,
    gec: 7,
    yarim: 4,
    gelmedi: 0,
  }

  await prisma.puantaj.upsert({
    where: { atamaId },
    create: {
      atamaId,
      girisSaat: durum === 'gelmedi' ? null : atama.tarih,
      calisilanSaat: calisilan[durum],
      mesaiSaat: 0,
      durum,
    },
    update: {
      girisSaat: durum === 'gelmedi' ? null : atama.tarih,
      calisilanSaat: calisilan[durum],
      durum,
    },
  })

  revalidatePath('/talepler')
  revalidatePath('/puantaj')
  revalidatePath('/')
}

export async function setAtamaDurum(formData: FormData) {
  await requireRoles(['patron', 'operasyon'])
  const id = Number(formData.get('id'))
  const durum = String(formData.get('durum') ?? 'atandi') as AtamaDurum
  await prisma.atama.update({ where: { id }, data: { durum } })
  revalidatePath('/talepler')
  revalidatePath('/puantaj')
}

export async function sgkBildir(formData: FormData) {
  await requireRoles(['patron', 'operasyon'])
  const id = Number(formData.get('id'))
  await prisma.atama.update({ where: { id }, data: { sgkBildirildi: true } })
  revalidatePath('/talepler')
  revalidatePath('/')
}

export async function talepDurumDegistir(formData: FormData) {
  await requireRoles(['patron', 'operasyon'])
  const id = Number(formData.get('id'))
  const durum = String(formData.get('durum') ?? 'acik') as TalepDurum
  await prisma.talep.update({ where: { id }, data: { durum } })
  revalidatePath('/talepler')
}

// ---- Uygun işçi önerisi (client'tan çağrılır) ----
export async function oneriGetir(talepId: number, meslekId: number) {
  await requireRoles(['patron', 'operasyon'])

  const talep = await prisma.talep.findUnique({ where: { id: talepId }, include: { lokasyon: true } })
  if (!talep) return []

  const bugun = startOfDay()
  const ayniGunAtamali = await prisma.atama.findMany({
    where: { tarih: talep.tarih, durum: { not: 'iptal' } },
    select: { isciId: true },
  })
  const atanmis = new Set(ayniGunAtamali.map((a) => a.isciId))

  const adaylar = await prisma.isci.findMany({
    where: {
      durum: 'aktif',
      meslekler: { some: { meslekId } },
    },
    include: {
      meslekler: { include: { meslek: true } },
      belgeler: true,
    },
  })

  const bolgeAnahtar = talep.lokasyon.ad.toLowerCase()

  return adaylar
    .filter((i) => !atanmis.has(i.id))
    .filter((i) => !i.belgeler.some((b) => b.bitisTarihi < bugun))
    .map((i) => {
      const bolgeUyum = i.tercihBolgeler.some((b) => bolgeAnahtar.includes(b.toLowerCase()) || b.toLowerCase().includes(bolgeAnahtar))
      const belgeYaklasan = i.belgeler.some((b) => b.bitisTarihi >= bugun && daysUntil(b.bitisTarihi) <= 30)
      const puan = i.puan + (bolgeUyum ? 10 : 0) - (belgeYaklasan ? 5 : 0)
      return {
        id: i.id,
        ad: i.ad,
        ilce: i.ilce,
        puan: i.puan,
        beklenti: Number(i.gunlukUcretBeklentisi),
        durum: i.durum,
        bolgeUyum,
        belgeYaklasan,
        skor: puan,
        meslekler: i.meslekler.map((m) => m.meslek.ad),
      }
    })
    .sort((a, b) => b.skor - a.skor)
    .slice(0, 8)
}