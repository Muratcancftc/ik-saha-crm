import { NextResponse } from 'next/server'
import { getSession } from '@/lib/dal'
import { prisma } from '@/lib/db'
import { decrypt } from '@/lib/crypto'

const AYIRICI = ';'

function csvSatir(hucreler: Array<string | number>): string {
  return hucreler.map((h) => `"${String(h).replace(/"/g, '""')}"`).join(AYIRICI) + '\r\n'
}

export async function GET() {
  const user = await getSession()
  if (!user || !['patron', 'muhasebe'].includes(user.rol)) {
    return NextResponse.json({ error: 'Yetkisiz' }, { status: 403 })
  }

  const odemeler = await prisma.odeme.findMany({
    where: { durum: 'bekliyor' },
    include: { isci: true, personel: true },
    orderBy: { createdAt: 'asc' },
  })

  const satirlar = odemeler.map((o) => {
    const ad = o.tip === 'isci' ? o.isci?.ad ?? '' : o.personel?.ad ?? ''
    const iban = o.tip === 'isci' && o.isci ? decrypt(o.isci.iban) : o.personel ? decrypt(o.personel.iban) : ''
    return [ad, iban, Number(o.tutar).toFixed(2), o.donem, o.tip === 'isci' ? 'İşçi' : 'Personel']
  })

  const csv =
    '\uFEFF' +
    csvSatir(['Ad Soyad', 'IBAN', 'Tutar', 'Dönem', 'Tip']) +
    satirlar.map(csvSatir).join('')

  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': 'attachment; filename="odeme-banka-dosyasi.csv"',
    },
  })
}