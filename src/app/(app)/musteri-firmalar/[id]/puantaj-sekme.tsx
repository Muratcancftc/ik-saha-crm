import Link from 'next/link'
import { prisma } from '@/lib/db'
import { Card, CardHeader, Th, Td, Badge, EmptyState } from '@/components/ui'
import { DonemDuzenle } from './ik-client'
import { donemUret, donemHesapla, setFirmaPeriyot } from '@/app/actions/ik'
import { tl, yuvarla, periyotEtiket } from '@/lib/ik'

export const dynamic = 'force-dynamic'

export default async function PuantajSekme({ firmaId, yazabilir }: { firmaId: number; yazabilir: boolean }) {
  const [firma, puantajlar, donemler] = await Promise.all([
    prisma.musteriFirma.findUnique({ where: { id: firmaId } }),
    prisma.puantajKayit.findMany({
      where: { firmaId },
      include: { isci: true },
      orderBy: { tarih: 'desc' },
      take: 40,
    }),
    prisma.odemeDonemi.findMany({
      where: { firmaId },
      include: { isci: true, odemeler: true },
      orderBy: { baslangic: 'desc' },
      take: 30,
    }),
  ])
  if (!firma) return null

  const aktifPersonel = await prisma.isci.count({ where: { firmaId, durum: 'aktif' } })

  return (
    <div className="space-y-5">
      {/* Firma periyodu + dönem üretme */}
      {yazabilir && (
        <Card>
          <CardHeader title="Ödeme Periyodu & Dönem Üretimi" desc="Firma varsayılanı; personel bazında ezilebilir. Sistem periyoda göre dönemleri otomatik oluşturur." />
          <div className="grid grid-cols-1 gap-4 px-5 py-4 lg:grid-cols-2">
            <form action={setFirmaPeriyot} className="flex flex-wrap items-end gap-2">
              <input type="hidden" name="firmaId" value={firmaId} />
              <div>
                <label className="mb-1 block text-[11px] font-medium text-slate-500">Firma Ödeme Periyodu</label>
                <select name="odemePeriyot" defaultValue={firma.odemePeriyot} className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500">
                  <option value="GUN_ARALIGI">Gün aralığı</option>
                  <option value="HAFTALIK">Haftalık</option>
                  <option value="AYLIK">Aylık</option>
                  <option value="SERBEST">Serbest</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-[11px] font-medium text-slate-500">Gün Aralığı (kaç günde bir)</label>
                <input name="gunAraligi" type="number" min={1} defaultValue={firma.gunAraligi} className="w-20 rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500" />
              </div>
              <button className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500">Periyodu Kaydet</button>
            </form>

            <form action={donemUret} className="flex flex-wrap items-end gap-2">
              <input type="hidden" name="firmaId" value={firmaId} />
              <div>
                <label className="mb-1 block text-[11px] font-medium text-slate-500">Başlangıç Tarihi</label>
                <input name="baslangic" type="date" required defaultValue={new Date().toISOString().slice(0, 10)} className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500" />
              </div>
              <div>
                <label className="mb-1 block text-[11px] font-medium text-slate-500">Dönem Adedi</label>
                <input name="adet" type="number" min={1} max={24} defaultValue={3} className="w-20 rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500" />
              </div>
              <button className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500">
                {aktifPersonel} Personel İçin Dönem Oluştur
              </button>
            </form>
          </div>
          <p className="px-5 pb-4 text-[11px] text-slate-400">
            Oluşturulan dönemler Ödenmedi (bekliyor) durumunda açılır; puantaj girildikten sonra &quot;Hesapla&quot; ile net tutar hesaplanır. Tarihler elle düzenlenebilir.
          </p>
        </Card>
      )}

      {/* Dönemler */}
      <Card>
        <CardHeader title={`Ödeme Dönemleri (${donemler.length})`} desc={`Firma periyodu: ${periyotEtiket(firma.odemePeriyot, firma.gunAraligi)}`} />
        <div className="overflow-x-auto">
          {donemler.length === 0 ? (
            <EmptyState icon="hakedis" title="Dönem yok" desc="Yukarıdan dönem oluşturun veya İK > Hakediş ekranını kullanın" />
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-100">
                  <Th>Personel</Th>
                  <Th>Dönem</Th>
                  <Th className="text-right">Brüt</Th>
                  <Th className="text-right">Net</Th>
                  <Th>Durum</Th>
                  <Th className="text-right">İşlem</Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {donemler.map((d) => {
                  const odenen = d.odemeler.reduce((a, o) => a + Number(o.tutar), 0)
                  return (
                    <tr key={d.id} className="hover:bg-slate-50/60">
                      <Td className="font-medium text-slate-900">{d.isci.ad}</Td>
                      <Td className="text-xs text-slate-500">
                        {d.baslangic.toLocaleDateString('tr-TR')} – {new Date(d.bitis.getTime() - 86400000).toLocaleDateString('tr-TR')}
                      </Td>
                      <Td className="text-right tabular-nums">{tl(Number(d.brutHakedis))}</Td>
                      <Td className="text-right font-semibold tabular-nums">{tl(Number(d.netOdenecek))}</Td>
                      <Td>
                        <Badge tone={d.durum === 'ODENDI' ? 'green' : d.durum === 'KISMI_ODENDI' ? 'amber' : 'slate'}>
                          {d.durum === 'ODENDI' ? 'Ödendi' : d.durum === 'KISMI_ODENDI' ? 'Kısmi' : 'Bekliyor'}
                        </Badge>
                        {d.kilitli && <span className="ml-1 text-[10px] text-emerald-600">kilitli</span>}
                      </Td>
                      <Td className="text-right">
                        {yazabilir && !d.kilitli && (
                          <div className="flex flex-wrap justify-end gap-1.5">
                            <form action={donemHesapla}>
                              <input type="hidden" name="isciId" value={d.isciId} />
                              <input type="hidden" name="firmaId" value={firmaId} />
                              <input type="hidden" name="baslangic" value={d.baslangic.toISOString().slice(0, 10)} />
                              <input type="hidden" name="bitis" value={d.bitis.toISOString().slice(0, 10)} />
                              <button className="rounded-lg bg-indigo-50 px-2.5 py-1 text-xs font-semibold text-indigo-700 hover:bg-indigo-100">Hesapla</button>
                            </form>
                            <DonemDuzenle donemId={d.id} baslangic={d.baslangic.toISOString().slice(0, 10)} bitis={new Date(d.bitis.getTime() - 86400000).toISOString().slice(0, 10)} />
                            <Link href="/ik/hakedis" className="rounded-lg bg-white px-2.5 py-1 text-xs font-medium text-slate-600 ring-1 ring-slate-300 hover:bg-slate-50">Öde</Link>
                          </div>
                        )}
                        {odenen > 0 && <div className="mt-1 text-[10px] text-slate-400">ödenen: {tl(yuvarla(odenen))}</div>}
                      </Td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
      </Card>

      {/* Puantaj kayıtları */}
      <Card>
        <CardHeader title={`Son Puantajlar (${puantajlar.length})`} desc="Bu firmanın puantaj kayıtları" />
        <div className="overflow-x-auto">
          {puantajlar.length === 0 ? (
            <EmptyState icon="puantaj" title="Puantaj kaydı yok" />
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-100">
                  <Th>Tarih</Th>
                  <Th>Personel</Th>
                  <Th>Tip</Th>
                  <Th className="text-right">Gün/Saat</Th>
                  <Th className="text-right">Tutar</Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {puantajlar.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50/60">
                    <Td>{p.tarih.toLocaleDateString('tr-TR')}</Td>
                    <Td className="font-medium text-slate-900">{p.isci.ad}</Td>
                    <Td><Badge tone={p.calismaTipi === 'SAATLIK' ? 'blue' : 'green'}>{p.calismaTipi === 'SAATLIK' ? 'Saatlik' : Number(p.fsi) === 0.5 ? 'Yarım' : 'Tam'}</Badge></Td>
                    <Td className="text-right tabular-nums">{p.calismaTipi === 'SAATLIK' ? `${Number(p.calisilanSaat)} sa` : `×${Number(p.fsi)}`}</Td>
                    <Td className="text-right font-semibold tabular-nums">{tl(Number(p.hesaplananTutar))}</Td>
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