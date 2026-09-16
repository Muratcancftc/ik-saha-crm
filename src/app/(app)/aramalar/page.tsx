import { requireRoles } from '@/lib/dal'
import { prisma } from '@/lib/db'
import { BolgeFiltre } from '@/components/bolge-filtre'
import { bolgeGecerli } from '@/lib/bolge'
import { AramaListesi } from './arama-listesi'

export const dynamic = 'force-dynamic'

export default async function AramalarPage({
  searchParams,
}: {
  searchParams: Promise<{ bolge?: string }>
}) {
  const user = await requireRoles(['patron', 'operasyon', 'muhasebe', 'ik', 'izleyici'])
  const sp = await searchParams
  const bolge = bolgeGecerli(sp.bolge)

  const personeller = await prisma.isci.findMany({
    where: bolge ? { bolge } : {},
    include: {
      firma: { select: { ad: true } },
      aramalar: { orderBy: { tarih: 'desc' }, take: 20, include: { kullanici: { select: { ad: true } } } },
    },
    orderBy: { ad: 'asc' },
  })

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold tracking-tight text-slate-900">Telefon Aramalar</h2>
          <p className="mt-0.5 text-sm text-slate-500">Personel listesi, canlı arama ve arama geçmişi takibi</p>
        </div>
        <BolgeFiltre aktif={bolge} />
      </div>

      <AramaListesi
        arayabilir={user.rol !== 'izleyici'}
        personeller={personeller.map((p) => ({
          id: p.id,
          ad: p.ad,
          telefon: p.telefon,
          firmaAd: p.firma?.ad ?? null,
          aramalar: p.aramalar.map((a) => ({ id: a.id, tarih: a.tarih.toISOString(), kullaniciAd: a.kullanici?.ad ?? null })),
        }))}
      />
    </div>
  )
}