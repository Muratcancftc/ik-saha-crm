import { NextResponse } from 'next/server'
import { requireApiAccess } from '@/lib/dal'
import { prisma } from '@/lib/db'

const AYIRICI = ';'

function csvSatir(hucreler: Array<string | number>): string {
  return hucreler.map((h) => `"${String(h).replace(/"/g, '""')}"`).join(AYIRICI) + '\r\n'
}

export async function GET(request: Request) {
  const user = await requireApiAccess('/api/export/rapor-isci', ['patron', 'muhasebe', 'operasyon'])
  if (!user) {
    return NextResponse.json({ error: 'Yetkisiz' }, { status: 403 })
  }

  const url = new URL(request.url)
  // Parametresiz çağrıda içinde bulunulan ay kullanılır (boş/0 rapor yerine)
  const ay = new Date()
  const bas = url.searchParams.get('bas') ?? `${ay.getFullYear()}-${String(ay.getMonth() + 1).padStart(2, '0')}-01`
  const bit = url.searchParams.get('bit') ?? new Date(ay.getFullYear(), ay.getMonth() + 1, 0).toISOString().slice(0, 10)

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