'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/db'
import { requireRoles } from '@/lib/dal'
import { startOfDay, addDays } from '@/lib/dates'
import { pushBildirimGonder } from '@/lib/push'
import { ISG_BELGE_TIPI } from '@/lib/belge'
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
  const belge = await prisma.belge.findUnique({ where: { id: Number(formData.get('id')) } })
  await prisma.belge.delete({ where: { id: Number(formData.get('id')) } })
  revalidatePath('/belge-sgk')
  revalidatePath('/isci-havuzu')
  if (belge?.personelId) revalidatePath('/personel')
  if (belge?.personelId) revalidatePath(`/personel/${belge.personelId}`)
  return
}

// Belgeyi tek adımda yenile (yeni bitiş tarihi)
export async function belgeYenile(formData: FormData) {
  await requireRoles(['patron', 'operasyon'])
  const id = Number(formData.get('id'))
  const bitis = String(formData.get('bitisTarihi') ?? '')
  if (!id || !bitis) return
  const belge = await prisma.belge.findUnique({ where: { id } })
  if (!belge) return
  await prisma.belge.update({ where: { id }, data: { bitisTarihi: new Date(`${bitis}T23:59:00`) } })
  revalidatePath('/belge-sgk')
  revalidatePath('/isci-havuzu')
  if (belge.isciId) revalidatePath(`/isci-havuzu/${belge.isciId}`)
  if (belge.personelId) revalidatePath('/personel')
  if (belge.personelId) revalidatePath(`/personel/${belge.personelId}`)
  return
}

// Personel için İSG belgesi ekle
export async function createPersonelIsg(_prev: BelgeState, formData: FormData): Promise<BelgeState> {
  await requireRoles(['patron', 'operasyon'])
  const personelId = Number(formData.get('personelId'))
  const bitis = String(formData.get('bitisTarihi') ?? '')
  if (!personelId || !bitis) return { error: 'Personel ve bitiş tarihi zorunludur.' }

  await prisma.belge.create({
    data: {
      personelId,
      tip: ISG_BELGE_TIPI,
      verilisTarihi: new Date(),
      bitisTarihi: new Date(`${bitis}T23:59:00`),
    },
  })
  revalidatePath('/belge-sgk')
  revalidatePath('/personel')
  revalidatePath(`/personel/${personelId}`)
  return { ok: true }
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
    include: { isci: true, personel: true },
  })
  const gecikenFaturalar = await prisma.fatura.findMany({ where: { durum: 'gecikti' } })
  const sgkEksik = await prisma.atama.findMany({
    where: { sgkBildirildi: false, durum: { in: ['atandi', 'onaylandi'] } },
    include: { isci: true, talep: { include: { firma: true } } },
  })

  const yeniBildirimler: { tur: BildirimTur; mesaj: string }[] = []

  for (const b of belgeler) {
    const durum = b.bitisTarihi < bugun ? 'süresi doldu' : '30 gün içinde doluyor'
    const ad = b.isci?.ad ?? b.personel?.ad ?? 'Kayıt'
    const mesaj = `${ad} — ${b.tip} belgesi ${durum}.`
    const mevcut = await prisma.bildirim.findFirst({ where: { mesaj, okundu: false } })
    if (!mevcut) {
      await prisma.bildirim.create({ data: { tur: 'belge', mesaj } })
      yeniBildirimler.push({ tur: 'belge', mesaj })
    }
  }
  for (const f of gecikenFaturalar) {
    const mesaj = `Fatura ${f.no} vadesi geçti.`
    const mevcut = await prisma.bildirim.findFirst({ where: { mesaj, okundu: false } })
    if (!mevcut) {
      await prisma.bildirim.create({ data: { tur: 'fatura', mesaj } })
      yeniBildirimler.push({ tur: 'fatura', mesaj })
    }
  }
  for (const a of sgkEksik) {
    const mesaj = `SGK bildirimi eksik: ${a.isci.ad} — ${a.talep.firma.ad} (işten 1 gün önce bildirim gerekir).`
    const mevcut = await prisma.bildirim.findFirst({ where: { mesaj, okundu: false } })
    if (!mevcut) {
      await prisma.bildirim.create({ data: { tur: 'sgk', mesaj } })
      yeniBildirimler.push({ tur: 'sgk', mesaj })
    }
  }

  // Tarayıcı push bildirimi (aktif aboneliklere)
  for (const y of yeniBildirimler) {
    await pushBildirimGonder('ATALAY İK — Bildirim', y.mesaj, '/bildirimler')
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

// Header feed'den kaldır: okundu işaretler + kaldırıldı işaretler (geçmiş kayıt korunur)
export async function bildirimKaldir(formData: FormData) {
  await requireRoles(['patron', 'operasyon', 'muhasebe', 'saha_sorumlusu'])
  const id = Number(formData.get('id'))
  await prisma.bildirim.update({ where: { id }, data: { okundu: true, kaldirildi: true } })
  revalidatePath('/')
  return
}

export type { BildirimTur }