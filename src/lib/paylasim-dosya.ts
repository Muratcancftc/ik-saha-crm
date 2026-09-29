import 'server-only'
import { put } from '@vercel/blob'
import { writeFile, mkdir } from 'node:fs/promises'
import path from 'node:path'

// Sunum dosyaları (PDF/PPTX) — private Blob + yerel dev fallback.
// Public sayfada token'lı route üzerinden sunucu tarafında stream edilir.

const MAX_BOYUT = 20 * 1024 * 1024 // 20MB

export const PDF_MIME = 'application/pdf'
export const PPTX_MIME =
  'application/vnd.openxmlformats-officedocument.presentationml.presentation'

export type DosyaMeta = { url: string; ad: string; boyut: number }

function uzanti(ad: string): string {
  const i = ad.lastIndexOf('.')
  return i >= 0 ? ad.slice(i + 1).toLowerCase() : ''
}

export function pdfGecerliMi(dosya: { name: string; size: number }): string | null {
  if (uzanti(dosya.name) !== 'pdf') return 'PDF dosyası zorunludur.'
  if (dosya.size > MAX_BOYUT) return 'PDF 20MB sınırını aşıyor.'
  if (dosya.size === 0) return 'Boş dosya yüklenemez.'
  return null
}

export function pptxGecerliMi(dosya: { name: string; size: number }): string | null {
  if (uzanti(dosya.name) !== 'pptx') return 'PPTX dosyası geçersiz.'
  if (dosya.size > MAX_BOYUT) return 'PPTX 20MB sınırını aşıyor.'
  if (dosya.size === 0) return 'Boş dosya yüklenemez.'
  return null
}

export async function dosyaKaydet(dosya: File, altKlasor: string): Promise<DosyaMeta> {
  const buf = Buffer.from(await dosya.arrayBuffer())
  const ad = dosya.name.replace(/[^\w.\-]+/g, '_')
  const uz = uzanti(ad) || 'bin'
  const mime = uz === 'pdf' ? PDF_MIME : uz === 'pptx' ? PPTX_MIME : 'application/octet-stream'

  if (process.env.VERCEL) {
    const blob = await put(`paylasim/${altKlasor}/${Date.now()}-${ad}`, buf, {
      access: 'private',
      contentType: mime,
    })
    return { url: blob.url, ad: dosya.name, boyut: buf.length }
  }

  const klasor = path.join(process.cwd(), 'uploads', 'paylasim', altKlasor)
  await mkdir(klasor, { recursive: true })
  const dosyaAdi = `${Date.now()}-${ad}`
  await writeFile(path.join(klasor, dosyaAdi), buf)
  return { url: `uploads/paylasim/${altKlasor}/${dosyaAdi}`, ad: dosya.name, boyut: buf.length }
}

// "uploads/paylasim/<alt>/<ad>" → yerel yol (path traversal korumalı)
export function yerelYol(url: string): string | null {
  const m = url.match(/^uploads\/paylasim\/[A-Za-z0-9_-]+\/([A-Za-z0-9._-]+)$/)
  if (!m) return null
  const alt = url.split('/')[2]
  return path.join(process.cwd(), 'uploads', 'paylasim', alt, m[1])
}
