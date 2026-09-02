import { notFound } from 'next/navigation'
import Link from 'next/link'
import { requireRoles } from '@/lib/dal'
import { getIsciProfil } from '@/lib/profil-queries'
import { donemAralik, donemEtiket } from '@/lib/donem'
import { tl, num, date, dateLong } from '@/lib/format'
import { Card, CardHeader, Badge, Button, Th, Td, EmptyState } from '@/components/ui'
import { IsciBadge, PuantajBadge } from '@/components/status-badge'
import { Icon } from '@/components/icons'
import { DonemSecici } from '@/components/donem-secici'
import { Suspense } from 'react'
import { isciNotGuncelle, avansEkle, avansMahsup } from '@/app/actions/isci'
import { belgeEkle, silBelge } from '@/app/actions/belge'

export const dynamic = 'force-dynamic'

const BELGE_TIPLERI = ['Kimlik Kartı', 'SGK İşe Giriş', 'Adli Sicil Kaydı', 'Vardiya Belgesi', 'Sağlık Raporu']

export default async function IsciProfilPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ donem?: string; bas?: string; bit?: string }>
}) {
  await requireRoles(['patron', 'operasyon'])
  const { id } = await params
  const isciId = Number(id)
  const sp = await searchParams
  const donem = donemAralik(sp)

  const isci = await getIsciProfil(isciId, donem.bas, donem.bit)
  if (!isci) notFound()

  return (
    <div className="space-y-5">
      {/* Başlık */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link href="/isci-havuzu" className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700">
            <Icon name="x" size={18} />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-semibold text-slate-900">{isci.ad}</h2>
              <IsciBadge durum={isci.durum} />
            </div>
            <p className="text-xs text-slate-500">{isci.ilce} · {isci.telefon}</p>
          </div>
        </div>
        <div className="flex flex-col items-end gap-2">
          <Suspense fallback={null}><DonemSecici /></Suspense>
          <span className="text-xs text-slate-400">{donemEtiket(donem)}</span>
        </div>
      </div>

      {/* Özet kutuları (döneme göre) */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        <Ozet label="Çalışılan Gün" value={num(isci.calisilanGun)} tone="text-indigo-600" />
        <Ozet label="Toplam Kazanç" value={tl(isci.toplamKazanc)} tone="text-emerald-600" />
        <Ozet label="Devam Oranı" value={`%${num(isci.devamOrani)}`} tone={isci.devamOrani >= 80 ? 'text-emerald-600' : isci.devamOrani >= 60 ? 'text-amber-600' : 'text-red-600'} />
        <Ozet label="No-Show" value={num(isci.noShow)} tone={isci.noShow === 0 ? 'text-emerald-600' : 'text-red-600'} />
        <Ozet label="Güvenilirlik" value={num(isci.guvenilirlik)} tone={isci.guvenilirlik >= 70 ? 'text-emerald-600' : isci.guvenilirlik >= 45 ? 'text-amber-600' : 'text-red-600'} />
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
        {/* Genel */}
        <Card>
          <CardHeader title="Genel" desc="Kimlik ve çalışma bilgileri" />
          <div className="px-5 py-4">
            <dl className="grid grid-cols-2 gap-x-6 gap-y-2.5 text-sm">
              <Satir label="TC Kimlik" value={isci.tcMasked} />
              <Satir label="IBAN" value={isci.ibanMasked} />
              <Satir label="Doğum Tarihi" value={date(isci.dogumTarihi)} />
              <Satir label="Günlük Beklenti" value={tl(isci.beklenti)} />
              <Satir label="Puan" value={num(isci.puan)} />
              <Satir label="Tercih Bölgeler" value={isci.tercihBolgeler.join(', ') || '—'} />
            </dl>
            <div className="mt-3">
              <div className="mb-1.5 text-xs font-medium text-slate-500">Meslekler</div>
              <div className="flex flex-wrap gap-1.5">
                {isci.meslekler.map((m) => (
                  <Badge key={m} tone="indigo">{m}</Badge>
                ))}
              </div>
            </div>
            <div className="mt-4">
              <div className="mb-1.5 text-xs font-medium text-slate-500">Not / Kara Liste</div>
              <form action={isciNotGuncelle} className="flex items-start gap-2">
                <input type="hidden" name="id" value={isci.id} />
                <textarea
                  name="not"
                  rows={2}
                  defaultValue={isci.not ?? ''}
                  placeholder="Not yazın…"
                  className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500"
                />
                <Button type="submit" size="sm">Kaydet</Button>
              </form>
            </div>
          </div>
        </Card>

        {/* Müsaitlik */}
        <Card>
          <CardHeader title="Müsaitlik Takvimi" desc={`${num(isci.musaitlik.length)} kayıt`} />
          <div className="px-5 py-4">
            {isci.musaitlik.length === 0 ? (
              <p className="text-sm text-slate-400">Müsaitlik kaydı yok</p>
            ) : (
              <ul className="space-y-1.5">
                {isci.musaitlik.map((m) => (
                  <li key={m.id} className="flex items-center justify-between text-sm text-slate-600">
                    <span>{date(m.tarih)}</span>
                    <span className="flex items-center gap-2">
                      <span className="text-xs text-slate-400">{m.eVadesiGun} gün eVadesi</span>
                      <Badge tone={m.durum === 'aktif' ? 'green' : 'amber'}>{m.durum}</Badge>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </Card>

        {/* Belgeler */}
        <Card>
          <CardHeader title="Belgeler" desc="Geçerlilik takibi — belge ekle/sil" />
          <div className="px-5 py-4">
            <form action={belgeEkle} className="mb-4 flex flex-wrap items-end gap-2">
              <input type="hidden" name="isciId" value={isci.id} />
              <div>
                <label className="mb-1 block text-[11px] font-medium text-slate-500">Tip</label>
                <select name="tip" required className="rounded-lg border border-slate-300 px-2.5 py-1.5 text-sm outline-none focus:border-indigo-500">
                  {BELGE_TIPLERI.map((t) => <option key={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-[11px] font-medium text-slate-500">Bitiş</label>
                <input name="bitisTarihi" type="date" required className="rounded-lg border border-slate-300 px-2.5 py-1.5 text-sm outline-none focus:border-indigo-500" />
              </div>
              <Button type="submit" size="sm">Belge Ekle</Button>
            </form>

            {isci.belgeler.length === 0 ? (
              <p className="text-sm text-slate-400">Belge yok</p>
            ) : (
              <ul className="divide-y divide-slate-50">
                {isci.belgeler.map((b) => (
                  <li key={b.id} className="flex items-center justify-between py-2 text-sm">
                    <div>
                      <div className="font-medium text-slate-800">{b.tip}</div>
                      <div className="text-xs text-slate-400">Veriliş {date(b.verilisTarihi)} · Bitiş {date(b.bitisTarihi)}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      {b.durum === 'doldu' ? (
                        <Badge tone="red">{Math.abs(b.kalanGun)} gün doldu</Badge>
                      ) : b.durum === 'yaklasiyor' ? (
                        <Badge tone="amber">{b.kalanGun} gün kaldı</Badge>
                      ) : (
                        <Badge tone="green">Geçerli</Badge>
                      )}
                      <form action={silBelge}>
                        <input type="hidden" name="id" value={b.id} />
                        <button className="rounded-lg p-1 text-slate-400 hover:bg-red-50 hover:text-red-600" title="Sil">
                          <Icon name="x" size={14} />
                        </button>
                      </form>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </Card>

        {/* Avanslar */}
        <Card>
          <CardHeader title="Avanslar" desc="Hakedişte otomatik düşülür" action={<AvansForm isciId={isci.id} />} />
          <div className="px-5 py-4">
            {isci.avanslar.length === 0 ? (
              <p className="text-sm text-slate-400">Avans yok</p>
            ) : (
              <>
                <ul className="divide-y divide-slate-50">
                  {isci.avanslar.map((a) => (
                    <li key={a.id} className="flex items-center justify-between py-2 text-sm">
                      <div>
                        <div className="font-medium tabular-nums text-slate-800">{tl(a.tutar)}</div>
                        <div className="text-xs text-slate-400">{date(a.tarih)}</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge tone={a.durum === 'verildi' ? 'amber' : 'green'}>{a.durum}</Badge>
                        {a.durum === 'verildi' && (
                          <form action={avansMahsup}>
                            <input type="hidden" name="id" value={a.id} />
                            <Button variant="secondary" size="sm" type="submit">Mahsup</Button>
                          </form>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
                <div className="mt-3 flex justify-between rounded-lg bg-amber-50 px-3 py-2 text-sm">
                  <span className="text-amber-800">Ödenmemiş avans toplamı</span>
                  <span className="font-semibold tabular-nums text-amber-800">{tl(isci.avansToplam)}</span>
                </div>
              </>
            )}
          </div>
        </Card>
      </div>

      {/* Çalışma geçmişi */}
      <Card>
        <CardHeader
          title={`Çalışma Geçmişi (${donem.etiket})`}
          desc={`${num(isci.calisilanGun)} gün · ${tl(isci.toplamKazanc)} kazanç`}
          action={<FirmaOzet isciFirmaOzet={isci.firmaOzet} />}
        />
        <div className="overflow-x-auto">
          {isci.calismaGecmisi.length === 0 ? (
            <EmptyState icon="isci" title="Bu dönemde çalışma kaydı yok" />
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-100">
                  <Th>Tarih</Th>
                  <Th>Firma</Th>
                  <Th>Lokasyon</Th>
                  <Th>Meslek</Th>
                  <Th>Puantaj</Th>
                  <Th className="text-right">Saat</Th>
                  <Th className="text-right">Yevmiye</Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {isci.calismaGecmisi.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50/60">
                    <Td>{date(c.tarih)}</Td>
                    <Td className="font-medium text-slate-900">{c.firma}</Td>
                    <Td>{c.lokasyon}</Td>
                    <Td>{c.meslek}</Td>
                    <Td>{c.puantaj ? <PuantajBadge durum={c.puantaj} /> : <Badge tone="slate">—</Badge>}</Td>
                    <Td className="text-right tabular-nums">{c.calisilanSaat}</Td>
                    <Td className="text-right tabular-nums">{tl(c.yevmiye)}</Td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </Card>

      {/* Devamsızlık */}
      <Card>
        <CardHeader
          title={`Devamsızlık / No-Show (${num(isci.devamsizlik.length)})`}
          desc="Her 'gelmedi' güvenilirlik skorunu düşürür, öneride aşağı iter"
        />
        {isci.devamsizlik.length === 0 ? (
          <EmptyState icon="check" title="Bu dönemde devamsızlık yok" />
        ) : (
          <ul className="divide-y divide-slate-50 px-5">
            {isci.devamsizlik.map((d) => (
              <li key={d.id} className="flex items-center justify-between py-2.5 text-sm">
                <span className="text-slate-700">{dateLong(d.tarih)}</span>
                <span className="text-slate-500">{d.firma} · {d.lokasyon}</span>
                <Badge tone="red">Gelmedi</Badge>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  )
}

function Ozet({ label, value, tone }: { label: string; value: string; tone: string }) {
  return (
    <Card className="px-3 py-3 text-center">
      <div className={`text-xl font-semibold tabular-nums ${tone}`}>{value}</div>
      <div className="mt-0.5 text-[10px] font-medium uppercase tracking-wide text-slate-400">{label}</div>
    </Card>
  )
}

function Satir({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3">
      <dt className="text-slate-400">{label}</dt>
      <dd className="text-right font-medium tabular-nums text-slate-800">{value}</dd>
    </div>
  )
}

function FirmaOzet({ isciFirmaOzet }: { isciFirmaOzet: Array<{ firma: string; gun: number }> }) {
  return (
    <div className="text-right">
      <div className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-slate-400">Firma bazında</div>
      <div className="flex flex-wrap justify-end gap-1.5">
        {isciFirmaOzet.map((f) => (
          <Badge key={f.firma} tone="blue">{f.firma} · {f.gun} gün</Badge>
        ))}
      </div>
    </div>
  )
}

function AvansForm({ isciId }: { isciId: number }) {
  return (
    <form action={avansEkle} className="flex items-center gap-1.5">
      <input type="hidden" name="isciId" value={isciId} />
      <input name="tutar" type="number" step="0.01" min={0} required placeholder="Tutar ₺" className="w-24 rounded-lg border border-slate-300 px-2 py-1.5 text-xs tabular-nums outline-none focus:border-indigo-500" />
      <Button type="submit" size="sm">Avans Ekle</Button>
    </form>
  )
}