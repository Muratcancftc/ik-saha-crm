import Link from 'next/link'
import { requireRoles } from '@/lib/dal'
import { prisma } from '@/lib/db'
import { parseLocalDate } from '@/lib/donem'
import { Card, CardHeader, Badge, EmptyState, Th, Td } from '@/components/ui'
import { Icon } from '@/components/icons'
import { OdemeForm } from './odeme-form'
import { donemHesapla, donemKilidiAc, odemeSil } from '@/app/actions/ik'
import { tl, yuvarla, donemAvansKesinti } from '@/lib/ik'
import { decrypt } from '@/lib/crypto'

export const dynamic = 'force-dynamic'

const AYLAR = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık']
function iso(d: Date) { return d.toISOString().slice(0, 10) }

export default async function IkHakedisPage({
  searchParams,
}: {
  searchParams: Promise<{ firma?: string; ay?: string }>
}) {
  const user = await requireRoles(['patron', 'muhasebe', 'operasyon', 'ik'])
  const sp = await searchParams

  const ayBas = sp.ay ? parseLocalDate(`${sp.ay}-01`) : new Date(new Date().getFullYear(), new Date().getMonth(), 1)
  const ayBit = new Date(ayBas.getFullYear(), ayBas.getMonth() + 1, 1)
  const ayEtiket = `${AYLAR[ayBas.getMonth()]} ${ayBas.getFullYear()}`

  const firmalar = await prisma.musteriFirma.findMany({ orderBy: { ad: 'asc' } })
  const seciliFirmaId = sp.firma ? Number(sp.firma) : firmalar[0]?.id ?? 0
  const seciliFirma = firmalar.find((f) => f.id === seciliFirmaId)

  const personel = await prisma.isci.findMany({
    where: { firmaId: seciliFirmaId, durum: 'aktif' },
    orderBy: { ad: 'asc' },
  })

  const [puantajlar, donemler] = await Promise.all([
    prisma.puantajKayit.groupBy({
      by: ['isciId'],
      where: { firmaId: seciliFirmaId, tarih: { gte: ayBas, lt: ayBit } },
      _sum: { hesaplananTutar: true },
      _count: true,
    }),
    prisma.odemeDonemi.findMany({
      where: { firmaId: seciliFirmaId, baslangic: ayBas, bitis: ayBit },
      include: { odemeler: true },
    }),
  ])

  const brutMap = new Map(puantajlar.map((p) => [p.isciId, { brut: Number(p._sum.hesaplananTutar ?? 0), adet: p._count }]))
  const donemMap = new Map(donemler.map((d) => [d.isciId, d]))

  const satirlar = await Promise.all(
    personel.map(async (i) => {
      const brut = yuvarla(brutMap.get(i.id)?.brut ?? 0)
      const adet = brutMap.get(i.id)?.adet ?? 0
      const { avans, kesinti } = await donemAvansKesinti(i.id, ayBas, ayBit)
      const net = yuvarla(brut - avans - kesinti)
      const donem = donemMap.get(i.id)
      const odenen = donem ? yuvarla(donem.odemeler.reduce((a, o) => a + Number(o.tutar), 0)) : 0
      return { isci: i, brut, adet, avans, kesinti, net, donem, odenen }
    })
  )

  const toplamNet = satirlar.reduce((a, s) => a + s.net, 0)
  const toplamOdenen = satirlar.reduce((a, s) => a + s.odenen, 0)
  const bekleyen = satirlar.reduce((a, s) => a + Math.max(0, s.net - s.odenen), 0)

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold tracking-tight text-slate-900">Hakediş & Ödeme</h2>
          <p className="mt-0.5 text-sm text-slate-500">Dönem hesapla → ödeme yöntemi (Elden/IBAN) seç → kaydet. Ödenen dönem kilitlenir.</p>
        </div>
        <form method="get" className="flex flex-wrap items-end gap-2">
          <div>
            <label className="mb-1 block text-[11px] font-medium text-slate-500">Firma</label>
            <select name="firma" defaultValue={String(seciliFirmaId)} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-500">
              {firmalar.map((f) => <option key={f.id} value={f.id}>{f.ad}</option>)}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-[11px] font-medium text-slate-500">Dönem</label>
            <input name="ay" type="month" defaultValue={`${ayBas.getFullYear()}-${String(ayBas.getMonth() + 1).padStart(2, '0')}`} className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500" />
          </div>
          <button className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500">Git</button>
        </form>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Ozet label="Toplam Net (dönem)" value={tl(yuvarla(toplamNet))} tone="text-slate-900" bg="bg-slate-50" />
        <Ozet label="Ödenen" value={tl(yuvarla(toplamOdenen))} tone="text-emerald-700" bg="bg-emerald-50" />
        <Ozet label="Bekleyen" value={tl(yuvarla(bekleyen))} tone="text-amber-700" bg="bg-amber-50" />
      </div>

      <Card>
        <CardHeader title={`${seciliFirma?.ad ?? '—'} — ${ayEtiket}`} desc="Personel bazlı dönem hakedişi" />
        <div className="overflow-x-auto">
          {satirlar.length === 0 ? (
            <EmptyState icon="hakedis" title="Bu firmada personel yok" />
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-100">
                  <Th>Personel</Th>
                  <Th className="text-right">Puantaj</Th>
                  <Th className="text-right">Brüt</Th>
                  <Th className="text-right">Avans</Th>
                  <Th className="text-right">Kesinti</Th>
                  <Th className="text-right">Net</Th>
                  <Th className="text-right">Ödenen</Th>
                  <Th>Durum</Th>
                  <Th className="text-right">İşlem</Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {satirlar.map((s) => (
                  <tr key={s.isci.id} className="hover:bg-slate-50/60">
                    <Td>
                      <Link href={`/ik/personel/${s.isci.id}`} className="font-medium text-slate-900 hover:text-indigo-600">{s.isci.ad}</Link>
                    </Td>
                    <Td className="text-right tabular-nums text-slate-500">{s.adet} gün</Td>
                    <Td className="text-right tabular-nums">{tl(s.brut)}</Td>
                    <Td className="text-right tabular-nums text-amber-700">{tl(s.avans)}</Td>
                    <Td className="text-right tabular-nums text-rose-700">{tl(s.kesinti)}</Td>
                    <Td className="text-right font-semibold tabular-nums text-slate-900">{tl(s.net)}</Td>
                    <Td className="text-right tabular-nums">{tl(s.odenen)}</Td>
                    <Td>
                      {s.donem ? (
                        <Badge tone={s.donem.durum === 'ODENDI' ? 'green' : s.donem.durum === 'KISMI_ODENDI' ? 'amber' : 'slate'}>
                          {s.donem.durum === 'ODENDI' ? 'Ödendi' : s.donem.durum === 'KISMI_ODENDI' ? 'Kısmi' : 'Bekliyor'}
                        </Badge>
                      ) : (
                        <Badge tone="slate">Hesaplanmadı</Badge>
                      )}
                    </Td>
                    <Td className="text-right">
                      <div className="flex flex-wrap justify-end gap-1.5">
                        {!s.donem ? (
                          <form action={donemHesapla}>
                            <input type="hidden" name="isciId" value={s.isci.id} />
                            <input type="hidden" name="firmaId" value={seciliFirmaId} />
                            <input type="hidden" name="baslangic" value={iso(ayBas)} />
                            <input type="hidden" name="bitis" value={iso(ayBit)} />
                            <button className="rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-200">Hesapla</button>
                          </form>
                        ) : (
                          <>
                            {s.donem.kilitli ? (
                              user.rol === 'patron' ? (
                                <form action={donemKilidiAc}>
                                  <input type="hidden" name="id" value={s.donem.id} />
                                  <button className="rounded-lg bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-700 ring-1 ring-amber-200 hover:bg-amber-100">Kilidi Aç</button>
                                </form>
                              ) : (
                                <Badge tone="green">Kilitli</Badge>
                              )
                            ) : (
                              <OdemeForm
                                donem={{
                                  id: s.donem.id,
                                  isciAd: s.isci.ad,
                                  firmaAd: seciliFirma?.ad ?? '',
                                  netOdenecek: Number(s.donem.netOdenecek),
                                  odenen: s.odenen,
                                  varsayilanYontem: s.isci.varsayilanOdemeYontemi,
                                  iban: decrypt(s.isci.iban),
                                  hesapSahibi: s.isci.ad,
                                }}
                              />
                            )}
                            <Link href={`/ik/hakedis/yazdir/${s.donem.id}`} target="_blank" className="rounded-lg bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 ring-1 ring-slate-300 hover:bg-slate-50">
                              Yazdır
                            </Link>
                          </>
                        )}
                      </div>
                    </Td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </Card>

      {/* Ödeme kayıtları */}
      <Card>
        <CardHeader title="Dönem Ödemeleri" desc="Yapılan ödemeler ve yöntemleri" />
        <div className="overflow-x-auto">
          {donemler.every((d) => d.odemeler.length === 0) ? (
            <p className="px-5 py-6 text-center text-xs text-slate-400">Bu dönemde ödeme kaydı yok</p>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-100">
                  <Th>Personel</Th>
                  <Th>Tarih</Th>
                  <Th className="text-right">Tutar</Th>
                  <Th>Yöntem</Th>
                  <Th>Detay</Th>
                  <Th className="text-right">İşlem</Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {donemler.flatMap((d) => {
                  const isci = personel.find((p) => p.id === d.isciId)
                  return d.odemeler.map((o) => (
                    <tr key={o.id} className="hover:bg-slate-50/60">
                      <Td className="font-medium text-slate-900">{isci?.ad ?? '—'}</Td>
                      <Td>{o.tarih.toLocaleDateString('tr-TR')}</Td>
                      <Td className="text-right font-semibold tabular-nums">{tl(Number(o.tutar))}</Td>
                      <Td>
                        <Badge tone={o.yontem === 'IBAN' ? 'blue' : 'amber'}>{o.yontem === 'IBAN' ? 'IBAN' : 'Zarf'}</Badge>
                      </Td>
                      <Td className="text-xs text-slate-500">
                        {o.yontem === 'IBAN'
                          ? `${o.hesapSahibi ?? ''} ${o.ibanSnapshot ? `· ${o.ibanSnapshot.slice(0, 8)}…` : ''}${o.yakininaOdeme ? ' · yakınına' : ''}`
                          : `Zarf: ${o.zarfNo ?? '—'} · Teslim: ${o.teslimAlan ?? '—'}`}
                      </Td>
                      <Td className="text-right">
                        {user.rol === 'patron' && (
                          <form action={odemeSil}>
                            <input type="hidden" name="id" value={o.id} />
                            <button className="rounded-lg p-1.5 text-slate-300 hover:bg-red-50 hover:text-red-600" title="Sil"><Icon name="trash" size={14} /></button>
                          </form>
                        )}
                      </Td>
                    </tr>
                  ))
                })}
              </tbody>
            </table>
          )}
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