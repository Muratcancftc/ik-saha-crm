'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/db'
import { requireRoles } from '@/lib/dal'
import { startOfDay, addDays } from '@/lib/dates'
import { parseLocalDate } from '@/lib/donem'
import { hakedisOlustur } from './hakedis'
import type { PuantajDurum, Vardiya } from '@prisma/client'

export type ManuelPuantajState = { error?: string; ok?: boolean; uyari?: string } | undefined

const CALISILAN_SAAT: Record<PuantajDurum, number> = {
  geldi: 8,
  gec: 7,
  yarim: 4,
  gelmedi: 0,
}

// Puantaj menüsünden manuel puantaj ekle.
// Atama olmadan çalışan bir işçi için talep + atama + puantaj kaydı üretir;
// böylece hakediş ve raporlar otomatik akışla aynı şekilde çalışır.
export async function manuelPuantajEkle(_prev: ManuelPuantajState, formData: FormData): Promise<ManuelPuantajState> {
  await requireRoles(['patron', 'operasyon'])

  const isciId = Number(formData.get('isciId'))
  const firmaId = Number(formData.get('firmaId'))
  const lokasyonId = Number(formData.get('lokasyonId'))
  const meslekId = Number(formData.get('meslekId')) || null
  const tarihStr = String(formData.get('tarih') ?? '')
  const vardiya = (String(formData.get('vardiya') ?? 'gunduz') as Vardiya) || 'gunduz'
  const durum = (String(formData.get('durum') ?? 'geldi') as PuantajDurum) || 'geldi'

  if (!isciId || !firmaId || !lokasyonId || !tarihStr) {
    return { error: 'İşçi, firma, lokasyon ve tarih zorunludur.' }
  }
  if (!meslekId) return { error: 'Meslek seçiniz (hakediş fiyatı için gerekli).' }

  const isci = await prisma.isci.findUnique({ where: { id: isciId } })
  if (!isci) return { error: 'İşçi bulunamadı.' }
  if (isci.durum !== 'aktif') return { error: `${isci.ad} aktif değil.` }

  const tarih = startOfDay(parseLocalDate(tarihStr))
  const ertesi = addDays(tarih, 1)

  const mevcut = await prisma.atama.findFirst({
    where: {
      isciId,
      tarih: { gte: tarih, lt: ertesi },
      durum: { not: 'iptal' },
    },
    include: { puantaj: true },
  })

  if (mevcut) {
    if (mevcut.puantaj) {
      return { error: `${isci.ad} için ${tarihStr} tarihinde puantaj zaten kayıtlı.` }
    }
    await prisma.atama.update({ where: { id: mevcut.id }, data: { durum: 'tamamlandi' } })
    await prisma.puantaj.create({
      data: {
        atamaId: mevcut.id,
        girisSaat: durum === 'gelmedi' ? null : tarih,
        calisilanSaat: CALISILAN_SAAT[durum],
        mesaiSaat: 0,
        durum,
      },
    })
    await hakedisOlustur(mevcut.id)
  } else {
    const talep = await prisma.talep.create({
      data: {
        firmaId,
        lokasyonId,
        tarih,
        vardiya,
        durum: 'kapandi',
        not: 'Manuel puantaj',
        kalemler: { create: [{ meslekId, adet: 1 }] },
      },
    })
    const atama = await prisma.atama.create({
      data: {
        talepId: talep.id,
        isciId,
        meslekId,
        tarih,
        durum: 'tamamlandi',
        sgkBildirildi: false,
      },
    })
    await prisma.puantaj.create({
      data: {
        atamaId: atama.id,
        girisSaat: durum === 'gelmedi' ? null : tarih,
        calisilanSaat: CALISILAN_SAAT[durum],
        mesaiSaat: 0,
        durum,
      },
    })
    await hakedisOlustur(atama.id)
  }

  revalidatePath('/puantaj')
  revalidatePath('/talepler')
  revalidatePath('/takvim')
  revalidatePath('/hakedis')
  revalidatePath('/isci-havuzu')
  revalidatePath('/raporlar')
  revalidatePath('/')
  return { ok: true }
}