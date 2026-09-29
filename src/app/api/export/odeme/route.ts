import { NextResponse } from 'next/server'
import { requireApiAccess } from '@/lib/dal'
import { prisma } from '@/lib/db'
import { decrypt } from '@/lib/crypto'
import { ibanGecerli } from '@/lib/ik'

const AYIRICI = ';'

function csvSatir(hucreler: Array<string | number>): string {
  return hucreler.map((h) => `"${String(h).replace(/"/g, '""')}"`).join(AYIRICI) + '\r\n'
}

export async function GET() {
  const user = await requireApiAccess('/api/export/odeme', ['patron', 'muhasebe'])
  if (!user) {
    return NextResponse.json({ error: 'Yetkisiz' }, { status: 403 })
  }

  const odemeler = await prisma.odeme.findMany({
    where: { durum: 'bekliyor' },
    include: { isci: true, personel: true },
    orderBy: { createdAt: 'asc' },
  })

  const satirlar = odemeler
    .map((o) => {
      const ad = o.tip === 'isci' ? o.isci?.ad ?? '' : o.personel?.ad ?? ''
      const iban = o.tip === 'isci' && o.isci ? decrypt(o.isci.iban) : o.personel ? decrypt(o.personel.iban) : ''
      return { ad, iban, tutar: Number(o.tutar).toFixed(2), donem: o.donem, tip: o.tip === 'isci' ? 'İşçi' : 'Personel' }
    })
    // Mock/sistem üretimi geçersiz IBAN (TR00…) kayıtlar banka dosyasına karışmasın
    .filter((k) => ibanGecerli(k.iban))
    .map((k) => [k.ad, k.iban, k.tutar, k.donem, k.tip])

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