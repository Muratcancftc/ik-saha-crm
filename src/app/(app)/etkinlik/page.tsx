import { requireRoles } from '@/lib/dal'
import { prisma } from '@/lib/db'
import { startOfDay, addDays } from '@/lib/dates'
import { parseLocalDate } from '@/lib/donem'
import { Card, CardHeader, Th, Td, Badge, EmptyState } from '@/components/ui'
import { Icon } from '@/components/icons'

export const dynamic = 'force-dynamic'

export default async function EtkinlikLoguPage({
  searchParams,
}: {
  searchParams: Promise<{ tarih?: string }>
}) {
  await requireRoles(['patron'])
  const sp = await searchParams
  const gun = sp.tarih ? startOfDay(parseLocalDate(sp.tarih)) : startOfDay()
  const ertesi = addDays(gun, 1)
  const etiket = new Intl.DateTimeFormat('tr-TR', { day: '2-digit', month: 'long', year: 'numeric' }).format(gun)

  const [etkinlikler, kayitlar] = await Promise.all([
    prisma.kullaniciEtkinlik.findMany({
      where: { tarih: gun },
      include: { kullanici: { select: { id: true, ad: true, rol: true } } },
      orderBy: { aktifDakika: 'desc' },
    }),
    prisma.etkinlikKayit.findMany({
      where: { tarih: { gte: gun, lt: ertesi } },
      include: { kullanici: { select: { id: true, ad: true } } },
      orderBy: { tarih: 'asc' },
    }),
  ])

  const kullaniciKayitlari = new Map<number, typeof kayitlar>()
  for (const k of kayitlar) {
    if (!kullaniciKayitlari.has(k.kullaniciId)) kullaniciKayitlari.set(k.kullaniciId, [])
    kullaniciKayitlari.get(k.kullaniciId)!.push(k)
  }

  const toplamGiris = etkinlikler.reduce((a, e) => a + e.girisSayisi, 0)
  const toplamDakika = etkinlikler.reduce((a, e) => a + e.aktifDakika, 0)

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold tracking-tight text-slate-900">Etkinlik Logu</h2>
          <p className="mt-0.5 text-sm text-slate-500">Kullanıcı girişleri, aktif dakika ve ne yaptıkları (yalnızca yönetici)</p>
        </div>
        <form method="get" className="flex items-center gap-2">
          <input name="tarih" type="date" defaultValue={gun.toISOString().slice(0, 10)} className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500" />
          <button className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500">Git</button>
        </form>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Ozet label="Tarih" value={etiket} tone="text-slate-900" bg="bg-slate-50" />
        <Ozet label="Aktif Kullanıcı" value={`${etkinlikler.length}`} tone="text-indigo-600" bg="bg-indigo-50" />
        <Ozet label="Toplam Giriş" value={`${toplamGiris}`} tone="text-emerald-700" bg="bg-emerald-50" />
        <Ozet label="Toplam Aktif Dakika" value={`${toplamDakika} dk`} tone="text-amber-700" bg="bg-amber-50" />
      </div>

      <Card>
        <CardHeader title={`Günlük Özet (${etiket})`} desc="Kullanıcı başına giriş sayısı ve CRM'de geçirilen aktif dakika" />
        <div className="overflow-x-auto">
          {etkinlikler.length === 0 ? (
            <EmptyState icon="clock" title="Bu gün etkinlik yok" />
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-100">
                  <Th>Kullanıcı</Th>
                  <Th>Rol</Th>
                  <Th className="text-right">Giriş</Th>
                  <Th className="text-right">Aktif (dk)</Th>
                  <Th>Son Aktivite</Th>
                  <Th className="text-right">Detay</Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {etkinlikler.map((e) => (
                  <tr key={e.id} className="hover:bg-slate-50/60">
                    <Td className="font-medium text-slate-900">{e.kullanici.ad}</Td>
                    <Td>
                      <Badge tone={e.kullanici.rol === 'patron' ? 'green' : 'slate'}>{e.kullanici.rol.replace('_', ' ')}</Badge>
                    </Td>
                    <Td className="text-right tabular-nums">{e.girisSayisi}</Td>
                    <Td className="text-right tabular-nums font-semibold">{e.aktifDakika} dk</Td>
                    <Td className="tabular-nums">{e.sonAktivite ? new Intl.DateTimeFormat('tr-TR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }).format(e.sonAktivite) : '—'}</Td>
                    <Td className="text-right">
                      <details className="inline-block">
                        <summary className="cursor-pointer rounded-lg bg-white px-2.5 py-1 text-xs font-medium text-slate-600 ring-1 ring-slate-300 hover:bg-slate-50">Ne yaptı ({kullaniciKayitlari.get(e.kullaniciId)?.length ?? 0})</summary>
                        <div className="absolute z-10 mt-2 max-h-72 w-80 overflow-auto rounded-xl border border-slate-200 bg-white p-3 text-left shadow-lg">
                          {(kullaniciKayitlari.get(e.kullaniciId) ?? []).length === 0 ? (
                            <p className="text-xs text-slate-400">Kayıt yok</p>
                          ) : (
                            <ul className="space-y-1.5">
                              {(kullaniciKayitlari.get(e.kullaniciId) ?? []).map((k) => (
                                <li key={k.id} className="flex items-start gap-2 text-xs text-slate-600">
                                  <span className="mt-0.5 text-slate-300"><Icon name="clock" size={12} /></span>
                                  <span>
                                    <span className="tabular-nums text-slate-400">{new Intl.DateTimeFormat('tr-TR', { hour: '2-digit', minute: '2-digit' }).format(k.tarih)}</span>
                                    <span className="ml-1.5">{k.islem.startsWith('Sayfa:') ? <><b>Sayfa</b>: {k.islem.slice(6)}</> : k.islem}</span>
                                  </span>
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                      </details>
                    </Td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </Card>

      {/* Tüm aktivite akışı */}
      <Card>
        <CardHeader title={`Aktivite Akışı (${kayitlar.length})`} desc={`${etiket} — tüm kullanıcılar`} />
        <div className="overflow-x-auto">
          {kayitlar.length === 0 ? (
            <EmptyState icon="clock" title="Kayıt yok" />
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-100">
                  <Th>Saat</Th>
                  <Th>Kullanıcı</Th>
                  <Th>İşlem</Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {kayitlar.slice().reverse().map((k) => (
                  <tr key={k.id} className="hover:bg-slate-50/60">
                    <Td className="tabular-nums text-slate-500">{new Intl.DateTimeFormat('tr-TR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }).format(k.tarih)}</Td>
                    <Td className="font-medium text-slate-900">{k.kullanici.ad}</Td>
                    <Td className="text-slate-600">{k.islem.startsWith('Sayfa:') ? <>Sayfa: <span className="font-mono text-indigo-700">{k.islem.slice(6)}</span></> : <Badge tone={k.islem === 'Giriş yaptı' ? 'green' : k.islem === 'Çıkış yaptı' ? 'amber' : 'slate'}>{k.islem}</Badge>}</Td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </Card>

      <p className="px-1 text-[11px] text-slate-400">
        Aktif dakika, kullanıcı uygulamayı açık tutarken gönderilen dakikalık sinyallerden tahmin edilir. Sayfa ziyaretleri &quot;Sayfa: /yol&quot; olarak kaydedilir.
      </p>
    </div>
  )
}

function Ozet({ label, value, tone, bg }: { label: string; value: string; tone: string; bg: string }) {
  return (
    <div className={`rounded-2xl ${bg} px-4 py-3`}>
      <div className={`text-lg font-bold tabular-nums ${tone}`}>{value}</div>
      <div className="mt-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-500">{label}</div>
    </div>
  )
}