'use server'

import { revalidatePath } from 'next/cache'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/db'
import { requireRoles } from '@/lib/dal'
import type { Rol } from '@prisma/client'

export type AyarState = { error?: string; ok?: boolean } | undefined

// ---- Meslek ----
export async function meslekEkle(formData: FormData) {
  await requireRoles(['patron'])
  const ad = String(formData.get('ad') ?? '').trim()
  if (!ad) return
  const varMi = await prisma.meslek.findUnique({ where: { ad } })
  if (varMi) return
  await prisma.meslek.create({ data: { ad } })
  revalidatePath('/ayarlar')
  revalidatePath('/talepler')
  revalidatePath('/isci-havuzu')
  return
}

export async function meslekSil(formData: FormData) {
  await requireRoles(['patron'])
  const id = Number(formData.get('id'))
  await prisma.meslek.delete({ where: { id } })
  revalidatePath('/ayarlar')
  return
}

// ---- Kullanıcı / RBAC ----
export async function kullaniciEkle(_prev: AyarState, formData: FormData): Promise<AyarState> {
  await requireRoles(['patron'])
  const ad = String(formData.get('ad') ?? '').trim()
  const email = String(formData.get('email') ?? '').trim().toLowerCase()
  const sifre = String(formData.get('sifre') ?? '')
  const rol = String(formData.get('rol') ?? 'operasyon') as Rol
  if (!ad || !email || sifre.length < 6) return { error: 'Ad, geçerli e-posta ve min 6 haneli şifre gerekli.' }
  const varMi = await prisma.kullanici.findUnique({ where: { email } })
  if (varMi) return { error: 'Bu e-posta zaten kayıtlı.' }

  const lokasyonId = rol === 'saha_sorumlusu' ? Number(formData.get('lokasyonId')) || null : null
  await prisma.kullanici.create({
    data: { ad, email, sifreHash: await bcrypt.hash(sifre, 10), rol, lokasyonId },
  })
  revalidatePath('/ayarlar')
  return { ok: true }
}

export async function kullaniciRolDegistir(formData: FormData) {
  await requireRoles(['patron'])
  const id = Number(formData.get('id'))
  const rol = String(formData.get('rol') ?? 'operasyon') as Rol
  const lokasyonId = rol === 'saha_sorumlusu' ? Number(formData.get('lokasyonId')) || null : null
  await prisma.kullanici.update({ where: { id }, data: { rol, lokasyonId } })
  revalidatePath('/ayarlar')
  return
}

export async function kullaniciSil(formData: FormData) {
  await requireRoles(['patron'])
  const id = Number(formData.get('id'))
  const mevcut = await prisma.kullanici.findUnique({ where: { id } })
  if (!mevcut) return
  if (mevcut.rol === 'patron') return // son patron silinmesin
  await prisma.kullanici.delete({ where: { id } })
  revalidatePath('/ayarlar')
  return
}

// ---- Ayar (firma bilgileri, KDV/SGK oranları) ----
export async function ayarKaydet(formData: FormData) {
  await requireRoles(['patron'])
  const anahtar = String(formData.get('anahtar') ?? '').trim()
  const deger = String(formData.get('deger') ?? '').trim()
  if (!anahtar) return
  await prisma.ayar.upsert({
    where: { anahtar },
    update: { deger },
    create: { anahtar, deger },
  })
  revalidatePath('/ayarlar')
  return
}