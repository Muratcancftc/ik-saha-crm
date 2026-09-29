import { NextResponse } from 'next/server'
import { get } from '@vercel/blob'
import { createReadStream } from 'node:fs'
import { stat } from 'node:fs/promises'
import { requireApiAccess } from '@/lib/dal'
import { prisma } from '@/lib/db'
import { dekontYerelYol } from '@/lib/dekont'

export const dynamic = 'force-dynamic'

const MIME: Record<string, string> = {
  pdf: 'application/pdf',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  gif: 'image/gif',
}

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireApiAccess('/api/dekont/indir', ['patron', 'muhasebe', 'ik', 'operasyon', 'izleyici'])
  if (!user) {
    return NextResponse.json({ error: 'Yetkisiz' }, { status: 403 })
  }
  const { id } = await params
  const dekont = await prisma.vergiDekont.findUnique({ where: { id: Number(id) } })
  if (!dekont || dekont.silindi) return NextResponse.json({ error: 'Dekont bulunamadı' }, { status: 404 })

  const indir = new URL(req.url).searchParams.get('indir') === '1'

  const yerel = dekontYerelYol(dekont.dosyaUrl)
  if (yerel) {
    try {
      const s = await stat(yerel)
      if (!s.isFile()) throw new Error('no')
      const uz = dekont.dosyaTipi
      const body = createReadStream(yerel) as unknown as ReadableStream
      return new NextResponse(body as unknown as BodyInit, {
        headers: {
          'Content-Type': MIME[uz] ?? 'application/octet-stream',
          'Content-Length': String(s.size),
          'Content-Disposition': indir
            ? `attachment; filename="${encodeURIComponent(dekont.dosyaAdi)}"`
            : 'inline',
          'Cache-Control': 'private, max-age=60',
        },
      })
    } catch {
      return NextResponse.json({ error: 'Dosya yok' }, { status: 404 })
    }
  }

  // Vercel Blob → OIDC ile kimlik doğrulamalı içerik (imzasız private URL 403 döner)
  try {
    const result = await get(dekont.dosyaUrl, { access: 'private' })
    if (!result) return NextResponse.json({ error: 'Dosya bulunamadı' }, { status: 404 })
    const buf = await new Response(result.stream).arrayBuffer()
    return new NextResponse(buf, {
      headers: {
        'Content-Type': MIME[dekont.dosyaTipi] ?? 'application/octet-stream',
        'Content-Length': String(buf.byteLength),
        'Content-Disposition': indir
          ? `attachment; filename*=UTF-8''${encodeURIComponent(dekont.dosyaAdi)}`
          : 'inline',
        'Cache-Control': 'private, no-store',
      },
    })
  } catch {
    return NextResponse.json({ error: 'Dosya bulunamadı' }, { status: 404 })
  }
}