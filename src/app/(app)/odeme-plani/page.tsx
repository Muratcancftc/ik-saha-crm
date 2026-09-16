import Link from 'next/link'
import { requireRoles } from '@/lib/dal'
import { prisma } from '@/lib/db'
import { startOfDay, addDays } from '@/lib/dates'
import { decrypt, maskIBAN } from '@/lib/crypto'
import { Card, CardHeader, Th, Td, Badge, EmptyState } from '@/components/ui'
import { BolgeFiltre } from '@/components/bolge-filtre'
import { bolgeGecerli, bolgeEtiket, BOLGE_TONE } from '@/lib/bolge'
import { tl, yuvarla, guncelDonem, periyotEtiket, varsayilanUcret } from '@/lib/ik'
import type { OdemePeriyot } from '@prisma/client'

export const dynamic = 'force-dynamic'

export default async function OdemePlaniPage({
  searchParams,
}: {
  searchParams: Promise<{ bolge?: string; firma?: string; yontem?: string; durum?: string }>
}) {
  const user = await requireRoles(['patron', 'muhasebe', 'ik'])
  const sp = await searchParams
  const bolge = bolgeGecerli(sp.bolge)
  const firmaId = sp.firma ? Number(sp.firma) : undefined
  const yontem = sp.yontem
  const durumFiltre = sp.durum
  const tamGorur = user.rol === 'patron' || user.rol === 'ik'

  const bugun = startOfDay()
  const pencereBas = addDays(bugun, -62)

  const [personeller, firmalar, firmaUcretleri, personelUcretleri] = await Promise.all([
    prisma.isci.findMany({
      where: {
        durum: 'aktif',
        ...(bolge ? { bolge } : {}),
        ...(firmaId ? { firmaId } : {}),
      },
      include: { firma: true, meslekler: { include: { meslek: true } } },
      orderBy: { ad: 'asc' },
    }),
    prisma.musteriFirma.findMany({ orderBy: { ad: 'asc' } }),
    prisma.firmaUcret.findMany({ where: { gecerlilikBitis: null } }),
    prisma.personelUcret.findMany({ where: { isci: { durum: 'aktif' } }, orderBy: { gecerlilikBaslangic: 'desc' } }),
  ])

  const ids = personeller.map((p) => p.id)
  const [puantajList, avansList, kesintiList, donemler] = ids.length
    ? await Promise.all([
        prisma.puantajKayit.findMany({ where: { isciId: { in: ids }, tarih: { gte: pencereBas } }, select: { isciId: true, tarih: true, hesaplananTutar: true } }),
        prisma.avans.findMany({ where: { isciId: { in: ids }, durum: 'verildi', tarih: { gte: pencereBas } }, select: { isciId: true, tarih: true, tutar: true } }),
        prisma.kesinti.findMany({ where: { isciId: { in: ids }, tarih: { gte: pencereBas } }, select: { isciId: true, tarih: true, tutar: true } }),
        prisma.odemeDonemi.findMany({ where: { isciId: { in: ids }, baslangic: { gte: pencereBas } }, include: { odemeler: true } }),
      ])
    : [[], [], [], []]

  const firmaUcretMap = new Map<number, { gunluk: number; saatlik: number }>()
  for (const f of firmaUcretleri) if (!firmaUcretMap.has(f.firmaId)) firmaUcretMap.set(f.firmaId, { gunluk: Number(f.gunlukUcret), saatlik: Number(f.saatlikUcret) })
  const personelUcretMap = new Map<number, { gunluk: number; saatlik: number }>()
  for (const u of personelUcretleri) if (!personelUcretMap.has(u.isciId)) personelUcretMap.set(u.isciId, { gunluk: Number(u.gunlukUcret), saatlik: Number(u.saatlikUcret) })

  const sistemGunluk = await varsayilanUcret()

  const satirlar = personeller.map((p) => {
    const periyot: OdemePeriyot = p.odemePeriyot ?? p.firma?.odemePeriyot ?? 'AYLIK'
    const gunAraligi = p.gunAraligi ?? p.firma?.gunAraligi ?? 30
    const donem = guncelDonem(periyot, gunAraligi, bugun)

    const brut = yuvarla(puantajList.filter((x) => x.isciId === p.id && x.tarih >= donem.baslangic && x.tarih < donem.bitis).reduce((a, x) => a + Number(x.hesaplananTutar), 0))
    const avans = yuvarla(avansList.filter((x) => x.isciId === p.id && x.tarih >= donem.baslangic && x.tarih < donem.bitis).reduce((a, x) => a + Number(x.tutar), 0))
    const kesinti = yuvarla(kesintiList.filter((x) => x.isciId === p.id && x.tarih >= donem.baslangic && x.tarih < donem.bitis).reduce((a, x) => a + Number(x.tutar), 0))
    const net = yuvarla(brut - avans - kesinti)
    const donemKayit = donemler.find((d) => d.isciId === p.id && d.baslangic.getTime() === donem.baslangic.getTime() && d.bitis.getTime() === donem.bitis.getTime())
    const odenen = donemKayit ? yuvarla(donemKayit.odemeler.reduce((a, o) => a + Number(o.tutar), 0)) : 0
    const kalan = yuvarla(net - odenen)

    const pUcret = personelUcretMap.get(p.id)
    const fUcret = p.firmaId ? firmaUcretMap.get(p.firmaId) : null
    const gunluk = pUcret ? pUcret.gunluk : fUcret ? fUcret.gunluk : sistemGunluk

    const durum = kalan <= 0 && odenen > 0 ? 'ODENDI' : kalan <= 0 ? 'BOS' : odenen > 0 ? 'KISMI' : 'BEKLIYOR'

    return { p, periyot, gunAraligi, donem, brut, avans, kesinti, net, odenen, kalan, durum, gunluk }
  })

  const filtrelenmis = satirlar
    .filter((s) => (yontem ? (yontem === 'IBAN' ? s.p.varsayilanOdemeYontemi === 'IBAN' : s.p.varsayilanOdemeYontemi === 'ELDEN') : true))
    .filter((s) => (durumFiltre === 'bekliyor' ? s.kalan > 0 && s.odenen === 0 : durumFiltre === 'kismi' ? s.kalan > 0 && s.odenen > 0 : durumFiltre === 'odendi' ? s.kalan <= 0 && s.odenen > 0 : true))

  const toplamAlacak = yuvarla(satirlar.filter((s) => s.net > 0).reduce((a, s) => a + s.net, 0))
  const toplamOdenen = yuvarla(satirlar.reduce((a, s) => a + s.odenen, 0))
  const toplamKalan = yuvarla(satirlar.reduce((a, s) => a + Math.max(0, s.kalan), 0))
  const zarfSayi = satirlar.filter((s) => s.p.varsayilanOdemeYontemi === 'ELDEN').length
  const ibanSayi = satirlar.filter((s) => s.p.varsayilanOdemeYontemi === 'IBAN').length

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold tracking-tight text-slate-900">Ödeme Planı</h2>
          <p className="mt-0.5 text-sm text-slate-500">Personel alacakları, Zarf/IBAN yöntemi ve sonraki ödeme tarihleri</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <BolgeFiltre aktif={bolge} />
        </div>
      </div>

      {/* Özet */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Ozet label="Toplam Alacak (dönem)" value={tl(toplamAlacak)} tone="text-indigo-600" bg="bg-indigo-50" />
        <Ozet label="Ödenen" value={tl(toplamOdenen)} tone="text-emerald-700" bg="bg-emerald-50" />
        <Ozet label="Bekleyen" value={tl(toplamKalan)} tone="text-amber-700" bg="bg-amber-50" />
        <Ozet label="Zarf / IBAN" value={`${zarfSayi} / ${ibanSayi}`} tone="text-slate-900" bg="bg-slate-50" />
      </div>

      {/* Filtreler */}
      <Card className="p-4">
        <form method="get" className="flex flex-wrap items-end gap-3">
          <input type="hidden" name="bolge" value={bolge ?? ''} />
          <div>
            <label className="mb-1 block text-[11px] font-medium text-slate-500">Firma</label>
            <select name="firma" defaultValue={firmaId ?? ''} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-500">
              <option value="">Tümü</option>
              {firmalar.map((f) => <option key={f.id} value={f.id}>{f.ad}</option>)}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-[11px] font-medium text-slate-500">Ödeme Yöntemi</label>
            <select name="yontem" defaultValue={yontem ?? ''} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-500">
              <option value="">Tümü</option>
              <option value="ELDEN">Zarf (Elden)</option>
              <option value="IBAN">IBAN</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-[11px] font-medium text-slate-500">Durum</label>
            <select name="durum" defaultValue={durumFiltre ?? ''} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-500">
              <option value="">Tümü</option>
              <option value="bekliyor">Bekliyor</option>
              <option value="kismi">Kısmi</option>
              <option value="odendi">Ödendi</option>
            </select>
          </div>
          <button className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500">Filtrele</button>
          <Link href="/odeme-plani" className="rounded-lg px-3 py-2 text-sm font-medium text-slate-500 hover:bg-slate-100">Temizle</Link>
        </form>
      </Card>

      {/* Liste */}
      <Card>
        <CardHeader title={`Ödeme Planı (${filtrelenmis.length})`} desc="Her personelin içinde bulunulan ödeme dönemi ve alacağı" />
        <div className="overflow-x-auto">
          {filtrelenmis.length === 0 ? (
            <EmptyState icon="wallet" title="Eşleşen kayıt yok" />
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-100">
                  <Th>Personel</Th>
                  <Th>Bölge</Th>
                  <Th>Firma</Th>
                  <Th>Yöntem</Th>
                  <Th>IBAN</Th>
                  <Th>Periyot</Th>
                  <Th>Sonraki Ödeme</Th>
                  <Th className="text-right">Alacak</Th>
                  <Th className="text-right">Ödenen</Th>
                  <Th className="text-right">Kalan</Th>
                  <Th>Durum</Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filtrelenmis.map((s) => (
                  <tr key={s.p.id} className="hover:bg-slate-50/60">
                    <Td>
                      <Link href={`/ik/personel/${s.p.id}`} className="font-medium text-slate-900 hover:text-indigo-600">{s.p.ad}</Link>
                      <div className="text-xs text-slate-400">{s.p.meslekler.map((m) => m.meslek.ad).join(', ') || '—'}</div>
                    </Td>
                    <Td><Badge tone={BOLGE_TONE[s.p.bolge]}>{bolgeEtiket(s.p.bolge)}</Badge></Td>
                    <Td className="text-slate-500">{s.p.firma?.ad ?? '—'}</Td>
                    <Td>
                      <Badge tone={s.p.varsayilanOdemeYontemi === 'IBAN' ? 'blue' : 'amber'}>{s.p.varsayilanOdemeYontemi === 'IBAN' ? 'IBAN' : 'Zarf'}</Badge>
                    </Td>
                    <Td className="tabular-nums text-slate-500">{tamGorur ? decrypt(s.p.iban) : maskIBAN(decrypt(s.p.iban))}</Td>
                    <Td className="text-xs text-slate-500">{periyotEtiket(s.periyot, s.gunAraligi)}</Td>
                    <Td className="tabular-nums">
                      {new Date(s.donem.bitis.getTime() - 86400000).toLocaleDateString('tr-TR')}
                      <div className="text-[10px] text-slate-400">{s.donem.baslangic.toLocaleDateString('tr-TR')} – {new Date(s.donem.bitis.getTime() - 86400000).toLocaleDateString('tr-TR')}</div>
                    </Td>
                    <Td className="text-right font-semibold tabular-nums">{tl(s.net)}</Td>
                    <Td className="text-right tabular-nums text-emerald-700">{s.odenen > 0 ? tl(s.odenen) : '—'}</Td>
                    <Td className="text-right tabular-nums text-amber-700">{s.kalan > 0 ? tl(s.kalan) : '—'}</Td>
                    <Td>
                      {s.durum === 'ODENDI' ? (
                        <Badge tone="green">Ödendi</Badge>
                      ) : s.durum === 'KISMI' ? (
                        <Badge tone="amber">Kısmi</Badge>
                      ) : s.durum === 'BOS' ? (
                        <Badge tone="slate">Dönem boş</Badge>
                      ) : (
                        <Badge tone="red">Bekliyor</Badge>
                      )}
                    </Td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </Card>

      <p className="px-1 text-[11px] text-slate-400">
        Alacak = dönem puantaj toplamı − avans − kesinti. Sonraki ödeme, seçili periyoda (gün aralığı/haftalık/aylık) göre hesaplanır. IBAN yalnızca yönetici/İK&apos;ye tam görünür.
      </p>
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