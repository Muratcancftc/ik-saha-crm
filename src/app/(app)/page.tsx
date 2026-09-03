import { requireUser } from '@/lib/dal'
import { prisma } from '@/lib/db'
import { getMaliVeri, getBugunAtamalar, getUyarilar, getAcilTalepler, getOperasyonOzeti } from '@/lib/queries'
import { getDashboardRapor, getAylikTrend } from '@/lib/profil-queries'
import { donemAralik, donemEtiket } from '@/lib/donem'
import { DonemSecici } from '@/components/donem-secici'
import { Suspense } from 'react'
import Link from 'next/link'
import { tl, dateLong, num } from '@/lib/format'
import { daysUntil } from '@/lib/dates'
import { StatCard, Card, CardHeader, Badge, EmptyState } from '@/components/ui'
import { PuantajBadge, AtamaBadge, AciliyetBadge, TalepBadge } from '@/components/status-badge'
import { Icon } from '@/components/icons'

export const dynamic = 'force-dynamic'

const compactTL = new Intl.NumberFormat('tr-TR', { notation: 'compact', maximumFractionDigits: 1 })

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ donem?: string; bas?: string; bit?: string }>
}) {
  const user = await requireUser()
  const sp = await searchParams
  const donem = donemAralik(sp)

  const [mali, atamalar, uyarilar, talepler, ops, rapor, trend, aktifIsci] = await Promise.all([
    getMaliVeri(donem.bas, donem.bit),
    getBugunAtamalar(user),
    getUyarilar(user),
    getAcilTalepler(user),
    getOperasyonOzeti(user),
    getDashboardRapor(user, donem.bas, donem.bit),
    getAylikTrend(),
    prisma.isci.count({ where: { durum: 'aktif' } }),
  ])

  const bugunAtamaSayisi = atamalar.length
  const geldiSayisi = atamalar.filter((a) => a.puantaj?.durum === 'geldi').length

  return (
    <div className="space-y-6">
      {/* Üst bar */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold tracking-tight text-slate-900">Kontrol Paneli</h2>
          <p className="mt-0.5 text-sm text-slate-500">{dateLong(new Date())}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Suspense fallback={null}><DonemSecici /></Suspense>
          <span className="mx-1 hidden h-6 w-px bg-slate-200 sm:block" />
          <Link
            href="/talepler"
            className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3.5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-500"
          >
            <Icon name="plus" size={16} />
            Yeni Talep
          </Link>
          <Link
            href="/isci-havuzu"
            className="inline-flex items-center gap-1.5 rounded-lg bg-white px-3.5 py-2 text-sm font-medium text-slate-700 ring-1 ring-slate-300 transition hover:bg-slate-50"
          >
            <Icon name="isci" size={16} />
            İşçi Havuzu
          </Link>
        </div>
      </div>

      {/* KPI — 8 kart, 2/3/4 sütun, dengeli (saha_sorumlusu: mali veri görmez) */}
      {user.rol === 'saha_sorumlusu' ? (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4">
          <StatCard icon="puantaj" label="Bugünkü Atama" value={num(bugunAtamaSayisi)} valueTone="neutral" sub={<span><b className="text-emerald-600">{num(geldiSayisi)}</b> geldi · {num(atamalar.length - geldiSayisi)} bekliyor</span>} tone="blue" />
          <StatCard icon="talep" label="Yarın İhtiyaç" value={`${num(ops.yarin.atanan)}/${num(ops.yarin.ihtiyac)}`} valueTone={ops.yarin.eksik > 0 ? 'amber' : 'green'} sub={<span>{num(ops.yarin.eksik)} kişi eksik</span>} tone="blue" />
          <StatCard icon="users" label="Açık Talepler" value={num(ops.acik.talepSayisi)} valueTone="amber" sub={`${num(ops.acik.adet)} ihtiyaç · ${num(ops.acik.eksik)} eksik`} tone="amber" />
          <StatCard icon="belge" label="Belge Uyarısı" value={num(ops.belge.dolan + ops.belge.yaklasan)} valueTone="red" sub={<span><b className="text-rose-600">{num(ops.belge.dolan)}</b> doldu · {num(ops.belge.yaklasan)} yakın</span>} tone="red" />
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4">
        <StatCard
          icon="wallet"
          label="Net Kâr"
          value={tl(mali.netKar)}
          valueTone={mali.netKar >= 0 ? 'green' : 'red'}
          sub={<span>Brüt marj: <b className="text-emerald-600">{tl(mali.brütMarj)}</b></span>}
          tone="indigo"
        />
        <StatCard icon="fatura" label="Ciro" value={tl(mali.ciro)} valueTone="neutral" sub={`Tahsilat: ${tl(mali.tahsilat)}`} tone="slate" />
        <StatCard
          icon="gider"
          label="Alacak"
          value={tl(mali.alacak)}
          valueTone={mali.alacak > 0 ? 'amber' : 'green'}
          sub="ödenmemiş faturalar"
          tone="amber"
        />
        <StatCard
          icon="puantaj"
          label="Bugünkü Atama"
          value={num(bugunAtamaSayisi)}
          valueTone="neutral"
          sub={<span><b className="text-emerald-600">{num(geldiSayisi)}</b> geldi · {num(atamalar.length - geldiSayisi)} bekliyor</span>}
          tone="blue"
        />
        <StatCard
          icon="talep"
          label="Yarın İhtiyaç"
          value={`${num(ops.yarin.atanan)}/${num(ops.yarin.ihtiyac)}`}
          valueTone={ops.yarin.eksik > 0 ? 'amber' : 'green'}
          sub={<span>{num(ops.yarin.eksik)} kişi eksik</span>}
          tone="blue"
        />
        <StatCard
          icon="users"
          label="Açık Talepler"
          value={num(ops.acik.talepSayisi)}
          valueTone="amber"
          sub={`${num(ops.acik.adet)} ihtiyaç · ${num(ops.acik.eksik)} eksik`}
          tone="amber"
        />
        <StatCard
          icon="belge"
          label="Belge Uyarısı"
          value={num(ops.belge.dolan + ops.belge.yaklasan)}
          valueTone="red"
          sub={<span><b className="text-rose-600">{num(ops.belge.dolan)}</b> doldu · {num(ops.belge.yaklasan)} yakın</span>}
          tone="red"
        />
        <StatCard icon="isci" label="Aktif İşçi" value={num(aktifIsci)} valueTone="neutral" sub="havuzda" tone="violet" />
      </div>
      )}

      {/* Dönem raporu (saha_sorumlusu görmez) */}
      {user.rol !== 'saha_sorumlusu' && (
      <Card>
        <CardHeader title="Dönem Raporu" desc={`${donemEtiket(donem)} — seçili döneme göre hesaplanır`} />
        <div className="grid grid-cols-1 gap-6 px-5 py-5 lg:grid-cols-2">
          {/* Trend grafiği */}
          <div>
            <h4 className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-400">Aylık Ciro – Gider – Net Kâr</h4>
            <TrendChart trend={trend} />
            <div className="mt-2 flex gap-4 text-[10px] text-slate-400">
              <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-sm bg-indigo-500" />Ciro</span>
              <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-sm bg-amber-400" />Gider</span>
              <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-sm bg-emerald-500" />Net</span>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <OranKutu label="Devamsızlık Oranı" deger={`%${num(rapor.devamsizlikOrani)}`} tone={rapor.devamsizlikOrani <= 10 ? 'text-emerald-700' : 'text-rose-700'} />
              <OranKutu label="Talep Doluluk Oranı" deger={`%${num(rapor.dolulukOrani)}`} tone={rapor.dolulukOrani >= 80 ? 'text-emerald-700' : 'text-amber-700'} />
            </div>
          </div>

          {/* En kârlı firmalar + işçiler */}
          <div>
            <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">En Kârlı Firmalar</h4>
            {rapor.enKarliFirmalar.length === 0 ? (
              <p className="rounded-xl bg-slate-50 px-3 py-4 text-xs text-slate-400">Bu dönemde hakediş yok</p>
            ) : (
              <ul className="space-y-1.5">
                {rapor.enKarliFirmalar.map((f, i) => (
                  <li key={f.id} className="flex items-center justify-between rounded-xl px-2 py-1.5 transition hover:bg-slate-50">
                    <Link href={`/musteri-firmalar/${f.id}`} className="flex items-center gap-2 text-sm text-slate-700 hover:text-indigo-600">
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-100 text-[10px] font-bold text-slate-500">{i + 1}</span>
                      <span className="font-medium">{f.ad}</span>
                    </Link>
                    <span className="text-sm font-semibold tabular-nums text-emerald-700">{tl(f.marj)}</span>
                  </li>
                ))}
              </ul>
            )}

            <h4 className="mb-2 mt-5 text-xs font-semibold uppercase tracking-wide text-slate-400">En Çok Çalışan İşçiler</h4>
            {rapor.enCokCalisan.length === 0 ? (
              <p className="rounded-xl bg-slate-50 px-3 py-4 text-xs text-slate-400">Bu dönemde atama yok</p>
            ) : (
              <ul className="space-y-1.5">
                {rapor.enCokCalisan.map((i) => (
                  <li key={i.id} className="flex items-center justify-between rounded-xl px-2 py-1.5 transition hover:bg-slate-50">
                    <Link href={`/isci-havuzu/${i.id}`} className="text-sm font-medium text-slate-700 hover:text-indigo-600">{i.ad}</Link>
                    <span className="flex items-center gap-2">
                      <span className="text-sm tabular-nums text-slate-500">{i.gun} gün</span>
                      {i.noshow > 0 && <Badge tone="red">{i.noshow} no-show</Badge>}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </Card>
      )}

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
        {/* Bugünkü atamalar */}
        <Card className="xl:col-span-2">
          <CardHeader
            title="Bugünkü Atamalar"
            desc="Sahada bugün çalışacak işçiler"
            action={<AtamaGosterge toplam={bugunAtamaSayisi} geldi={geldiSayisi} />}
          />
          {atamalar.length === 0 ? (
            <EmptyState icon="puantaj" title="Bugün atama yok" />
          ) : (
            <ul className="divide-y divide-slate-100">
              {atamalar.map((a) => (
                <li key={a.id} className="flex items-center justify-between gap-3 px-5 py-3.5">
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-indigo-50 text-xs font-semibold text-indigo-600">
                      {a.isci.ad.split(' ').map((p) => p[0]).slice(0, 2).join('')}
                    </div>
                    <div className="min-w-0">
                      <Link href={`/isci-havuzu/${a.isci.id}`} className="truncate text-sm font-medium text-slate-900 hover:text-indigo-600">{a.isci.ad}</Link>
                      <div className="truncate text-xs text-slate-500">
                        {a.talep.firma.ad} · {a.talep.lokasyon.ad}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {a.sgkBildirildi ? <Badge tone="green">SGK ✓</Badge> : <Badge tone="amber">SGK yok</Badge>}
                    {a.puantaj ? <PuantajBadge durum={a.puantaj.durum} /> : <AtamaBadge durum={a.durum} />}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>

        {/* Uyarılar */}
        <Card>
          <CardHeader title="Uyarılar" desc="Dikkat gerektirenler" />
          <div className="space-y-3 px-4 py-4">
            {uyarilar.suresiDolan.length > 0 && (
              <UyariBox tone="red" icon="alert" title={`${uyarilar.suresiDolan.length} belgenin süresi doldu`}>
                {uyarilar.suresiDolan.slice(0, 3).map((b) => (
                  <div key={b.id} className="text-xs text-slate-600">
                    <b>{b.isci.ad}</b> — {b.tip} · {Math.abs(daysUntil(b.bitisTarihi))} gün önce
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
                    <b>{a.isci.ad}</b> — {a.talep.firma.ad} (1 gün önce bildirim gerekir)
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
          {talepler.length === 0 ? (
            <EmptyState icon="talep" title="Açık talep yok" />
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500">Firma / Lokasyon</th>
                  <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500">Tarih</th>
                  <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500">Talep</th>
                  <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500">Atama</th>
                  <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500">Durum</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {talepler.map((t) => {
                  const toplamAdet = t.kalemler.reduce((a, k) => a + k.adet, 0)
                  const atanan = t.atamalar.filter((a) => a.durum !== 'iptal').length
                  return (
                    <tr key={t.id} className="hover:bg-slate-50/60">
                      <td className="px-5 py-3 text-sm">
                        <div className="font-medium text-slate-900">{t.firma.ad}</div>
                        <div className="text-xs text-slate-500">{t.lokasyon.ad}</div>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-sm text-slate-700">{dateLong(t.tarih)}</td>
                      <td className="px-4 py-3 text-sm text-slate-700">{t.kalemler.map((k) => `${k.meslek.ad} ×${k.adet}`).join(', ')}</td>
                      <td className="whitespace-nowrap px-4 py-3 text-sm tabular-nums text-slate-700">{atanan}/{toplamAdet}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <AciliyetBadge aciliyet={t.aciliyet} />
                          {atanan > toplamAdet ? <Badge tone="violet">Aşım</Badge> : <TalepBadge durum={t.durum} />}
                        </div>
                      </td>
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

// ---- Eksenli mini bar grafiği ----
function TrendChart({ trend }: { trend: Array<{ etiket: string; ciro: number; gider: number; netKar: number }> }) {
  const max = Math.max(...trend.map((m) => Math.max(m.ciro, m.gider, 0)), 1)
  const bos = trend.every((m) => m.ciro === 0 && m.gider === 0)

  if (bos) {
    return (
      <div className="flex h-48 flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 text-center">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-400">
          <Icon name="gider" size={20} />
        </div>
        <p className="mt-2 text-xs font-medium text-slate-500">Veri bulunamadı</p>
        <p className="mt-0.5 text-[11px] text-slate-400">Bu dönem için fatura veya gider kaydı yok.</p>
      </div>
    )
  }

  const grid = [1, 0.75, 0.5, 0.25, 0]
  return (
    <div>
      {/* Grafik alanı */}
      <div className="relative h-48">
        {/* yatay ızgara + y ekseni */}
        {grid.map((f) => (
          <div key={f} className="absolute inset-x-0 top-0 border-t border-slate-100" style={{ top: `${(1 - f) * 100}%` }}>
            <span className="absolute -top-2 left-0 -translate-x-1 text-[10px] tabular-nums text-slate-400">
              {compactTL.format(max * f)}
            </span>
          </div>
        ))}
        {/* çubuklar */}
        <div className="absolute inset-y-0 left-10 right-0 flex items-end gap-2">
          {trend.map((m) => (
            <div key={m.etiket} className="flex flex-1 flex-col items-center justify-end gap-1">
              <div className="flex w-full items-end justify-center gap-1">
                <div className="w-3 rounded-t-sm bg-indigo-500" style={{ height: `${Math.max((m.ciro / max) * 100, 2)}%` }} title={`Ciro ${tl(m.ciro)}`} />
                <div className="w-3 rounded-t-sm bg-amber-400" style={{ height: `${Math.max((m.gider / max) * 100, 2)}%` }} title={`Gider ${tl(m.gider)}`} />
                <div className="w-3 rounded-t-sm bg-emerald-500" style={{ height: `${Math.max((Math.max(m.netKar, 0) / max) * 100, 2)}%` }} title={`Net ${tl(m.netKar)}`} />
              </div>
            </div>
          ))}
        </div>
      </div>
      {/* x ekseni */}
      <div className="mt-1 flex gap-2 pl-10">
        {trend.map((m) => (
          <span key={m.etiket} className="flex-1 text-center text-[10px] text-slate-400">{m.etiket}</span>
        ))}
      </div>
    </div>
  )
}

function OranKutu({ label, deger, tone }: { label: string; deger: string; tone: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5">
      <div className={`text-xl font-bold tabular-nums ${tone}`}>{deger}</div>
      <div className="mt-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-400">{label}</div>
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
    red: { text: 'text-rose-600', bg: 'bg-rose-50', ring: 'ring-rose-100' },
    amber: { text: 'text-amber-600', bg: 'bg-amber-50', ring: 'ring-amber-100' },
    blue: { text: 'text-sky-600', bg: 'bg-sky-50', ring: 'ring-sky-100' },
  }
  const t = tones[tone]
  return (
    <div className={`rounded-xl ${t.bg} p-3 ring-1 ${t.ring}`}>
      <div className="flex items-center gap-2 text-xs font-semibold text-slate-800">
        <span className={t.text}><Icon name={icon} size={14} /></span>
        {title}
      </div>
      <div className="mt-2 space-y-1.5">{children}</div>
    </div>
  )
}