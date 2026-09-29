import { requireRoles } from '@/lib/dal'
import { prisma } from '@/lib/db'
import { Card, CardHeader, Badge, Button } from '@/components/ui'
import { Icon } from '@/components/icons'
import { meslekEkle, meslekSil, ayarKaydet } from '@/app/actions/ayar'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

export default async function AyarlarPage() {
  await requireRoles(['patron'])

  const [meslekler, ayarlar] = await Promise.all([
    prisma.meslek.findMany({ orderBy: { ad: 'asc' } }),
    prisma.ayar.findMany({ orderBy: { anahtar: 'asc' } }),
  ])

  const ayarMap = new Map(ayarlar.map((a) => [a.anahtar, a.deger]))
  const ayarGet = (k: string, d: string) => ayarMap.get(k) ?? d

  return (
    <div className="space-y-5">
      {/* Firma bilgileri */}
      <Card>
        <CardHeader title="Firma Bilgileri" desc="Faturada ve bordroda kullanılan bilgiler" />
        <div className="grid grid-cols-1 gap-3 px-5 py-4 sm:grid-cols-2">
          <AyarRow anahtar="FIRMA_AD" label="Firma Adı" deger={ayarGet('FIRMA_AD', 'ATALAY İnsan Kaynakları San. Tic. Ltd. Şti.')} />
          <AyarRow anahtar="FIRMA_VERGINO" label="Vergi No" deger={ayarGet('FIRMA_VERGINO', '1234567890')} />
          <AyarRow anahtar="FIRMA_TELEFON" label="Telefon" deger={ayarGet('FIRMA_TELEFON', '+90 216 000 00 00')} />
          <AyarRow anahtar="FIRMA_EMAIL" label="E-posta" deger={ayarGet('FIRMA_EMAIL', 'info@iksaha.com')} />
          <AyarRow anahtar="FIRMA_ADRES" label="Adres" deger={ayarGet('FIRMA_ADRES', 'İstanbul')} />
        </div>
      </Card>

      {/* Oranlar */}
      <Card>
        <CardHeader title="Oranlar" desc="Sabit değerler koddan buraya taşındı" />
        <div className="grid grid-cols-1 gap-3 px-5 py-4 sm:grid-cols-3">
          <AyarRow anahtar="KDV_ORANI" label="KDV Oranı (fatura)" deger={ayarGet('KDV_ORANI', '0.20')} />
          <AyarRow anahtar="SGK_ISVEREN_ORANI" label="SGK İşveren Payı" deger={ayarGet('SGK_ISVEREN_ORANI', '0.205')} />
        </div>
      </Card>

      {/* Vardiya tipleri */}
      <Card>
        <CardHeader title="Vardiya Tipleri" desc="Şu an tanımlı vardiyalar" />
        <div className="flex flex-wrap gap-2 px-5 py-4">
          <Badge tone="blue">Gündüz (07:30)</Badge>
          <Badge tone="slate">Gece (21:30)</Badge>
        </div>
      </Card>

      {/* Meslekler */}
      <Card>
        <CardHeader
          title="Meslek Tanımları"
          desc={`${meslekler.length} meslek`}
          action={
            <form action={meslekEkle} className="flex items-center gap-1.5">
              <input name="ad" placeholder="Yeni meslek" className="rounded-lg border border-slate-300 px-2.5 py-1.5 text-sm outline-none focus:border-indigo-500" />
              <Button type="submit" size="sm">Ekle</Button>
            </form>
          }
        />
        <div className="flex flex-wrap gap-2 px-5 py-4">
          {meslekler.map((m) => (
            <div key={m.id} className="flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm text-slate-700">
              {m.ad}
              <form action={meslekSil}>
                <input type="hidden" name="id" value={m.id} />
                <button className="rounded-full p-0.5 text-slate-400 hover:text-red-600" title="Sil">
                  <Icon name="x" size={13} />
                </button>
              </form>
            </div>
          ))}
        </div>
      </Card>

      {/* Maliyet Parametreleri (Teklif & Paylaşım) */}
      <Card>
        <CardHeader title="Maliyet Parametreleri" desc="Teklif maliyet tablosunda kullanılan oranlar (ondalık: 0.14 = %14)" />
        <div className="grid grid-cols-1 gap-3 px-5 py-4 sm:grid-cols-3">
          <AyarRow anahtar="MALIYET_SGK_ISCI" label="SGK İşçi Oranı" deger={ayarGet('MALIYET_SGK_ISCI', '0.14')} />
          <AyarRow anahtar="MALIYET_ISSIZLIK_ISCI" label="İşsizlik İşçi Oranı" deger={ayarGet('MALIYET_ISSIZLIK_ISCI', '0.01')} />
          <AyarRow anahtar="MALIYET_SGK_ISVEREN" label="SGK İşveren Oranı" deger={ayarGet('MALIYET_SGK_ISVEREN', '0.155')} />
          <AyarRow anahtar="MALIYET_ISSIZLIK_ISVEREN" label="İşsizlik İşveren Oranı" deger={ayarGet('MALIYET_ISSIZLIK_ISVEREN', '0.02')} />
          <AyarRow anahtar="MALIYET_GELIR_VERGISI" label="Gelir Vergisi Oranı" deger={ayarGet('MALIYET_GELIR_VERGISI', '0.15')} />
          <AyarRow anahtar="MALIYET_DAMGA_VERGISI" label="Damga Vergisi Oranı (binde 7,59)" deger={ayarGet('MALIYET_DAMGA_VERGISI', '0.00759')} />
          <AyarRow anahtar="PAYLASIM_LINK_GUN" label="Paylaşım Linki Varsayılan Süresi (gün)" deger={ayarGet('PAYLASIM_LINK_GUN', '30')} />
        </div>
      </Card>

      {/* Kullanıcı yönetimine yönlendirme */}
      <Link
        href="/kullanicilar"
        className="flex items-center justify-between rounded-2xl border border-indigo-200 bg-indigo-50/60 px-5 py-4 transition hover:bg-indigo-50"
      >
        <div>
          <div className="flex items-center gap-2 text-sm font-semibold text-indigo-700">
            <Icon name="users" size={16} />
            Kullanıcılar & Yetkiler
          </div>
          <div className="mt-0.5 text-xs text-indigo-500">Ekip üyesi ekle, rollerini ve lokasyonlarını belirle</div>
        </div>
        <Icon name="chevron" size={16} className="-rotate-90 text-indigo-400" />
      </Link>
    </div>
  )
}

function AyarRow({ anahtar, label, deger }: { anahtar: string; label: string; deger: string }) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-slate-500">{label}</label>
      <form action={ayarKaydet} className="flex items-center gap-1.5">
        <input type="hidden" name="anahtar" value={anahtar} />
        <input name="deger" defaultValue={deger} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500" />
        <Button type="submit" size="sm">Kaydet</Button>
      </form>
    </div>
  )
}