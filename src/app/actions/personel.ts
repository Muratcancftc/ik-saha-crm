'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/db'
import { requireRoles } from '@/lib/dal'
import { encrypt, decrypt } from '@/lib/crypto'
import type { PersonelDurum } from '@prisma/client'

export type PersonelState = { error?: string; ok?: boolean } | undefined

export async function createPersonel(_prev: PersonelState, formData: FormData): Promise<PersonelState> {
  await requireRoles(['patron', 'muhasebe'])
  const ad = String(formData.get('ad') ?? '').trim()
  const maas = Number(formData.get('maas'))
  const iban = String(formData.get('iban') ?? '').replace(/\s/g, '')
  if (!ad || !maas || maas <= 0) return { error: 'Ad ve maaş zorunludur.' }
  if (iban && !/^TR\d{24}$/.test(iban)) return { error: 'IBAN geçersiz.' }

  await prisma.personel.create({
    data: {
      ad,
      departman: String(formData.get('departman') ?? ''),
      rol: String(formData.get('rol') ?? ''),
      iseGiris: formData.get('iseGiris') ? new Date(String(formData.get('iseGiris'))) : new Date(),
      maas,
      iban: iban ? encrypt(iban) : encrypt(''),
      sgkDurum: String(formData.get('sgkDurum') ?? 'Aktif SGK'),
      izinBakiyesi: Number(formData.get('izinBakiyesi') ?? 0) || 0,
      durum: 'aktif',
    },
  })
  revalidatePath('/personel')
  revalidatePath('/')
  return { ok: true }
}

export async function updatePersonel(_prev: PersonelState, formData: FormData): Promise<PersonelState> {
  await requireRoles(['patron', 'muhasebe'])
  const id = Number(formData.get('id'))
  const mevcut = await prisma.personel.findUnique({ where: { id } })
  if (!mevcut) return { error: 'Kayıt bulunamadı.' }

  const iban = String(formData.get('iban') ?? '').replace(/\s/g, '')
  if (iban && !/^TR\d{24}$/.test(iban)) return { error: 'IBAN geçersiz.' }

  await prisma.personel.update({
    where: { id },
    data: {
      ad: String(formData.get('ad') ?? mevcut.ad).trim() || mevcut.ad,
      departman: String(formData.get('departman') ?? mevcut.departman),
      rol: String(formData.get('rol') ?? mevcut.rol),
      iseGiris: formData.get('iseGiris') ? new Date(String(formData.get('iseGiris'))) : mevcut.iseGiris,
      maas: Number(formData.get('maas') ?? mevcut.maas) || mevcut.maas,
      iban: iban ? encrypt(iban) : mevcut.iban,
      sgkDurum: String(formData.get('sgkDurum') ?? mevcut.sgkDurum),
      izinBakiyesi: Number(formData.get('izinBakiyesi') ?? mevcut.izinBakiyesi) || 0,
      durum: (String(formData.get('durum') ?? mevcut.durum) as PersonelDurum) || mevcut.durum,
    },
  })
  revalidatePath('/personel')
  return { ok: true }
}

export async function personelGizli(id: number) {
  await requireRoles(['patron', 'muhasebe'])
  const p = await prisma.personel.findUnique({ where: { id } })
  if (!p) return null
  return { iban: p.iban ? decrypt(p.iban) : '' }
}

export async function togglePersonelDurum(formData: FormData) {
  await requireRoles(['patron', 'muhasebe'])
  const id = Number(formData.get('id'))
  const hedef = String(formData.get('hedef') ?? 'pasif') as PersonelDurum
  await prisma.personel.update({ where: { id }, data: { durum: hedef } })
  revalidatePath('/personel')
  return
}