import Link from 'next/link'
import { requireRoles } from '@/lib/dal'
import { prisma } from '@/lib/db'
import { parseLocalDate } from '@/lib/donem'
import { Card, CardHeader, Th, Td, EmptyState } from '@/components/ui'
import { tl, yuvarla } from '@/lib/ik'
import { PrintButton } from '../hakedis/yazdir/print-button'

export const dynamic = 'force-dynamic'

const AYLAR = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık']
function iso(d: Date) { return d.toISOString().slice(0, 10) }

export default async function IkRaporlarPage({
  searchParams,
}: {
  searchParams: Promise<{ ay?: string }>
}) {
  await requireRoles(['patron', 'muhasebe', 'ik', 'operasyon'])
  const sp = await searchParams
  const ayBas = sp.ay ? parseLocalDate(`${sp.ay}-01`) : new Date(new Date().getFullYear(), new Date().getMonth(), 1)
  const ayBit = new Date(ayBas.getFullYear(), ayBas.getMonth() + 1, 1)
  const ayEtiket = `${AYLAR[ayBas.getMonth()]} ${ayBas.getFullYear()}`

  const firmalar = await prisma.musteriFirma.findMany({ orderBy: { ad: 'asc' } })

  const firmaRapor = await Promise.all(
    firmalar.map(async (f) => {
      const personel = await prisma.isci.findMany({ where: { firmaId: f.id, durum: 'aktif' }, select: { id: true } })
      const puantajlar = await prisma.puantajKayit.findMany({
        where: { firmaId: f.id, tarih: { gte: ayBas, lt: ayBit } },
        select: { isciId: true, hesaplananTutar: true },
      })
      const brut = yuvarla(puantajlar.reduce((a, p) => a + Number(p.hesaplananTutar), 0))
      const gun = puantajlar.length
      const donemler = await prisma.odemeDonemi.findMany({ where: { firmaId: f.id, baslangic: ayBas, bitis: ayBit }, include: { odemeler: true } })
      const odenen = yuvarla(donemler.reduce((a, d) => a + d.odemeler.reduce((x, o) => x + Number(o.tutar), 0), 0))
      const net = yuvarla(donemler.reduce((a, d) => a + Number(d.netOdenecek), 0)) || brut
      return { firma: f, personelSayisi: personel.length, gun, brut, net, odenen, bekleyen: Math.max(0, net - odenen) }
    })
  )

  // Ödeme yöntemi dağılımı
  const odemeler = await prisma.odemeKayit.findMany({
    where: { tarih: { gte: ayBas, lt: ayBit } },
  })
  const elden = odemeler.filter((o) => o.yontem === 'ELDEN')
  const iban = odemeler.filter((o) => o.yontem === 'IBAN')
  const eldenTutar = yuvarla(elden.reduce((a, o) => a + Number(o.tutar), 0))
  const ibanTutar = yuvarla(iban.reduce((a, o) => a + Number(o.tutar), 0))

  // Bekleyen ödemeler
  const bekleyenDonemler = await prisma.odemeDonemi.findMany({
    where: { baslangic: ayBas, bitis: ayBit, durum: { not: 'ODENDI' } },
    include: { isci: true, firma: true, odemeler: true },
    orderBy: { netOdenecek: 'desc' },
  })

  const toplamBrut = firmaRapor.reduce((a, r) => a + r.brut, 0)
  const toplamOdenen = firmaRapor.reduce((a, r) => a + r.odenen, 0)
  const toplamBekleyen = firmaRapor.reduce((a, r) => a + r.bekleyen, 0)

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold tracking-tight text-slate-900">İK Raporları</h2>
          <p className="mt-0.5 text-sm text-slate-500">{ayEtiket} · firma maliyeti, ödeme yöntemi dağılımı, bekleyen ödemeler</p>
        </div>
        <div className="flex flex-wrap items-center gap-2 print:hidden">
          <form method="get">
            <input name="ay" type="month" defaultValue={`${ayBas.getFullYear()}-${String(ayBas.getMonth() + 1).padStart(2, '0')}`} className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500" />
            <button className="ml-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500">Git</button>
          </form>
          <a
            href={`/api/export/ik-rapor?bas=${iso(ayBas)}&bit=${iso(new Date(ayBit.getTime() - 86400000))}`}
            className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3.5 py-2 text-sm font-medium text-white hover:bg-emerald-500"
          >
            Excel (CSV)
          </a>
          <PrintButton />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Ozet label="Toplam Brüt" value={tl(yuvarla(toplamBrut))} tone="text-slate-900" bg="bg-slate-50" />
        <Ozet label="Ödenen" value={tl(yuvarla(toplamOdenen))} tone="text-emerald-700" bg="bg-emerald-50" />
        <Ozet label="Bekleyen" value={tl(yuvarla(toplamBekleyen))} tone="text-amber-700" bg="bg-amber-50" />
        <Ozet label="Ödeme Kaydı" value={`${odemeler.length}`} tone="text-indigo-600" bg="bg-indigo-50" />
      </div>

      <Card>
        <CardHeader title="Firma Bazlı Aylık Personel Maliyeti" desc="Dönem brüt / net / ödenen / bekleyen" />
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-100">
                <Th>Firma</Th>
                <Th className="text-right">Personel</Th>
                <Th className="text-right">Puantaj Günü</Th>
                <Th className="text-right">Brüt</Th>
                <Th className="text-right">Net</Th>
                <Th className="text-right">Ödenen</Th>
                <Th className="text-right">Bekleyen</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {firmaRapor.map((r) => (
                <tr key={r.firma.id} className="hover:bg-slate-50/60">
                  <Td className="font-medium text-slate-900">{r.firma.ad}</Td>
                  <Td className="text-right tabular-nums">{r.personelSayisi}</Td>
                  <Td className="text-right tabular-nums">{r.gun}</Td>
                  <Td className="text-right tabular-nums">{tl(r.brut)}</Td>
                  <Td className="text-right tabular-nums">{tl(r.net)}</Td>
                  <Td className="text-right tabular-nums text-emerald-700">{tl(r.odenen)}</Td>
                  <Td className="text-right tabular-nums text-amber-700">{tl(r.bekleyen)}</Td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
        <Card>
          <CardHeader title="Ödeme Yöntemi Dağılımı" desc="Elden (Zarf) vs IBAN" />
          <div className="grid grid-cols-2 gap-4 px-5 py-5">
            <div className="rounded-xl bg-amber-50 p-4">
              <div className="text-xs font-semibold uppercase text-amber-700">Elden (Zarf)</div>
              <div className="mt-1 text-2xl font-bold tabular-nums text-amber-800">{tl(eldenTutar)}</div>
              <div className="text-xs text-amber-600">{elden.length} ödeme</div>
            </div>
            <div className="rounded-xl bg-sky-50 p-4">
              <div className="text-xs font-semibold uppercase text-sky-700">IBAN (Havale)</div>
              <div className="mt-1 text-2xl font-bold tabular-nums text-sky-800">{tl(ibanTutar)}</div>
              <div className="text-xs text-sky-600">{iban.length} ödeme</div>
            </div>
          </div>
        </Card>

        <Card>
          <CardHeader title={`Bekleyen Ödemeler (${bekleyenDonemler.length})`} desc="Ödenmemiş / kısmi dönemler" />
          <div className="overflow-x-auto">
            {bekleyenDonemler.length === 0 ? (
              <EmptyState icon="check" title="Bekleyen ödeme yok" />
            ) : (
              <ul className="divide-y divide-slate-50 px-5">
                {bekleyenDonemler.map((d) => {
                  const odenen = yuvarla(d.odemeler.reduce((a, o) => a + Number(o.tutar), 0))
                  return (
                    <li key={d.id} className="flex items-center justify-between py-2.5 text-sm">
                      <div>
                        <div className="font-medium text-slate-800">{d.isci.ad}</div>
                        <div className="text-xs text-slate-400">{d.firma.ad}</div>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold tabular-nums text-amber-700">{tl(yuvarla(Number(d.netOdenecek) - odenen))}</div>
                        <Link href={`/ik/hakedis?firma=${d.firmaId}&ay=${d.baslangic.getFullYear()}-${String(d.baslangic.getMonth() + 1).padStart(2, '0')}`} className="text-[11px] text-indigo-600 hover:underline print:hidden">
                          Ödemeye git →
                        </Link>
                      </div>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>
        </Card>
      </div>
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