import { NextResponse } from 'next/server'
import { getSession } from '@/lib/dal'
import { prisma } from '@/lib/db'
import { parseLocalDate } from '@/lib/donem'
import { startOfDay, addDays } from '@/lib/dates'
import { donemAvansKesinti, yuvarla } from '@/lib/ik'

const AYIRICI = ';'
function csvSatir(hucreler: Array<string | number>): string {
  return hucreler.map((h) => `"${String(h).replace(/"/g, '""')}"`).join(AYIRICI) + '\r\n'
}

export async function GET(req: Request) {
  const user = await getSession()
  if (!user || !['patron', 'muhasebe', 'operasyon', 'ik'].includes(user.rol)) {
    return NextResponse.json({ error: 'Yetkisiz' }, { status: 403 })
  }

  const url = new URL(req.url)
  const bas = startOfDay(parseLocalDate(url.searchParams.get('bas') ?? ''))
  const bit = addDays(parseLocalDate(url.searchParams.get('bit') ?? ''), 1)
  const firmaId = Number(url.searchParams.get('firma')) || undefined

  const firmalar = firmaId ? await prisma.musteriFirma.findMany({ where: { id: firmaId } }) : await prisma.musteriFirma.findMany({ orderBy: { ad: 'asc' } })

  const baslik = ['Firma', 'Personel', 'Puantaj Günü', 'Brüt', 'Avans', 'Kesinti', 'Net', 'Ödenen', 'Bekleyen']
  const satirlar: Array<Array<string | number>> = []

  for (const firma of firmalar) {
    const personel = await prisma.isci.findMany({ where: { firmaId: firma.id, durum: 'aktif' }, orderBy: { ad: 'asc' } })
    for (const i of personel) {
      const puantajlar = await prisma.puantajKayit.findMany({ where: { isciId: i.id, firmaId: firma.id, tarih: { gte: bas, lt: bit } } })
      const brut = yuvarla(puantajlar.reduce((a, p) => a + Number(p.hesaplananTutar), 0))
      const { avans, kesinti } = await donemAvansKesinti(i.id, bas, bit)
      const net = yuvarla(brut - avans - kesinti)
      const donem = await prisma.odemeDonemi.findUnique({ where: { isciId_firmaId_baslangic_bitis: { isciId: i.id, firmaId: firma.id, baslangic: bas, bitis: bit } }, include: { odemeler: true } })
      const odenen = donem ? yuvarla(donem.odemeler.reduce((a, o) => a + Number(o.tutar), 0)) : 0
      satirlar.push([firma.ad, i.ad, puantajlar.length, brut.toFixed(2), avans.toFixed(2), kesinti.toFixed(2), net.toFixed(2), odenen.toFixed(2), Math.max(0, net - odenen).toFixed(2)])
    }
  }

  const csv = '\uFEFF' + csvSatir(baslik) + satirlar.map(csvSatir).join('')
  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="ik-rapor-${url.searchParams.get('bas')}.csv"`,
    },
  })
}