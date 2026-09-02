import { requireRoles } from '@/lib/dal'
import { prisma } from '@/lib/db'
import { tl, num, date } from '@/lib/format'
import { Card, CardHeader, StatCard, Th, Td, EmptyState } from '@/components/ui'
import { Icon } from '@/components/icons'
import { hakedisUret } from '@/app/actions/hakedis'

export const dynamic = 'force-dynamic'

export default async function HakedisPage() {
  await requireRoles(['patron', 'muhasebe'])

  const hakedisler = await prisma.hakedis.findMany({
    include: { isci: true, firma: true },
    orderBy: { donemBitis: 'desc' },
  })

  const toplamIsciNet = hakedisler.reduce((a, h) => a + Number(h.isciNet), 0)
  const toplamMusteri = hakedisler.reduce((a, h) => a + Number(h.musteriTutar), 0)
  const toplamMarj = hakedisler.reduce((a, h) => a + Number(h.marj), 0)
  const toplamGun = hakedisler.reduce((a, h) => a + h.gun, 0)

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard icon="hakedis" label="Toplam Hakediş" value={tl(toplamMusteri)} sub={`${num(toplamGun)} iş günü`} tone="indigo" />
        <StatCard icon="wallet" label="Brüt Marj" value={tl(toplamMarj)} sub="Müşteriden − (gün × yevmiye)" tone="green" />
        <StatCard icon="isci" label="İşçiye Ödenecek Net" value={tl(toplamIsciNet)} sub="Net = gün×yevmiye − avans − kesinti" tone="blue" />
        <StatCard icon="gider" label="Avans Kullanımı" value="—" sub={`${num(hakedisler.length)} hakediş kaydı`} tone="amber" />
      </div>

      <Card>
        <CardHeader
          title="Dönem Hakedişi Üret"
          desc="Tamamlanan atamalardan (puantajlı) otomatik hakediş oluşturur — meslek bazlı firma fiyatı kullanılır"
          action={
            <div className="flex flex-wrap items-end gap-2">
              <a
                href="/api/export/hakedis"
                className="inline-flex items-center gap-1.5 rounded-lg bg-white px-3 py-2 text-sm font-medium text-emerald-700 ring-1 ring-emerald-200 transition hover:bg-emerald-50"
              >
                <Icon name="excel" size={15} />
                Excel İcmal
              </a>
              <a
                href="/icmal/hakedis"
                className="inline-flex items-center gap-1.5 rounded-lg bg-white px-3 py-2 text-sm font-medium text-red-600 ring-1 ring-red-200 transition hover:bg-red-50"
              >
                <Icon name="pdf" size={15} />
                PDF İcmal
              </a>
              <form action={hakedisUret} className="flex items-end gap-2">
                <div>
                  <label className="mb-1 block text-[11px] font-medium text-slate-500">Başlangıç</label>
                  <input name="donemBas" type="date" required className="rounded-lg border border-slate-300 px-2.5 py-1.5 text-sm outline-none focus:border-indigo-500" />
                </div>
                <div>
                  <label className="mb-1 block text-[11px] font-medium text-slate-500">Bitiş</label>
                  <input name="donemBitis" type="date" required className="rounded-lg border border-slate-300 px-2.5 py-1.5 text-sm outline-none focus:border-indigo-500" />
                </div>
                <button type="submit" className="rounded-lg bg-indigo-600 px-3 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-indigo-500">
                  Üret
                </button>
              </form>
            </div>
          }
        />
        <div className="overflow-x-auto">
          {hakedisler.length === 0 ? (
            <EmptyState icon="hakedis" title="Hakediş kaydı yok" desc="Yukarıdan dönem seçip üretin; atamalar tamamlandı + puantajlı olduğunda otomatik oluşur" />
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-100">
                  <Th>Dönem</Th>
                  <Th>İşçi</Th>
                  <Th>Firma</Th>
                  <Th className="text-right">Gün</Th>
                  <Th className="text-right">Yevmiye</Th>
                  <Th className="text-right">Avans</Th>
                  <Th className="text-right">Kesinti</Th>
                  <Th className="text-right">İşçi Net</Th>
                  <Th className="text-right">Müşteri</Th>
                  <Th className="text-right">Marj</Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {hakedisler.map((h) => (
                  <tr key={h.id} className="hover:bg-slate-50/60">
                    <Td>{date(h.donemBas)} → {date(h.donemBitis)}</Td>
                    <Td className="font-medium text-slate-900">{h.isci.ad}</Td>
                    <Td>{h.firma.ad}</Td>
                    <Td className="text-right tabular-nums">{num(h.gun)}</Td>
                    <Td className="text-right tabular-nums">{tl(h.yevmiye)}</Td>
                    <Td className="text-right tabular-nums">{tl(h.avansToplam)}</Td>
                    <Td className="text-right tabular-nums">{tl(h.kesinti)}</Td>
                    <Td className="text-right font-medium tabular-nums text-slate-900">{tl(h.isciNet)}</Td>
                    <Td className="text-right tabular-nums">{tl(h.musteriTutar)}</Td>
                    <Td className={`text-right font-semibold tabular-nums ${Number(h.marj) >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                      {tl(h.marj)}
                    </Td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t border-slate-200 bg-slate-50/60">
                  <Td className="font-semibold" colSpan={3}>Toplam</Td>
                  <Td className="text-right font-semibold tabular-nums">{num(toplamGun)}</Td>
                  <Td colSpan={3}></Td>
                  <Td className="text-right font-semibold tabular-nums">{tl(toplamIsciNet)}</Td>
                  <Td className="text-right font-semibold tabular-nums">{tl(toplamMusteri)}</Td>
                  <Td className={`text-right font-bold tabular-nums ${toplamMarj >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                    {tl(toplamMarj)}
                  </Td>
                </tr>
              </tfoot>
            </table>
          )}
        </div>
      </Card>
    </div>
  )
}