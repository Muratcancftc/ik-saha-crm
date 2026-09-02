'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/db'
import { requireRoles } from '@/lib/dal'
import { startOfDay, addDays } from '@/lib/dates'
import type { BildirimTur } from '@prisma/client'

export type BelgeState = { error?: string; ok?: boolean } | undefined

export async function createBelge(_prev: BelgeState, formData: FormData): Promise<BelgeState> {
  await requireRoles(['patron', 'operasyon'])
  const isciId = Number(formData.get('isciId'))
  const tip = String(formData.get('tip') ?? '').trim()
  const bitis = String(formData.get('bitisTarihi') ?? '')
  if (!isciId || !tip || !bitis) return { error: 'İşçi, belge tipi ve bitiş tarihi zorunludur.' }

  await prisma.belge.create({
    data: {
      isciId,
      tip,
      verilisTarihi: formData.get('verilisTarihi') ? new Date(String(formData.get('verilisTarihi'))) : new Date(),
      bitisTarihi: new Date(`${bitis}T23:59:00`),
    },
  })
  revalidatePath('/belge-sgk')
  revalidatePath('/isci-havuzu')
  revalidatePath(`/isci-havuzu/${isciId}`)
  return { ok: true }
}

export async function silBelge(formData: FormData) {
  await requireRoles(['patron', 'operasyon'])
  await prisma.belge.delete({ where: { id: Number(formData.get('id')) } })
  revalidatePath('/belge-sgk')
  revalidatePath('/isci-havuzu')
  return
}

// Profil sayfasında düz form ile belge ekleme
export async function belgeEkle(formData: FormData) {
  await requireRoles(['patron', 'operasyon'])
  const isciId = Number(formData.get('isciId'))
  const tip = String(formData.get('tip') ?? '').trim()
  const bitis = String(formData.get('bitisTarihi') ?? '')
  if (!isciId || !tip || !bitis) return
  await prisma.belge.create({
    data: {
      isciId,
      tip,
      verilisTarihi: new Date(),
      bitisTarihi: new Date(`${bitis}T23:59:00`),
    },
  })
  revalidatePath(`/isci-havuzu/${isciId}`)
  revalidatePath('/belge-sgk')
  revalidatePath('/isci-havuzu')
  return
}

// ---- Bildirim iskeleti: güncel uyarıları tarayıp bildirim kaydı üretir ----
export async function bildirimleriTara() {
  await requireRoles(['patron', 'operasyon', 'muhasebe'])

  const bugun = startOfDay()
  const limit = addDays(bugun, 30)

  const belgeler = await prisma.belge.findMany({
    where: { bitisTarihi: { lte: limit } },
    include: { isci: true },
  })
  const gecikenFaturalar = await prisma.fatura.findMany({ where: { durum: 'gecikti' } })
  const sgkEksik = await prisma.atama.findMany({
    where: { sgkBildirildi: false, durum: { in: ['atandi', 'onaylandi'] } },
    include: { isci: true, talep: { include: { firma: true } } },
  })

  for (const b of belgeler) {
    const durum = b.bitisTarihi < bugun ? 'süresi doldu' : '30 gün içinde doluyor'
    const mesaj = `${b.isci.ad} — ${b.tip} belgesi ${durum}.`
    const mevcut = await prisma.bildirim.findFirst({ where: { mesaj, okundu: false } })
    if (!mevcut) {
      await prisma.bildirim.create({ data: { tur: 'belge', mesaj } })
    }
  }
  for (const f of gecikenFaturalar) {
    const mesaj = `Fatura ${f.no} vadesi geçti.`
    const mevcut = await prisma.bildirim.findFirst({ where: { mesaj, okundu: false } })
    if (!mevcut) {
      await prisma.bildirim.create({ data: { tur: 'fatura', mesaj } })
    }
  }
  for (const a of sgkEksik) {
    const mesaj = `SGK bildirimi eksik: ${a.isci.ad} — ${a.talep.firma.ad} (işten 1 gün önce bildirim gerekir).`
    const mevcut = await prisma.bildirim.findFirst({ where: { mesaj, okundu: false } })
    if (!mevcut) {
      await prisma.bildirim.create({ data: { tur: 'sgk', mesaj } })
    }
  }

  revalidatePath('/')
  return
}

export async function bildirimleriOku() {
  await requireRoles(['patron', 'operasyon', 'muhasebe', 'saha_sorumlusu'])
  await prisma.bildirim.updateMany({ data: { okundu: true } })
  revalidatePath('/')
  return
}

export async function bildirimSil(formData: FormData) {
  await prisma.bildirim.delete({ where: { id: Number(formData.get('id')) } })
  revalidatePath('/')
  return
}

// SMS/WhatsApp gönderim placeholder: gerçek entegrasyon gelene kadar kayıt yeterli
export async function bildirimGonder(formData: FormData) {
  await requireRoles(['patron', 'operasyon'])
  const id = Number(formData.get('id'))
  await prisma.bildirim.update({ where: { id }, data: { gonderimDurum: true } })
  revalidatePath('/')
  revalidatePath('/talepler')
  return
}

export type { BildirimTur }