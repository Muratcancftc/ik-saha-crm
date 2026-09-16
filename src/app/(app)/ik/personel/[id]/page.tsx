import { notFound } from 'next/navigation'
import Link from 'next/link'
import { requireRoles } from '@/lib/dal'
import { prisma } from '@/lib/db'
import { decrypt, maskTC, maskIBAN } from '@/lib/crypto'
import { date } from '@/lib/format'
import { Card, CardHeader, Badge, Th, Td, EmptyState } from '@/components/ui'
import { Icon } from '@/components/icons'
import { IkPersonelForm } from '../ik-personel-form'
import { kesintiEkle, kesintiSil } from '@/app/actions/ik'
import { avansEkle } from '@/app/actions/isci'
import { tl, yuvarla, ucretCozumle, varsayilanUcret, varsayilanSaatlikUcret } from '@/lib/ik'
import { bolgeEtiket, BOLGE_TONE } from '@/lib/bolge'

export const dynamic = 'force-dynamic'

const KESINTI_TUR: Record<string, string> = { sgk: 'SGK', avans_mahsup: 'Avans Mahsup', ceza: 'Ceza', diger: 'Diğer' }

export default async function IkPersonelDetayPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireRoles(['patron', 'muhasebe', 'operasyon', 'ik'])
  const { id } = await params
  const isciId = Number(id)
  if (!isciId) notFound()

  const isci = await prisma.isci.findUnique({
    where: { id: isciId },
    include: {
      meslekler: { include: { meslek: true } },
      firma: true,
      personelUcretler: { orderBy: { gecerlilikBaslangic: 'desc' } },
      puantajKayitlari: { orderBy: { tarih: 'desc' }, take: 60 },
      kesintiler: { orderBy: { tarih: 'desc' }, take: 30 },
      avanslar: { orderBy: { tarih: 'desc' }, take: 30 },
      odemeDonemleri: { orderBy: { baslangic: 'desc' }, include: { odemeler: true, firma: true } },
    },
  })
  if (!isci) notFound()

  const tamGorur = user.rol === 'patron' || user.rol === 'ik'
  const duzenlemeVar = ['patron', 'muhasebe', 'operasyon'].includes(user.rol)
  const cozum = isci.firmaId ? await ucretCozumle(isci.id, isci.firmaId, new Date()) : null

  // Form için: firmalar (varsayılan ücretleriyle), meslekler, sistem varsayılanları, kullanıcılar (ücret geçmişi)
  const [sistemGunluk, sistemSaatlik, firmalar, meslekler, firmaUcretleri, kullanicilar] = await Promise.all([
    varsayilanUcret(),
    varsayilanSaatlikUcret(),
    prisma.musteriFirma.findMany({ orderBy: { ad: 'asc' } }),
    prisma.meslek.findMany({ orderBy: { ad: 'asc' } }),
    prisma.firmaUcret.findMany({ where: { gecerlilikBitis: null } }),
    prisma.kullanici.findMany({ select: { id: true, ad: true } }),
  ])
  const firmaUcretMap = new Map<number, { gunluk: number; saatlik: number }>()
  for (const f of firmaUcretleri) firmaUcretMap.set(f.firmaId, { gunluk: Number(f.gunlukUcret), saatlik: Number(f.saatlikUcret) })
  const kullaniciMap = new Map(kullanicilar.map((k) => [k.id, k.ad]))
  const firmaUcretDto = firmalar.map((f) => {
    const u = firmaUcretMap.get(f.id)
    return { id: f.id, ad: f.ad, gunlukUcret: u?.gunluk ?? null, saatlikUcret: u?.saatlik ?? null }
  })

  const toplamPuantajTutar = isci.puantajKayitlari.reduce((a, p) => a + Number(p.hesaplananTutar), 0)
  const toplamAvans = isci.avanslar.filter((a) => a.durum === 'verildi').reduce((a, x) => a + Number(x.tutar), 0)
  const toplamKesinti = isci.kesintiler.reduce((a, k) => a + Number(k.tutar), 0)

  return (
    <div className="space-y-5">
      {/* Başlık */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link href="/ik/personel" className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700">
            <Icon name="x" size={18} />
          </Link>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-lg font-semibold text-slate-900">{isci.ad}</h2>
              <Badge tone={BOLGE_TONE[isci.bolge]}>{bolgeEtiket(isci.bolge)}</Badge>
              <Badge tone={isci.durum === 'aktif' ? 'green' : 'slate'}>{isci.durum === 'aktif' ? 'Aktif' : 'Pasif'}</Badge>
              <Badge tone={isci.varsayilanOdemeYontemi === 'IBAN' ? 'blue' : 'amber'}>
                {isci.varsayilanOdemeYontemi === 'IBAN' ? 'IBAN' : 'Zarf'}
              </Badge>
            </div>
            <p className="mt-0.5 text-xs text-slate-500">
              {isci.firma?.ad ?? 'Firma atanmamış'} · {isci.meslekler.map((m) => m.meslek.ad).join(', ') || 'Pozisyon yok'}
            </p>
          </div>
        </div>
        {duzenlemeVar && (
          <IkPersonelForm
            mode="edit"
            personel={{
              id: isci.id,
              ad: isci.ad,
              telefon: isci.telefon,
              bolge: isci.bolge,
              firmaId: isci.firmaId,
              calismaTipi: isci.calismaTipi,
              odemeYontemi: isci.varsayilanOdemeYontemi,
              meslekId: isci.meslekler[0]?.meslekId ?? null,
              gunlukUcret: cozum?.gunlukUcret ?? sistemGunluk,
              saatlikUcret: cozum?.saatlikUcret ?? 0,
              odemePeriyot: isci.odemePeriyot,
              gunAraligi: isci.gunAraligi,
            }}
            firmalar={firmaUcretDto}
            meslekler={meslekler.map((m) => ({ id: m.id, ad: m.ad }))}
            varsayilanGunluk={sistemGunluk}
            varsayilanSaatlik={sistemSaatlik}
          />
        )}
      </div>

      {/* Özet */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Ozet label="Uygulanan Günlük" value={cozum ? tl(cozum.gunlukUcret) : '—'} sub={cozum ? `Kaynak: ${cozum.kaynak === 'personel' ? 'Personel' : cozum.kaynak === 'firma' ? 'Firma' : 'Sistem'}` : ''} tone="text-indigo-600" />
        <Ozet label="Puantaj Tutarı (toplam)" value={tl(yuvarla(toplamPuantajTutar))} sub={`${isci.puantajKayitlari.length} kayıt`} tone="text-slate-900" />
        <Ozet label="Avans (açık)" value={tl(yuvarla(toplamAvans))} sub="mahsup edilmemiş" tone="text-amber-700" />
        <Ozet label="Kesinti (toplam)" value={tl(yuvarla(toplamKesinti))} tone="text-rose-700" />
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
        {/* Bilgiler */}
        <Card>
          <CardHeader title="Bilgiler" desc="Kimlik ve iletişim (TC/IBAN yetkiye göre maskeli)" />
          <div className="px-5 py-4">
            <dl className="grid grid-cols-1 gap-x-6 gap-y-2.5 text-sm sm:grid-cols-2">
              <Satir label="Telefon" value={isci.telefon || '—'} />
              <Satir label="Çalışma Tipi" value={isci.calismaTipi === 'SAATLIK' ? 'Saatlik' : 'Günlük'} />
              <Satir label="TC Kimlik" value={tamGorur ? decrypt(isci.tcKimlik) : maskTC(decrypt(isci.tcKimlik))} />
              <Satir label="IBAN" value={tamGorur ? decrypt(isci.iban) : maskIBAN(decrypt(isci.iban))} />
              <Satir label="Kayıt Tarihi" value={date(isci.createdAt)} />
              <Satir label="Puan" value={String(isci.puan)} />
            </dl>
          </div>
        </Card>

        {/* Ücret geçmişi */}
        <Card>
          <CardHeader
            title="Ücret Geçmişi"
            desc="Ücret değişikliği personel formundan yapılır; eski kayıt kapanır, silinmez"
          />
          <div className="overflow-x-auto">
            {isci.personelUcretler.length === 0 ? (
              <p className="px-5 py-6 text-center text-xs text-slate-400">Personel bazlı ücret yok — firma/sistem ücreti uygulanıyor</p>
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-100">
                    <Th>Başlangıç</Th>
                    <Th>Bitiş</Th>
                    <Th className="text-right">Günlük</Th>
                    <Th className="text-right">Saatlik</Th>
                    <Th>Değiştiren</Th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {isci.personelUcretler.map((u) => (
                    <tr key={u.id} className={u.gecerlilikBitis ? '' : 'bg-emerald-50/40'}>
                      <Td>{date(u.gecerlilikBaslangic)}</Td>
                      <Td>{u.gecerlilikBitis ? date(u.gecerlilikBitis) : <Badge tone="green">Geçerli</Badge>}</Td>
                      <Td className="text-right tabular-nums">{tl(Number(u.gunlukUcret))}</Td>
                      <Td className="text-right tabular-nums">{Number(u.saatlikUcret) > 0 ? tl(Number(u.saatlikUcret)) : '—'}</Td>
                      <Td className="text-xs text-slate-500">{u.olusturanKullaniciId ? (kullaniciMap.get(u.olusturanKullaniciId) ?? '—') : '—'}</Td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </Card>
      </div>

      {/* Puantaj geçmişi */}
      <Card>
        <CardHeader title={`Puantaj Geçmişi (${isci.puantajKayitlari.length})`} desc="Uygulanan ücret snapshot olarak saklanır" />
        <div className="overflow-x-auto">
          {isci.puantajKayitlari.length === 0 ? (
            <EmptyState icon="puantaj" title="Puantaj kaydı yok" />
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-100">
                  <Th>Tarih</Th>
                  <Th>Tip</Th>
                  <Th className="text-right">Gün/Saat</Th>
                  <Th className="text-right">Mesai</Th>
                  <Th className="text-right">Uyg. Günlük</Th>
                  <Th className="text-right">Uyg. Saatlik</Th>
                  <Th className="text-right">Tutar</Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {isci.puantajKayitlari.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50/60">
                    <Td>{date(p.tarih)}</Td>
                    <Td>
                      <Badge tone={p.calismaTipi === 'SAATLIK' ? 'blue' : 'green'}>{p.calismaTipi === 'SAATLIK' ? 'Saatlik' : Number(p.fsi) === 0.5 ? 'Yarım' : 'Tam'}</Badge>
                      {p.ucretManuelMi && <Badge tone="violet" className="ml-1">Elle</Badge>}
                    </Td>
                    <Td className="text-right tabular-nums">{p.calismaTipi === 'SAATLIK' ? `${Number(p.calisilanSaat)} sa` : `×${Number(p.fsi)}`}</Td>
                    <Td className="text-right tabular-nums">{Number(p.mesaiSaat) > 0 ? `${Number(p.mesaiSaat)} sa` : '—'}</Td>
                    <Td className="text-right tabular-nums">{tl(Number(p.uygulananGunlukUcret))}</Td>
                    <Td className="text-right tabular-nums">{Number(p.uygulananSaatlikUcret) > 0 ? tl(Number(p.uygulananSaatlikUcret)) : '—'}</Td>
                    <Td className="text-right font-semibold tabular-nums text-slate-900">{tl(Number(p.hesaplananTutar))}</Td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
        {/* Avans */}
        <Card>
          <CardHeader title="Avanslar" desc="Mahsup edilene kadar dönem net ödemesinden düşülür" />
          <div className="px-5 py-3">
            {duzenlemeVar && (
              <form action={avansEkle} className="mb-3 flex flex-wrap items-end gap-2">
                <input type="hidden" name="isciId" value={isci.id} />
                <input name="tutar" type="number" min={0} required placeholder="Tutar ₺" className="w-28 rounded-lg border border-slate-300 px-2 py-1.5 text-xs outline-none focus:border-indigo-500" />
                <input name="tarih" type="date" className="rounded-lg border border-slate-300 px-2 py-1.5 text-xs outline-none focus:border-indigo-500" />
                <button className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-500">Avans Ekle</button>
              </form>
            )}
            {isci.avanslar.length === 0 ? (
              <p className="py-4 text-center text-xs text-slate-400">Avans yok</p>
            ) : (
              <ul className="divide-y divide-slate-50">
                {isci.avanslar.map((a) => (
                  <li key={a.id} className="flex items-center justify-between py-2 text-sm">
                    <span className="text-slate-600">{date(a.tarih)}</span>
                    <span className="flex items-center gap-2">
                      <span className="font-semibold tabular-nums">{tl(Number(a.tutar))}</span>
                      <Badge tone={a.durum === 'mahsup' ? 'slate' : 'amber'}>{a.durum === 'mahsup' ? 'Mahsup' : 'Açık'}</Badge>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </Card>

        {/* Kesinti */}
        <Card>
          <CardHeader title="Kesintiler" desc="Dönem net ödemesinden düşülür" />
          <div className="px-5 py-3">
            {duzenlemeVar && (
              <form action={kesintiEkle} className="mb-3 flex flex-wrap items-end gap-2">
                <input type="hidden" name="isciId" value={isci.id} />
                <select name="tur" className="rounded-lg border border-slate-300 px-2 py-1.5 text-xs outline-none focus:border-indigo-500">
                  <option value="sgk">SGK</option>
                  <option value="avans_mahsup">Avans Mahsup</option>
                  <option value="ceza">Ceza</option>
                  <option value="diger">Diğer</option>
                </select>
                <input name="tutar" type="number" min={0} required placeholder="Tutar ₺" className="w-28 rounded-lg border border-slate-300 px-2 py-1.5 text-xs outline-none focus:border-indigo-500" />
                <input name="tarih" type="date" className="rounded-lg border border-slate-300 px-2 py-1.5 text-xs outline-none focus:border-indigo-500" />
                <button className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-500">Ekle</button>
              </form>
            )}
            {isci.kesintiler.length === 0 ? (
              <p className="py-4 text-center text-xs text-slate-400">Kesinti yok</p>
            ) : (
              <ul className="divide-y divide-slate-50">
                {isci.kesintiler.map((k) => (
                  <li key={k.id} className="flex items-center justify-between py-2 text-sm">
                    <span className="flex items-center gap-2 text-slate-600">
                      {date(k.tarih)} <Badge tone="slate">{KESINTI_TUR[k.tur] ?? k.tur}</Badge>
                    </span>
                    <span className="flex items-center gap-2">
                      <span className="font-semibold tabular-nums text-rose-700">{tl(Number(k.tutar))}</span>
                      {duzenlemeVar && (
                        <form action={kesintiSil}>
                          <input type="hidden" name="id" value={k.id} />
                          <button className="rounded-lg p-1 text-slate-300 hover:bg-red-50 hover:text-red-600"><Icon name="x" size={13} /></button>
                        </form>
                      )}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </Card>
      </div>

      {/* Ödeme geçmişi */}
      <Card>
        <CardHeader title={`Ödeme Dönemleri (${isci.odemeDonemleri.length})`} desc="Dönem hakedişi, ödemeler ve kilit durumu" />
        <div className="overflow-x-auto">
          {isci.odemeDonemleri.length === 0 ? (
            <EmptyState icon="hakedis" title="Ödeme dönemi yok" />
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-100">
                  <Th>Dönem</Th>
                  <Th>Firma</Th>
                  <Th className="text-right">Brüt</Th>
                  <Th className="text-right">Avans</Th>
                  <Th className="text-right">Kesinti</Th>
                  <Th className="text-right">Net</Th>
                  <Th>Ödenen</Th>
                  <Th>Durum</Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {isci.odemeDonemleri.map((d) => {
                  const odenen = d.odemeler.reduce((a, o) => a + Number(o.tutar), 0)
                  return (
                    <tr key={d.id} className="hover:bg-slate-50/60">
                      <Td>{date(d.baslangic)} – {date(new Date(d.bitis.getTime() - 86400000))}</Td>
                      <Td className="text-slate-500">{d.firma.ad}</Td>
                      <Td className="text-right tabular-nums">{tl(Number(d.brutHakedis))}</Td>
                      <Td className="text-right tabular-nums text-amber-700">{tl(Number(d.toplamAvans))}</Td>
                      <Td className="text-right tabular-nums text-rose-700">{tl(Number(d.toplamKesinti))}</Td>
                      <Td className="text-right font-semibold tabular-nums">{tl(Number(d.netOdenecek))}</Td>
                      <Td className="tabular-nums">{tl(yuvarla(odenen))}</Td>
                      <Td>
                        <Badge tone={d.durum === 'ODENDI' ? 'green' : d.durum === 'KISMI_ODENDI' ? 'amber' : 'slate'}>
                          {d.durum === 'ODENDI' ? 'Ödendi' : d.durum === 'KISMI_ODENDI' ? 'Kısmi' : 'Bekliyor'}
                        </Badge>
                        {d.kilitli && <Icon name="check" size={13} className="ml-1 inline text-emerald-600" />}
                      </Td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
      </Card>

      <p className="px-1 text-[11px] text-slate-400">
        TC Kimlik ve IBAN yalnızca yönetici/İK rolüne tam görünür; diğer roller maskeli görür. Ücret değişiklikleri audit log&apos;a yazılır.
      </p>
    </div>
  )
}

function Ozet({ label, value, sub, tone }: { label: string; value: string; sub?: string; tone: string }) {
  return (
    <Card className="px-3 py-3">
      <div className={`text-lg font-bold tabular-nums ${tone}`}>{value}</div>
      <div className="mt-0.5 text-[10px] font-medium uppercase tracking-wide text-slate-400">{label}</div>
      {sub && <div className="text-[10px] text-slate-400">{sub}</div>}
    </Card>
  )
}

function Satir({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-3">
      <dt className="text-slate-400">{label}</dt>
      <dd className="text-right font-medium tabular-nums text-slate-800">{value}</dd>
    </div>
  )
}