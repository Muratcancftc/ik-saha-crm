'use server'

import { revalidatePath } from 'next/cache'
import { writeFile, mkdir } from 'node:fs/promises'
import path from 'node:path'
import { prisma } from '@/lib/db'
import { requireRoles } from '@/lib/dal'
import type { EvrakTip } from '@prisma/client'

const UPLOAD_DIR = path.join(process.cwd(), 'public', 'uploads', 'evrak')

export async function evrakYukle(formData: FormData) {
  await requireRoles(['patron', 'operasyon', 'muhasebe'])

  const tip = String(formData.get('tip') ?? 'diger') as EvrakTip
  const baslik = String(formData.get('baslik') ?? '').trim()
  const ilgiliFirmaId = Number(formData.get('ilgiliFirmaId')) || null
  const ilgiliIsciId = Number(formData.get('ilgiliIsciId')) || null
  const dosya = formData.get('dosya')

  if (!baslik || !dosya || typeof dosya === 'string') return

  const bytes = await dosya.arrayBuffer()
  if (bytes.byteLength === 0) return

  await mkdir(UPLOAD_DIR, { recursive: true })
  const benzersiz = `${Date.now()}-${Math.round(Math.random() * 1e9)}`
  const dosyaAdi = `${benzersiz}-${dosya.name.replace(/[^\w.\-]+/g, '_')}`
  const yol = path.join(UPLOAD_DIR, dosyaAdi)
  await writeFile(yol, Buffer.from(bytes))

  await prisma.evrak.create({
    data: {
      tip,
      baslik,
      dosyaAdi: dosya.name,
      dosyaYol: `/uploads/evrak/${dosyaAdi}`,
      ilgiliFirmaId,
      ilgiliIsciId,
    },
  })

  revalidatePath('/evrak')
  if (ilgiliFirmaId) revalidatePath(`/musteri-firmalar/${ilgiliFirmaId}`)
  if (ilgiliIsciId) revalidatePath(`/isci-havuzu/${ilgiliIsciId}`)
  return
}

export async function evrakSil(formData: FormData) {
  await requireRoles(['patron', 'operasyon', 'muhasebe'])
  const id = Number(formData.get('id'))
  await prisma.evrak.delete({ where: { id } })
  revalidatePath('/evrak')
  return
}