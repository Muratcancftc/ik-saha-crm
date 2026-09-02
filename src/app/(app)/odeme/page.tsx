import { requireRoles } from '@/lib/dal'
import { prisma } from '@/lib/db'
import { decrypt, maskIBAN } from '@/lib/crypto'
import { tl, num, date } from '@/lib/format'
import { Card, CardHeader, Th, Td, Badge, EmptyState, Button } from '@/components/ui'
import { Icon } from '@/components/icons'
import { odemeUret, odemeOdendi, odemeleriOdi, odemeGeriAl, odemeSil } from '@/app/actions/odeme'

export const dynamic = 'force-dynamic'

export default async function OdemePage() {
  await requireRoles(['patron', 'muhasebe'])

  const odemeler = await prisma.odeme.findMany({
    include: { isci: true, personel: true },
    orderBy: [{ durum: 'asc' }, { donem: 'desc' }, { createdAt: 'asc' }],
  })

  const donemler = Array.from(new Set(odemeler.map((o) => o.donem))).sort().reverse()
  const bekleyen = odemeler.filter((o) => o.durum === 'bekliyor')
  const toplamBekleyen = bekleyen.reduce((a, o) => a + Number(o.tutar), 0)
  const toplamOdenen = odemeler.filter((o) => o.durum === 'odendi').reduce((a, o) => a + Number(o.tutar), 0)

  const cariDonem = new Date().toISOString().slice(0, 7)

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Kutu label="Bekleyen Ödeme" value={tl(toplamBekleyen)} tone="text-amber-600" sub={`${num(bekleyen.length)} kayıt`} />
        <Kutu label="Ödenen" value={tl(toplamOdenen)} tone="text-emerald-600" sub="Toplam" />
        <Kutu label="Toplam Kayıt" value={num(odemeler.length)} tone="text-indigo-600" sub={`${num(donemler.length)} dönem`} />
      </div>

      <Card>
        <CardHeader
          title="Toplu Ödeme Üret"
          desc="İşçi hakediş netleri (avans düşülmüş) + personel maaşları — dönem bazlı, tekrarsız"
          action={
            <div className="flex flex-wrap items-center gap-2">
              <form action={odemeUret} className="flex items-center gap-2">
                <input name="donem" type="month" defaultValue={cariDonem} className="rounded-lg border border-slate-300 px-2.5 py-1.5 text-sm outline-none focus:border-indigo-500" />
                <Button type="submit" size="sm">Üret</Button>
              </form>
              <form action={odemeleriOdi}>
                <input type="hidden" name="donem" value="" />
                <Button variant="secondary" size="sm" type="submit">Tümünü Ödendi İşaretle</Button>
              </form>
              <a
                href="/api/export/odeme"
                className="inline-flex items-center gap-1.5 rounded-lg bg-white px-3 py-2 text-sm font-medium text-emerald-700 ring-1 ring-emerald-200 transition hover:bg-emerald-50"
              >
                <Icon name="excel" size={15} />
                Banka CSV
              </a>
            </div>
          }
        />
        <div className="overflow-x-auto">
          {odemeler.length === 0 ? (
            <EmptyState icon="wallet" title="Ödeme kaydı yok" desc="Yukarıdan dönem seçip üretin" />
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-100">
                  <Th>Kişi</Th>
                  <Th>Tip</Th>
                  <Th>IBAN</Th>
                  <Th className="text-right">Tutar</Th>
                  <Th>Dönem</Th>
                  <Th>Durum</Th>
                  <Th className="text-right">İşlem</Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {odemeler.map((o) => {
                  const ad = o.tip === 'isci' ? o.isci?.ad ?? '—' : o.personel?.ad ?? '—'
                  const iban = o.tip === 'isci' && o.isci ? maskIBAN(decrypt(o.isci.iban)) : o.personel ? maskIBAN(decrypt(o.personel.iban)) : '—'
                  return (
                    <tr key={o.id} className="hover:bg-slate-50/60">
                      <Td className="font-medium text-slate-900">{ad}</Td>
                      <Td>
                        <Badge tone={o.tip === 'isci' ? 'indigo' : 'violet'}>{o.tip === 'isci' ? 'İşçi' : 'Personel'}</Badge>
                      </Td>
                      <Td className="tabular-nums text-slate-500">{iban}</Td>
                      <Td className={`text-right font-semibold tabular-nums ${Number(o.tutar) < 0 ? 'text-red-600' : 'text-slate-900'}`}>{tl(o.tutar)}</Td>
                      <Td className="text-slate-500">{o.donem}</Td>
                      <Td>
                        <Badge tone={o.durum === 'odendi' ? 'green' : 'amber'}>{o.durum}</Badge>
                        {o.odemeTarihi && <div className="mt-0.5 text-[10px] text-slate-400">{date(o.odemeTarihi)}</div>}
                      </Td>
                      <Td className="text-right">
                        <div className="flex justify-end gap-1.5">
                          {o.durum === 'bekliyor' ? (
                            <form action={odemeOdendi}>
                              <input type="hidden" name="id" value={o.id} />
                              <Button variant="secondary" size="sm" type="submit">Ödendi</Button>
                            </form>
                          ) : (
                            <form action={odemeGeriAl}>
                              <input type="hidden" name="id" value={o.id} />
                              <Button variant="ghost" size="sm" type="submit" title="Bekliyora çevir">↺</Button>
                            </form>
                          )}
                          <form action={odemeSil}>
                            <input type="hidden" name="id" value={o.id} />
                            <button className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600" title="Sil">
                              <Icon name="x" size={14} />
                            </button>
                          </form>
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

function Kutu({ label, value, tone, sub }: { label: string; value: string; tone: string; sub?: string }) {
  return (
    <Card className="p-4">
      <div className="text-xs font-medium uppercase tracking-wide text-slate-400">{label}</div>
      <div className={`mt-1.5 text-xl font-semibold tabular-nums ${tone}`}>{value}</div>
      {sub && <div className="mt-1 text-xs text-slate-500">{sub}</div>}
    </Card>
  )
}