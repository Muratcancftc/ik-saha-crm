import { requireRoles } from '@/lib/dal'
import { prisma } from '@/lib/db'
import { tl, num, date } from '@/lib/format'
import { daysUntil } from '@/lib/dates'
import { Card, CardHeader, StatCard, Th, Td, EmptyState, Badge } from '@/components/ui'
import { FaturaBadge } from '@/components/status-badge'
import { Icon } from '@/components/icons'
import { FaturaForm } from './fatura-form'
import { createTahsilat, faturaDurumDegistir } from '@/app/actions/muhasebe'

export const dynamic = 'force-dynamic'

export default async function FaturalarPage() {
  await requireRoles(['patron', 'muhasebe'])

  const faturalar = await prisma.fatura.findMany({
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
          desc="KDV %20 otomatik hesaplanır; fatura KDV'si vergi ekranına işlenir"
          action={<FaturaForm firmalar={firmalar.map((f) => ({ id: f.id, ad: f.ad }))} />}
        />
        <div className="overflow-x-auto">
          {faturalar.length === 0 ? (
            <EmptyState icon="fatura" title="Fatura yok" desc="Firma seçip fatura kesin" />
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-100">
                  <Th>No / Dönem</Th>
                  <Th>Firma</Th>
                  <Th>Vade</Th>
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
                        {date(f.vadeTarihi)}
                        {gecikme !== null && gecikme < 0 && f.durum !== 'odendi' && (
                          <Badge tone="red" className="ml-1.5">{Math.abs(gecikme)} gün gecikti</Badge>
                        )}
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
                          {f.durum !== 'odendi' && (
                            <form action={faturaDurumDegistir}>
                              <input type="hidden" name="id" value={f.id} />
                              <input type="hidden" name="durum" value="odendi" />
                              <button type="submit" title="Ödendi işaretle" className="rounded-lg p-1.5 text-slate-400 transition hover:bg-indigo-50 hover:text-indigo-600">
                                <Icon name="check" size={15} />
                              </button>
                            </form>
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