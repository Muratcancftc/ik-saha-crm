import { requireRoles } from '@/lib/dal'
import { prisma } from '@/lib/db'
import { date, num } from '@/lib/format'
import { Card, CardHeader, Th, Td, Badge, EmptyState } from '@/components/ui'
import { Icon } from '@/components/icons'
import { AdayForm } from './aday-form'
import { AdayBolgeSelect } from './aday-bolge-select'
import { adayDurumDegistir, adayAktar, adaySil } from '@/app/actions/aday'
import { SilOnayForm } from './sil-onay'
import { bolgeGecerli, bolgeEtiket, BOLGE_TONE } from '@/lib/bolge'

export const dynamic = 'force-dynamic'

const DURUM: Record<string, { label: string; tone: string }> = {
  basvurdu: { label: 'Onay Bekliyor', tone: 'blue' },
  gorusuldu: { label: 'Görüşüldü', tone: 'amber' },
  onaylandi: { label: 'Onaylandı', tone: 'green' },
  reddedildi: { label: 'Reddedildi', tone: 'red' },
}

export default async function AdaylarPage({
  searchParams,
}: {
  searchParams: Promise<{ bolge?: string; atanmamis?: string }>
}) {
  await requireRoles(['patron', 'operasyon'])
  const sp = await searchParams
  const bolge = bolgeGecerli(sp.bolge)
  const atanmamis = sp.atanmamis === '1'

  const [adaylar, meslekler] = await Promise.all([
    prisma.aday.findMany({
      where: {
        ...(atanmamis ? { bolge: null } : bolge ? { bolge } : {}),
      },
      include: { meslek: true, ilan: true },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.meslek.findMany({ orderBy: { ad: 'asc' } }),
  ])

  const sayilar = {
    basvurdu: adaylar.filter((a) => a.durum === 'basvurdu').length,
    gorusuldu: adaylar.filter((a) => a.durum === 'gorusuldu').length,
    onaylandi: adaylar.filter((a) => a.durum === 'onaylandi').length,
  }
  const bekleyen = sayilar.basvurdu + sayilar.gorusuldu

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-slate-500">
          <b className="text-slate-900">{num(adaylar.length)}</b> aday ·{' '}
          <span className="text-blue-600">{num(bekleyen)} onay bekliyor</span> ·{' '}
          <span className="text-amber-600">{num(sayilar.gorusuldu)} görüşüldü</span> ·{' '}
          <span className="text-emerald-600">{num(sayilar.onaylandi)} onaylandı</span>
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <form method="get" className="flex items-center gap-2">
            <select
              name="bolge"
              defaultValue={bolge ?? ''}
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-indigo-500"
            >
              <option value="">Tüm Bölgeler</option>
              <option value="kocaeli">Kocaeli</option>
              <option value="balikesir">Balıkesir</option>
            </select>
            <label className="flex cursor-pointer items-center gap-1.5 text-xs font-medium text-slate-600">
              <input type="checkbox" name="atanmamis" value="1" defaultChecked={atanmamis} className="rounded accent-indigo-600" />
              Atanmamış
            </label>
            <button type="submit" className="rounded-lg bg-white px-3 py-2 text-sm font-medium text-slate-700 ring-1 ring-slate-300 hover:bg-slate-50">Filtrele</button>
          </form>
          <AdayForm meslekler={meslekler.map((m) => ({ id: m.id, ad: m.ad }))} />
        </div>
      </div>

      <Card>
        <CardHeader title="Aday Havuzu" desc="Onaylanan aday tek tıkla işçi havuzuna aktarılır" />
        <div className="overflow-x-auto">
          {adaylar.length === 0 ? (
            <EmptyState icon="users" title="Aday yok" desc="Yeni aday ekleyerek başlayın" />
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="border-b border-slate-100 px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500">Aday</th>
                  <Th>Bölge</Th>
                  <Th>Meslek</Th>
                  <Th>İletişim</Th>
                  <Th>Başvuru</Th>
                  <Th>Puan</Th>
                  <Th>Durum</Th>
                  <Th className="text-right">İşlem</Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {adaylar.map((a) => {
                  const d = DURUM[a.durum] ?? { label: a.durum, tone: 'slate' }
                  return (
                    <tr key={a.id} className="hover:bg-slate-50/60">
                      <Td className="font-medium text-slate-900">
                        <div className="flex items-center gap-2">
                          {a.ad}
                          {a.kaynak?.startsWith('website') && <Badge tone="violet">Website</Badge>}
                        </div>
                        {a.ilan && (
                          <div className="mt-0.5 text-xs text-slate-500">
                            Başvurduğu ilan: <b className="font-medium">{a.ilan.baslik}</b>
                          </div>
                        )}
                      </Td>
                      <Td>
                        <div className="flex items-center gap-1.5">
                          {a.bolge ? <Badge tone={BOLGE_TONE[a.bolge]}>{bolgeEtiket(a.bolge)}</Badge> : <Badge tone="slate">Atanmamış</Badge>}
                          <AdayBolgeSelect adayId={a.id} bolge={a.bolge} />
                        </div>
                      </Td>
                      <Td>{a.meslek?.ad ?? '—'}</Td>
                      <Td>
                        <div>{a.telefon}</div>
                        {a.email && <div className="text-xs text-slate-400">{a.email}</div>}
                      </Td>
                      <Td>{date(a.createdAt)}</Td>
                      <Td className="tabular-nums">{a.puan}</Td>
                      <Td><Badge tone={d.tone as never}>{d.label}</Badge></Td>
                      <Td className="text-right">
                        <div className="flex justify-end gap-1.5">
                          {a.durum !== 'onaylandi' && a.durum !== 'reddedildi' && (
                            <form action={adayDurumDegistir}>
                              <input type="hidden" name="id" value={a.id} />
                              <input type="hidden" name="durum" value="gorusuldu" />
                              <button className="rounded-lg px-2 py-1 text-xs font-medium text-amber-700 ring-1 ring-amber-200 hover:bg-amber-50" title="Görüşüldü">
                                Görüşüldü
                              </button>
                            </form>
                          )}
                          {a.durum !== 'onaylandi' && a.durum !== 'reddedildi' && (
                            <form action={adayAktar}>
                              <input type="hidden" name="id" value={a.id} />
                              <button className="rounded-lg bg-indigo-600 px-2 py-1 text-xs font-medium text-white hover:bg-indigo-500" title="Onayla ve işçi havuzuna aktar">
                                Onayla & Havuza Aktar
                              </button>
                            </form>
                          )}
                          {a.durum !== 'reddedildi' && (
                            <form action={adayDurumDegistir}>
                              <input type="hidden" name="id" value={a.id} />
                              <input type="hidden" name="durum" value="reddedildi" />
                              <button className="rounded-lg p-1.5 text-red-400 transition hover:bg-red-50 hover:text-red-600" title="Reddet">
                                <Icon name="x" size={15} />
                              </button>
                            </form>
                          )}
                          <SilOnayForm action={adaySil} id={a.id} baslik={`${a.ad} adayı`} />
                        </div>
                      </Td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
      </Card>
    </div>
  )
}