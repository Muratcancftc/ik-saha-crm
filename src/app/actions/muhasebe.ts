'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/db'
import { requireRoles } from '@/lib/dal'
import { getAyarSayi } from '@/lib/ayar'
import { istanbulBugun } from '@/lib/dates'
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
async function siradakiFaturaNo(): Promise<string> {
  const yil = istanbulBugun().getFullYear()
  const prefix = `IKR-${yil}-`
  const mevcut = await prisma.fatura.findMany({ where: { no: { startsWith: prefix }, silindi: false }, select: { no: true } })
  let max = 0
  for (const f of mevcut) {
    const m = f.no.match(/(\d+)$/)
    if (m) max = Math.max(max, Number(m[1]))
  }
  return `${prefix}${String(max + 1).padStart(3, '0')}`
}

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

  const noGirildi = String(formData.get('no') ?? '').trim()
  const no = noGirildi || (await siradakiFaturaNo())
  const kesimTarihi = String(formData.get('kesimTarihi') ?? '')
  try {
    await prisma.fatura.create({
      data: {
        firmaId,
        no,
        donem,
        araToplam,
        kdvOran,
        kdvTutar,
        genelToplam,
        kesimTarihi: kesimTarihi ? new Date(`${kesimTarihi}T00:00:00`) : new Date(),
        vadeTarihi: new Date(`${vadeTarihi}T23:59:00`),
        durum: 'vadede',
      },
    })
  } catch (e: unknown) {
    // Fatura no çakışırsa (eşzamanlı kayıt) sıradaki numarayla bir kez daha dene
    if ((e as { code?: string }).code === 'P2002' && !noGirildi) {
      const yeniden = await siradakiFaturaNo()
      await prisma.fatura.create({
        data: {
          firmaId,
          no: yeniden,
          donem,
          araToplam,
          kdvOran,
          kdvTutar,
          genelToplam,
          kesimTarihi: kesimTarihi ? new Date(`${kesimTarihi}T00:00:00`) : new Date(),
          vadeTarihi: new Date(`${vadeTarihi}T23:59:00`),
          durum: 'vadede',
        },
      })
    } else {
      throw e
    }
  }
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

  // Ödendi / kısmi durumu güncelle: kalan varsa kismi, tamamı ödenmişse odendi
  const fatura = await prisma.fatura.findUnique({ where: { id: faturaId }, include: { tahsilatlar: true } })
  if (fatura) {
    const toplam = fatura.tahsilatlar.reduce((a, t) => a + Number(t.tutar), 0)
    const genel = Number(fatura.genelToplam)
    if (toplam >= genel) {
      await prisma.fatura.update({ where: { id: faturaId }, data: { durum: 'odendi' } })
    } else if (toplam > 0 && fatura.durum !== 'odendi') {
      await prisma.fatura.update({ where: { id: faturaId }, data: { durum: 'kismi' } })
    }
  }
  revalidatePath('/faturalar')
  revalidatePath('/')
  if (fatura?.firmaId) revalidatePath(`/musteri-firmalar/${fatura.firmaId}`)
  revalidatePath('/musteri-firmalar')
  return
}

export async function faturaDurumDegistir(formData: FormData) {
  await requireRoles(['patron', 'muhasebe'])
  const id = Number(formData.get('id'))
  const durum = String(formData.get('durum') ?? 'vadede') as 'vadede' | 'kismi' | 'odendi' | 'gecikti'
  if (!id) return
  const fatura = await prisma.fatura.findUnique({ where: { id }, include: { tahsilatlar: true } })
  if (!fatura) return
  const toplam = fatura.tahsilatlar.reduce((a, t) => a + Number(t.tutar), 0)
  const genel = Number(fatura.genelToplam)
  // Tahsilata göre doğal durum: kalan varsa "ödendi" olamaz (önce tahsilat gerekir).
  const otomatik = toplam >= genel ? 'odendi' : toplam > 0 ? 'kismi' : 'vadede'
  const hedefDurum = durum === 'odendi' || durum === 'vadede' ? otomatik : durum
  await prisma.fatura.update({ where: { id }, data: { durum: hedefDurum } })
  revalidatePath('/faturalar')
  revalidatePath('/')
  return
}

// İptal (soft delete): silindi=true — geçmiş/rapor verisi korunur.
export async function faturaIptal(formData: FormData) {
  await requireRoles(['patron', 'muhasebe'])
  const id = Number(formData.get('id'))
  const mevcut = await prisma.fatura.findUnique({ where: { id }, include: { tahsilatlar: { select: { id: true } } } })
  if (!mevcut) return
  if (mevcut.tahsilatlar.length > 0) {
    // Tahsilatı olan fatura iptal edilemez; önce tahsilatlar geri alınmalı
    return
  }
  await prisma.fatura.update({ where: { id }, data: { silindi: true, durum: 'vadede' } })
  revalidatePath('/faturalar')
  revalidatePath('/')
  revalidatePath('/musteri-firmalar')
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