'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/db'
import { requireRoles } from '@/lib/dal'
import { startOfDay, daysUntil, addDays } from '@/lib/dates'
import type { TalepDurum, AtamaDurum, PuantajDurum, Vardiya, Aciliyet, TekrarTip } from '@prisma/client'

export type TalepActionState = { error?: string; ok?: boolean; uyari?: string } | undefined

// ---- Talep doluluk otomatik: atanan >= ihtiyaç → dolu; >0 → kısmi; else açık ----
async function talepDolulukGuncelle(talepId: number) {
  const talep = await prisma.talep.findUnique({
    where: { id: talepId },
    include: { kalemler: true, atamalar: { where: { durum: { not: 'iptal' } } } },
  })
  if (!talep || talep.durum === 'kapandi') return
  const ihtiyac = talep.kalemler.reduce((a, k) => a + k.adet, 0)
  const atanan = talep.atamalar.length
  const durum: TalepDurum = atanan >= ihtiyac ? 'dolu' : atanan > 0 ? 'kismi' : 'acik'
  if (talep.durum !== durum) {
    await prisma.talep.update({ where: { id: talepId }, data: { durum } })
  }
}

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

  const tekrarRaw = String(formData.get('tekrar') ?? '')
  const sablon = formData.get('sablon') === 'on'
  const tekrar = (tekrarRaw && (tekrarRaw === 'gunluk' || tekrarRaw === 'haftalik') ? tekrarRaw : null) as TekrarTip | null

  const talep = await prisma.talep.create({
    data: {
      firmaId,
      lokasyonId,
      tarih: new Date(`${tarih}T08:00:00`),
      vardiya: (String(formData.get('vardiya') ?? 'gunduz') as Vardiya) || 'gunduz',
      aciliyet: (String(formData.get('aciliyet') ?? 'normal') as Aciliyet) || 'normal',
      not: String(formData.get('not') ?? '') || null,
      sablon,
      tekrar,
      kalemler: { create: kalemler },
    },
  })

  revalidatePath('/talepler')
  redirect(`/talepler?talep=${talep.id}`)
}

// ---- Çakışma + belge kontrolü ile atama + SMS/WhatsApp bildirim iskeleti ----
export async function createAtama(_prev: TalepActionState, formData: FormData): Promise<TalepActionState> {
  const user = await requireRoles(['patron', 'operasyon'])
  void user

  const talepId = Number(formData.get('talepId'))
  const isciId = Number(formData.get('isciId'))
  const meslekId = Number(formData.get('meslekId')) || null
  const talep = await prisma.talep.findUnique({
    where: { id: talepId },
    include: { kalemler: true, lokasyon: true },
  })
  if (!talep) return { error: 'Talep bulunamadı.' }

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

  let atama
  try {
    atama = await prisma.atama.create({
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

  // SMS/WhatsApp bildirim iskeleti: "Yarın 07:30 <lokasyon>" kaydı
  const saat = talep.vardiya === 'gece' ? '21:30' : '07:30'
  const etiket = daysUntil(talep.tarih) === 1 ? 'Yarın' : new Date(talep.tarih).toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit' })
  await prisma.bildirim.create({
    data: {
      tur: 'talep',
      kanal: 'sms',
      hedef: isci.telefon,
      ilgiliId: atama.id,
      mesaj: `${etiket} ${saat} ${talep.lokasyon.ad} — iş başı.`,
    },
  })

  await talepDolulukGuncelle(talepId)

  revalidatePath('/talepler')
  revalidatePath('/')
  return { ok: true, uyari: yaklasan ? 'Belgesi 30 gün içinde doluyor — yenilemeyi unutmayın.' : undefined }
}

// ---- Çıkar (iptal) + talep doluluk güncelle ----
export async function cikarAtama(formData: FormData) {
  await requireRoles(['patron', 'operasyon'])
  const id = Number(formData.get('id'))
  const atama = await prisma.atama.findUnique({ where: { id } })
  if (!atama) return
  await prisma.atama.update({ where: { id }, data: { durum: 'iptal' } })
  await talepDolulukGuncelle(atama.talepId)
  revalidatePath('/talepler')
  revalidatePath('/')
}

export async function setAtamaDurum(formData: FormData) {
  await requireRoles(['patron', 'operasyon'])
  const id = Number(formData.get('id'))
  const durum = String(formData.get('durum') ?? 'atandi') as AtamaDurum
  const atama = await prisma.atama.update({ where: { id }, data: { durum } })
  if (durum === 'iptal') await talepDolulukGuncelle(atama.talepId)
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

// ---- Şablon / tekrar / kopyala ----
export async function sablonYap(formData: FormData) {
  await requireRoles(['patron', 'operasyon'])
  const id = Number(formData.get('id'))
  const tekrar = String(formData.get('tekrar') ?? 'gunluk') as TekrarTip
  await prisma.talep.update({ where: { id }, data: { sablon: true, tekrar } })
  revalidatePath('/talepler')
  return
}

// Bir talebi (kalemleriyle) belirli bir tarihten itibaren N gün boyunca kopyala
export async function talepKopyala(formData: FormData) {
  await requireRoles(['patron', 'operasyon'])
  const id = Number(formData.get('id'))
  const baslangic = String(formData.get('baslangic') ?? '')
  const gunSayisi = Number(formData.get('gunSayisi') ?? 7)
  if (!baslangic || gunSayisi < 1) return

  const kaynak = await prisma.talep.findUnique({
    where: { id },
    include: { kalemler: true },
  })
  if (!kaynak) return

  const bas = startOfDay(new Date(baslangic))
  for (let i = 0; i < gunSayisi; i++) {
    const gun = addDays(bas, i)
    const varMi = await prisma.talep.findFirst({
      where: { firmaId: kaynak.firmaId, lokasyonId: kaynak.lokasyonId, tarih: { gte: startOfDay(gun), lt: addDays(gun, 1) } },
    })
    if (varMi) continue // o gün zaten talep var
    await prisma.talep.create({
      data: {
        firmaId: kaynak.firmaId,
        lokasyonId: kaynak.lokasyonId,
        tarih: gun,
        vardiya: kaynak.vardiya,
        aciliyet: kaynak.aciliyet,
        not: kaynak.not,
        kalemler: { create: kaynak.kalemler.map((k) => ({ meslekId: k.meslekId, adet: k.adet })) },
      },
    })
  }
  revalidatePath('/talepler')
  return
}

export async function sablonSil(formData: FormData) {
  await requireRoles(['patron', 'operasyon'])
  const id = Number(formData.get('id'))
  await prisma.talep.update({ where: { id }, data: { sablon: false, tekrar: null } })
  revalidatePath('/talepler')
  return
}

// ---- Puantaj durumu (canlı güncelleme) ----
export async function updatePuantaj(formData: FormData) {
  const user = await requireRoles(['patron', 'operasyon', 'saha_sorumlusu'])
  void user

  const atamaId = Number(formData.get('atamaId'))
  const durum = String(formData.get('durum') ?? 'geldi') as PuantajDurum

  const atama = await prisma.atama.findUnique({ where: { id: atamaId }, include: { talep: true } })
  if (!atama) return

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

  // gelmedi → no-show bildirimi
  if (durum === 'gelmedi') {
    const isci = await prisma.isci.findUnique({ where: { id: atama.isciId } })
    const tarihEtiketi = atama.tarih.toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit' })
    const mesaj = `${isci?.ad ?? 'İşçi'} gelmedi — ${atama.talep.firmaId ? '' : ''}${tarihEtiketi} (no-show)`
    const mevcut = await prisma.bildirim.findFirst({ where: { mesaj, okundu: false } })
    if (!mevcut) {
      await prisma.bildirim.create({ data: { tur: 'talep', mesaj, ilgiliId: atama.id } })
    }
  }

  revalidatePath('/talepler')
  revalidatePath('/puantaj')
  revalidatePath('/')
  revalidatePath('/bildirimler')
}

// ---- Uygun işçi önerisi (meslek + bölge + puan + no-show, uygunluk %'li) ----
export async function oneriGetir(talepId: number, meslekId: number, haricId?: number) {
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
      _count: { select: { atamalar: true } },
    },
  })

  // no-show sayıları
  const noshow = await prisma.puantaj.groupBy({
    by: ['atamaId'],
    where: { durum: 'gelmedi' },
    _count: true,
  })
  // atamaId -> isciId eşlemesi
  const noShowMap = new Map<number, number>()
  const atamaIds = noshow.map((n) => n.atamaId)
  if (atamaIds.length) {
    const atamalar = await prisma.atama.findMany({ where: { id: { in: atamaIds } }, select: { id: true, isciId: true } })
    for (const a of atamalar) {
      const n = noshow.find((x) => x.atamaId === a.id)
      noShowMap.set(a.isciId, n?._count ?? 0)
    }
  }

  const bolgeAnahtar = talep.lokasyon.ad.toLowerCase()

  return adaylar
    .filter((i) => !atanmis.has(i.id))
    .filter((i) => i.id !== haricId)
    .filter((i) => !i.belgeler.some((b) => b.bitisTarihi < bugun))
    .map((i) => {
      const bolgeUyum = i.tercihBolgeler.some(
        (b) => bolgeAnahtar.includes(b.toLowerCase()) || b.toLowerCase().includes(bolgeAnahtar)
      )
      const belgeYaklasan = i.belgeler.some((b) => b.bitisTarihi >= bugun && daysUntil(b.bitisTarihi) <= 30)
      const noShow = noShowMap.get(i.id) ?? 0
      const guvenilirlik = Math.max(0, i.puan - noShow * 5)
      const skor = guvenilirlik + (bolgeUyum ? 10 : 0) - (belgeYaklasan ? 5 : 0)
      const uygunluk = Math.max(0, Math.min(100, Math.round((guvenilirlik + (bolgeUyum ? 15 : 0)) / 1.15)))
      return {
        id: i.id,
        ad: i.ad,
        ilce: i.ilce,
        puan: i.puan,
        noShow,
        guvenilirlik,
        beklenti: Number(i.gunlukUcretBeklentisi),
        durum: i.durum,
        bolgeUyum,
        belgeYaklasan,
        uygunluk,
        skor,
        meslekler: i.meslekler.map((m) => m.meslek.ad),
        gecmisAtama: i._count.atamalar,
      }
    })
    .sort((a, b) => b.skor - a.skor)
    .slice(0, 8)
}