'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/db'
import { requireRoles } from '@/lib/dal'
import { startOfDay } from '@/lib/dates'
import { parseLocalDate } from '@/lib/donem'
import { yuvarla, tarihTr } from '@/lib/vergi'
import { dekontKaydet, dekontGecerli } from '@/lib/dekont'
import { ucretLog } from '@/lib/ik'
import type { VergiTuru, VergiOdemeYontemi } from '@prisma/client'

export type VergiState = { error?: string; ok?: boolean; uyari?: string } | undefined

const YAZANLAR = ['patron', 'muhasebe', 'ik'] as const
const ADMIN = ['patron'] as const

function parseTarih(v: string): Date | null {
  if (!v) return null
  return startOfDay(parseLocalDate(v))
}

async function audit(kayitId: number, alan: string, eski: string | null, yeni: string | null, kullaniciId: number) {
  await ucretLog('vergi', kayitId, alan, eski, yeni, kullaniciId)
}

// ---- Vergi ödemesi ekle (varsayılan ODENMEDI) ----
export async function vergiEkle(_prev: VergiState, formData: FormData): Promise<VergiState> {
  const user = await requireRoles([...YAZANLAR])
  const firmaId = Number(formData.get('firmaId'))
  const vergiTuru = (String(formData.get('vergiTuru') ?? 'KDV') as VergiTuru) || 'KDV'
  const donem = String(formData.get('donem') ?? '').trim()
  const tahakkuk = Number(formData.get('tahakkukTutari'))
  const sonOdeme = parseTarih(String(formData.get('sonOdemeTarihi') ?? ''))
  if (!firmaId || !donem || Number.isNaN(tahakkuk) || tahakkuk <= 0 || !sonOdeme) {
    return { error: 'Firma, dönem, tahakkuk tutarı ve son ödeme tarihi zorunludur.' }
  }

  await prisma.vergiOdemesi.create({
    data: {
      firmaId,
      vergiTuru,
      vergiTuruDiger: vergiTuru === 'DIGER' ? String(formData.get('vergiTuruDiger') ?? '').trim() || null : null,
      donem,
      tahakkukTutari: yuvarla(tahakkuk),
      sonOdemeTarihi: sonOdeme,
      not: String(formData.get('not') ?? '').trim() || null,
      olusturanKullaniciId: user.id,
    },
  })
  revalidatePath('/vergi-odemeler')
  return { ok: true }
}

export async function vergiGuncelle(_prev: VergiState, formData: FormData): Promise<VergiState> {
  const user = await requireRoles([...YAZANLAR])
  const id = Number(formData.get('id'))
  const mevcut = await prisma.vergiOdemesi.findUnique({ where: { id } })
  if (!mevcut) return { error: 'Kayıt bulunamadı.' }
  const sonOdeme = parseTarih(String(formData.get('sonOdemeTarihi') ?? '')) ?? mevcut.sonOdemeTarihi
  const tahakkuk = Number(formData.get('tahakkukTutari'))
  if (Number.isNaN(tahakkuk) || tahakkuk <= 0) return { error: 'Tahakkuk tutarı geçersiz.' }

  await prisma.vergiOdemesi.update({
    where: { id },
    data: {
      vergiTuru: (String(formData.get('vergiTuru') ?? mevcut.vergiTuru) as VergiTuru) || mevcut.vergiTuru,
      vergiTuruDiger: String(formData.get('vergiTuruDiger') ?? mevcut.vergiTuruDiger ?? '').trim() || null,
      donem: String(formData.get('donem') ?? mevcut.donem),
      tahakkukTutari: yuvarla(tahakkuk),
      sonOdemeTarihi: sonOdeme,
      not: String(formData.get('not') ?? mevcut.not ?? '').trim() || null,
    },
  })
  await audit(id, 'guncelle', null, `tahakkuk=${tahakkuk}`, user.id)
  revalidatePath('/vergi-odemeler')
  revalidatePath(`/vergi-odemeler/${id}`)
  return { ok: true }
}

// ---- Ödendi işaretle (modal: tarih + tutar + yöntem + dekont yükleme) ----
export async function odendiIsaretle(_prev: VergiState, formData: FormData): Promise<VergiState> {
  const user = await requireRoles([...YAZANLAR])
  const id = Number(formData.get('id'))
  const mevcut = await prisma.vergiOdemesi.findUnique({ where: { id } })
  if (!mevcut || mevcut.silindi) return { error: 'Kayıt bulunamadı.' }

  const odemeTarihi = parseTarih(String(formData.get('odemeTarihi') ?? '')) ?? startOfDay()
  const odenen = Number(formData.get('odenenTutar') ?? mevcut.tahakkukTutari)
  const yontem = (String(formData.get('odemeYontemi') ?? 'BANKA') as VergiOdemeYontemi) || 'BANKA'
  if (Number.isNaN(odenen) || odenen <= 0) return { error: 'Ödenen tutar geçersiz.' }

  await prisma.vergiOdemesi.update({
    where: { id },
    data: { odemeTarihi, odenenTutar: yuvarla(Math.min(odenen, Number(mevcut.tahakkukTutari))), odemeYontemi: yontem },
  })
  await audit(id, 'durum', 'ODENMEDI', odenen >= Number(mevcut.tahakkukTutari) ? 'ODENDI' : 'KISMI_ODENDI', user.id)

  // Dekont yükleme (opsiyonel, çoklu)
  const dosyalar = formData.getAll('dekontlar')
  for (const d of dosyalar) {
    if (typeof d === 'string' || !(d instanceof File)) continue
    const hata = dekontGecerli(d)
    if (hata) return { error: hata }
    const meta = await dekontKaydet(d)
    await prisma.vergiDekont.create({
      data: { vergiOdemeId: id, dosyaUrl: meta.url, dosyaAdi: meta.ad, dosyaTipi: meta.tip, dosyaBoyutu: meta.boyut, yukleyenKullaniciId: user.id },
    })
    await audit(id, 'dekont', null, meta.ad, user.id)
  }

  revalidatePath('/vergi-odemeler')
  revalidatePath(`/vergi-odemeler/${id}`)
  return { ok: true }
}

// ---- Ödendi → Ödenmedi (geri alma, ADMIN; dekontlar silinmez) ----
export async function odenmediyeDon(formData: FormData) {
  const user = await requireRoles([...ADMIN])
  const id = Number(formData.get('id'))
  const mevcut = await prisma.vergiOdemesi.findUnique({ where: { id } })
  if (!mevcut) return
  await prisma.vergiOdemesi.update({
    where: { id },
    data: { odemeTarihi: null, odenenTutar: null, odemeYontemi: null },
  })
  await audit(id, 'durum', 'ODENDI', 'ODENMEDI', user.id)
  revalidatePath('/vergi-odemeler')
  revalidatePath(`/vergi-odemeler/${id}`)
  return
}

// ---- Dekont yükle (var olan ödemeye ekle) ----
export async function dekontYukle(_prev: VergiState, formData: FormData): Promise<VergiState> {
  const user = await requireRoles([...YAZANLAR])
  const id = Number(formData.get('id'))
  const mevcut = await prisma.vergiOdemesi.findUnique({ where: { id } })
  if (!mevcut) return { error: 'Kayıt bulunamadı.' }

  const dosyalar = formData.getAll('dekontlar')
  let adet = 0
  for (const d of dosyalar) {
    if (typeof d === 'string' || !(d instanceof File)) continue
    const hata = dekontGecerli(d)
    if (hata) return { error: hata }
    const meta = await dekontKaydet(d)
    await prisma.vergiDekont.create({
      data: { vergiOdemeId: id, dosyaUrl: meta.url, dosyaAdi: meta.ad, dosyaTipi: meta.tip, dosyaBoyutu: meta.boyut, yukleyenKullaniciId: user.id },
    })
    await audit(id, 'dekont', null, meta.ad, user.id)
    adet++
  }
  revalidatePath(`/vergi-odemeler/${id}`)
  revalidatePath('/vergi-odemeler')
  return { ok: true, uyari: adet === 0 ? 'Dosya seçilmedi.' : undefined }
}

// ---- Dekont sil (soft delete; ADMIN/IK) ----
export async function dekontSil(formData: FormData) {
  const user = await requireRoles(['patron', 'ik'])
  const id = Number(formData.get('id'))
  const dekont = await prisma.vergiDekont.findUnique({ where: { id } })
  if (!dekont) return
  await prisma.vergiDekont.update({ where: { id }, data: { silindi: true } })
  await audit(dekont.vergiOdemeId, 'dekont-sil', dekont.dosyaAdi, null, user.id)
  revalidatePath(`/vergi-odemeler/${dekont.vergiOdemeId}`)
  revalidatePath('/vergi-odemeler')
  return
}

// ---- Vergi sil (soft delete) ----
export async function vergiSil(formData: FormData) {
  const user = await requireRoles([...ADMIN])
  const id = Number(formData.get('id'))
  await prisma.vergiOdemesi.update({ where: { id }, data: { silindi: true } })
  await audit(id, 'sil', null, 'silindi', user.id)
  revalidatePath('/vergi-odemeler')
  return
}

// ---- Toplu ödendi işaretle (ortak tarih + yöntem) ----
export async function topluOdendi(_prev: VergiState, formData: FormData): Promise<VergiState> {
  const user = await requireRoles([...YAZANLAR])
  const ids = formData.getAll('ids').map(Number).filter(Boolean)
  const odemeTarihi = parseTarih(String(formData.get('odemeTarihi') ?? '')) ?? startOfDay()
  const yontem = (String(formData.get('odemeYontemi') ?? 'BANKA') as VergiOdemeYontemi) || 'BANKA'
  if (ids.length === 0) return { error: 'Kayıt seçin.' }

  const kayitlar = await prisma.vergiOdemesi.findMany({ where: { id: { in: ids }, silindi: false } })
  for (const k of kayitlar) {
    if (Number(k.odenenTutar ?? 0) > 0) continue // zaten ödenmişi atla
    await prisma.vergiOdemesi.update({
      where: { id: k.id },
      data: { odemeTarihi, odenenTutar: k.tahakkukTutari, odemeYontemi: yontem },
    })
    await audit(k.id, 'durum', 'ODENMEDI', 'ODENDI', user.id)
  }

  // Toplu modaldan tek dekont yüklenebilir
  const dosyalar = formData.getAll('dekontlar')
  for (const d of dosyalar) {
    if (typeof d === 'string' || !(d instanceof File)) continue
    const hata = dekontGecerli(d)
    if (hata) return { error: hata }
    const meta = await dekontKaydet(d)
    const hedef = kayitlar.find((k) => Number(k.odenenTutar ?? 0) === 0)
    if (!hedef) break
    await prisma.vergiDekont.create({
      data: { vergiOdemeId: hedef.id, dosyaUrl: meta.url, dosyaAdi: meta.ad, dosyaTipi: meta.tip, dosyaBoyutu: meta.boyut, yukleyenKullaniciId: user.id },
    })
    break
  }

  revalidatePath('/vergi-odemeler')
  return { ok: true }
}

// ---- Tekrarlayan şablon ----
export async function vergiSablonEkle(_prev: VergiState, formData: FormData): Promise<VergiState> {
  await requireRoles([...YAZANLAR])
  const firmaId = Number(formData.get('firmaId'))
  const vergiTuru = (String(formData.get('vergiTuru') ?? 'KDV') as VergiTuru) || 'KDV'
  const tutar = Number(formData.get('tahakkukTutari'))
  const gun = Number(formData.get('sonOdemeGun'))
  if (!firmaId || Number.isNaN(tutar) || tutar <= 0 || !gun || gun < 1 || gun > 28) return { error: 'Geçersiz şablon değerleri.' }
  await prisma.vergiSablon.create({
    data: {
      firmaId,
      vergiTuru,
      vergiTuruDiger: vergiTuru === 'DIGER' ? String(formData.get('vergiTuruDiger') ?? '').trim() || null : null,
      tahakkukTutari: yuvarla(tutar),
      sonOdemeGun: gun,
      donemEtiketi: String(formData.get('donemEtiketi') ?? '').trim() || null,
    },
  })
  revalidatePath('/vergi-odemeler')
  return { ok: true }
}

// Şablondan mevcut dönemin kaydını oluştur (varsa atla — idempotent)
export async function sablonOlustur(formData: FormData) {
  const user = await requireRoles([...YAZANLAR])
  const sablonId = Number(formData.get('sablonId'))
  const sablon = await prisma.vergiSablon.findUnique({ where: { id: sablonId } })
  if (!sablon) return

  const bugun = new Date()
  const donem = sablon.donemEtiketi
    ? `${bugun.getFullYear()} ${sablon.donemEtiketi}`
    : `${bugun.getFullYear()}-${String(bugun.getMonth() + 1).padStart(2, '0')}`
  const varMi = await prisma.vergiOdemesi.findFirst({
    where: { firmaId: sablon.firmaId, vergiTuru: sablon.vergiTuru, donem, silindi: false },
  })
  if (varMi) return

  const sonOdeme = new Date(bugun.getFullYear(), bugun.getMonth(), sablon.sonOdemeGun)
  await prisma.vergiOdemesi.create({
    data: {
      firmaId: sablon.firmaId,
      vergiTuru: sablon.vergiTuru,
      vergiTuruDiger: sablon.vergiTuruDiger,
      donem,
      tahakkukTutari: sablon.tahakkukTutari,
      sonOdemeTarihi: sonOdeme,
      olusturanKullaniciId: user.id,
    },
  })
  await audit(0, 'sablon', null, `firma=${sablon.firmaId} ${donem}`, user.id)
  revalidatePath('/vergi-odemeler')
  return
}

export async function sablonSil(formData: FormData) {
  await requireRoles([...YAZANLAR])
  const id = Number(formData.get('id'))
  await prisma.vergiSablon.delete({ where: { id } })
  revalidatePath('/vergi-odemeler')
  return
}

export { tarihTr }