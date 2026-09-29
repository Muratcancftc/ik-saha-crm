import { NextResponse } from 'next/server'
import { requireApiAccess } from '@/lib/dal'
import { prisma } from '@/lib/db'
import { startOfDay, addDays } from '@/lib/dates'
import { parseLocalDate } from '@/lib/donem'
import { vergiDurum, VERGI_TUR_ETIKET, VERGI_DURUM_ETIKET, tarihTr } from '@/lib/vergi'
import { istanbulBugun } from '@/lib/dates'

const AYIRICI = ';'
function csvSatir(hucreler: Array<string | number>): string {
  return hucreler.map((h) => `"${String(h).replace(/"/g, '""')}"`).join(AYIRICI) + '\r\n'
}

export async function GET(req: Request) {
  const user = await requireApiAccess('/api/export/vergi-rapor', ['patron', 'muhasebe', 'ik', 'operasyon', 'izleyici'])
  if (!user) {
    return NextResponse.json({ error: 'Yetkisiz' }, { status: 403 })
  }

  const url = new URL(req.url)
  // Parametresiz çağrıda İstanbul'daki içinde bulunulan ay kullanılır
  const ay = istanbulBugun()
  const basParam = url.searchParams.get('bas') ?? `${ay.getFullYear()}-${String(ay.getMonth() + 1).padStart(2, '0')}-01`
  const bitParam = url.searchParams.get('bit') ?? new Date(ay.getFullYear(), ay.getMonth() + 1, 0).toISOString().slice(0, 10)
  const bas = startOfDay(parseLocalDate(basParam))
  const bit = addDays(parseLocalDate(bitParam), 1)

  const kayitlar = await prisma.vergiOdemesi.findMany({
    where: { silindi: false, sonOdemeTarihi: { gte: bas, lt: bit } },
    include: { firma: true, dekontlar: { where: { silindi: false }, select: { id: true } } },
    orderBy: { sonOdemeTarihi: 'asc' },
  })

  const baslik = ['Firma', 'Vergi Türü', 'Dönem', 'Tahakkuk', 'Ödenen', 'Kalan', 'Son Ödeme', 'Durum', 'Dekont']
  const satirlar = kayitlar.map((k) => {
    const durum = vergiDurum(k)
    const odenen = Number(k.odenenTutar ?? 0)
    return [
      k.firma.ad,
      k.vergiTuru === 'DIGER' ? `Diğer (${k.vergiTuruDiger ?? ''})` : VERGI_TUR_ETIKET[k.vergiTuru],
      k.donem,
      Number(k.tahakkukTutari).toFixed(2),
      odenen.toFixed(2),
      (Number(k.tahakkukTutari) - odenen).toFixed(2),
      tarihTr(k.sonOdemeTarihi),
      VERGI_DURUM_ETIKET[durum],
      k.dekontlar.length > 0 ? 'VAR' : 'YOK',
    ]
  })

  const csv = '\uFEFF' + csvSatir(baslik) + satirlar.map(csvSatir).join('')
  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="vergi-rapor-${basParam}.csv"`,
    },
  })
}