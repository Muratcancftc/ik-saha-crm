import { requireUser } from '@/lib/dal'
import { getDashboardRapor, getAylikTrend, getIsciKarlilik } from '@/lib/profil-queries'
import { getMaliVeri } from '@/lib/queries'
import { donemAralik, donemEtiket } from '@/lib/donem'
import { tl, num } from '@/lib/format'
import { Card, CardHeader, Badge, EmptyState } from '@/components/ui'
import { DonemSecici } from '@/components/donem-secici'
import { Icon } from '@/components/icons'
import Link from 'next/link'
import { PrintButton } from './print-button'

export const dynamic = 'force-dynamic'

export default async function RaporlarPage({
  searchParams,
}: {
  searchParams: Promise<{ donem?: string; bas?: string; bit?: string }>
}) {
  const user = await requireUser()
  const sp = await searchParams
  const donem = donemAralik(sp)

  const [rapor, trend, karlilik, mali] = await Promise.all([
    getDashboardRapor(user, donem.bas, donem.bit),
    getAylikTrend(),
    getIsciKarlilik(donem.bas, donem.bit),
    getMaliVeri(donem.bas, donem.bit),
  ])

  const maxTrend = Math.max(...trend.map((m) => Math.max(m.ciro, m.gider, 1)))
  const maxKarlilik = Math.max(...karlilik.map((k) => Math.abs(k.marj)), 1)

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-slate-900">Raporlar</h2>
        <div className="flex flex-col items-end gap-2">
          <DonemSecici />
          <div className="flex gap-2">
            <a
              href={`/api/export/rapor-isci?bas=${donem.bas.toISOString().slice(0, 10)}&bit=${donem.bit.toISOString().slice(0, 10)}`}
              className="inline-flex items-center gap-1.5 rounded-lg bg-white px-3 py-2 text-sm font-medium text-emerald-700 ring-1 ring-emerald-200 transition hover:bg-emerald-50"
            >
              <Icon name="excel" size={15} /> Excel
            </a>
            <PrintButton />
          </div>
        </div>
      </div>
      <p className="text-xs text-slate-400">{donemEtiket(donem)}</p>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        {/* Aylık trend */}
        <Card>
          <CardHeader title="Aylık Ciro – Gider – Net Kâr" desc="Son 6 ay" />
          <div className="px-5 py-4">
            <div className="flex h-44 items-end gap-3">
              {trend.map((m) => (
                <div key={m.etiket} className="flex flex-1 flex-col items-center gap-1">
                  <div className="flex w-full flex-1 items-end justify-center gap-1">
                    <div className="w-3 rounded-t bg-indigo-500" style={{ height: `${(m.ciro / maxTrend) * 100}%` }} title={`Ciro ${tl(m.ciro)}`} />
                    <div className="w-3 rounded-t bg-amber-400" style={{ height: `${(m.gider / maxTrend) * 100}%` }} title={`Gider ${tl(m.gider)}`} />
                    <div className="w-3 rounded-t bg-emerald-500" style={{ height: `${(Math.max(m.netKar, 0) / maxTrend) * 100}%` }} title={`Net ${tl(m.netKar)}`} />
                  </div>
                  <span className="text-[10px] text-slate-400">{m.etiket}</span>
                </div>
              ))}
            </div>
            <div className="mt-2 flex gap-3 text-[10px] text-slate-400">
              <span className="flex items-center gap-1"><span className="h-2 w-2 rounded bg-indigo-500" />Ciro</span>
              <span className="flex items-center gap-1"><span className="h-2 w-2 rounded bg-amber-400" />Gider</span>
              <span className="flex items-center gap-1"><span className="h-2 w-2 rounded bg-emerald-500" />Net</span>
            </div>
            <div className="mt-4 grid grid-cols-3 gap-3">
              <Mini label="Ciro" v={tl(mali.ciro)} tone="text-indigo-600" />
              <Mini label="Gider" v={tl(mali.genelGiderler + mali.personelBordroGider + mali.sahaIsciMaliyeti + mali.odenenVergi)} tone="text-amber-600" />
              <Mini label="Net Kâr" v={tl(mali.netKar)} tone={mali.netKar >= 0 ? 'text-emerald-600' : 'text-red-600'} />
            </div>
          </div>
        </Card>

        {/* Oranlar */}
        <Card>
          <CardHeader title="Oranlar" desc="Dönem bazlı" />
          <div className="grid grid-cols-2 gap-3 px-5 py-4">
            <Oran label="Devamsızlık / No-Show" deger={`%${num(rapor.devamsizlikOrani)}`} tone={rapor.devamsizlikOrani <= 10 ? 'text-emerald-600' : 'text-red-600'} sub={`${num(rapor.noshowToplam)}/${num(rapor.toplamAtama)} atama`} />
            <Oran label="Talep Doluluk" deger={`%${num(rapor.dolulukOrani)}`} tone={rapor.dolulukOrani >= 80 ? 'text-emerald-600' : 'text-amber-600'} sub="atanan / ihtiyaç" />
          </div>
          <div className="px-5 pb-4">
            <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">En Kârlı Firmalar</h4>
            {rapor.enKarliFirmalar.length === 0 ? (
              <p className="text-xs text-slate-400">Bu dönemde hakediş yok</p>
            ) : (
              <ul className="space-y-2">
                {rapor.enKarliFirmalar.map((f, i) => (
                  <li key={f.id} className="flex items-center justify-between text-sm">
                    <Link href={`/musteri-firmalar/${f.id}`} className="font-medium text-slate-700 hover:text-indigo-600">#{i + 1} {f.ad}</Link>
                    <span className="tabular-nums text-emerald-600">{tl(f.marj)}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </Card>

        {/* İşçi başına kârlılık */}
        <Card>
          <CardHeader title="İşçi Başına Kârlılık" desc="Hakediş marjı — dönem" />
          <div className="px-5 py-4">
            {karlilik.length === 0 ? (
              <EmptyState icon="hakedis" title="Bu dönemde veri yok" />
            ) : (
              <div className="space-y-2">
                {karlilik.slice(0, 12).map((k) => (
                  <div key={k.id} className="flex items-center gap-2">
                    <Link href={`/isci-havuzu/${k.id}`} className="w-36 truncate text-sm text-slate-700 hover:text-indigo-600">{k.ad}</Link>
                    <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
                      <div className={`h-full rounded-full ${k.marj >= 0 ? 'bg-emerald-500' : 'bg-red-400'}`} style={{ width: `${Math.min(100, Math.abs(k.marj / maxKarlilik) * 100)}%` }} />
                    </div>
                    <span className="w-24 text-right text-sm tabular-nums text-slate-600">{tl(k.marj)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Card>

        {/* En çok / az çalışan */}
        <Card>
          <CardHeader title="İşçi İstatistikleri" desc="Çalışılan gün — dönem" />
          <div className="grid grid-cols-2 gap-4 px-5 py-4">
            <div>
              <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">En Çok Çalışan</h4>
              <ul className="space-y-2">
                {rapor.enCokCalisan.map((i) => (
                  <li key={i.id} className="flex items-center justify-between text-sm">
                    <Link href={`/isci-havuzu/${i.id}`} className="font-medium text-slate-700 hover:text-indigo-600">{i.ad}</Link>
                    <span className="flex items-center gap-1.5">
                      <span className="tabular-nums text-slate-500">{i.gun} gün</span>
                      {i.noshow > 0 && <Badge tone="red">{i.noshow}</Badge>}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">En Az Çalışan</h4>
              <ul className="space-y-2">
                {rapor.enAzCalisan.map((i) => (
                  <li key={i.id} className="flex items-center justify-between text-sm">
                    <Link href={`/isci-havuzu/${i.id}`} className="font-medium text-slate-700 hover:text-indigo-600">{i.ad}</Link>
                    <span className="tabular-nums text-slate-500">{i.gun} gün</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </Card>
      </div>
    </div>
  )
}

function Mini({ label, v, tone }: { label: string; v: string; tone: string }) {
  return (
    <div className="rounded-xl bg-slate-50 px-3 py-2">
      <div className={`text-sm font-semibold tabular-nums ${tone}`}>{v}</div>
      <div className="text-[10px] font-medium uppercase tracking-wide text-slate-400">{label}</div>
    </div>
  )
}

function Oran({ label, deger, tone, sub }: { label: string; deger: string; tone: string; sub?: string }) {
  return (
    <div className="rounded-xl bg-slate-50 px-3 py-3">
      <div className={`text-xl font-semibold tabular-nums ${tone}`}>{deger}</div>
      <div className="text-[10px] font-medium uppercase tracking-wide text-slate-400">{label}</div>
      {sub && <div className="mt-0.5 text-[10px] text-slate-400">{sub}</div>}
    </div>
  )
}

