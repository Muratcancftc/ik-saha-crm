import { notFound } from 'next/navigation'
import Link from 'next/link'
import { requireRoles } from '@/lib/dal'
import { prisma } from '@/lib/db'
import { Card, CardHeader, Badge } from '@/components/ui'
import { Icon } from '@/components/icons'
import { DekontPanel } from './dekont-panel'
import {
  vergiDurum,
  VERGI_TUR_ETIKET,
  VERGI_YONTEM_ETIKET,
  VERGI_DURUM_ETIKET,
  VERGI_DURUM_TONE,
  tl,
  yuvarla,
  tarihTr,
} from '@/lib/vergi'
import { OdeModal } from '../vergi-client'
import { GeriAlButon } from '../geri-al'

export const dynamic = 'force-dynamic'

export default async function VergiDetayPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireRoles(['patron', 'muhasebe', 'ik', 'operasyon', 'izleyici'])
  const { id } = await params
  const kayit = await prisma.vergiOdemesi.findUnique({
    where: { id: Number(id) },
    include: { firma: true, dekontlar: { where: { silindi: false }, orderBy: { createdAt: 'desc' } } },
  })
  if (!kayit || kayit.silindi) notFound()

  const yazabilir = ['patron', 'muhasebe', 'ik'].includes(user.rol)
  const admin = user.rol === 'patron'
  const dekontSilYetkisi = admin || user.rol === 'ik'

  const kullanicilar = await prisma.kullanici.findMany({ select: { id: true, ad: true } })
  const kullaniciMap = new Map(kullanicilar.map((k) => [k.id, k.ad]))

  const durum = vergiDurum(kayit)
  const odenen = Number(kayit.odenenTutar ?? 0)
  const kalan = yuvarla(Number(kayit.tahakkukTutari) - odenen)

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link href="/vergi-odemeler" className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700">
            <Icon name="x" size={18} />
          </Link>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-lg font-semibold text-slate-900">{kayit.firma.ad}</h2>
              <Badge tone={VERGI_DURUM_TONE[durum]}>{VERGI_DURUM_ETIKET[durum]}</Badge>
              {kayit.dekontlar.length === 0 && durum === 'ODENDI' && <Badge tone="amber">Dekont eksik</Badge>}
            </div>
            <p className="mt-0.5 text-xs text-slate-500">
              {kayit.vergiTuru === 'DIGER' ? `Diğer (${kayit.vergiTuruDiger ?? ''})` : VERGI_TUR_ETIKET[kayit.vergiTuru]} · {kayit.donem}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {yazabilir && odenen === 0 && (
            <OdeModal kayit={{ id: kayit.id, firmaAd: kayit.firma.ad, tur: kayit.vergiTuru, donem: kayit.donem, tahakkuk: Number(kayit.tahakkukTutari) }} />
          )}
          {admin && odenen > 0 && <GeriAlButon id={kayit.id} />}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Ozet label="Tahakkuk" value={tl(Number(kayit.tahakkukTutari))} tone="text-slate-900" bg="bg-slate-50" />
        <Ozet label="Ödenen" value={odenen > 0 ? tl(odenen) : '—'} tone="text-emerald-700" bg="bg-emerald-50" />
        <Ozet label="Kalan" value={kalan > 0 ? tl(kalan) : '—'} tone="text-amber-700" bg="bg-amber-50" />
        <Ozet label="Son Ödeme" value={tarihTr(kayit.sonOdemeTarihi)} tone="text-indigo-600" bg="bg-indigo-50" />
      </div>

      <Card>
        <CardHeader title="Ödeme Bilgileri" />
        <div className="grid grid-cols-1 gap-x-8 gap-y-2.5 px-5 py-4 text-sm sm:grid-cols-2">
          <Satir label="Vergi Türü" value={kayit.vergiTuru === 'DIGER' ? kayit.vergiTuruDiger ?? 'Diğer' : VERGI_TUR_ETIKET[kayit.vergiTuru]} />
          <Satir label="Dönem" value={kayit.donem} />
          <Satir label="Son Ödeme Tarihi" value={tarihTr(kayit.sonOdemeTarihi)} />
          <Satir label="Ödeme Tarihi" value={kayit.odemeTarihi ? tarihTr(kayit.odemeTarihi) : '—'} />
          <Satir label="Ödeme Yöntemi" value={kayit.odemeYontemi ? VERGI_YONTEM_ETIKET[kayit.odemeYontemi] : '—'} />
          <Satir label="Oluşturan" value={kayit.olusturanKullaniciId ? (kullaniciMap.get(kayit.olusturanKullaniciId) ?? '—') : '—'} />
          <Satir label="Kayıt Tarihi" value={tarihTr(kayit.createdAt)} />
          <Satir label="Not" value={kayit.not ?? '—'} />
        </div>
      </Card>

      <Card>
        <CardHeader title={`Dekontlar (${kayit.dekontlar.length})`} desc="Önizleme için tıklayın; indir ve sil butonları kart üzerinde" />
        <div className="px-5 py-4">
          <DekontPanel
            vergiOdemeId={kayit.id}
            yazabilir={yazabilir}
            dekontSilYetkisi={dekontSilYetkisi}
            dekontlar={kayit.dekontlar.map((d) => ({ id: d.id, dosyaAdi: d.dosyaAdi, dosyaTipi: d.dosyaTipi, dosyaBoyutu: d.dosyaBoyutu, yukleyen: d.yukleyenKullaniciId ? (kullaniciMap.get(d.yukleyenKullaniciId) ?? null) : null, tarih: d.createdAt }))}
          />
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

function Satir({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-3">
      <dt className="text-slate-400">{label}</dt>
      <dd className="text-right font-medium text-slate-800">{value}</dd>
    </div>
  )
}