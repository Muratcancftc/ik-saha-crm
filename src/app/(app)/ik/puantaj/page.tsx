import { requireRoles } from '@/lib/dal'
import { prisma } from '@/lib/db'
import { startOfDay, addDays, sameDay } from '@/lib/dates'
import { parseLocalDate } from '@/lib/donem'
import { Card, CardHeader, Badge, EmptyState } from '@/components/ui'
import { Icon } from '@/components/icons'
import { puantajGir, puantajToplu, puantajSil } from '@/app/actions/ik'
import { tl, ucretCozumle, yuvarla } from '@/lib/ik'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

function iso(d: Date) { return d.toISOString().slice(0, 10) }
const AYLAR = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık']

export default async function IkPuantajPage({
  searchParams,
}: {
  searchParams: Promise<{ tarih?: string; firma?: string; ay?: string }>
}) {
  await requireRoles(['patron', 'muhasebe', 'operasyon', 'ik'])
  const sp = await searchParams

  const tarih = sp.tarih ? startOfDay(parseLocalDate(sp.tarih)) : startOfDay()
  const firmalar = await prisma.musteriFirma.findMany({ orderBy: { ad: 'asc' } })
  const seciliFirmaId = sp.firma ? Number(sp.firma) : firmalar[0]?.id ?? 0
  const seciliFirma = firmalar.find((f) => f.id === seciliFirmaId)

  // ay görünümü
  const ayBas = sp.ay ? parseLocalDate(`${sp.ay}-01`) : new Date(tarih.getFullYear(), tarih.getMonth(), 1)
  const ayBit = new Date(ayBas.getFullYear(), ayBas.getMonth() + 1, 1)
  const ayEtiket = `${AYLAR[ayBas.getMonth()]} ${ayBas.getFullYear()}`
  const ayGunSayisi = new Date(ayBas.getFullYear(), ayBas.getMonth() + 1, 0).getDate()

  const [personel, bugunPuantaj, ayPuantaj] = await Promise.all([
    prisma.isci.findMany({
      where: { firmaId: seciliFirmaId, durum: 'aktif' },
      include: { meslekler: { include: { meslek: true } } },
      orderBy: { ad: 'asc' },
    }),
    prisma.puantajKayit.findMany({
      where: { firmaId: seciliFirmaId, tarih: { gte: tarih, lt: addDays(tarih, 1) } },
    }),
    prisma.puantajKayit.findMany({
      where: { firmaId: seciliFirmaId, tarih: { gte: ayBas, lt: ayBit } },
      select: { tarih: true, fsi: true },
    }),
  ])

  const bugunMap = new Map(bugunPuantaj.map((p) => [p.isciId, p]))
  const cozumler = await Promise.all(personel.map((i) => ucretCozumle(i.id, seciliFirmaId, tarih)))
  const gunlukSayilar = new Map<number, number>()
  for (const p of ayPuantaj) gunlukSayilar.set(p.tarih.getDate(), (gunlukSayilar.get(p.tarih.getDate()) ?? 0) + Number(p.fsi))

  const bugunToplam = bugunPuantaj.reduce((a, p) => a + Number(p.hesaplananTutar), 0)

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold tracking-tight text-slate-900">Puantaj Girişi</h2>
          <p className="mt-0.5 text-sm text-slate-500">Hızlı giriş: Tam / Yarım / Gelmedi — ücret satırda elle ezilebilir</p>
        </div>
        <form method="get" className="flex flex-wrap items-end gap-2">
          <div>
            <label className="mb-1 block text-[11px] font-medium text-slate-500">Firma</label>
            <select name="firma" defaultValue={String(seciliFirmaId)} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-500">
              {firmalar.map((f) => <option key={f.id} value={f.id}>{f.ad}</option>)}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-[11px] font-medium text-slate-500">Tarih</label>
            <input name="tarih" type="date" defaultValue={iso(tarih)} className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500" />
          </div>
          <input type="hidden" name="ay" value={`${ayBas.getFullYear()}-${String(ayBas.getMonth() + 1).padStart(2, '0')}`} />
          <button className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500">Git</button>
        </form>
      </div>

      {/* Günlük giriş */}
      <Card>
        <CardHeader
          title={`${seciliFirma?.ad ?? '—'} — Günlük Puantaj`}
          desc={`${seciliFirma?.ad ?? '—'} · Aynı güne ikinci giriş uyarı verir; yeniden gönderimde üzerine yazılır. Gün toplamı: ${tl(yuvarla(bugunToplam))}`}
        />
        {personel.length === 0 ? (
          <EmptyState icon="isci" title="Bu firmada aktif personel yok" desc="İK Personel sayfasından personelin firmasını atayın" />
        ) : (
          <div className="divide-y divide-slate-100">
            {personel.map((i, idx) => {
              const mevcut = bugunMap.get(i.id)
              const cozum = cozumler[idx]
              return (
                <div key={i.id} className="px-5 py-3">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-indigo-50 text-xs font-semibold text-indigo-600">
                        {i.ad.split(' ').map((p) => p[0]).slice(0, 2).join('')}
                      </div>
                      <div className="min-w-0">
                        <div className="text-sm font-medium text-slate-900">{i.ad}</div>
                        <div className="text-xs text-slate-500">
                          {cozum.calismaTipi === 'SAATLIK' ? 'Saatlik' : 'Günlük'} · {tl(cozum.gunlukUcret)} · <span className="capitalize">{cozum.kaynak}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      {mevcut ? (
                        <Badge tone={Number(mevcut.fsi) === 0 ? 'red' : Number(mevcut.fsi) === 0.5 ? 'amber' : 'green'}>
                          {Number(mevcut.fsi) === 0 ? 'Gelmedi' : Number(mevcut.fsi) === 0.5 ? 'Yarım' : 'Tam'} · {tl(Number(mevcut.hesaplananTutar))}
                          {mevcut.ucretManuelMi ? ' · elle' : ''}
                        </Badge>
                      ) : (
                        <Badge tone="slate">Kayıt yok</Badge>
                      )}
                      <form action={puantajGir} className="flex overflow-hidden rounded-lg border border-slate-200">
                        <input type="hidden" name="isciId" value={i.id} />
                        <input type="hidden" name="firmaId" value={seciliFirmaId} />
                        <input type="hidden" name="tarih" value={iso(tarih)} />
                        <input type="hidden" name="calismaTipi" value={cozum.calismaTipi} />
                        <input type="hidden" name="calisilanSaat" value={cozum.calismaTipi === 'SAATLIK' ? 8 : 0} />
                        <input type="hidden" name="uzerineYaz" value={mevcut ? '1' : '0'} />
                        <button type="submit" name="fsi" value="1" className="px-2.5 py-1.5 text-xs font-medium text-emerald-700 hover:bg-emerald-50">Tam</button>
                        <button type="submit" name="fsi" value="0.5" className="border-l border-slate-200 px-2.5 py-1.5 text-xs font-medium text-amber-700 hover:bg-amber-50">Yarım</button>
                        <button type="submit" name="fsi" value="0" className="border-l border-slate-200 px-2.5 py-1.5 text-xs font-medium text-red-700 hover:bg-red-50">Gelmedi</button>
                      </form>
                      {mevcut && (
                        <form action={puantajSil}>
                          <input type="hidden" name="id" value={mevcut.id} />
                          <button className="rounded-lg p-1.5 text-slate-300 hover:bg-red-50 hover:text-red-600" title="Kaydı sil"><Icon name="x" size={14} /></button>
                        </form>
                      )}
                    </div>
                  </div>
                  {/* Elle ezme (override) */}
                  <details className="mt-2">
                    <summary className="cursor-pointer text-[11px] font-medium text-slate-400 hover:text-indigo-600">Ücret / saat / mesai elle gir</summary>
                    <form action={puantajGir} className="mt-2 flex flex-wrap items-end gap-2 rounded-xl bg-slate-50 p-3">
                      <input type="hidden" name="isciId" value={i.id} />
                      <input type="hidden" name="firmaId" value={seciliFirmaId} />
                      <input type="hidden" name="tarih" value={iso(tarih)} />
                      <input type="hidden" name="uzerineYaz" value="1" />
                      <input type="hidden" name="calismaTipi" value={cozum.calismaTipi} />
                      <div>
                        <label className="mb-1 block text-[10px] text-slate-500">Tam/Yarım</label>
                        <select name="fsi" defaultValue="1" className="rounded-lg border border-slate-300 px-2 py-1.5 text-xs outline-none focus:border-indigo-500">
                          <option value="1">Tam</option>
                          <option value="0.5">Yarım</option>
                          <option value="0">Gelmedi</option>
                        </select>
                      </div>
                      {cozum.calismaTipi === 'SAATLIK' && (
                        <div>
                          <label className="mb-1 block text-[10px] text-slate-500">Çalışılan Saat</label>
                          <input name="calisilanSaat" type="number" step="0.5" min={0} defaultValue={8} className="w-20 rounded-lg border border-slate-300 px-2 py-1.5 text-xs outline-none focus:border-indigo-500" />
                        </div>
                      )}
                      <div>
                        <label className="mb-1 block text-[10px] text-slate-500">Mesai Saat</label>
                        <input name="mesaiSaat" type="number" step="0.5" min={0} defaultValue={0} className="w-20 rounded-lg border border-slate-300 px-2 py-1.5 text-xs outline-none focus:border-indigo-500" />
                      </div>
                      <div>
                        <label className="mb-1 block text-[10px] text-slate-500">Günlük ₺ (ez)</label>
                        <input name="gunlukUcret" type="number" step="1" min={0} placeholder={String(cozum.gunlukUcret)} className="w-24 rounded-lg border border-slate-300 px-2 py-1.5 text-xs outline-none focus:border-indigo-500" />
                      </div>
                      <div>
                        <label className="mb-1 block text-[10px] text-slate-500">Saatlik ₺ (ez)</label>
                        <input name="saatlikUcret" type="number" step="1" min={0} placeholder={String(cozum.saatlikUcret)} className="w-24 rounded-lg border border-slate-300 px-2 py-1.5 text-xs outline-none focus:border-indigo-500" />
                      </div>
                      <button className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-500">Kaydet</button>
                    </form>
                  </details>
                </div>
              )
            })}
          </div>
        )}
      </Card>

      {/* Toplu işaretleme */}
      {personel.length > 0 && (
        <Card>
          <CardHeader title="Toplu İşaretleme" desc="Seçili personellere aynı durumu uygula (üzerine yazar)" />
          <form action={puantajToplu} className="px-5 py-4">
            <input type="hidden" name="firmaId" value={seciliFirmaId} />
            <input type="hidden" name="tarih" value={iso(tarih)} />
            <div className="mb-3 flex flex-wrap gap-2">
              {personel.map((i) => (
                <label key={i.id} className="flex cursor-pointer items-center gap-1.5 rounded-full border border-slate-200 px-3 py-1.5 text-xs text-slate-700 has-[:checked]:border-indigo-500 has-[:checked]:bg-indigo-50">
                  <input type="checkbox" name="isciIds" value={i.id} className="accent-indigo-600" />
                  {i.ad}
                </label>
              ))}
            </div>
            <div className="flex flex-wrap gap-2">
              <button name="fsi" value="1" className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500">Seçilenlere Tam Gün</button>
              <button name="fsi" value="0.5" className="rounded-lg bg-amber-500 px-4 py-2 text-sm font-medium text-white hover:bg-amber-400">Yarım Gün</button>
              <button name="fsi" value="0" className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-500">Gelmedi</button>
            </div>
          </form>
        </Card>
      )}

      {/* Aylık özet */}
      <Card>
        <CardHeader title={`Aylık Görünüm — ${ayEtiket}`} desc={`${seciliFirma?.ad ?? '—'} · günlük toplam gün katsayısı`} />
        <div className="grid grid-cols-7 gap-1.5 px-5 py-4 sm:grid-cols-10 lg:grid-cols-16">
          {Array.from({ length: ayGunSayisi }, (_, k) => k + 1).map((gun) => {
            const sayi = gunlukSayilar.get(gun) ?? 0
            const d = new Date(ayBas.getFullYear(), ayBas.getMonth(), gun)
            const bugun = sameDay(d, startOfDay())
            return (
              <Link
                key={gun}
                href={`/ik/puantaj?firma=${seciliFirmaId}&tarih=${iso(d)}&ay=${ayBas.getFullYear()}-${String(ayBas.getMonth() + 1).padStart(2, '0')}`}
                className={`rounded-lg border p-1.5 text-center transition ${bugun ? 'border-indigo-500 bg-indigo-50' : sayi > 0 ? 'border-emerald-200 bg-emerald-50 hover:border-emerald-300' : 'border-slate-100 hover:border-slate-300'}`}
              >
                <div className="text-[11px] font-semibold text-slate-700">{gun}</div>
                <div className={`text-[11px] font-bold tabular-nums ${sayi > 0 ? 'text-emerald-700' : 'text-slate-300'}`}>{sayi}</div>
              </Link>
            )
          })}
        </div>
      </Card>
    </div>
  )
}