import { NextResponse } from 'next/server'
import { requireApiAccess } from '@/lib/dal'
import { prisma } from '@/lib/db'

export const dynamic = 'force-dynamic'

// Fatura kesme formu için referans: seçili firma+dönemin hakediş müşteri tutar toplamı
export async function GET(req: Request) {
  const user = await requireApiAccess('/api/faturalar/referans', ['patron', 'muhasebe'])
  if (!user) return NextResponse.json({ error: 'Yetkisiz' }, { status: 403 })

  const url = new URL(req.url)
  const firmaId = Number(url.searchParams.get('firmaId'))
  const donem = url.searchParams.get('donem') ?? ''
  if (!firmaId || !/^\d{4}-\d{2}$/.test(donem)) return NextResponse.json({ toplam: 0, adet: 0 })

  const [yil, ay] = donem.split('-').map(Number)
  const donemKey = `${yil}-${ay}` // hakediş donemKey biçimi (önde sıfır yok)
  const h = await prisma.hakedis.aggregate({
    where: { firmaId, donemKey },
    _sum: { musteriTutar: true },
    _count: true,
  })
  return NextResponse.json({ toplam: Number(h._sum.musteriTutar ?? 0), adet: h._count })
}