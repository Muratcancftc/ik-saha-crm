import { requireUser } from '@/lib/dal'
import { prisma } from '@/lib/db'
import { getMaliVeri } from '@/lib/queries'
import { tl, num, date } from '@/lib/format'
import { Card, CardHeader, StatCard, Th, Td, EmptyState } from '@/components/ui'
import { GiderKategoriLabel, GiderKategoriLabelBadge, GiderForm } from './gider-form'
import { silGider } from '@/app/actions/muhasebe'
import { Icon } from '@/components/icons'

export const dynamic = 'force-dynamic'

export default async function GelirGiderPage() {
  const user = await requireUser()
  const mali = await getMaliVeri(user)

  const giderler = await prisma.gider.findMany({ orderBy: { tarih: 'desc' } })
  const tahsilatlar = await prisma.tahsilat.findMany({
    include: { fatura: { include: { firma: true } } },
    orderBy: { tarih: 'desc' },
  })

  // Nakit akışı birleştir
  const akis = [
    ...tahsilatlar.map((t) => ({
      id: `t${t.id}`,
      tarih: t.tarih,
      tip: 'Tahsilat',
      detay: `${t.fatura.firma.ad} — ${t.fatura.no}`,
      tutar: Number(t.tutar),
      pozitif: true,
    })),
    ...giderler.map((g) => ({
      id: `g${g.id}`,
      tarih: g.tarih,
      tip: GiderKategoriLabel[g.kategori] ?? g.kategori,
      detay: g.aciklama ?? '',
      tutar: Number(g.tutar),
      pozitif: false,
    })),
  ].sort((a, b) => b.tarih.getTime() - a.tarih.getTime())

  const giren = akis.filter((a) => a.pozitif).reduce((s, a) => s + a.tutar, 0)
  const cikan = akis.filter((a) => !a.pozitif).reduce((s, a) => s + a.tutar, 0)

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard icon="wallet" label="Net Kâr" value={tl(mali.netKar)} sub="Gelir − (işçi + gider + bordro + vergi)" tone={mali.netKar >= 0 ? 'green' : 'red'} />
        <StatCard icon="hakedis" label="Brüt Marj" value={tl(mali.brütMarj)} sub="Müşteriden − gün×yevmiye (ayrı hesaplanır)" tone="indigo" />
        <StatCard icon="gider" label="Nakit Akışı" value={tl(giren - cikan)} sub={`Giren ${tl(giren)} · Çıkan ${tl(cikan)}`} tone="blue" />
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
        {/* Kârlılık dökümü */}
        <Card>
          <CardHeader title="Kârlılık Dökümü" desc="Toplam gelir ve maliyet kırılımı" />
          <div className="space-y-1 px-5 py-4">
            <DokumSatir label="Toplam Gelir (kesilen faturalar)" value={mali.ciro} pozitif />
            <DokumSatir label="Saha işçi maliyeti (gün × yevmiye)" value={-mali.sahaIsciMaliyeti} />
            <DokumSatir label="Personel bordro gideri" value={-mali.personelBordroGider} />
            <DokumSatir label="Genel giderler (kira/ulaşım/yakıt/sarf)" value={-mali.genelGiderler} />
            <DokumSatir label="Ödenen resmi ödemeler (vergi/SGK)" value={-mali.odenenVergi} />
            <div className="mt-3 flex items-center justify-between rounded-xl bg-indigo-50 px-3 py-2.5">
              <span className="text-sm font-semibold text-indigo-900">NET KÂR</span>
              <span className={`text-sm font-bold tabular-nums ${mali.netKar >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                {tl(mali.netKar)}
              </span>
            </div>
            <p className="pt-2 text-[11px] text-slate-400">
              Brüt marj (hakediş bazlı) ile net kâr ayrı gösterilir; net kâr resmi ödemeler ve genel giderleri de içerir.
            </p>
          </div>
        </Card>

        {/* Nakit akışı */}
        <Card>
          <CardHeader title="Nakit Akışı" desc="Son tahsilat ve ödemeler" />
          <div className="max-h-96 overflow-y-auto px-5 py-2">
            {akis.length === 0 ? (
              <EmptyState icon="wallet" title="Hareket yok" />
            ) : (
              <ul className="divide-y divide-slate-50">
                {akis.slice(0, 25).map((a) => (
                  <li key={a.id} className="flex items-center justify-between gap-3 py-2.5">
                    <div className="flex items-center gap-2.5">
                      <span className={`flex h-7 w-7 items-center justify-center rounded-lg ${a.pozitif ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-500'}`}>
                        <Icon name={a.pozitif ? 'wallet' : 'gider'} size={14} />
                      </span>
                      <div>
                        <div className="text-xs font-medium text-slate-800">{a.tip}</div>
                        <div className="text-[11px] text-slate-400">{a.detay} · {date(a.tarih)}</div>
                      </div>
                    </div>
                    <span className={`text-sm font-semibold tabular-nums ${a.pozitif ? 'text-emerald-600' : 'text-red-500'}`}>
                      {a.pozitif ? '+' : '−'}{tl(a.tutar)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </Card>
      </div>

      {/* Giderler */}
      <Card>
        <CardHeader
          title={`Gider Kalemleri (${num(giderler.length)})`}
          desc="Saha işçi yevmiye ve bordro dahil tüm giderler"
          action={<GiderForm />}
        />
        <div className="overflow-x-auto">
          {giderler.length === 0 ? (
            <EmptyState icon="gider" title="Gider kaydı yok" />
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-100">
                  <Th>Tarih</Th>
                  <Th>Kategori</Th>
                  <Th>Açıklama</Th>
                  <Th className="text-right">Tutar</Th>
                  <Th className="text-right">İşlem</Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {giderler.map((g) => (
                  <tr key={g.id} className="hover:bg-slate-50/60">
                    <Td>{date(g.tarih)}</Td>
                    <Td><GiderKategoriLabelBadge kategori={g.kategori} /></Td>
                    <Td className="text-slate-500">{g.aciklama ?? '—'}</Td>
                    <Td className="text-right tabular-nums">{tl(g.tutar)}</Td>
                    <Td className="text-right">
                      <form action={silGider}>
                        <input type="hidden" name="id" value={g.id} />
                        <button className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600" title="Sil">
                          <Icon name="x" size={14} />
                        </button>
                      </form>
                    </Td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </Card>
    </div>
  )
}

function DokumSatir({ label, value, pozitif }: { label: string; value: number; pozitif?: boolean }) {
  return (
    <div className="flex items-center justify-between py-1.5 text-sm">
      <span className="text-slate-600">{label}</span>
      <span className={`font-medium tabular-nums ${pozitif ? 'text-slate-900' : value > 0 ? 'text-red-600' : 'text-slate-700'}`}>
        {pozitif ? tl(value) : `−${tl(Math.abs(value))}`}
      </span>
    </div>
  )
}