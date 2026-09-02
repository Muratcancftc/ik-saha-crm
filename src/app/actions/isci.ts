'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/db'
import { requireRoles } from '@/lib/dal'
import { encrypt, decrypt } from '@/lib/crypto'
import type { IsciDurum } from '@prisma/client'

function parseMeslekler(formData: FormData): number[] {
  return formData
    .getAll('meslekler')
    .map((v) => Number(v))
    .filter((n) => !Number.isNaN(n))
}

function parseBolgeler(formData: FormData): string[] {
  return formData.getAll('bolgeler').map(String).filter(Boolean)
}

export type IsciActionState = { error?: string; ok?: boolean } | undefined

export async function createIsci(_prev: IsciActionState, formData: FormData): Promise<IsciActionState> {
  const user = await requireRoles(['patron', 'operasyon'])
  void user

  const ad = String(formData.get('ad') ?? '').trim()
  if (!ad) return { error: 'Ad zorunludur.' }

  const tc = String(formData.get('tcKimlik') ?? '').replace(/\s/g, '')
  if (!/^\d{11}$/.test(tc)) return { error: 'TC Kimlik 11 haneli olmalıdır.' }

  const iban = String(formData.get('iban') ?? '').replace(/\s/g, '')
  if (!/^TR\d{24}$/.test(iban)) return { error: 'IBAN geçersiz (TR + 24 hane).' }

  await prisma.isci.create({
    data: {
      ad,
      telefon: String(formData.get('telefon') ?? ''),
      tcKimlik: encrypt(tc),
      ilce: String(formData.get('ilce') ?? ''),
      iban: encrypt(iban),
      dogumTarihi: new Date(String(formData.get('dogumTarihi') ?? Date.now())),
      puan: Number(formData.get('puan') ?? 50) || 50,
      gunlukUcretBeklentisi: Number(formData.get('gunlukUcretBeklentisi') ?? 0) || 0,
      durum: (String(formData.get('durum') ?? 'aktif') as IsciDurum) || 'aktif',
      tercihBolgeler: parseBolgeler(formData),
      meslekler: {
        create: parseMeslekler(formData).map((meslekId) => ({ meslekId })),
      },
    },
  })

  revalidatePath('/isci-havuzu')
  redirect('/isci-havuzu')
}

export async function updateIsci(_prev: IsciActionState, formData: FormData): Promise<IsciActionState> {
  await requireRoles(['patron', 'operasyon'])

  const id = Number(formData.get('id'))
  if (!id) return { error: 'Kayıt bulunamadı.' }

  const mevcut = await prisma.isci.findUnique({ where: { id } })
  if (!mevcut) return { error: 'Kayıt bulunamadı.' }

  const tc = String(formData.get('tcKimlik') ?? '').replace(/\s/g, '')
  const iban = String(formData.get('iban') ?? '').replace(/\s/g, '')
  if (tc && !/^\d{11}$/.test(tc)) return { error: 'TC Kimlik 11 haneli olmalıdır.' }
  if (iban && !/^TR\d{24}$/.test(iban)) return { error: 'IBAN geçersiz.' }

  const meslekIds = parseMeslekler(formData)
  const bolgeler = parseBolgeler(formData)

  await prisma.$transaction([
    prisma.isciMeslek.deleteMany({ where: { isciId: id } }),
    prisma.isci.update({
      where: { id },
      data: {
        ad: String(formData.get('ad') ?? mevcut.ad).trim() || mevcut.ad,
        telefon: String(formData.get('telefon') ?? mevcut.telefon),
        tcKimlik: tc ? encrypt(tc) : mevcut.tcKimlik,
        ilce: String(formData.get('ilce') ?? mevcut.ilce),
        iban: iban ? encrypt(iban) : mevcut.iban,
        dogumTarihi: formData.get('dogumTarihi') ? new Date(String(formData.get('dogumTarihi'))) : mevcut.dogumTarihi,
        puan: Number(formData.get('puan') ?? mevcut.puan) || mevcut.puan,
        gunlukUcretBeklentisi:
          Number(formData.get('gunlukUcretBeklentisi') ?? mevcut.gunlukUcretBeklentisi) ||
          mevcut.gunlukUcretBeklentisi,
        durum: (String(formData.get('durum') ?? mevcut.durum) as IsciDurum) || mevcut.durum,
        tercihBolgeler: bolgeler.length ? bolgeler : mevcut.tercihBolgeler,
        meslekler: {
          create: meslekIds.map((meslekId) => ({ meslekId })),
        },
      },
    }),
  ])

  revalidatePath('/isci-havuzu')
  return { ok: true }
}

export async function toggleIsciDurum(formData: FormData) {
  await requireRoles(['patron', 'operasyon'])
  const id = Number(formData.get('id'))
  const hedef = String(formData.get('hedef') ?? 'pasif') as IsciDurum
  await prisma.isci.update({ where: { id }, data: { durum: hedef } })
  revalidatePath('/isci-havuzu')
}

export async function silIsci(formData: FormData) {
  await requireRoles(['patron'])
  const id = Number(formData.get('id'))
  await prisma.isci.delete({ where: { id } })
  revalidatePath('/isci-havuzu')
}

export async function gizliAlan(id: number) {
  await requireRoles(['patron', 'operasyon'])
  const isci = await prisma.isci.findUnique({ where: { id } })
  if (!isci) return null
  return { tc: decrypt(isci.tcKimlik), iban: decrypt(isci.iban) }
}

export async function isciDetay(id: number) {
  await requireRoles(['patron', 'operasyon'])
  const { getIsciDetay } = await import('@/lib/queries')
  return getIsciDetay(id)
}