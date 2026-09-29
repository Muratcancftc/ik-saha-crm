import { get } from '@vercel/blob'
import { readFile } from 'node:fs/promises'
import { prisma } from '@/lib/db'
import { requireRoles } from '@/lib/dal'
import { yerelYol } from '@/lib/paylasim-dosya'

export const dynamic = 'force-dynamic'

const PPTX_MIME =
  'application/vnd.openxmlformats-officedocument.presentationml.presentation'

// Admin sunum sürümü görüntüleme/indirme (private Blob'a güvenli erişim).
export async function GET(req: Request, { params }: { params: Promise<{ versiyonId: string }> }) {
  await requireRoles(['patron', 'operasyon'])
  const { versiyonId } = await params
  const versiyon = await prisma.sunumVersiyon.findUnique({ where: { id: Number(versiyonId) } })
  if (!versiyon) return new Response('Bulunamadı', { status: 404 })

  const sp = new URL(req.url).searchParams
  const pptx = sp.get('dosya') === 'pptx'
  const indir = sp.get('indir') === '1'
  if (pptx && !versiyon.pptxUrl) return new Response('Bulunamadı', { status: 404 })
  const url = pptx ? versiyon.pptxUrl! : versiyon.pdfUrl
  const mime = pptx ? PPTX_MIME : 'application/pdf'
  const adi = pptx ? versiyon.pptxAdi ?? 'sunum.pptx' : versiyon.pdfAdi || 'sunum.pdf'
  const dispozisyon = `${indir ? 'attachment' : 'inline'}; filename*=UTF-8''${encodeURIComponent(adi)}`

  // Yerel dev kaydı
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
