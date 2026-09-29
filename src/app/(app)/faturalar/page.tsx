import { requireRoles } from '@/lib/dal'
import { prisma } from '@/lib/db'
import { tl, num, date } from '@/lib/format'
import { daysUntil } from '@/lib/dates'
import { Card, CardHeader, StatCard, Th, Td, EmptyState, Badge } from '@/components/ui'
import { FaturaBadge } from '@/components/status-badge'
import { Icon } from '@/components/icons'
import { FaturaForm } from './fatura-form'
import { createTahsilat, faturaDurumDegistir, faturaIptal } from '@/app/actions/muhasebe'
import { SilOnayForm, OnayForm } from '@/components/sil-onay'

export const dynamic = 'force-dynamic'

export default async function FaturalarPage() {
  await requireRoles(['patron', 'muhasebe'])

  const faturalar = await prisma.fatura.findMany({
    where: { silindi: false },
    include: { firma: true, tahsilatlar: true },
    orderBy: { createdAt: 'desc' },
  })
  const firmalar = await prisma.musteriFirma.findMany({ orderBy: { ad: 'asc' } })

  const toplamGenel = faturalar.reduce((a, f) => a + Number(f.genelToplam), 0)
  const toplamTahsilat = faturalar.reduce((a, f) => a + f.tahsilatlar.reduce((x, t) => x + Number(t.tutar), 0), 0)
  const alacak = toplamGenel - toplamTahsilat

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard icon="fatura" label="Toplam Fatura" value={tl(toplamGenel)} sub={`${num(faturalar.length)} fatura`} tone="indigo" />
        <StatCard icon="wallet" label="Tahsilat" value={tl(toplamTahsilat)} sub="Toplam ödenen" tone="green" />
        <StatCard icon="gider" label="Alacak" value={tl(alacak)} sub="Ödenmemiş faturalar" tone={alacak > 0 ? 'amber' : 'green'} />
      </div>

      <Card>
        <CardHeader
          title="Faturalar"
          desc="KDV %20 otomatik hesaplanır; tahsilat işlemleri en sağdaki İşlem sütununda — tabloyu sağa kaydırın"
          action={
            <div className="flex flex-wrap items-center gap-2">
              <FaturaForm firmalar={firmalar.map((f) => ({ id: f.id, ad: f.ad }))} />
              {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
              <a
                href="/api/export/faturalar"
                className="inline-flex items-center gap-1.5 rounded-lg bg-white px-3 py-2 text-sm font-medium text-emerald-700 ring-1 ring-emerald-200 transition hover:bg-emerald-50"
                title="KDV icmali ve fatura listesi (CSV)"
              >
                <Icon name="excel" size={15} />
                Excel (CSV)
              </a>
            </div>
          }
        />
        <div className="relative overflow-x-auto">
          <div className="pointer-events-none absolute inset-y-0 right-0 w-8 bg-gradient-to-l from-slate-100/80 to-transparent" />
          {faturalar.length === 0 ? (
            <EmptyState icon="fatura" title="Fatura yok" desc="Firma seçip fatura kesin" />
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-100">
                  <Th>No / Dönem</Th>
                  <Th>Firma</Th>
                  <Th>Kesim / Vade</Th>
                  <Th className="text-right">Net (ara toplam)</Th>
                  <Th className="text-right">KDV %20</Th>
                  <Th className="text-right">Genel Toplam</Th>
                  <Th className="text-right">Tahsilat</Th>
                  <Th className="text-left">Durum</Th>
                  <Th className="text-right">İşlem</Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {faturalar.map((f) => {
                  const odenen = f.tahsilatlar.reduce((a, t) => a + Number(t.tutar), 0)
                  const kalan = Number(f.genelToplam) - odenen
                  const gecikme = f.durum !== 'odendi' ? daysUntil(f.vadeTarihi) : null
                  return (
                    <tr key={f.id} className="hover:bg-slate-50/60">
                      <Td>
                        <div className="font-medium text-slate-900">{f.no}</div>
                        <div className="text-xs text-slate-400">Dönem: {f.donem}</div>
                      </Td>
                      <Td className="font-medium">{f.firma.ad}</Td>
                      <Td>
                        <div className="text-xs text-slate-500">
                          Kesim: <span className="text-slate-700">{date(f.kesimTarihi)}</span>
                        </div>
                        <div className="text-xs text-slate-400">
                          Vade: {date(f.vadeTarihi)}
                          {gecikme !== null && gecikme < 0 && f.durum !== 'odendi' && (
                            <Badge tone="red" className="ml-1.5">{Math.abs(gecikme)} gün gecikti</Badge>
                          )}
                        </div>
                      </Td>
                      <Td className="text-right tabular-nums">{tl(f.araToplam)}</Td>
                      <Td className="text-right tabular-nums">{tl(f.kdvTutar)}</Td>
                      <Td className="text-right font-semibold tabular-nums text-slate-900">{tl(f.genelToplam)}</Td>
                      <Td className="text-right tabular-nums text-emerald-600">{tl(odenen)}</Td>
                      <Td><FaturaBadge durum={f.durum} /></Td>
                      <Td className="text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {kalan > 0 && (
                            <form action={createTahsilat} className="flex items-center gap-1">
                              <input type="hidden" name="faturaId" value={f.id} />
                              <input
                                name="tutar"
                                type="number"
                                step="0.01"
                                placeholder="Tahsilat"
                                defaultValue={Number(f.genelToplam) - odenen}
                                className="w-24 rounded-lg border border-slate-200 px-2 py-1 text-right text-xs tabular-nums outline-none focus:border-indigo-500"
                              />
                              <button type="submit" title="Tahsilat kaydet" className="rounded-lg p-1.5 text-emerald-600 transition hover:bg-emerald-50">
                                <Icon name="wallet" size={15} />
                              </button>
                            </form>
                          )}
                          {f.durum !== 'odendi' && kalan <= 0 && (
                            <OnayForm
                              action={faturaDurumDegistir}
                              gizli={{ id: f.id, durum: 'odendi' }}
                              onayMetni={`${f.no} faturası ödendi olarak işaretlensin mi?`}
                              title="Ödendi işaretle"
                              className="rounded-lg p-1.5 text-slate-400 transition hover:bg-indigo-50 hover:text-indigo-600"
                            >
                              <Icon name="check" size={15} />
                            </OnayForm>
                          )}
                          {f.durum === 'odendi' && odenen < Number(f.genelToplam) && (
                            <OnayForm
                              action={faturaDurumDegistir}
                              gizli={{ id: f.id, durum: 'vadede' }}
                              onayMetni={`${f.no} faturasının "Ödendi" işareti geri alınsın mı? Tahsilata göre yeniden hesaplanır.`}
                              title="Ödendi işaretini geri al"
                              className="rounded-lg p-1.5 text-slate-400 transition hover:bg-amber-50 hover:text-amber-600"
                            >
                              <Icon name="yenile" size={15} />
                            </OnayForm>
                          )}
                          {odenen === 0 ? (
                            <SilOnayForm
                              action={faturaIptal}
                              id={f.id}
                              baslik={`${f.no} faturası`}
                              onayMetni="Faturayı iptal et"
                              buttonClass="rounded-lg p-1.5 text-slate-300 transition hover:bg-red-50 hover:text-red-600"
                            />
                          ) : (
                            <span
                              className="rounded-lg p-1.5 text-slate-300"
                              title="Tahsilatı olan fatura iptal edilemez"
                            >
                              <Icon name="x" size={15} />
                            </span>
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