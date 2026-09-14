import { prisma } from '@/lib/db'
import { requireUser } from '@/lib/dal'

export const dynamic = 'force-dynamic'

// Header orta bildirim feed'i için: son kaldırılmamış bildirimler + okunmamış sayı
export async function GET() {
  const user = await requireUser()

  const kullaniciFiltre =
    user.rol === 'saha_sorumlusu' ? { kullaniciId: user.id } : {}

  const [items, unreadCount] = await Promise.all([
    prisma.bildirim.findMany({
      where: { kaldirildi: false, ...kullaniciFiltre },
      orderBy: { tarih: 'desc' },
      take: 3,
    }),
    prisma.bildirim.count({ where: { okundu: false, ...kullaniciFiltre } }),
  ])

  return Response.json({
    success: true,
    unreadCount,
    items: items.map((b) => ({
      id: b.id,
      tur: b.tur,
      mesaj: b.mesaj,
      ilgiliId: b.ilgiliId,
      tarih: b.tarih,
    })),
  })
}