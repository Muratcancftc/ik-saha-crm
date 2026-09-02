import { NextResponse } from 'next/server'
import { getSession } from '@/lib/dal'
import { prisma } from '@/lib/db'

const AYIRICI = ';'

function csvSatir(hucreler: Array<string | number>): string {
  return hucreler
    .map((h) => `"${String(h).replace(/"/g, '""')}"`)
    .join(AYIRICI) + '\r\n'
}

export async function GET() {
  const user = await getSession()
  if (!user || !['patron', 'muhasebe'].includes(user.rol)) {
    return NextResponse.json({ error: 'Yetkisiz' }, { status: 403 })
  }

  const hakedisler = await prisma.hakedis.findMany({
    include: { isci: true, firma: true },
    orderBy: { donemBitis: 'desc' },
  })

  const baslik = ['Dönem', 'İşçi', 'Firma', 'Gün', 'Yevmiye', 'Avans', 'Kesinti', 'İşçi Net', 'Müşteri', 'Marj']
  const satirlar = hakedisler.map((h) => [
    `${h.donemBas.toLocaleDateString('tr-TR')} - ${h.donemBitis.toLocaleDateString('tr-TR')}`,
    h.isci.ad,
    h.firma.ad,
    h.gun,
    Number(h.yevmiye).toFixed(2),
    Number(h.avansToplam).toFixed(2),
    Number(h.kesinti).toFixed(2),
    Number(h.isciNet).toFixed(2),
    Number(h.musteriTutar).toFixed(2),
    Number(h.marj).toFixed(2),
  ])

  const csv = '\uFEFF' + csvSatir(baslik) + satirlar.map(csvSatir).join('')

  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': 'attachment; filename="hakedis-icmal.csv"',
    },
  })
}