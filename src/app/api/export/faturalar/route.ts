import { NextResponse } from 'next/server'
import { getSession } from '@/lib/dal'
import { prisma } from '@/lib/db'

const AYIRICI = ';'

function csvSatir(hucreler: Array<string | number>): string {
  return (
    hucreler.map((h) => `"${String(h).replace(/"/g, '""')}"`).join(AYIRICI) +
    '\r\n'
  )
}

export async function GET() {
  const user = await getSession()
  if (!user || !['patron', 'muhasebe'].includes(user.rol)) {
    return NextResponse.json({ error: 'Yetkisiz' }, { status: 403 })
  }

  const faturalar = await prisma.fatura.findMany({
    include: { firma: true, tahsilatlar: true },
    orderBy: { createdAt: 'desc' },
  })

  const baslik = ['No', 'Dönem', 'Firma', 'Vade', 'Net', 'KDV %20', 'Genel Toplam', 'Tahsilat', 'Alacak', 'Durum']
  const satirlar = faturalar.map((f) => {
    const tahsilat = f.tahsilatlar.reduce((a, t) => a + Number(t.tutar), 0)
    return [
      f.no,
      f.donem,
      f.firma.ad,
      f.vadeTarihi.toLocaleDateString('tr-TR'),
      Number(f.araToplam).toFixed(2),
      Number(f.kdvTutar).toFixed(2),
      Number(f.genelToplam).toFixed(2),
      tahsilat.toFixed(2),
      (Number(f.genelToplam) - tahsilat).toFixed(2),
      f.durum,
    ]
  })

  const csv = '\uFEFF' + csvSatir(baslik) + satirlar.map(csvSatir).join('')

  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': 'attachment; filename="fatura-icmal.csv"',
    },
  })
}