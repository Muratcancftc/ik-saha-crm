'use server'

import { revalidatePath } from 'next/cache'
import { put, del } from '@vercel/blob'
import { writeFile, mkdir } from 'node:fs/promises'
import path from 'node:path'
import crypto from 'node:crypto'
import { prisma } from '@/lib/db'
import { requireRoles } from '@/lib/dal'
import type { EvrakTip } from '@prisma/client'

export type EvrakState = { error?: string; ok?: boolean } | undefined

const IZINLI_UZANTI = new Set(['pdf', 'doc', 'docx', 'jpg', 'jpeg', 'png', 'xls', 'xlsx'])
const MAX_BYTE = 10 * 1024 * 1024 // 10 MB

const MIME: Record<string, string> = {
  pdf: 'application/pdf',
  doc: 'application/msword',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  xls: 'application/vnd.ms-excel',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
}

function uzanti(dosyaAdi: string): string {
  const i = dosyaAdi.lastIndexOf('.')
  return i >= 0 ? dosyaAdi.slice(i + 1).toLowerCase() : ''
}

export async function evrakYukle(_prev: EvrakState, formData: FormData): Promise<EvrakState> {
  await requireRoles(['patron', 'operasyon', 'muhasebe'])

  const tip = String(formData.get('tip') ?? 'diger') as EvrakTip
  const baslik = String(formData.get('baslik') ?? '').trim()
  const ilgiliFirmaId = Number(formData.get('ilgiliFirmaId')) || null
  const ilgiliIsciId = Number(formData.get('ilgiliIsciId')) || null
  const dosya = formData.get('dosya')

  if (!baslik || !dosya || typeof dosya === 'string') return { error: 'Başlık ve dosya zorunludur.' }

  const bytes = Buffer.from(await dosya.arrayBuffer())
  if (bytes.byteLength === 0) return { error: 'Boş dosya yüklenemez.' }

  const uz = uzanti(dosya.name)
  if (!IZINLI_UZANTI.has(uz)) return { error: 'Desteklenmeyen dosya türü (pdf, doc, docx, jpg, png, xls, xlsx).' }
  if (bytes.byteLength > MAX_BYTE) return { error: 'Dosya 10MB sınırını aşıyor.' }

  const mime = MIME[uz] ?? 'application/octet-stream'
  const guvenliAd = dosya.name.replace(/[^\w.\-]+/g, '_')
  const uuid = crypto.randomUUID()

  let dosyaYol: string
  if (process.env.VERCEL) {
    const blob = await put(`documents/evrak/${uuid}.${uz}`, bytes, {
      access: 'private',
      contentType: mime,
    })
    dosyaYol = blob.url
  } else {
    const klasor = path.join(process.cwd(), 'public', 'uploads', 'evrak')
    await mkdir(klasor, { recursive: true })
    const dosyaAdi = `${Date.now()}-${uuid}-${guvenliAd}`
    await writeFile(path.join(klasor, dosyaAdi), bytes)
    dosyaYol = `/uploads/evrak/${dosyaAdi}`
  }

  try {
    await prisma.evrak.create({
      data: {
        tip,
        baslik,
        dosyaAdi: dosya.name,
        dosyaYol,
        mime,
        boyut: bytes.byteLength,
        ilgiliFirmaId,
        ilgiliIsciId,
      },
    })
  } catch (e) {
    // DB hatası → yüklenen blob'u temizle (yarım state bırakma)
    if (dosyaYol.startsWith('https://')) {
      try {
        await del(dosyaYol)
      } catch {
        // temizleme başarısızsa sessizce geç — asıl hatayı döndür
      }
    }
    throw e
  }

  revalidatePath('/evrak')
  if (ilgiliFirmaId) revalidatePath(`/musteri-firmalar/${ilgiliFirmaId}`)
  if (ilgiliIsciId) revalidatePath(`/isci-havuzu/${ilgiliIsciId}`)
  return { ok: true }
}

export async function evrakSil(formData: FormData) {
  await requireRoles(['patron', 'operasyon', 'muhasebe'])
  const id = Number(formData.get('id'))
  const evrak = await prisma.evrak.findUnique({ where: { id } })
  if (!evrak) return

  // Önce DB satırını sil; yalnızca başarılıysa blob'u temizle (yarım state bırakma)
  await prisma.evrak.delete({ where: { id } })
  if (evrak.dosyaYol.startsWith('https://')) {
    try {
      await del(evrak.dosyaYol)
    } catch {
      // blob silme başarısız olursa sessizce geç — DB kaydı zaten silindi
    }
  }

  revalidatePath('/evrak')
  if (evrak.ilgiliFirmaId) revalidatePath(`/musteri-firmalar/${evrak.ilgiliFirmaId}`)
  if (evrak.ilgiliIsciId) revalidatePath(`/isci-havuzu/${evrak.ilgiliIsciId}`)
  return
}