import { requireUser } from '@/lib/dal'
import { prisma } from '@/lib/db'
import { atamaLokasyonFilter } from '@/lib/queries'
import { dateLong, num } from '@/lib/format'
import { startOfDay, addDays, sameDay } from '@/lib/dates'
import { Card, CardHeader, Badge, EmptyState } from '@/components/ui'
import { PuantajBadge, AtamaBadge } from '@/components/status-badge'
import { Icon } from '@/components/icons'
import { updatePuantaj } from '@/app/actions/talep'

export const dynamic = 'force-dynamic'

export default async function PuantajPage({
  searchParams,
}: {
  searchParams: Promise<{ tarih?: string }>
}) {
  const user = await requireUser()
  const sp = await searchParams
  const tarih = sp.tarih ? startOfDay(new Date(sp.tarih)) : startOfDay()

  const bugun = startOfDay()
  const gunler = Array.from({ length: 14 }, (_, i) => addDays(bugun, i - 3))

  const atamalar = await prisma.atama.findMany({
    where: {
      tarih: { gte: startOfDay(tarih), lt: addDays(startOfDay(tarih), 1) },
      durum: { not: 'iptal' },
      ...atamaLokasyonFilter(user),
    },
    include: {
      isci: true,
      talep: { include: { firma: true, lokasyon: true } },
      puantaj: true,
    },
    orderBy: { isci: { ad: 'asc' } },
  })

  const sayilar = { geldi: 0, gec: 0, gelmedi: 0, yarim: 0, bekliyor: 0 }
  for (const a of atamalar) {
    if (!a.puantaj) sayilar.bekliyor++
    else sayilar[a.puantaj.durum]++
  }

  const sahaSiniri = user.rol === 'saha_sorumlusu' ? ' — yalnızca kendi lokasyonunuz' : ''

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-slate-500">
          <b className="text-slate-900">{dateLong(tarih)}</b>
          {!sameDay(tarih, bugun) && (tarih < bugun ? ' · geçmiş gün' : ' · gelecek gün')}
          <span className="text-slate-400">{sahaSiniri}</span>
        </p>
        <div className="flex gap-1.5">
          {gunler.map((g) => {
            const aktif = sameDay(g, tarih)
            const bugunMu = sameDay(g, bugun)
            return (
              <a
                key={g.toISOString()}
                href={`/puantaj?tarih=${g.toISOString().slice(0, 10)}`}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                  aktif
                    ? 'bg-indigo-600 text-white'
                    : bugunMu
                      ? 'bg-indigo-50 text-indigo-600 hover:bg-indigo-100'
                      : 'bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50'
                }`}
              >
                {g.getDate()}
              </a>
            )
          })}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        <OzetKutu label="Geldi" value={sayilar.geldi} tone="text-emerald-600" />
        <OzetKutu label="Geç" value={sayilar.gec} tone="text-amber-600" />
        <OzetKutu label="Gelmedi" value={sayilar.gelmedi} tone="text-red-600" />
        <OzetKutu label="Yarım" value={sayilar.yarim} tone="text-sky-600" />
        <OzetKutu label="Puantaj Yok" value={sayilar.bekliyor} tone="text-slate-500" />
      </div>

      <Card>
        <CardHeader
          title={`Puantaj — ${num(atamalar.length)} işçi`}
          desc="Durum değiştirdikçe sayaçlar ve yevmiye anında güncellenir"
        />
        {atamalar.length === 0 ? (
          <EmptyState icon="puantaj" title="Bu gün için atama yok" />
        ) : (
          <ul className="divide-y divide-slate-100">
            {atamalar.map((a) => (
              <li key={a.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-indigo-50 text-xs font-semibold text-indigo-600">
                    {a.isci.ad.split(' ').map((p) => p[0]).slice(0, 2).join('')}
                  </div>
                  <div>
                    <div className="text-sm font-medium text-slate-900">{a.isci.ad}</div>
                    <div className="text-xs text-slate-500">
                      {a.talep.firma.ad} · {a.talep.lokasyon.ad} · {a.talep.vardiya === 'gunduz' ? 'Gündüz' : 'Gece'}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <AtamaBadge durum={a.durum} />
                  {a.puantaj ? (
                    <PuantajBadge durum={a.puantaj.durum} />
                  ) : (
                    <Badge tone="slate">Puantaj yok</Badge>
                  )}
                  <form action={updatePuantaj} className="flex overflow-hidden rounded-lg border border-slate-200">
                    <input type="hidden" name="atamaId" value={a.id} />
                    {(['geldi', 'gec', 'gelmedi', 'yarim'] as const).map((d) => {
                      const aktif = a.puantaj?.durum === d
                      return (
                        <button
                          key={d}
                          type="submit"
                          name="durum"
                          value={d}
                          className={`px-2.5 py-1.5 text-xs font-medium transition ${
                            aktif
                              ? d === 'geldi'
                                ? 'bg-emerald-500 text-white'
                                : d === 'gec'
                                  ? 'bg-amber-500 text-white'
                                  : d === 'gelmedi'
                                    ? 'bg-red-500 text-white'
                                    : 'bg-sky-500 text-white'
                              : 'bg-white text-slate-600 hover:bg-slate-50'
                          }`}
                        >
                          {d === 'geldi' ? 'Geldi' : d === 'gec' ? 'Geç' : d === 'gelmedi' ? 'Gelmedi' : 'Yarım'}
                        </button>
                      )
                    })}
                  </form>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  )
}

function OzetKutu({ label, value, tone }: { label: string; value: number; tone: string }) {
  return (
    <Card className="p-3 text-center">
      <div className={`text-xl font-semibold tabular-nums ${tone}`}>{num(value)}</div>
      <div className="mt-0.5 text-[11px] font-medium uppercase tracking-wide text-slate-400">{label}</div>
    </Card>
  )
}