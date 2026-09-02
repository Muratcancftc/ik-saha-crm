import Link from 'next/link'
import { requireUser, requireRoles } from '@/lib/dal'
import { prisma } from '@/lib/db'
import { getTaleplerFiltreli, getTalepDetay } from '@/lib/queries'
import { dateLong, num } from '@/lib/format'
import { sameDay, startOfDay, daysUntil } from '@/lib/dates'
import { Card, CardHeader, Badge, EmptyState, Button } from '@/components/ui'
import { TalepBadge, AtamaBadge, PuantajBadge, AciliyetBadge } from '@/components/status-badge'
import { Icon } from '@/components/icons'
import { TalepForm } from './talep-form'
import { AtamaPaneli } from './atama-paneli'
import { YerineBul } from './yerine-bul'
import {
  updatePuantaj,
  sgkBildir,
  talepDurumDegistir,
  cikarAtama,
  sablonYap,
  sablonSil,
  talepKopyala,
} from '@/app/actions/talep'
import { bildirimGonder } from '@/app/actions/belge'
import { setAtamaDurumOtomatik } from '@/app/actions/hakedis'

export const dynamic = 'force-dynamic'

const GCEMIS_LIMIT = 12

export default async function TaleplerPage({
  searchParams,
}: {
  searchParams: Promise<{
    talep?: string
    durum?: string
    firma?: string
    tarihBas?: string
    tarihBit?: string
    eksik?: string
    sablon?: string
    g?: string
  }>
}) {
  const user = await requireUser()
  const isOperasyon = ['patron', 'operasyon'].includes(user.rol)
  await requireRoles(['patron', 'operasyon', 'saha_sorumlusu'])

  const sp = await searchParams
  const seciliId = Number(sp.talep) || 0
  const durum = sp.durum ?? ''
  const firmaId = sp.firma ? Number(sp.firma) : undefined
  const goster = sp.g ?? ''

  const [talepler, secili, firmalar, meslekler] = await Promise.all([
    getTaleplerFiltreli(user, {
      durum: durum || undefined,
      firmaId,
      tarihBas: sp.tarihBas,
      tarihBit: sp.tarihBit,
      sadeceEksik: sp.eksik === '1',
      sablon: sp.sablon === '1',
    }),
    seciliId ? getTalepDetay(user, seciliId) : null,
    prisma.musteriFirma.findMany({ include: { lokasyonlar: true }, orderBy: { ad: 'asc' } }),
    prisma.meslek.findMany({ orderBy: { ad: 'asc' } }),
  ])

  // SMS bildirim durumları (atamalar için)
  const smsBildirimler = secili
    ? await prisma.bildirim.findMany({
        where: { tur: 'talep', ilgiliId: { in: secili.atamalar.map((a) => a.id) } },
      })
    : []
  const smsMap = new Map(smsBildirimler.map((b) => [b.ilgiliId, b]))

  const bugun = startOfDay()
  const bugunTalepler = talepler.filter((t) => sameDay(t.tarih, bugun))
  const gelecek = talepler.filter((t) => t.tarih >= bugun && !sameDay(t.tarih, bugun))
  const gecmis = talepler.filter((t) => t.tarih < bugun)
  const gecmisGoster = goster === '1' || goster === 'tum'
  const gecmisLimitli = gecmis.slice(0, goster === 'tum' ? undefined : GCEMIS_LIMIT)

  // Özet şeridi verileri
  const acikSayi = talepler.filter((t) => t.durum === 'acik').length
  const kismiSayi = talepler.filter((t) => t.durum === 'kismi').length
  const eksikOlan = talepler.filter((t) => {
    const ihtiyac = t.kalemler.reduce((a, k) => a + k.adet, 0)
    const atanan = t.atamalar.filter((a) => a.durum !== 'iptal').length
    return atanan < ihtiyac
  })
  const yarinIhtiyac = talepler
    .filter((t) => sameDay(t.tarih, addDaysT(bugun, 1)))
    .reduce((a, t) => a + t.kalemler.reduce((x, k) => x + k.adet, 0), 0)

  return (
    <div className="flex flex-col gap-5 lg:flex-row lg:items-start">
      {/* ============ SOL: liste ============ */}
      <div className="w-full shrink-0 space-y-3 lg:w-[400px]">
        {/* Özet şeridi */}
        <div className="grid grid-cols-4 gap-2">
          <OzetKutu label="Açık" value={acikSayi} tone="text-amber-600" />
          <OzetKutu label="Kısmi" value={kismiSayi} tone="text-blue-600" />
          <OzetKutu label="Eksik" value={eksikOlan.length} tone="text-red-600" />
          <OzetKutu label="Yarın İhtiyaç" value={yarinIhtiyac} tone="text-indigo-600" />
        </div>

        {/* Filtreler */}
        <Card className="p-3">
          <form method="get" className="grid grid-cols-2 gap-2">
            <input type="hidden" name="talep" value={seciliId || ''} />
            <div className="col-span-2">
              <label className="mb-1 block text-[11px] font-medium text-slate-500">Durum</label>
              <select name="durum" defaultValue={durum} className="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm outline-none focus:border-indigo-500">
                <option value="">Tümü</option>
                <option value="acik">Açık</option>
                <option value="kismi">Kısmi</option>
                <option value="dolu">Dolu</option>
                <option value="kapandi">Kapandı</option>
              </select>
            </div>
            <div className="col-span-2">
              <label className="mb-1 block text-[11px] font-medium text-slate-500">Firma</label>
              <select name="firma" defaultValue={firmaId ?? ''} className="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm outline-none focus:border-indigo-500">
                <option value="">Tümü</option>
                {firmalar.map((f) => (
                  <option key={f.id} value={f.id}>{f.ad}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-[11px] font-medium text-slate-500">Başlangıç</label>
              <input name="tarihBas" type="date" defaultValue={sp.tarihBas} className="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm outline-none focus:border-indigo-500" />
            </div>
            <div>
              <label className="mb-1 block text-[11px] font-medium text-slate-500">Bitiş</label>
              <input name="tarihBit" type="date" defaultValue={sp.tarihBit} className="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm outline-none focus:border-indigo-500" />
            </div>
            <div className="col-span-2 flex flex-wrap items-center gap-3">
              <label className="flex cursor-pointer items-center gap-1.5 text-xs font-medium text-slate-600">
                <input type="checkbox" name="eksik" value="1" defaultChecked={sp.eksik === '1'} className="rounded accent-indigo-600" />
                Sadece açık/eksik
              </label>
              <label className="flex cursor-pointer items-center gap-1.5 text-xs font-medium text-slate-600">
                <input type="checkbox" name="sablon" value="1" defaultChecked={sp.sablon === '1'} className="rounded accent-indigo-600" />
                Şablonlar
              </label>
            </div>
            <button type="submit" className="col-span-1 rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-indigo-500">
              Filtrele
            </button>
            <Link href={`/talepler${seciliId ? `?talep=${seciliId}` : ''}`} className="col-span-1 rounded-lg bg-white px-3 py-1.5 text-center text-sm font-medium text-slate-600 ring-1 ring-slate-300 hover:bg-slate-50">
              Temizle
            </Link>
          </form>
        </Card>

        {/* Liste paneli — sabit yükseklik, kendi scroll'u */}
        <Card className="flex flex-col lg:h-[calc(100vh-280px)] lg:min-h-[420px]">
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-2.5">
            <span className="text-xs font-semibold text-slate-600">
              {num(talepler.length)} talep
            </span>
            {isOperasyon && (
              <TalepForm
                firmalar={firmalar.map((f) => ({ id: f.id, ad: f.ad, lokasyonlar: f.lokasyonlar.map((l) => ({ id: l.id, ad: l.ad })) }))}
                meslekler={meslekler.map((m) => ({ id: m.id, ad: m.ad }))}
              />
            )}
          </div>

          <div className="flex-1 space-y-4 overflow-y-auto px-3 py-3">
            <TalepGruplari
              title={`Bugün (${bugunTalepler.length})`}
              items={bugunTalepler}
              seciliId={seciliId}
              firmaId={firmaId}
              durum={durum}
              eksik={sp.eksik}
              sablon={sp.sablon}
              goster={goster}
            />
            <TalepGruplari
              title={`Gelecek (${gelecek.length})`}
              items={gelecek}
              seciliId={seciliId}
              firmaId={firmaId}
              durum={durum}
              eksik={sp.eksik}
              sablon={sp.sablon}
              goster={goster}
            />

            {/* Geçmiş — varsayılan kapalı */}
            <div>
              {!gecmisGoster ? (
                gecmis.length > 0 && (
                  <div className="rounded-xl border border-dashed border-slate-300 px-4 py-2.5 text-center">
                    <Link
                      href={filtreHref(seciliId, firmaId, durum, sp.eksik, sp.sablon, '1')}
                      className="text-xs font-medium text-slate-500 hover:text-indigo-600"
                    >
                      Geçmiş ({gecmis.length}) — {GCEMIS_LIMIT} tanesini göster ▾
                    </Link>
                  </div>
                )
              ) : (
                <TalepGruplari
                  title={`Geçmiş (${gecmis.length})`}
                  items={gecmisLimitli}
                  seciliId={seciliId}
                  firmaId={firmaId}
                  durum={durum}
                  eksik={sp.eksik}
                  sablon={sp.sablon}
                  goster={goster}
                />
              )}
              {gecmisGoster && gecmis.length > GCEMIS_LIMIT && goster === '1' && (
                <div className="mt-1 text-center">
                  <Link href={filtreHref(seciliId, firmaId, durum, sp.eksik, sp.sablon, 'tum')} className="text-xs font-medium text-indigo-600 hover:underline">
                    Tümünü göster ({gecmis.length})
                  </Link>
                </div>
              )}
            </div>
          </div>
        </Card>
      </div>

      {/* ============ SAĞ: talep detayı ============ */}
      <div className="min-w-0 flex-1">
        {!secili ? (
          <Card>
            <EmptyState icon="talep" title="Bir talep seçin" desc="Soldaki listeden bir talep seçerek atama, puantaj ve şablon işlemlerini yönetin" />
          </Card>
        ) : (
          <div className="space-y-5">
            {/* Özet */}
            <Card className="overflow-hidden">
              <div className="bg-gradient-to-r from-indigo-600 to-indigo-500 px-5 py-4 text-white">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-base font-semibold">{secili.firma.ad}</h2>
                      <TalepBadge durum={secili.durum} />
                      <AciliyetBadge aciliyet={secili.aciliyet} />
                      {secili.sablon && <Badge tone="violet" className="bg-white/15 text-white ring-white/20">Şablon {secili.tekrar ? `(${secili.tekrar === 'gunluk' ? 'Günlük' : 'Haftalık'})` : ''}</Badge>}
                    </div>
                    <p className="mt-1 text-sm text-indigo-100">
                      {secili.lokasyon.ad} · {dateLong(secili.tarih)} · {secili.vardiya === 'gunduz' ? 'Gündüz' : 'Gece'}
                      {daysUntil(secili.tarih) === 0 && <span className="font-semibold text-white"> · Bugün</span>}
                    </p>
                    {secili.not && <p className="mt-1 text-xs text-indigo-200">Not: {secili.not}</p>}
                  </div>
                  <div className="flex gap-2">
                    {secili.durum !== 'kapandi' ? (
                      <form action={talepDurumDegistir}>
                        <input type="hidden" name="id" value={secili.id} />
                        <input type="hidden" name="durum" value="kapandi" />
                        <Button variant="secondary" size="sm" type="submit" className="bg-white/90 ring-white">Talep Kapat</Button>
                      </form>
                    ) : (
                      <form action={talepDurumDegistir}>
                        <input type="hidden" name="id" value={secili.id} />
                        <input type="hidden" name="durum" value="acik" />
                        <Button variant="secondary" size="sm" type="submit" className="bg-white/90 ring-white">Tekrar Aç</Button>
                      </form>
                    )}
                  </div>
                </div>
              </div>

              {/* İhtiyaç + doluluk */}
              <div className="px-5 py-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">İhtiyaç</div>
                    <div className="mt-1.5 flex flex-wrap gap-1.5">
                      {secili.kalemler.map((k) => (
                        <Badge key={k.id} tone="indigo">{k.adet} {k.meslek.ad}</Badge>
                      ))}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">Doluluk</div>
                    <div className="mt-1 flex items-center gap-2">
                      <span className="text-2xl font-bold tabular-nums text-slate-900">
                        {secili.atamalar.filter((a) => a.durum !== 'iptal').length}
                        <span className="text-sm font-medium text-slate-400">/{secili.kalemler.reduce((a, k) => a + k.adet, 0)}</span>
                      </span>
                    </div>
                  </div>
                </div>
                <DolulukBar secili={secili} />
              </div>
            </Card>

            {/* Şablon aksiyonları */}
            {isOperasyon && (
              <Card className="px-5 py-3">
                <div className="flex flex-wrap items-center gap-3">
                  <span className="text-xs font-semibold text-slate-600">Tekrarlayan talep:</span>
                  {!secili.sablon ? (
                    <form action={sablonYap} className="flex items-center gap-1.5">
                      <input type="hidden" name="id" value={secili.id} />
                      <select name="tekrar" className="rounded-lg border border-slate-300 px-2 py-1.5 text-xs outline-none focus:border-indigo-500">
                        <option value="gunluk">Günlük</option>
                        <option value="haftalik">Haftalık</option>
                      </select>
                      <button type="submit" className="rounded-lg bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 ring-1 ring-slate-300 hover:bg-slate-50">
                        Şablon yap
                      </button>
                    </form>
                  ) : (
                    <form action={sablonSil}>
                      <input type="hidden" name="id" value={secili.id} />
                      <button type="submit" className="rounded-lg bg-white px-2.5 py-1.5 text-xs font-medium text-slate-600 ring-1 ring-slate-300 hover:bg-red-50">
                        Şablonu kaldır
                      </button>
                    </form>
                  )}
                  <form action={talepKopyala} className="flex items-center gap-1.5">
                    <input type="hidden" name="id" value={secili.id} />
                    <input name="baslangic" type="date" className="rounded-lg border border-slate-300 px-2 py-1.5 text-xs outline-none focus:border-indigo-500" />
                    <input name="gunSayisi" type="number" defaultValue={7} min={1} className="w-16 rounded-lg border border-slate-300 px-2 py-1.5 text-xs outline-none focus:border-indigo-500" />
                    <button type="submit" className="rounded-lg bg-indigo-50 px-2.5 py-1.5 text-xs font-medium text-indigo-700 ring-1 ring-indigo-200 hover:bg-indigo-100">
                      Bu tarihten itibaren kopyala
                    </button>
                  </form>
                </div>
              </Card>
            )}

            {/* Atama panelleri (kalem başına) */}
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

            {/* Atanan işçiler */}
            <Card>
              <CardHeader
                title={`Atanan İşçiler (${num(secili.atamalar.filter((a) => a.durum !== 'iptal').length)})`}
                desc="Puantaj canlı güncellenir; çıkar ve yerine adam bul işlemleri kalıcıdır"
              />
              {secili.atamalar.length === 0 ? (
                <EmptyState icon="isci" title="Henüz atama yok" />
              ) : (
                <ul className="divide-y divide-slate-100">
                  {secili.atamalar.map((a) => {
                    const sms = smsMap.get(a.id)
                    return (
                      <li key={a.id} className="px-5 py-3.5">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div className="flex min-w-0 items-center gap-3">
                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-indigo-50 text-xs font-semibold text-indigo-600">
                              {a.isci.ad.split(' ').map((p) => p[0]).slice(0, 2).join('')}
                            </div>
                            <div>
                              <div className="flex flex-wrap items-center gap-2 text-sm font-medium text-slate-900">
                                <a href={`/isci-havuzu/${a.isci.id}`} className="hover:text-indigo-600">{a.isci.ad}</a>
                                {a.durum === 'iptal' && <Badge tone="red">İptal</Badge>}
                                {sms ? (
                                  sms.gonderimDurum ? (
                                    <Badge tone="green">SMS ✓</Badge>
                                  ) : (
                                    <Badge tone="amber">SMS bekliyor</Badge>
                                  )
                                ) : null}
                              </div>
                              <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                                <AtamaBadge durum={a.durum} />
                                {a.puantaj ? <PuantajBadge durum={a.puantaj.durum} /> : <Badge tone="slate">Puantaj yok</Badge>}
                                {a.sgkBildirildi ? <Badge tone="green">SGK ✓</Badge> : <Badge tone="amber">SGK yok</Badge>}
                              </div>
                            </div>
                          </div>

                          <div className="flex flex-wrap items-center gap-2">
                            {/* Puantaj */}
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
                                    className={`px-2 py-1.5 text-xs font-medium transition ${
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
                                  >
                                    {d === 'geldi' ? 'Geldi' : d === 'gec' ? 'Geç' : d === 'gelmedi' ? 'Gelmedi' : 'Yarım'}
                                  </button>
                                )
                              })}
                            </form>

                            {a.durum === 'iptal' ? (
                              <YerineBul
                                talepId={secili.id}
                                meslekId={a.meslekId ?? secili.kalemler[0]?.meslekId ?? 0}
                                meslekAd={secili.kalemler.find((k) => k.meslekId === a.meslekId)?.meslek.ad ?? secili.kalemler[0]?.meslek.ad ?? 'İşçi'}
                                tarih={dateLong(secili.tarih)}
                                haricId={a.isciId}
                              />
                            ) : (
                              <>
                                {isOperasyon && !a.sgkBildirildi && (
                                  <form action={sgkBildir}>
                                    <input type="hidden" name="id" value={a.id} />
                                    <Button variant="secondary" size="sm" type="submit">SGK Bildir</Button>
                                  </form>
                                )}
                                {isOperasyon && a.durum !== 'tamamlandi' && (
                                  <form action={setAtamaDurumOtomatik}>
                                    <input type="hidden" name="id" value={a.id} />
                                    <input type="hidden" name="durum" value="tamamlandi" />
                                    <Button variant="secondary" size="sm" type="submit">Tamamla</Button>
                                  </form>
                                )}
                                {isOperasyon && (
                                  <form action={cikarAtama}>
                                    <input type="hidden" name="id" value={a.id} />
                                    <Button variant="ghost" size="sm" type="submit" title="Çıkar (iptal eder)">
                                      <Icon name="x" size={14} />
                                    </Button>
                                  </form>
                                )}
                              </>
                            )}
                          </div>
                        </div>

                        {/* SMS gönderim placeholder */}
                        {sms && !sms.gonderimDurum && (
                          <div className="mt-2 flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2">
                            <div className="text-xs text-slate-600">
                              <span className="font-medium">SMS:</span> {sms.mesaj} <span className="text-slate-400">→ {sms.hedef}</span>
                            </div>
                            <form action={bildirimGonder}>
                              <input type="hidden" name="id" value={sms.id} />
                              <Button variant="secondary" size="sm" type="submit">Gönder (placeholder)</Button>
                            </form>
                          </div>
                        )}
                      </li>
                    )
                  })}
                </ul>
              )}
            </Card>
          </div>
        )}
      </div>
    </div>
  )
}

// ---- yardımcılar ----
function addDaysT(d: Date, n: number) {
  const x = new Date(d)
  x.setDate(x.getDate() + n)
  return x
}

function filtreHref(seciliId: number, firmaId?: number, durum?: string, eksik?: string, sablon?: string, g?: string) {
  const p = new URLSearchParams()
  if (seciliId) p.set('talep', String(seciliId))
  if (firmaId) p.set('firma', String(firmaId))
  if (durum) p.set('durum', durum)
  if (eksik === '1') p.set('eksik', '1')
  if (sablon === '1') p.set('sablon', '1')
  if (g) p.set('g', g)
  const q = p.toString()
  return `/talepler${q ? `?${q}` : ''}`
}

function OzetKutu({ label, value, tone }: { label: string; value: number; tone: string }) {
  const bg: Record<string, string> = {
    'text-amber-600': 'bg-amber-50',
    'text-blue-600': 'bg-blue-50',
    'text-red-600': 'bg-red-50',
    'text-indigo-600': 'bg-indigo-50',
    'text-emerald-600': 'bg-emerald-50',
  }
  return (
    <div className={`rounded-2xl ${bg[tone] ?? 'bg-slate-50'} px-3 py-3 text-center`}>
      <div className={`text-xl font-bold tabular-nums ${tone}`}>{num(value)}</div>
      <div className="mt-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-500">{label}</div>
    </div>
  )
}

function DolulukBar({ secili }: { secili: { kalemler: Array<{ adet: number }>; atamalar: Array<{ durum: string }> } }) {
  const ihtiyac = secili.kalemler.reduce((a, k) => a + k.adet, 0)
  const atanan = secili.atamalar.filter((a) => a.durum !== 'iptal').length
  const yuzde = ihtiyac === 0 ? 0 : Math.min(100, Math.round((atanan / ihtiyac) * 100))
  return (
    <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
      <div className={`h-full rounded-full ${yuzde >= 100 ? 'bg-emerald-500' : yuzde >= 50 ? 'bg-amber-500' : 'bg-red-400'}`} style={{ width: `${yuzde}%` }} />
    </div>
  )
}

function TalepGruplari({
  title,
  items,
  seciliId,
  firmaId,
  durum,
  eksik,
  sablon,
  goster,
}: {
  title: string
  items: Array<{ id: number; firma: { ad: string }; lokasyon: { ad: string }; tarih: Date; durum: string; vardiya: string; aciliyet: string; kalemler: Array<{ adet: number }>; atamalar: Array<{ durum: string }>; sablon: boolean }>
  seciliId: number
  firmaId?: number
  durum?: string
  eksik?: string
  sablon?: string
  goster?: string
}) {
  if (items.length === 0) return null
  return (
    <div>
      <div className="px-1 pb-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-400">{title}</div>
      <div className="space-y-1.5">
        {items.map((t) => {
          const toplam = t.kalemler.reduce((a, k) => a + k.adet, 0)
          const atanan = t.atamalar.filter((a) => a.durum !== 'iptal').length
          const eksikMi = atanan < toplam
          const durumRenk =
            t.durum === 'kapandi'
              ? 'border-l-emerald-400'
              : t.durum === 'dolu'
                ? 'border-l-emerald-500'
                : t.durum === 'kismi'
                  ? 'border-l-amber-400'
                  : 'border-l-red-400'
          return (
            <Link
              key={t.id}
              href={filtreHref(t.id, firmaId, durum, eksik, sablon, goster)}
              className={`block rounded-xl border border-l-4 bg-white px-4 py-3 shadow-sm transition ${durumRenk} ${
                seciliId === t.id ? 'border-l-indigo-600 ring-2 ring-indigo-500/20' : 'hover:border-slate-300 hover:shadow'
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="truncate text-sm font-semibold text-slate-900">{t.firma.ad}</span>
                <div className="flex shrink-0 items-center gap-1.5">
                  {t.aciliyet === 'acil' && <Badge tone="red">ACİL</Badge>}
                  {t.vardiya === 'gece' && <Badge tone="slate">Gece</Badge>}
                  {t.sablon && <Badge tone="violet">Ş</Badge>}
                  <TalepBadge durum={t.durum} />
                </div>
              </div>
              <div className="mt-1.5 flex items-center justify-between gap-2 text-xs text-slate-500">
                <span className="truncate">{t.lokasyon.ad} · {dateLong(t.tarih)}</span>
                <span className={`shrink-0 rounded-lg px-1.5 py-0.5 font-semibold tabular-nums ${
                  eksikMi ? 'bg-amber-50 text-amber-700' : 'bg-emerald-50 text-emerald-700'
                }`}>
                  {atanan}/{toplam}
                </span>
              </div>
            </Link>
          )
        })}
      </div>
    </div>
  )
}