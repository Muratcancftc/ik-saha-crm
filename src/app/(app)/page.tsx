import { requireUser } from '@/lib/dal'
import { getMaliVeri, getBugunAtamalar, getUyarilar, getAcilTalepler, getOperasyonOzeti } from '@/lib/queries'
import { getDashboardRapor, getAylikTrend } from '@/lib/profil-queries'
import { donemAralik, donemEtiket } from '@/lib/donem'
import { DonemSecici } from '@/components/donem-secici'
import Link from 'next/link'
import { tl, dateLong, num } from '@/lib/format'
import { daysUntil } from '@/lib/dates'
import { StatCard, Card, CardHeader, Badge } from '@/components/ui'
import { PuantajBadge, AtamaBadge, AciliyetBadge, TalepBadge } from '@/components/status-badge'
import { Icon } from '@/components/icons'

export const dynamic = 'force-dynamic'

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ donem?: string; bas?: string; bit?: string }>
}) {
  const user = await requireUser()
  const sp = await searchParams
  const donem = donemAralik(sp)

  const [mali, atamalar, uyarilar, talepler, ops, rapor, trend] = await Promise.all([
    getMaliVeri(),
    getBugunAtamalar(user),
    getUyarilar(user),
    getAcilTalepler(user),
    getOperasyonOzeti(user),
    getDashboardRapor(user, donem.bas, donem.bit),
    getAylikTrend(),
  ])

  const bugunAtamaSayisi = atamalar.length
  const geldiSayisi = atamalar.filter((a) => a.puantaj?.durum === 'geldi').length

  return (
    <div className="space-y-6">
      {/* Başlık */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold tracking-tight text-slate-900">
            Merhaba, {user.ad.split(' ')[0]} 👋
          </h2>
          <p className="mt-0.5 text-sm text-slate-500">{dateLong(new Date())}</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <DonemSecici />
          <Link
            href="/talepler"
            className="rounded-lg bg-indigo-600 px-3.5 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-indigo-500"
          >
            + Yeni Talep
          </Link>
          <Link
            href="/isci-havuzu"
            className="rounded-lg bg-white px-3.5 py-2 text-sm font-medium text-slate-700 ring-1 ring-slate-300 transition hover:bg-slate-50"
          >
            İşçi Havuzu
          </Link>
        </div>
      </div>

      {/* KPI */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          icon="wallet"
          label="Net Kâr"
          value={tl(mali.netKar)}
          sub={<span className="text-emerald-600">Brüt marj: {tl(mali.brütMarj)}</span>}
          tone="indigo"
        />
        <StatCard icon="fatura" label="Ciro (Kesilen Fatura)" value={tl(mali.ciro)} sub={`Tahsilat: ${tl(mali.tahsilat)}`} tone="blue" />
        <StatCard icon="gider" label="Alacak (Ödenmemiş)" value={tl(mali.alacak)} sub="Vadesi gelen faturaların toplamı" tone="amber" />
        <StatCard
          icon="puantaj"
          label="Bugünkü Atama"
          value={num(bugunAtamaSayisi)}
          sub={
            <>
              <span className="text-emerald-600">{num(geldiSayisi)} geldi</span> · {num(atamalar.length - geldiSayisi)} bekliyor
            </>
          }
          tone="green"
        />
      </div>

      {/* Operasyon özeti */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard
          icon="talep"
          label="Yarın İhtiyaç"
          value={`${num(ops.yarin.atanan)}/${num(ops.yarin.ihtiyac)}`}
          sub={
            <span className={ops.yarin.eksik > 0 ? 'text-red-600' : 'text-emerald-600'}>
              {num(ops.yarin.eksik)} kişi eksik
            </span>
          }
          tone="blue"
        />
        <StatCard
          icon="users"
          label="Açık Talepler"
          value={num(ops.acik.talepSayisi)}
          sub={
            <span className={ops.acik.eksik > 0 ? 'text-amber-600' : 'text-emerald-600'}>
              {num(ops.acik.adet)} ihtiyaç · {num(ops.acik.eksik)} eksik
            </span>
          }
          tone="amber"
        />
        <StatCard
          icon="belge"
          label="Belge Uyarısı"
          value={num(ops.belge.dolan + ops.belge.yaklasan)}
          sub={
            <span className="text-red-600">{num(ops.belge.dolan)} doldu</span>
          }
          tone="red"
        />
      </div>

      {/* Rapor bölümü */}
      <Card>
        <CardHeader
          title={`Dönem Raporu — ${donemEtiket(donem)}`}
          desc="Seçili döneme göre yeniden hesaplanır"
        />
        <div className="grid grid-cols-1 gap-5 px-5 py-4 lg:grid-cols-2">
          {/* Trend */}
          <div>
            <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">Aylık Ciro – Gider – Net Kâr</h4>
            <div className="flex h-40 items-end gap-3">
              {trend.map((m) => {
                const max = Math.max(...trend.map((x) => Math.max(x.ciro, x.gider, 1)))
                return (
                  <div key={m.etiket} className="flex flex-1 flex-col items-center gap-1">
                    <div className="flex w-full flex-1 items-end justify-center gap-1">
                      <div className="w-3 rounded-t bg-indigo-500" style={{ height: `${(m.ciro / max) * 100}%` }} title={`Ciro ${tl(m.ciro)}`} />
                      <div className="w-3 rounded-t bg-amber-400" style={{ height: `${(m.gider / max) * 100}%` }} title={`Gider ${tl(m.gider)}`} />
                      <div className="w-3 rounded-t bg-emerald-500" style={{ height: `${(Math.max(m.netKar, 0) / max) * 100}%` }} title={`Net ${tl(m.netKar)}`} />
                    </div>
                    <span className="text-[10px] text-slate-400">{m.etiket}</span>
                  </div>
                )
              })}
            </div>
            <div className="mt-1 flex gap-3 text-[10px] text-slate-400">
              <span className="flex items-center gap-1"><span className="h-2 w-2 rounded bg-indigo-500" />Ciro</span>
              <span className="flex items-center gap-1"><span className="h-2 w-2 rounded bg-amber-400" />Gider</span>
              <span className="flex items-center gap-1"><span className="h-2 w-2 rounded bg-emerald-500" />Net</span>
            </div>

            {/* Dönem oranları */}
            <div className="mt-4 grid grid-cols-2 gap-3">
              <OranKutu label="Devamsızlık Oranı" deger={`%${num(rapor.devamsizlikOrani)}`} tone={rapor.devamsizlikOrani <= 10 ? 'text-emerald-600' : 'text-red-600'} />
              <OranKutu label="Talep Doluluk Oranı" deger={`%${num(rapor.dolulukOrani)}`} tone={rapor.dolulukOrani >= 80 ? 'text-emerald-600' : 'text-amber-600'} />
            </div>
          </div>

          {/* En kârlı firmalar */}
          <div>
            <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">En Kârlı Firmalar (marj)</h4>
            {rapor.enKarliFirmalar.length === 0 ? (
              <p className="text-xs text-slate-400">Bu dönemde hakediş yok</p>
            ) : (
              <ul className="space-y-2">
                {rapor.enKarliFirmalar.map((f, i) => (
                  <li key={f.id} className="flex items-center justify-between text-sm">
                    <Link href={`/musteri-firmalar/${f.id}`} className="flex items-center gap-2 text-slate-700 hover:text-indigo-600">
                      <span className="w-5 text-xs text-slate-400">#{i + 1}</span>
                      <span className="font-medium">{f.ad}</span>
                    </Link>
                    <span className="tabular-nums text-emerald-600">{tl(f.marj)}</span>
                  </li>
                ))}
              </ul>
            )}

            <h4 className="mb-2 mt-5 text-xs font-semibold uppercase tracking-wide text-slate-400">En Çok Çalışan İşçiler</h4>
            {rapor.enCokCalisan.length === 0 ? (
              <p className="text-xs text-slate-400">Bu dönemde atama yok</p>
            ) : (
              <ul className="space-y-2">
                {rapor.enCokCalisan.map((i) => (
                  <li key={i.id} className="flex items-center justify-between text-sm">
                    <Link href={`/isci-havuzu/${i.id}`} className="font-medium text-slate-700 hover:text-indigo-600">{i.ad}</Link>
                    <span className="flex items-center gap-2">
                      <span className="tabular-nums text-slate-500">{i.gun} gün</span>
                      {i.noshow > 0 && <Badge tone="red">{i.noshow} no-show</Badge>}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        {/* Bugünkü atamalar */}
        <Card className="xl:col-span-2">
          <CardHeader
            title="Bugünkü Atamalar"
            desc="Sahada bugün çalışacak işçiler"
            action={<AtamaGosterge toplam={bugunAtamaSayisi} geldi={geldiSayisi} />}
          />
          {atamalar.length === 0 ? (
            <div className="flex flex-col items-center justify-center px-6 py-14 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
                <Icon name="puantaj" size={22} />
              </div>
              <p className="mt-4 text-sm font-medium text-slate-700">Bugün atama yok</p>
            </div>
          ) : (
            <ul className="divide-y divide-slate-100">
              {atamalar.map((a) => (
                <li key={a.id} className="flex items-center justify-between gap-3 px-5 py-3.5">
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-indigo-50 text-xs font-semibold text-indigo-600">
                      {a.isci.ad
                        .split(' ')
                        .map((p) => p[0])
                        .slice(0, 2)
                        .join('')}
                    </div>
                    <div className="min-w-0">
                      <div className="truncate text-sm font-medium text-slate-900">{a.isci.ad}</div>
                      <div className="truncate text-xs text-slate-500">
                        {a.talep.firma.ad} · {a.talep.lokasyon.ad}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {a.sgkBildirildi ? (
                      <Badge tone="green">SGK ✓</Badge>
                    ) : (
                      <Badge tone="amber">SGK bildirimi yok</Badge>
                    )}
                    {a.puantaj ? (
                      <PuantajBadge durum={a.puantaj.durum} />
                    ) : (
                      <AtamaBadge durum={a.durum} />
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>

        {/* Uyarılar */}
        <Card>
          <CardHeader title="Uyarılar" desc="Dikkat gerektirenler" />
          <div className="space-y-4 px-5 py-4">
            {uyarilar.suresiDolan.length > 0 && (
              <UyariBox tone="red" icon="alert" title={`${uyarilar.suresiDolan.length} belgenin süresi doldu`}>
                {uyarilar.suresiDolan.slice(0, 3).map((b) => (
                  <div key={b.id} className="text-xs text-slate-600">
                    <b>{b.isci.ad}</b> — {b.tip} · {Math.abs(daysUntil(b.bitisTarihi))} gün önce doldu
                  </div>
                ))}
              </UyariBox>
            )}
            {uyarilar.yaklasan.length > 0 && (
              <UyariBox tone="amber" icon="clock" title={`${uyarilar.yaklasan.length} belge 30 gün içinde doluyor`}>
                {uyarilar.yaklasan.slice(0, 3).map((b) => (
                  <div key={b.id} className="text-xs text-slate-600">
                    <b>{b.isci.ad}</b> — {b.tip} · {daysUntil(b.bitisTarihi)} gün kaldı
                  </div>
                ))}
              </UyariBox>
            )}
            {uyarilar.gecikenFaturalar.length > 0 && (
              <UyariBox tone="red" icon="fatura" title={`${uyarilar.gecikenFaturalar.length} gecikmiş fatura`}>
                {uyarilar.gecikenFaturalar.map((f) => (
                  <div key={f.id} className="text-xs text-slate-600">
                    <b>{f.no}</b> — {f.firma.ad} · {tl(f.genelToplam)}
                  </div>
                ))}
              </UyariBox>
            )}
            {uyarilar.sgkEksik.length > 0 && (
              <UyariBox tone="blue" icon="belge" title={`${uyarilar.sgkEksik.length} atamada SGK bildirimi eksik`}>
                {uyarilar.sgkEksik.map((a) => (
                  <div key={a.id} className="text-xs text-slate-600">
                    <b>{a.isci.ad}</b> — {a.talep.firma.ad} (işten 1 gün önce bildirim gerekir)
                  </div>
                ))}
              </UyariBox>
            )}
            {uyarilar.suresiDolan.length === 0 &&
              uyarilar.yaklasan.length === 0 &&
              uyarilar.gecikenFaturalar.length === 0 &&
              uyarilar.sgkEksik.length === 0 && (
                <div className="py-6 text-center text-xs text-slate-400">Her şey yolunda 🎉</div>
              )}
          </div>
        </Card>
      </div>

      {/* Açık talepler */}
      <Card>
        <CardHeader title="Açık Talepler" desc="Dolmayı bekleyen talepler" action={<Link href="/talepler" className="text-xs font-medium text-indigo-600 hover:underline">Tümünü gör</Link>} />
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-100">
                <th className="px-5 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500">Firma / Lokasyon</th>
                <th className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500">Tarih</th>
                <th className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500">Talep</th>
                <th className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500">Atama</th>
                <th className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500">Durum</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {talepler.map((t) => {
                const toplamAdet = t.kalemler.reduce((a, k) => a + k.adet, 0)
                const atanan = t.atamalar.filter((a) => a.durum !== 'iptal').length
                return (
                  <tr key={t.id}>
                    <td className="px-5 py-3 text-sm">
                      <div className="font-medium text-slate-900">{t.firma.ad}</div>
                      <div className="text-xs text-slate-500">{t.lokasyon.ad}</div>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-slate-700">{dateLong(t.tarih)}</td>
                    <td className="px-4 py-3 text-sm text-slate-700">
                      {t.kalemler.map((k) => `${k.meslek.ad} ×${k.adet}`).join(', ')}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm tabular-nums text-slate-700">{atanan}/{toplamAdet}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <AciliyetBadge aciliyet={t.aciliyet} />
                        <TalepBadge durum={t.durum} />
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}

function OranKutu({ label, deger, tone }: { label: string; deger: string; tone: string }) {
  return (
    <div className="rounded-xl bg-slate-50 px-3 py-2.5">
      <div className={`text-lg font-semibold tabular-nums ${tone}`}>{deger}</div>
      <div className="text-[10px] font-medium uppercase tracking-wide text-slate-400">{label}</div>
    </div>
  )
}

function AtamaGosterge({ toplam, geldi }: { toplam: number; geldi: number }) {
  const yuzde = toplam === 0 ? 0 : Math.round((geldi / toplam) * 100)
  return (
    <div className="text-right">
      <div className="text-xs font-medium text-slate-500">Devam: %{yuzde}</div>
      <div className="mt-1 h-1.5 w-24 overflow-hidden rounded-full bg-slate-100">
        <div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${yuzde}%` }} />
      </div>
    </div>
  )
}

function UyariBox({
  tone,
  icon,
  title,
  children,
}: {
  tone: 'red' | 'amber' | 'blue'
  icon: 'alert' | 'clock' | 'fatura' | 'belge'
  title: string
  children: React.ReactNode
}) {
  const tones = {
    red: 'text-red-500',
    amber: 'text-amber-500',
    blue: 'text-sky-500',
  }
  const bg = {
    red: 'bg-red-50',
    amber: 'bg-amber-50',
    blue: 'bg-sky-50',
  }
  return (
    <div className={`rounded-xl ${bg[tone]} p-3`}>
      <div className="flex items-center gap-2 text-xs font-semibold text-slate-800">
        <span className={tones[tone]}>
          <Icon name={icon} size={14} />
        </span>
        {title}
      </div>
      <div className="mt-2 space-y-1.5">{children}</div>
    </div>
  )
}