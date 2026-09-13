import { getDownloadUrl } from '@vercel/blob'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { prisma } from '@/lib/db'
import { requireRoles } from '@/lib/dal'

export const dynamic = 'force-dynamic'

function dosyaHeaders(evrak: { mime: string | null; dosyaAdi: string }, buf: Buffer | ArrayBuffer) {
  const dosyaAdi = encodeURIComponent(evrak.dosyaAdi || 'dosya')
  return {
    'Content-Type': evrak.mime ?? 'application/octet-stream',
    'Content-Disposition': `attachment; filename*=UTF-8''${dosyaAdi}`,
    'Content-Length': String(buf.byteLength),
    'Cache-Control': 'private, no-store',
  }
}

// Kimlik doğrulamalı evrak indirme — private Blob'a (production) güvenli erişim
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  await requireRoles(['patron', 'operasyon', 'muhasebe'])

  const { id } = await params
  const evrak = await prisma.evrak.findUnique({ where: { id: Number(id) } })
  if (!evrak) return new Response(JSON.stringify({ error: 'not_found' }), { status: 404, headers: { 'Content-Type': 'application/json' } })

  if (evrak.dosyaYol.startsWith('https://')) {
    try {
      const signed = getDownloadUrl(evrak.dosyaYol)
      const res = await fetch(signed)
      if (!res.ok) {
        return new Response(JSON.stringify({ error: 'storage_error' }), { status: 502, headers: { 'Content-Type': 'application/json' } })
      }
      const buf = await res.arrayBuffer()
      return new Response(buf, { headers: dosyaHeaders(evrak, buf) })
    } catch {
      return new Response(JSON.stringify({ error: 'storage_error' }), { status: 502, headers: { 'Content-Type': 'application/json' } })
    }
  }

  // Yerel dev/test kaydı (production'da asla kullanılmaz — Blob path'i üstte ele alınır)
  try {
    const dosya = path.join(process.cwd(), 'public', evrak.dosyaYol.replace(/^\//, ''))
    const buf = await readFile(dosya)
    return new Response(buf, { headers: dosyaHeaders(evrak, buf) })
  } catch {
    return new Response(JSON.stringify({ error: 'file_unavailable' }), { status: 410, headers: { 'Content-Type': 'application/json' } })
  }
}