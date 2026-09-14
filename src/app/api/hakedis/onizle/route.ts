import { prisma } from '@/lib/db'
import { requireRoles } from '@/lib/dal'
import { parseLocalDate } from '@/lib/donem'
import { addDays, startOfDay } from '@/lib/dates'

export const dynamic = 'force-dynamic'

// Dönem önizlemesi: seçili aralıkta kaç atama hakedişe dönüşebilir
export async function GET(req: Request) {
  await requireRoles(['patron', 'muhasebe'])
  const url = new URL(req.url)
  const bas = url.searchParams.get('bas')
  const bit = url.searchParams.get('bit')
  if (!bas || !bit) return Response.json({ success: false, uygunAtama: 0, uygunIsci: 0 }, { status: 400 })

  const basTarih = startOfDay(parseLocalDate(bas))
  const bitTarih = addDays(startOfDay(parseLocalDate(bit)), 1)

  const atamalar = await prisma.atama.findMany({
    where: {
      durum: 'tamamlandi',
      tarih: { gte: basTarih, lt: bitTarih },
      puantaj: { is: { durum: { not: 'gelmedi' } } },
    },
    select: { isciId: true, talep: { select: { firmaId: true } } },
  })

  const uygunIsci = new Set(atamalar.map((a) => a.isciId)).size
  return Response.json({ success: true, uygunAtama: atamalar.length, uygunIsci })
}