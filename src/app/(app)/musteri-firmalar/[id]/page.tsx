import { notFound } from 'next/navigation'
import Link from 'next/link'
import { requireRoles } from '@/lib/dal'
import { prisma } from '@/lib/db'
import { getFirmaProfil } from '@/lib/profil-queries'
import { donemAralik, donemEtiket } from '@/lib/donem'
import { tl, num, date } from '@/lib/format'
import { Card, CardHeader, Th, Td, EmptyState } from '@/components/ui'
import { TalepBadge, FaturaBadge } from '@/components/status-badge'
import { Icon } from '@/components/icons'
import { DonemSecici } from '@/components/donem-secici'
import { setFirmaFiyat } from '@/app/actions/firma'

export const dynamic = 'force-dynamic'

export default async function FirmaProfilPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ donem?: string; bas?: string; bit?: string }>
}) {
  await requireRoles(['patron', 'operasyon', 'muhasebe'])
  const { id } = await params
  const firmaId = Number(id)
  const sp = await searchParams
  const donem = donemAralik(sp)

  const firma = await getFirmaProfil(firmaId, donem.bas, donem.bit)
  if (!firma) notFound()

  const meslekler = await prisma.meslek.findMany({ orderBy: { ad: 'asc' } })

  const maxYas = Math.max(firma.yaslandirma.g90, firma.yaslandirma.g60_90, firma.yaslandirma.g30_60, firma.yaslandirma.g0_30, firma.yaslandirma.vadesiGelmemis, 1)

  return (
    <div className="space-y-5">
      {/* Başlık */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link href="/musteri-firmalar" className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700">
            <Icon name="x" size={18} />
          </Link>
          <div>
            <h2 className="text-lg font-semibold text-slate-900">{firma.ad}</h2>
            <p className="text-xs text-slate-500">
              {firma.vergiNo ? `Vergi No: ${firma.vergiNo}` : ''} {firma.telefon ? `· ${firma.telefon}` : ''}
            </p>
          </div>
        </div>
        <div className="flex flex-col items-end gap-2">
          <DonemSecici />
          <span className="text-xs text-slate-400">{donemEtiket(donem)}</span>
        </div>
      </div>

      {/* Özet kutuları */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        <Ozet label="Ciro (dönem)" value={tl(firma.ciro)} tone="text-indigo-600" />
        <Ozet label="Tahsilat" value={tl(firma.tahsilat)} tone="text-emerald-600" />
        <Ozet label="Alacak" value={tl(firma.alacak)} tone={firma.alacak > 0 ? 'text-amber-600' : 'text-emerald-600'} />
        <Ozet label="Ort. Doluluk" value={`%${num(firma.ortalamaDoluluk)}`} tone="text-blue-600" />
        <Ozet label="Gönderilen İşçi" value={`${num(firma.gonderilenIsci)} gün`} tone="text-violet-600" />
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
        {/* Bilgiler + yetkililer + lokasyonlar */}
        <Card>
          <CardHeader title="Firma Bilgileri" desc="İletişim, yetkililer ve lokasyonlar" />
          <div className="px-5 py-4">
            <dl className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
              <Satir label="E-posta" value={firma.email ?? '—'} />
              <Satir label="Adres" value={firma.adres ?? '—'} />
            </dl>
            <h4 className="mb-1.5 mt-4 text-xs font-semibold uppercase tracking-wide text-slate-400">Yetkililer</h4>
            <ul className="space-y-1 text-sm text-slate-600">
              {firma.yetkililer.length === 0 && <li className="text-slate-400">Yetkili yok</li>}
              {firma.yetkililer.map((y) => (
                <li key={y.id} className="flex justify-between">
                  <span className="font-medium">{y.ad}</span>
                  <span className="text-xs text-slate-400">{y.unvan} {y.telefon}</span>
                </li>
              ))}
            </ul>
            <h4 className="mb-1.5 mt-4 text-xs font-semibold uppercase tracking-wide text-slate-400">Lokasyonlar</h4>
            <ul className="space-y-1 text-sm text-slate-600">
              {firma.lokasyonlar.length === 0 && <li className="text-slate-400">Lokasyon yok</li>}
              {firma.lokasyonlar.map((l) => (
                <li key={l.id} className="flex justify-between">
                  <span className="font-medium">{l.ad}</span>
                  <span className="text-xs text-slate-400">{l.adres}</span>
                </li>
              ))}
            </ul>
          </div>
        </Card>

        {/* Fiyat anlaşması */}
        <Card>
          <CardHeader title="Fiyat Anlaşması" desc="Meslek bazlı kişi/gün fiyatı (düzenlenebilir)" />
          <div className="px-5 py-4">
            <div className="space-y-1.5">
              {meslekler.map((m) => {
                const fiyat = firma.fiyatlar.find((p) => p.meslekId === m.id)
                return (
                  <form key={m.id} action={setFirmaFiyat} className="flex items-center gap-2">
                    <input type="hidden" name="firmaId" value={firma.id} />
                    <input type="hidden" name="meslekId" value={m.id} />
                    <span className="w-28 text-sm text-slate-600">{m.ad}</span>
                    <input
                      name="fiyat"
                      type="number"
                      step="10"
                      defaultValue={fiyat ? fiyat.kisiGunFiyat : ''}
                      placeholder="—"
                      className="w-28 rounded-lg border border-slate-200 px-2 py-1 text-right text-sm tabular-nums outline-none focus:border-indigo-500"
                    />
                    <button type="submit" title="Kaydet" className="rounded-lg p-1.5 text-emerald-600 transition hover:bg-emerald-50">
                      <Icon name="check" size={15} />
                    </button>
                  </form>
                )
              })}
            </div>
          </div>
        </Card>

        {/* Talep / atama geçmişi */}
        <Card>
          <CardHeader title={`Talep Geçmişi (${donem.etiket})`} desc={`${num(firma.talepSayisi)} talep`} />
          <div className="overflow-x-auto">
            {firma.talepGecmisi.length === 0 ? (
              <EmptyState icon="talep" title="Bu dönemde talep yok" />
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-100">
                    <Th>Tarih</Th>
                    <Th>Lokasyon</Th>
                    <Th className="text-right">İhtiyaç</Th>
                    <Th className="text-right">Atanan</Th>
                    <Th>Durum</Th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {firma.talepGecmisi.map((t) => (
                    <tr key={t.id} className="hover:bg-slate-50/60">
                      <Td>{date(t.tarih)}</Td>
                      <Td>{t.lokasyon}</Td>
                      <Td className="text-right tabular-nums">{num(t.ihtiyac)}</Td>
                      <Td className="text-right tabular-nums">{num(t.atanan)}</Td>
                      <Td><TalepBadge durum={t.durum} /></Td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </Card>

        {/* En çok gönderilen işçiler */}
        <Card>
          <CardHeader title="En Çok Gönderilen İşçiler" desc={`${donem.etiket} dönemi`} />
          <div className="px-5 py-4">
            {firma.enCokGonderilen.length === 0 ? (
              <p className="text-sm text-slate-400">Bu dönemde gönderilen işçi yok</p>
            ) : (
              <ul className="space-y-2">
                {firma.enCokGonderilen.map((i, idx) => (
                  <li key={i.id} className="flex items-center justify-between text-sm">
                    <Link href={`/isci-havuzu/${i.id}`} className="flex items-center gap-2 text-slate-700 hover:text-indigo-600">
                      <span className="w-5 text-xs text-slate-400">#{idx + 1}</span>
                      <span className="font-medium">{i.ad}</span>
                    </Link>
                    <span className="tabular-nums text-slate-500">{i.gun} gün</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </Card>
      </div>

      {/* Faturalar + alacak yaşlandırma */}
      <Card>
        <CardHeader title="Faturalar & Alacak Yaşlandırma" desc="Vadesi geçen ödenmemiş faturaların gün bazında kırılımı" />
        <div className="px-5 py-4">
          {/* Yaşlandırma */}
          <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-5">
            <YasKutu label="Vadesi gelmemiş" tutar={firma.yaslandirma.vadesiGelmemis} tone="bg-slate-100 text-slate-600" oran={firma.yaslandirma.vadesiGelmemis / maxYas} />
            <YasKutu label="0–30 gün" tutar={firma.yaslandirma.g0_30} tone="bg-amber-100 text-amber-700" oran={firma.yaslandirma.g0_30 / maxYas} />
            <YasKutu label="30–60 gün" tutar={firma.yaslandirma.g30_60} tone="bg-orange-100 text-orange-700" oran={firma.yaslandirma.g30_60 / maxYas} />
            <YasKutu label="60–90 gün" tutar={firma.yaslandirma.g60_90} tone="bg-red-100 text-red-700" oran={firma.yaslandirma.g60_90 / maxYas} />
            <YasKutu label="90+ gün" tutar={firma.yaslandirma.g90} tone="bg-red-200 text-red-800" oran={firma.yaslandirma.g90 / maxYas} />
          </div>

          <div className="overflow-x-auto">
            {firma.acikFaturalar.length === 0 && firma.faturalar.length === 0 ? (
              <EmptyState icon="fatura" title="Fatura yok" />
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-100">
                    <Th>No / Dönem</Th>
                    <Th>Vade</Th>
                    <Th className="text-right">Tutar</Th>
                    <Th className="text-right">Ödenen</Th>
                    <Th className="text-right">Kalan</Th>
                    <Th>Durum</Th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {firma.faturalar.map((f) => (
                    <tr key={f.id} className="hover:bg-slate-50/60">
                      <Td>
                        <div className="font-medium text-slate-900">{f.no}</div>
                        <div className="text-xs text-slate-400">Dönem: {f.donem}</div>
                      </Td>
                      <Td>{date(f.vadeTarihi)}</Td>
                      <Td className="text-right tabular-nums">{tl(f.genelToplam)}</Td>
                      <Td className="text-right tabular-nums text-emerald-600">{tl(f.odenen)}</Td>
                      <Td className={`text-right font-medium tabular-nums ${f.genelToplam - f.odenen > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>
                        {tl(f.genelToplam - f.odenen)}
                      </Td>
                      <Td><FaturaBadge durum={f.durum} /></Td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
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
      <dd className="text-right font-medium text-slate-800">{value}</dd>
    </div>
  )
}

function YasKutu({ label, tutar, tone, oran }: { label: string; tutar: number; tone: string; oran: number }) {
  return (
    <div className="rounded-xl bg-slate-50 p-3">
      <div className="flex items-baseline justify-between">
        <span className="text-[11px] font-medium text-slate-500">{label}</span>
        <span className={`text-sm font-semibold tabular-nums ${tone.split(' ')[1]}`}>{tl(tutar)}</span>
      </div>
      <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-200/60">
        <div className={`h-full rounded-full ${tone.split(' ')[0].replace('bg-', 'bg-')}`} style={{ width: `${Math.round(oran * 100)}%` }} />
      </div>
    </div>
  )
}