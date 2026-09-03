import { requireRoles } from '@/lib/dal'
import { prisma } from '@/lib/db'
import { date, num } from '@/lib/format'
import { Card, CardHeader, Th, Td, Badge, EmptyState } from '@/components/ui'
import { Icon } from '@/components/icons'
import { AdayForm } from './aday-form'
import { adayDurumDegistir, adayAktar, adaySil } from '@/app/actions/aday'
import { SilOnayForm } from './sil-onay'

export const dynamic = 'force-dynamic'

const DURUM: Record<string, { label: string; tone: string }> = {
  basvurdu: { label: 'Başvurdu', tone: 'blue' },
  gorusuldu: { label: 'Görüşüldü', tone: 'amber' },
  onaylandi: { label: 'Onaylandı', tone: 'green' },
  reddedildi: { label: 'Reddedildi', tone: 'red' },
}

export default async function AdaylarPage() {
  await requireRoles(['patron', 'operasyon'])

  const [adaylar, meslekler] = await Promise.all([
    prisma.aday.findMany({
      include: { meslek: true },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.meslek.findMany({ orderBy: { ad: 'asc' } }),
  ])

  const sayilar = {
    basvurdu: adaylar.filter((a) => a.durum === 'basvurdu').length,
    gorusuldu: adaylar.filter((a) => a.durum === 'gorusuldu').length,
    onaylandi: adaylar.filter((a) => a.durum === 'onaylandi').length,
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-slate-500">
          <b className="text-slate-900">{num(adaylar.length)}</b> aday ·{' '}
          <span className="text-blue-600">{num(sayilar.basvurdu)} başvurdu</span> ·{' '}
          <span className="text-amber-600">{num(sayilar.gorusuldu)} görüşüldü</span> ·{' '}
          <span className="text-emerald-600">{num(sayilar.onaylandi)} onaylandı</span>
        </p>
        <AdayForm meslekler={meslekler.map((m) => ({ id: m.id, ad: m.ad }))} />
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
                  <Th>Aday</Th>
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
                      <Td className="font-medium text-slate-900">{a.ad}</Td>
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
                          {a.durum !== 'onaylandi' && (
                            <form action={adayAktar}>
                              <input type="hidden" name="id" value={a.id} />
                              <button className="rounded-lg bg-indigo-600 px-2 py-1 text-xs font-medium text-white hover:bg-indigo-500" title="İşçi havuzuna aktar">
                                Havuza Aktar
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