import { get } from '@vercel/blob'
import { readFile } from 'node:fs/promises'
import { prisma } from '@/lib/db'
import { tokenHash, oturumOku } from '@/lib/paylasim'
import { yerelYol } from '@/lib/paylasim-dosya'
import { linkDurumHesapla } from '@/lib/paylasim-tipleri'

export const dynamic = 'force-dynamic'

const PPTX_MIME =
  'application/vnd.openxmlformats-officedocument.presentationml.presentation'

// Public sunum dosyası: token + (gerekiyorsa) şifre oturumu doğrulanır.
export async function GET(req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const link = await prisma.paylasimLink.findUnique({
    where: { tokenHash: tokenHash(token) },
    include: { sunumVersiyon: true },
  })
  if (!link || link.tur !== 'SUNUM' || !link.sunumVersiyon) return new Response('Bulunamadı', { status: 404 })

  if (linkDurumHesapla(link.durum, link.gecerlilikBitis) !== 'AKTIF') {
    return new Response('Link artık geçerli değil', { status: 410 })
  }
  if (link.sifreHash && !(await oturumOku(link.id))) {
    return new Response('Yetkisiz', { status: 403 })
  }

  const versiyon = link.sunumVersiyon
  const sp = new URL(req.url).searchParams
  const pptx = sp.get('dosya') === 'pptx'
  const indir = sp.get('indir') === '1'
  if (pptx && !versiyon.pptxUrl) return new Response('Bulunamadı', { status: 404 })
  const url = pptx ? versiyon.pptxUrl! : versiyon.pdfUrl
  const mime = pptx ? PPTX_MIME : 'application/pdf'
  const adi = pptx ? versiyon.pptxAdi ?? 'sunum.pptx' : versiyon.pdfAdi || 'sunum.pdf'
  const dispozisyon = `${indir ? 'attachment' : 'inline'}; filename*=UTF-8''${encodeURIComponent(adi)}`

  const yerel = yerelYol(url)
  if (yerel) {
    try {
      const buf = await readFile(yerel)
      return new Response(buf, {
        headers: { 'Content-Type': mime, 'Content-Disposition': dispozisyon, 'Cache-Control': 'private, no-store' },
      })
    } catch {
      return new Response('Dosya yok', { status: 404 })
    }
  }

  try {
    const result = await get(url, { access: 'private' })
    if (!result) return new Response('Dosya yok', { status: 404 })
    const buf = await new Response(result.stream).arrayBuffer()
    return new Response(buf, {
      headers: { 'Content-Type': mime, 'Content-Disposition': dispozisyon, 'Cache-Control': 'private, no-store' },
    })
  } catch {
    return new Response('Dosya yok', { status: 404 })
  }
}
