import { NextResponse } from 'next/server'
import { getSession } from '@/lib/dal'
import { prisma } from '@/lib/db'

const AYIRICI = ';'

function csvSatir(hucreler: Array<string | number>): string {
  return hucreler.map((h) => `"${String(h).replace(/"/g, '""')}"`).join(AYIRICI) + '\r\n'
}

export async function GET(request: Request) {
  const user = await getSession()
  if (!user || !['patron', 'muhasebe', 'operasyon'].includes(user.rol)) {
    return NextResponse.json({ error: 'Yetkisiz' }, { status: 403 })
  }

  const url = new URL(request.url)
  const bas = url.searchParams.get('bas')
  const bit = url.searchParams.get('bit')
  if (!bas || !bit) return NextResponse.json({ error: 'dönem eksik' }, { status: 400 })

  const hakedisler = await prisma.hakedis.findMany({
    where: { donemBitis: { gte: new Date(`${bas}T00:00:00`), lt: new Date(`${bit}T00:00:00`) } },
    include: { isci: true },
  })

  const map = new Map<number, { ad: string; marj: number; gun: number }>()
  for (const h of hakedisler) {
    const e = map.get(h.isciId)
    if (e) {
      e.marj += Number(h.marj)
      e.gun += h.gun
    } else {
      map.set(h.isciId, { ad: h.isci.ad, marj: Number(h.marj), gun: h.gun })
    }
  }
  const satirlar = Array.from(map.values())
    .sort((a, b) => b.marj - a.marj)
    .map((v) => [v.ad, v.gun, v.marj.toFixed(2)])

  const csv =
    '\uFEFF' +
    csvSatir(['İşçi', 'Gün', 'Kârlılık (Marj)']) +
    satirlar.map(csvSatir).join('')

  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': 'attachment; filename="isci-karlilik.csv"',
    },
  })
}