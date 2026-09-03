import { requireUser } from '@/lib/dal'
import { prisma } from '@/lib/db'
import { dateTime } from '@/lib/format'
import { Card, CardHeader, Badge, EmptyState } from '@/components/ui'
import { Icon } from '@/components/icons'
import { bildirimleriTara, bildirimleriOku, bildirimSil, bildirimGonder } from '@/app/actions/belge'

export const dynamic = 'force-dynamic'

const TUR: Record<string, { label: string; tone: string }> = {
  belge: { label: 'Belge', tone: 'amber' },
  sgk: { label: 'SGK', tone: 'blue' },
  fatura: { label: 'Fatura', tone: 'red' },
  vergi: { label: 'Vergi', tone: 'violet' },
  talep: { label: 'Talep / No-show', tone: 'indigo' },
}

export default async function BildirimlerPage({
  searchParams,
}: {
  searchParams: Promise<{ tur?: string; okunmamis?: string }>
}) {
    const user = await requireUser()
  void user
  const sp = await searchParams

  const [bildirimler, okunmamisToplam] = await Promise.all([
    prisma.bildirim.findMany({
      where: {
        ...(sp.tur ? { tur: sp.tur as never } : {}),
        ...(sp.okunmamis === '1' ? { okundu: false } : {}),
      },
      orderBy: [{ okundu: 'asc' }, { tarih: 'desc' }],
      take: 100,
    }),
    prisma.bildirim.count({ where: { okundu: false } }),
  ])

  const okunmamis = okunmamisToplam

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-slate-500">
          <b className="text-slate-900">{okunmamis}</b> okunmamış bildirim
        </p>
        <div className="flex flex-wrap gap-2">
          <form method="get" className="flex items-center gap-2">
            <select name="tur" defaultValue={sp.tur ?? ''} className="rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs outline-none focus:border-indigo-500">
              <option value="">Tümü</option>
              <option value="belge">Belge</option>
              <option value="sgk">SGK</option>
              <option value="fatura">Fatura</option>
              <option value="vergi">Vergi</option>
              <option value="talep">Talep / No-show</option>
            </select>
            <label className="flex items-center gap-1.5 text-xs font-medium text-slate-600">
              <input type="checkbox" name="okunmamis" value="1" defaultChecked={sp.okunmamis === '1'} className="rounded accent-indigo-600" />
              Sadece okunmamış
            </label>
            <button type="submit" className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white">Filtrele</button>
          </form>
          <form action={bildirimleriTara}>
            <button type="submit" className="rounded-lg bg-white px-3 py-1.5 text-xs font-medium text-indigo-600 ring-1 ring-slate-300 hover:bg-indigo-50">Uyarıları Tara</button>
          </form>
          <form action={bildirimleriOku}>
            <button type="submit" className="rounded-lg bg-white px-3 py-1.5 text-xs font-medium text-slate-600 ring-1 ring-slate-300 hover:bg-slate-50">Tümünü Okundu İşaretle</button>
          </form>
        </div>
      </div>

      <Card>
        <CardHeader title="Bildirim Akışı" desc="Dolan belge, SGK bildirimi, geciken fatura, gelmeyen işçi, resmi ödeme" />
        {bildirimler.length === 0 ? (
          <EmptyState icon="bell" title="Bildirim yok" desc="'Uyarıları Tara' ile güncel uyarıları oluşturun" />
        ) : (
          <ul className="divide-y divide-slate-100">
            {bildirimler.map((b) => {
              const t = TUR[b.tur] ?? { label: b.tur, tone: 'slate' }
              return (
                <li key={b.id} className={`flex items-start justify-between gap-3 px-5 py-3.5 ${b.okundu ? 'opacity-60' : ''}`}>
                  <div className="flex min-w-0 items-start gap-3">
                    <span className="mt-0.5 text-slate-400"><Icon name="bell" size={16} /></span>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge tone={t.tone as never}>{t.label}</Badge>
                        {!b.okundu && <Badge tone="blue">Yeni</Badge>}
                        {b.kanal && (
                          <Badge tone={b.gonderimDurum ? 'green' : 'amber'}>
                            {b.kanal.toUpperCase()} {b.gonderimDurum ? '✓' : 'bekliyor'}
                          </Badge>
                        )}
                      </div>
                      <p className="mt-1 text-sm text-slate-700">{b.mesaj}</p>
                      <p className="mt-0.5 text-[11px] text-slate-400">{dateTime(b.tarih)}</p>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-1.5">
                    {b.kanal && !b.gonderimDurum && (
                      <form action={bildirimGonder}>
                        <input type="hidden" name="id" value={b.id} />
                        <button className="rounded-lg bg-indigo-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-indigo-500" title="Gönder (placeholder)">
                          Gönder
                        </button>
                      </form>
                    )}
                    <form action={bildirimSil}>
                      <input type="hidden" name="id" value={b.id} />
                      <button className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600" title="Sil">
                        <Icon name="x" size={14} />
                      </button>
                    </form>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </Card>
    </div>
  )
}