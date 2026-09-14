import { prisma } from '@/lib/db'
import { requireRoles } from '@/lib/dal'
import { startOfDay } from '@/lib/dates'

export const dynamic = 'force-dynamic'

// Aylık bordro önizlemesi: seçili dönemde kaç işçi hakedişi + personel maaşı ödemeye dönüşür
export async function GET(req: Request) {
  await requireRoles(['patron', 'muhasebe'])
  const url = new URL(req.url)
  const donem = url.searchParams.get('donem') ?? ''
  if (!/^\d{4}-\d{2}$/.test(donem)) return Response.json({ success: false }, { status: 400 })

  const [yil, ay] = donem.split('-').map(Number)
  const bas = startOfDay(new Date(yil, ay - 1, 1))
  const bit = startOfDay(new Date(yil, ay, 1))

  const hakedisler = await prisma.hakedis.findMany({ where: { donemBitis: { gte: bas, lt: bit } }, select: { isciId: true, isciNet: true } })
  const isciSayisi = new Set(hakedisler.map((h) => h.isciId)).size
  const isciTutar = hakedisler.reduce((a, h) => a + Number(h.isciNet), 0)

  const personeller = await prisma.personel.findMany({ where: { durum: 'aktif' } })
  const personelTutar = personeller.reduce((a, p) => a + Number(p.maas), 0)

  const mevcut = await prisma.odeme.count({ where: { donem } })

  return Response.json({
    success: true,
    isciSayisi,
    isciTutar,
    personelSayisi: personeller.length,
    personelTutar,
    mevcut,
  })
}