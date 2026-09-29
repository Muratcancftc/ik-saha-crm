import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { ERISIM_SAKLAMA_GUN } from '@/lib/paylasim-tipleri'

export const dynamic = 'force-dynamic'

// KVKK: paylaşım erişim kayıtları 1 yıl sonra silinir.
// Vercel Cron günde bir çağırır; Authorization: Bearer <CRON_SECRET> ile korunur.
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET
  if (!secret || req.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const sinir = new Date(Date.now() - ERISIM_SAKLAMA_GUN * 24 * 60 * 60 * 1000)

  const erisim = await prisma.paylasimErisim.deleteMany({ where: { tarih: { lt: sinir } } })
  // Süresi dolmuş / iptal linkleri de 1 yıl sonra temizle (aktif linklere dokunma)
  const linkler = await prisma.paylasimLink.deleteMany({
    where: { durum: { not: 'AKTIF' }, gecerlilikBitis: { lt: sinir } },
  })

  return NextResponse.json({ ok: true, silinenErisim: erisim.count, silinenLink: linkler.count, sinir: sinir.toISOString() })
}
