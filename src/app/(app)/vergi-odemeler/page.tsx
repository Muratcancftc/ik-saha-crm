import Link from 'next/link'
import { requireRoles } from '@/lib/dal'
import { prisma } from '@/lib/db'
import { daysUntil, startOfDay } from '@/lib/dates'
import { Card, CardHeader, Th, Td, Badge, EmptyState } from '@/components/ui'
import { Icon } from '@/components/icons'
import { VergiForm, OdeModal, TopluOde, SablonForm } from './vergi-client'
import {
  vergiDurum,
  VERGI_TUR_ETIKET,
  VERGI_DURUM_ETIKET,
  VERGI_DURUM_TONE,
  tl,
  yuvarla,
  tarihTr,
} from '@/lib/vergi'
import { vergiSil, sablonOlustur, sablonSil } from '@/app/actions/vergi'
import { SilOnayForm } from '@/components/sil-onay'
import { GeriAlButon } from './geri-al'

export const dynamic = 'force-dynamic'

const TUR_FILTRE = ['KDV', 'MUHTASAR', 'STOPAJ', 'GECICI_VERGI', 'KURUMLAR', 'SGK', 'BAGKUR', 'DAMGA', 'DIGER']

export default async function VergiOdemelerPage({
  searchParams,
}: {
  searchParams: Promise<{ firma?: string; tur?: string; durum?: string; bas?: string; bit?: string; dekontsuz?: string }>
}) {
  const user = await requireRoles(['patron', 'muhasebe', 'ik', 'operasyon', 'izleyici'])
  const sp = await searchParams
  const yazabilir = ['patron', 'muhasebe', 'ik'].includes(user.rol)
  const admin = user.rol === 'patron'
  
  const filtre: Record<string, unknown> = { silindi: false }
  if (sp.firma) filtre.firmaId = Number(sp.firma)
  if (sp.tur) filtre.vergiTuru = sp.tur
  if (sp.bas) filtre.sonOdemeTarihi = { ...(typeof filtre.sonOdemeTarihi === 'object' ? filtre.sonOdemeTarihi : {}), gte: startOfDay(new Date(`${sp.bas}T00:00:00`)) }
  if (sp.bit) filtre.sonOdemeTarihi = { ...(typeof filtre.sonOdemeTarihi === 'object' ? filtre.sonOdemeTarihi : {}), lte: new Date(`${sp.bit}T23:59:59`) }

  const [firmalar, kayitlar, sablonlar] = await Promise.all([
    prisma.musteriFirma.findMany({ orderBy: { ad: 'asc' } }),
    prisma.vergiOdemesi.findMany({
      where: filtre,
      include: { firma: true, dekontlar: { where: { silindi: false }, select: { id: true } } },
      orderBy: [{ odenenTutar: 'asc' }, { sonOdemeTarihi: 'asc' }],
    }),
    prisma.vergiSablon.findMany({ include: { firma: true }, orderBy: { createdAt: 'asc' } }),
  ])

  const durumFiltre = sp.durum
  const dekontsuz = sp.dekontsuz === '1'
  const liste = kayitlar
    .map((k) => ({ k, durum: vergiDurum(k) }))
    .filter((x) => (durumFiltre ? x.durum === durumFiltre : true))
    .filter((x) => (dekontsuz ? x.k.dekontlar.length === 0 : true))

  const bugun = startOfDay()
  const ayBas = new Date(bugun.getFullYear(), bugun.getMonth(), 1)
  const ayBit = new Date(bugun.getFullYear(), bugun.getMonth() + 1, 1)

  // Özet
  const buAyOdenecek = kayitlar
    .filter((k) => k.sonOdemeTarihi >= ayBas && k.sonOdemeTarihi < ayBit && Number(k.odenenTutar ?? 0) === 0)
    .reduce((a, k) => a + Number(k.tahakkukTutari), 0)
  const odenenToplam = kayitlar.filter((k) => Number(k.odenenTutar ?? 0) > 0).reduce((a, k) => a + Number(k.odenenTutar), 0)
  const bekleyenToplam = kayitlar.filter((k) => Number(k.odenenTutar ?? 0) === 0).reduce((a, k) => a + Number(k.tahakkukTutari), 0)
  const gecikmisAdet = kayitlar.filter((k) => Number(k.odenenTutar ?? 0) === 0 && k.sonOdemeTarihi < bugun).length

  // Rapor: firma bazlı yıl + tür kırılımı
  const yil = bugun.getFullYear()
  const yillik = kayitlar.filter((k) => k.donem.startsWith(String(yil)))
  const firmaYuk = new Map<number, { ad: string; toplam: number }>()
  for (const k of yillik) {
    const e = firmaYuk.get(k.firmaId) ?? { ad: k.firma.ad, toplam: 0 }
    e.toplam += Number(k.tahakkukTutari)
    firmaYuk.set(k.firmaId, e)
  }
  const turKirim = new Map<string, number>()
  for (const k of yillik) {
    const ad = k.vergiTuru === 'DIGER' ? `Diğer (${k.vergiTuruDiger ?? ''})` : VERGI_TUR_ETIKET[k.vergiTuru]
    turKirim.set(ad, (turKirim.get(ad) ?? 0) + Number(k.tahakkukTutari))
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold tracking-tight text-slate-900">Vergi & Resmi Ödemeler</h2>
          <p className="mt-0.5 text-sm text-slate-500">Firma bazlı vergi kaydı, ödeme takibi ve dekont arşivi</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <TopluOde secili={liste.filter((x) => x.durum !== 'ODENDI').map((x) => ({ id: x.k.id, firmaAd: x.k.firma.ad, tur: VERGI_TUR_ETIKET[x.k.vergiTuru], donem: x.k.donem, tahakkuk: Number(x.k.tahakkukTutari) }))} />
          {yazabilir && <VergiForm mode="create" firmalar={firmalar.map((f) => ({ id: f.id, ad: f.ad }))} />}
        </div>
      </div>

      {/* Özet */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Ozet label="Bu Ay Ödenecek" value={tl(yuvarla(buAyOdenecek))} tone="text-indigo-600" bg="bg-indigo-50" />
        <Ozet label="Ödenen" value={tl(yuvarla(odenenToplam))} tone="text-emerald-700" bg="bg-emerald-50" />
        <Ozet label="Bekleyen" value={tl(yuvarla(bekleyenToplam))} tone="text-amber-700" bg="bg-amber-50" />
        <Ozet label="Gecikmiş" value={`${gecikmisAdet}`} tone="text-rose-700" bg="bg-rose-50" />
      </div>

      {/* Filtreler */}
      <Card className="p-4">
        <form method="get" className="flex flex-wrap items-end gap-3">
          <div>
            <label className="mb-1 block text-[11px] font-medium text-slate-500">Firma</label>
            <select name="firma" defaultValue={sp.firma ?? ''} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-500">
              <option value="">Tümü</option>
              {firmalar.map((f) => <option key={f.id} value={f.id}>{f.ad}</option>)}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-[11px] font-medium text-slate-500">Vergi Türü</label>
            <select name="tur" defaultValue={sp.tur ?? ''} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-500">
              <option value="">Tümü</option>
              {TUR_FILTRE.map((t) => <option key={t} value={t}>{VERGI_TUR_ETIKET[t as keyof typeof VERGI_TUR_ETIKET]}</option>)}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-[11px] font-medium text-slate-500">Durum</label>
            <select name="durum" defaultValue={sp.durum ?? ''} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-500">
              <option value="">Tümü</option>
              {(['ODENMEDI', 'ODENDI', 'KISMI_ODENDI', 'GECIKMIS'] as const).map((d) => <option key={d} value={d}>{VERGI_DURUM_ETIKET[d]}</option>)}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-[11px] font-medium text-slate-500">Başlangıç</label>
            <input name="bas" type="date" defaultValue={sp.bas} className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500" />
          </div>
          <div>
            <label className="mb-1 block text-[11px] font-medium text-slate-500">Bitiş</label>
            <input name="bit" type="date" defaultValue={sp.bit} className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500" />
          </div>
          <label className="flex items-center gap-1.5 pb-2 text-xs font-medium text-slate-600">
            <input type="checkbox" name="dekontsuz" value="1" defaultChecked={dekontsuz} className="rounded accent-indigo-600" />
            Sadece dekontsuz
          </label>
          <button className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500">Filtrele</button>
          <Link href="/vergi-odemeler" className="rounded-lg px-3 py-2 text-sm font-medium text-slate-500 hover:bg-slate-100">Temizle</Link>
        </form>
      </Card>

      {/* Liste */}
      <Card>
        <CardHeader title={`Vergi Ödemeleri (${liste.length})`} desc="Gecikmiş kırmızı, 7 gün kala sarı vurgulanır" />
        <div className="overflow-x-auto">
          {liste.length === 0 ? (
            <EmptyState icon="vergi" title="Kayıt yok" desc="Yeni vergi ödemesi ekleyerek başlayın" />
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-100">
                  <Th>Firma</Th>
                  <Th>Vergi Türü</Th>
                  <Th>Dönem</Th>
                  <Th className="text-right">Tahakkuk</Th>
                  <Th className="text-right">Ödenen</Th>
                  <Th>Son Ödeme</Th>
                  <Th>Durum</Th>
                  <Th>Dekont</Th>
                  <Th className="text-right">İşlem</Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {liste.map(({ k, durum }) => {
                  const kalanGun = daysUntil(k.sonOdemeTarihi)
                  const vurgu = durum === 'GECIKMIS' ? 'bg-rose-50/40' : durum === 'ODENMEDI' && kalanGun >= 0 && kalanGun <= 7 ? 'bg-amber-50/40' : ''
                  const odenen = Number(k.odenenTutar ?? 0)
                  return (
                    <tr key={k.id} className={`hover:bg-slate-50/60 ${vurgu}`}>
                      <Td className="font-medium text-slate-900">{k.firma.ad}</Td>
                      <Td>{k.vergiTuru === 'DIGER' ? `Diğer (${k.vergiTuruDiger ?? ''})` : VERGI_TUR_ETIKET[k.vergiTuru]}</Td>
                      <Td className="tabular-nums text-slate-500">{k.donem}</Td>
                      <Td className="text-right tabular-nums font-medium">{tl(Number(k.tahakkukTutari))}</Td>
                      <Td className="text-right tabular-nums text-emerald-700">{odenen > 0 ? tl(odenen) : '—'}</Td>
                      <Td>
                        {tarihTr(k.sonOdemeTarihi)}
                        {durum === 'ODENMEDI' && kalanGun >= 0 && kalanGun <= 7 && <span className="ml-1 text-[10px] font-semibold text-amber-600">{kalanGun} gün</span>}
                        {durum === 'GECIKMIS' && <span className="ml-1 text-[10px] font-semibold text-rose-600">{Math.abs(kalanGun)} gün gecikti</span>}
                      </Td>
                      <Td>
                        <Badge tone={VERGI_DURUM_TONE[durum]}>{VERGI_DURUM_ETIKET[durum]}</Badge>
                        {durum === 'KISMI_ODENDI' && (
                          <div className="text-[10px] text-slate-500 mt-0.5">kalan {tl(yuvarla(Number(k.tahakkukTutari) - odenen))}</div>
                        )}
                      </Td>
                      <Td>
                        <Link href={`/vergi-odemeler/${k.id}`} className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-indigo-600">
                          <Icon name="pdf" size={14} />
                          {k.dekontlar.length}
                        </Link>
                        {k.dekontlar.length === 0 && durum === 'ODENDI' && <Badge tone="amber" className="ml-1">Dekont eksik</Badge>}
                      </Td>
                      <Td className="text-right">
                        <div className="flex flex-wrap justify-end gap-1.5">
                          {yazabilir && odenen === 0 && <OdeModal kayit={{ id: k.id, firmaAd: k.firma.ad, tur: k.vergiTuru === 'DIGER' ? k.vergiTuruDiger ?? 'Diğer' : VERGI_TUR_ETIKET[k.vergiTuru], donem: k.donem, tahakkuk: Number(k.tahakkukTutari) }} />}
                          {admin && odenen > 0 && <GeriAlButon id={k.id} />}
                          {yazabilir && <VergiForm mode="edit" kayit={{ id: k.id, firmaId: k.firmaId, tur: k.vergiTuru, donem: k.donem, tahakkuk: Number(k.tahakkukTutari), sonOdemeTarihi: k.sonOdemeTarihi.toISOString().slice(0, 10), not: k.not ?? '', vergiTuruDiger: k.vergiTuruDiger ?? '' }} firmalar={firmalar.map((f) => ({ id: f.id, ad: f.ad }))} />}
                          {admin && <SilOnayForm action={vergiSil} id={k.id} baslik={`${k.firma.ad} ${k.donem} vergisi`} buttonClass="rounded-lg p-1.5 text-slate-300 transition hover:bg-red-50 hover:text-red-600" />}
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

      {/* Tekrarlayan şablonlar */}
      <Card>
        <CardHeader
          title="Tekrarlayan Ödemeler"
          desc="Şablondan mevcut dönemin kaydı otomatik oluşturulur (varsa atlanır)"
          action={yazabilir ? <SablonForm firmalar={firmalar.map((f) => ({ id: f.id, ad: f.ad }))} /> : undefined}
        />
        {sablonlar.length === 0 ? (
          <p className="px-5 py-6 text-center text-xs text-slate-400">Şablon tanımlı değil</p>
        ) : (
          <ul className="divide-y divide-slate-50">
            {sablonlar.map((s) => (
              <li key={s.id} className="flex flex-wrap items-center justify-between gap-2 px-5 py-3">
                <div className="text-sm">
                  <span className="font-medium text-slate-800">{s.firma.ad}</span>
                  <span className="text-slate-500"> · {s.vergiTuru === 'DIGER' ? s.vergiTuruDiger : VERGI_TUR_ETIKET[s.vergiTuru]} · {tl(Number(s.tahakkukTutari))}</span>
                  <span className="text-slate-400"> · her ay {s.sonOdemeGun}&apos;unda{s.donemEtiketi ? ` · ${s.donemEtiketi}` : ''}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  {yazabilir && (
                    <form action={sablonOlustur}>
                      <input type="hidden" name="sablonId" value={s.id} />
                      <button className="rounded-lg bg-indigo-50 px-3 py-1.5 text-xs font-semibold text-indigo-700 hover:bg-indigo-100">Şimdi Oluştur</button>
                    </form>
                  )}
                  {yazabilir && (
                    <form action={sablonSil}>
                      <input type="hidden" name="id" value={s.id} />
                      <button className="rounded-lg p-1.5 text-slate-300 hover:bg-red-50 hover:text-red-600"><Icon name="x" size={14} /></button>
                    </form>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>

      {/* Rapor */}
      <Card>
        <CardHeader
          title={`Yıllık Rapor — ${yil}`}
          desc="Firma bazlı vergi yükü ve tür kırılımı"
          action={
            <a
              href={`/api/export/vergi-rapor?bas=${bugun.getFullYear()}-01-01&bit=${bugun.getFullYear()}-12-31`}
              className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3.5 py-2 text-sm font-medium text-white hover:bg-emerald-500"
            >
              Excel (CSV)
            </a>
          }
        />
        <div className="grid grid-cols-1 gap-6 px-5 py-5 lg:grid-cols-2">
          <div>
            <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">Firma Bazlı Vergi Yükü</h4>
            {firmaYuk.size === 0 ? <p className="text-xs text-slate-400">Bu yıl kayıt yok</p> : (
              <ul className="space-y-1.5">
                {Array.from(firmaYuk.values()).sort((a, b) => b.toplam - a.toplam).map((f) => (
                  <li key={f.ad} className="flex items-center justify-between rounded-xl px-2 py-1.5 text-sm hover:bg-slate-50">
                    <span className="font-medium text-slate-700">{f.ad}</span>
                    <span className="font-semibold tabular-nums text-slate-900">{tl(yuvarla(f.toplam))}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div>
            <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">Vergi Türü Kırılımı</h4>
            {turKirim.size === 0 ? <p className="text-xs text-slate-400">Bu yıl kayıt yok</p> : (
              <ul className="space-y-1.5">
                {Array.from(turKirim.entries()).sort((a, b) => b[1] - a[1]).map(([tur, tutar]) => (
                  <li key={tur} className="flex items-center justify-between rounded-xl px-2 py-1.5 text-sm hover:bg-slate-50">
                    <span className="text-slate-700">{tur}</span>
                    <span className="font-semibold tabular-nums text-slate-900">{tl(yuvarla(tutar))}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </Card>
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