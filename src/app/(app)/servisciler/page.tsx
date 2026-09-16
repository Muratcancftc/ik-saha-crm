import { requireRoles } from '@/lib/dal'
import { prisma } from '@/lib/db'
import { num, date } from '@/lib/format'
import { Card, CardHeader, Th, Td, Badge, EmptyState } from '@/components/ui'
import { Icon } from '@/components/icons'
import { ServisciForm } from './servisci-form'
import { ServisciDetay } from './servisci-detay'
import { toggleServisciDurum, silServisci } from '@/app/actions/servis'
import { BolgeSubMenu } from '@/components/bolge-submenu'
import { BolgeFiltre } from '@/components/bolge-filtre'
import { bolgeGecerli, bolgeEtiket, BOLGE_TONE } from '@/lib/bolge'
import { SilOnayForm } from '@/components/sil-onay'

export const dynamic = 'force-dynamic'

const tl = (n: number) => new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(n)

export default async function ServiscilerPage({
  searchParams,
}: {
  searchParams: Promise<{ bolge?: string }>
}) {
  const user = await requireRoles(['patron', 'operasyon', 'muhasebe'])
  const sp = await searchParams
  const bolge = bolgeGecerli(sp.bolge)

  const servisciler = await prisma.servisci.findMany({
    where: bolge ? { bolge } : {},
    include: { servisler: true },
    orderBy: { ad: 'asc' },
  })

  const toplamServis = servisciler.reduce((a, s) => a + s.servisler.length, 0)
  const toplamTutar = servisciler.reduce((a, s) => a + s.servisler.reduce((x, sv) => x + Number(sv.tutar), 0), 0)
  const aktif = servisciler.filter((s) => s.durum === 'aktif').length

  return (
    <div className="space-y-5">
      {bolge && <BolgeSubMenu bolge={bolge} rol={user.rol} />}

      {/* Özet */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Ozet label="Servisçi" value={num(servisciler.length)} tone="text-slate-900" bg="bg-slate-50" />
        <Ozet label="Aktif" value={num(aktif)} tone="text-emerald-600" bg="bg-emerald-50" />
        <Ozet label="Toplam Servis" value={num(toplamServis)} tone="text-indigo-600" bg="bg-indigo-50" />
        <Ozet label="Toplam (KDV'siz)" value={tl(toplamTutar)} tone="text-amber-700" bg="bg-amber-50" />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-slate-500">
          <b className="text-slate-900">{num(servisciler.length)}</b> servisçi
          {bolge && <span className="text-slate-400"> · {bolgeEtiket(bolge)}</span>}
        </p>
        <div className="flex items-center gap-2">
          <BolgeFiltre aktif={bolge} />
          <ServisciForm mode="create" varsayilanBolge={bolge ?? 'kocaeli'} />
        </div>
      </div>

      <Card>
        <CardHeader
          title="Servisçiler"
          desc="Servis şoförleri — servis sayısı, ne yaptı ve kavlî (KDV'siz) ödemeler"
        />
        <div className="overflow-x-auto">
          {servisciler.length === 0 ? (
            <EmptyState icon="servis" title="Servisçi yok" desc="Yeni servisçi ekleyerek başlayın" />
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-100">
                  <Th>Servisçi</Th>
                  <Th>Bölge</Th>
                  <Th>Telefon</Th>
                  <Th className="text-right">Servis</Th>
                  <Th className="text-right">Toplam (KDV&apos;siz)</Th>
                  <Th>Son Servis</Th>
                  <Th>Durum</Th>
                  <Th className="text-right">İşlem</Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {servisciler.map((s) => {
                  const toplam = s.servisler.reduce((a, sv) => a + Number(sv.tutar), 0)
                  const son = s.servisler.length ? s.servisler.map((x) => x.tarih).sort((a, b) => b.getTime() - a.getTime())[0] : null
                  return (
                    <tr key={s.id} className="hover:bg-slate-50/60">
                      <Td>
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-amber-50 text-xs font-semibold text-amber-700">
                            {s.ad.split(' ').map((p) => p[0]).slice(0, 2).join('')}
                          </div>
                          <span className="font-medium text-slate-900">{s.ad}</span>
                        </div>
                      </Td>
                      <Td><Badge tone={BOLGE_TONE[s.bolge]}>{bolgeEtiket(s.bolge)}</Badge></Td>
                      <Td className="tabular-nums text-slate-500">{s.telefon || '—'}</Td>
                      <Td className="text-right font-semibold tabular-nums text-slate-900">{num(s.servisler.length)}</Td>
                      <Td className="text-right font-semibold tabular-nums text-amber-700">{tl(toplam)}</Td>
                      <Td>{son ? date(son) : '—'}</Td>
                      <Td>
                        <Badge tone={s.durum === 'aktif' ? 'green' : 'slate'}>{s.durum === 'aktif' ? 'Aktif' : 'Pasif'}</Badge>
                      </Td>
                      <Td className="text-right">
                        <div className="flex justify-end gap-1.5">
                          <ServisciDetay
                            servisci={{ id: s.id, ad: s.ad, telefon: s.telefon, bolge: s.bolge, durum: s.durum }}
                            servisler={s.servisler.map((sv) => ({ id: sv.id, tarih: sv.tarih, guzergah: sv.guzergah, tutar: Number(sv.tutar), not: sv.not }))}
                          />
                          <ServisciForm
                            mode="edit"
                            servisci={{ id: s.id, ad: s.ad, telefon: s.telefon, bolge: s.bolge, durum: s.durum, not: s.not }}
                          />
                          <form action={toggleServisciDurum}>
                            <input type="hidden" name="id" value={s.id} />
                            <input type="hidden" name="hedef" value={s.durum === 'aktif' ? 'pasif' : 'aktif'} />
                            <button className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700" title="Durum değiştir">
                              <Icon name="x" size={15} />
                            </button>
                          </form>
                          {user.rol === 'patron' && (
                            <SilOnayForm action={silServisci} id={s.id} baslik={`${s.ad} servisçisi`} />
                          )}
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

function Ozet({ label, value, tone, bg }: { label: string; value: string; tone: string; bg: string }) {
  return (
    <div className={`rounded-2xl ${bg} px-4 py-3`}>
      <div className={`text-xl font-bold tabular-nums ${tone}`}>{value}</div>
      <div className="mt-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-500">{label}</div>
    </div>
  )
}