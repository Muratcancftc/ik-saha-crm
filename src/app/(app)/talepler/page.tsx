import Link from 'next/link'
import { requireUser, requireRoles } from '@/lib/dal'
import { prisma } from '@/lib/db'
import { getTalepler, getTalepDetay } from '@/lib/queries'
import { dateLong, num } from '@/lib/format'
import { sameDay, startOfDay, daysUntil } from '@/lib/dates'
import { Card, CardHeader, Badge, EmptyState, Button } from '@/components/ui'
import { TalepBadge, AtamaBadge, PuantajBadge, AciliyetBadge } from '@/components/status-badge'
import { Icon } from '@/components/icons'
import { TalepForm } from './talep-form'
import { AtamaPaneli } from './atama-paneli'
import {
  updatePuantaj,
  sgkBildir,
  talepDurumDegistir,
  setAtamaDurum,
} from '@/app/actions/talep'
import { setAtamaDurumOtomatik } from '@/app/actions/hakedis'

export const dynamic = 'force-dynamic'

export default async function TaleplerPage({
  searchParams,
}: {
  searchParams: Promise<{ talep?: string }>
}) {
  const user = await requireUser()
  const isOperasyon = ['patron', 'operasyon'].includes(user.rol)
  await requireRoles(['patron', 'operasyon', 'saha_sorumlusu'])

  const sp = await searchParams
  const seciliId = Number(sp.talep) || 0

  const [talepler, secili, firmalar, meslekler] = await Promise.all([
    getTalepler(user),
    seciliId ? getTalepDetay(user, seciliId) : null,
    prisma.musteriFirma.findMany({ include: { lokasyonlar: true }, orderBy: { ad: 'asc' } }),
    prisma.meslek.findMany({ orderBy: { ad: 'asc' } }),
  ])

  const bugun = startOfDay()
  const bugunTalepler = talepler.filter((t) => sameDay(t.tarih, bugun))
  const gelecek = talepler.filter((t) => t.tarih >= bugun && !sameDay(t.tarih, bugun))
  const gecmis = talepler.filter((t) => t.tarih < bugun)

  return (
    <div className="flex flex-col gap-5 lg:flex-row lg:items-start">
      {/* Sol: talep listesi */}
      <div className="w-full shrink-0 space-y-4 lg:w-96">
        <div className="flex items-center justify-between">
          <p className="text-sm text-slate-500">{num(talepler.length)} talep</p>
          {isOperasyon && <TalepForm firmalar={firmalar} meslekler={meslekler} />}
        </div>

        <div className="space-y-4">
          <TalepListeGruplari title={`Bugün (${bugunTalepler.length})`} items={bugunTalepler} seciliId={seciliId} />
          <TalepListeGruplari title={`Gelecek (${gelecek.length})`} items={gelecek} seciliId={seciliId} />
          <TalepListeGruplari title={`Geçmiş (${gecmis.length})`} items={gecmis} seciliId={seciliId} />
        </div>
      </div>

      {/* Sağ: talep detayı */}
      <div className="min-w-0 flex-1">
        {!secili ? (
          <Card>
            <EmptyState icon="talep" title="Bir talep seçin" desc="Soldaki listeden bir talep seçerek atama ve puantaj işlemlerini yönetin" />
          </Card>
        ) : (
          <div className="space-y-5">
            {/* Talep başlığı */}
            <Card>
              <div className="flex flex-wrap items-start justify-between gap-3 px-5 py-4">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-base font-semibold text-slate-900">{secili.firma.ad}</h2>
                    <TalepBadge durum={secili.durum} />
                    <AciliyetBadge aciliyet={secili.aciliyet} />
                  </div>
                  <p className="mt-1 text-sm text-slate-500">
                    {secili.lokasyon.ad} · {dateLong(secili.tarih)} ·{' '}
                    {secili.vardiya === 'gunduz' ? 'Gündüz' : 'Gece'}
                    {daysUntil(secili.tarih) === 0 && <span className="text-indigo-600"> · Bugün</span>}
                    {secili.not && <span className="block text-xs text-slate-400">Not: {secili.not}</span>}
                  </p>
                </div>
                <div className="flex gap-2">
                  {secili.durum !== 'kapandi' ? (
                    <form action={talepDurumDegistir}>
                      <input type="hidden" name="id" value={secili.id} />
                      <input type="hidden" name="durum" value="kapandi" />
                      <Button variant="secondary" size="sm" type="submit">Talep Kapat</Button>
                    </form>
                  ) : (
                    <form action={talepDurumDegistir}>
                      <input type="hidden" name="id" value={secili.id} />
                      <input type="hidden" name="durum" value="acik" />
                      <Button variant="secondary" size="sm" type="submit">Tekrar Aç</Button>
                    </form>
                  )}
                </div>
              </div>
            </Card>

            {/* Kalemler + atama paneli */}
            <div className="space-y-4">
              {secili.kalemler.map((kalem) => {
                const atanan = secili.atamalar.filter((a) => a.durum !== 'iptal').length
                const toplamAdet = secili.kalemler.reduce((a, k) => a + k.adet, 0)
                const yuzde = Math.min(100, Math.round((atanan / Math.max(toplamAdet, 1)) * 100))
                return (
                  <Card key={kalem.id}>
                    <div className="px-5 py-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Badge tone="indigo">{kalem.meslek.ad}</Badge>
                          <span className="text-sm text-slate-500">
                            İstenen: <b className="text-slate-900">{kalem.adet}</b>
                          </span>
                        </div>
                        <span className="text-sm font-semibold tabular-nums text-slate-700">
                          {num(atanan)}/{num(toplamAdet)}
                        </span>
                      </div>
                      <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                        <div className={`h-full rounded-full ${yuzde >= 100 ? 'bg-emerald-500' : 'bg-indigo-500'}`} style={{ width: `${yuzde}%` }} />
                      </div>
                    </div>
                  </Card>
                )
              })}
            </div>

            {/* Atama yap */}
            {isOperasyon && secili.durum !== 'kapandi' && (
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-slate-900">Atama Yap</h3>
                {secili.kalemler.map((kalem) => (
                  <AtamaPaneli
                    key={kalem.id}
                    talepId={secili.id}
                    meslekId={kalem.meslekId}
                    meslekAd={kalem.meslek.ad}
                    tarih={dateLong(secili.tarih)}
                  />
                ))}
              </div>
            )}

            {/* Atanan işçiler + puantaj */}
            <Card>
              <CardHeader
                title={`Atanan İşçiler (${num(secili.atamalar.filter((a) => a.durum !== 'iptal').length)})`}
                desc="Puantaj durumu anında güncellenir"
              />
              {secili.atamalar.length === 0 ? (
                <EmptyState icon="isci" title="Henüz atama yok" />
              ) : (
                <ul className="divide-y divide-slate-100">
                  {secili.atamalar.map((a) => (
                    <li key={a.id} className="px-5 py-3.5">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="flex min-w-0 items-center gap-3">
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-indigo-50 text-xs font-semibold text-indigo-600">
                            {a.isci.ad.split(' ').map((p) => p[0]).slice(0, 2).join('')}
                          </div>
                          <div>
                            <div className="text-sm font-medium text-slate-900">{a.isci.ad}</div>
                            <div className="flex items-center gap-2 text-xs text-slate-500">
                              <AtamaBadge durum={a.durum} />
                              {a.puantaj ? <PuantajBadge durum={a.puantaj.durum} /> : <Badge tone="slate">Puantaj yok</Badge>}
                              {a.sgkBildirildi ? <Badge tone="green">SGK ✓</Badge> : <Badge tone="amber">SGK yok</Badge>}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          {/* Puantaj kontrolü (canlı) */}
                          <form action={updatePuantaj} className="flex overflow-hidden rounded-lg border border-slate-200">
                            <input type="hidden" name="atamaId" value={a.id} />
                            {(['geldi', 'gec', 'gelmedi', 'yarim'] as const).map((d) => {
                              const aktif = a.puantaj?.durum === d
                              return (
                                <button
                                  key={d}
                                  type="submit"
                                  name="durum"
                                  value={d}
                                  className={`px-2.5 py-1.5 text-xs font-medium transition ${
                                    aktif
                                      ? d === 'geldi'
                                        ? 'bg-emerald-500 text-white'
                                        : d === 'gec'
                                          ? 'bg-amber-500 text-white'
                                          : d === 'gelmedi'
                                            ? 'bg-red-500 text-white'
                                            : 'bg-sky-500 text-white'
                                      : 'bg-white text-slate-600 hover:bg-slate-50'
                                  }`}
                                  title={`${d} işaretle`}
                                >
                                  {d === 'geldi' ? 'Geldi' : d === 'gec' ? 'Geç' : d === 'gelmedi' ? 'Gelmedi' : 'Yarım'}
                                </button>
                              )
                            })}
                          </form>

                          {isOperasyon && !a.sgkBildirildi && (
                            <form action={sgkBildir}>
                              <input type="hidden" name="id" value={a.id} />
                              <Button variant="secondary" size="sm" type="submit" title="SGK bildirimi yapıldı işaretle">
                                SGK Bildir
                              </Button>
                            </form>
                          )}

                          {isOperasyon && a.durum !== 'tamamlandi' && a.durum !== 'iptal' && (
                            <form action={setAtamaDurumOtomatik}>
                              <input type="hidden" name="id" value={a.id} />
                              <input type="hidden" name="durum" value="tamamlandi" />
                              <Button variant="secondary" size="sm" type="submit" title="Hakedişi otomatik üretir">
                                Tamamla
                              </Button>
                            </form>
                          )}

                          {isOperasyon && a.durum !== 'iptal' && (
                            <form action={setAtamaDurum}>
                              <input type="hidden" name="id" value={a.id} />
                              <input type="hidden" name="durum" value="iptal" />
                              <Button variant="ghost" size="sm" type="submit" title="Atamayı iptal et">
                                <Icon name="x" size={14} />
                              </Button>
                            </form>
                          )}
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </div>
        )}
      </div>
    </div>
  )
}

function TalepListeGruplari({
  title,
  items,
  seciliId,
}: {
  title: string
  items: Array<{ id: number; firma: { ad: string }; lokasyon: { ad: string }; tarih: Date; durum: string; kalemler: Array<{ adet: number }>; atamalar: Array<{ durum: string }> }>
  seciliId: number
}) {
  if (items.length === 0) return null
  return (
    <div>
      <div className="px-1 pb-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-400">{title}</div>
      <div className="space-y-1.5">
        {items.map((t) => {
          const toplam = t.kalemler.reduce((a, k) => a + k.adet, 0)
          const atanan = t.atamalar.filter((a) => a.durum !== 'iptal').length
          return (
            <Link
              key={t.id}
              href={`/talepler?talep=${t.id}`}
              className={`block rounded-xl border px-4 py-3 transition ${
                seciliId === t.id ? 'border-indigo-500 bg-indigo-50/60 ring-2 ring-indigo-500/20' : 'border-slate-200 bg-white hover:border-slate-300'
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="truncate text-sm font-medium text-slate-900">{t.firma.ad}</span>
                <TalepBadge durum={t.durum} />
              </div>
              <div className="mt-1 flex items-center justify-between gap-2 text-xs text-slate-500">
                <span className="truncate">{t.lokasyon.ad} · {dateLong(t.tarih)}</span>
                <span className="tabular-nums">{atanan}/{toplam}</span>
              </div>
            </Link>
          )
        })}
      </div>
    </div>
  )
}