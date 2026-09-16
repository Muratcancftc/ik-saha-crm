import { put } from '@vercel/blob'
import { writeFile, mkdir } from 'node:fs/promises'
import path from 'node:path'

const MAX_BOYUT = 10 * 1024 * 1024 // 10MB

export type DekontMeta = { url: string; ad: string; tip: string; boyut: number }

export function dekontGecerli(dosya: { name: string; size: number }): string | null {
  const uz = dosya.name.split('.').pop()?.toLowerCase() ?? ''
  if (!['pdf', 'jpg', 'jpeg', 'png', 'webp', 'gif'].includes(uz)) return 'Yalnızca PDF/JPG/PNG/WebP/GIF yüklenebilir.'
  if (dosya.size > MAX_BOYUT) return 'Dosya 10MB sınırını aşıyor.'
  if (dosya.size === 0) return 'Boş dosya yüklenemez.'
  return null
}

// Dosyayı sakla. Local dev: public dışında (imzalı erişim API route ile).
// Production: Vercel Blob private (imzalı URL getDownloadUrl ile).
export async function dekontKaydet(dosya: File): Promise<DekontMeta> {
  const buf = Buffer.from(await dosya.arrayBuffer())
  const ad = dosya.name.replace(/[^\w.\-]+/g, '_')
  const uz = ad.split('.').pop()?.toLowerCase() ?? 'bin'

  if (process.env.VERCEL) {
    const blob = await put(`dekont/${Date.now()}-${ad}`, buf, { access: 'private', contentType: dosya.type || 'application/octet-stream' })
    return { url: blob.url, ad: dosya.name, tip: uz, boyut: buf.length }
  }

  const klasor = path.join(process.cwd(), 'uploads', 'dekont')
  await mkdir(klasor, { recursive: true })
  const dosyaAdi = `${Date.now()}-${ad}`
  await writeFile(path.join(klasor, dosyaAdi), buf)
  return { url: `uploads/dekont/${dosyaAdi}`, ad: dosya.name, tip: uz, boyut: buf.length }
}

export function dekontYerelYol(url: string): string | null {
  // "uploads/dekont/<ad>" → yerel dosya yolu (path traversal korumalı)
  const m = url.match(/^uploads\/dekont\/([A-Za-z0-9._-]+)$/)
  if (!m) return null
  return path.join(process.cwd(), 'uploads', 'dekont', m[1])
}