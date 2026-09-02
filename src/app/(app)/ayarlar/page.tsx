import { requireRoles } from '@/lib/dal'
import { prisma } from '@/lib/db'
import { Card, CardHeader, Th, Td, Badge, Button } from '@/components/ui'
import { Icon } from '@/components/icons'
import { KullaniciForm } from './kullanici-form'
import { meslekEkle, meslekSil, kullaniciRolDegistir, kullaniciSil, ayarKaydet } from '@/app/actions/ayar'

export const dynamic = 'force-dynamic'

const ROL_LABEL: Record<string, string> = {
  patron: 'Patron',
  operasyon: 'Operasyon',
  muhasebe: 'Muhasebe',
  saha_sorumlusu: 'Saha Sorumlusu',
}

export default async function AyarlarPage() {
  await requireRoles(['patron'])

  const [meslekler, kullanicilar, lokasyonlar, ayarlar] = await Promise.all([
    prisma.meslek.findMany({ orderBy: { ad: 'asc' } }),
    prisma.kullanici.findMany({ include: { lokasyon: true }, orderBy: { id: 'asc' } }),
    prisma.lokasyon.findMany({ include: { firma: true } }),
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
          <AyarRow anahtar="FIRMA_AD" label="Firma Adı" deger={ayarGet('FIRMA_AD', 'İK Saha A.Ş.')} />
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

      {/* Kullanıcı & RBAC */}
      <Card>
        <CardHeader
          title="Kullanıcı & Rol Yönetimi"
          desc="RBAC — rol bazlı yetkilendirme"
          action={<KullaniciForm lokasyonlar={lokasyonlar} />}
        />
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-100">
                <Th>Kullanıcı</Th>
                <Th>E-posta</Th>
                <Th>Rol</Th>
                <Th>Lokasyon</Th>
                <Th className="text-right">İşlem</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {kullanicilar.map((u) => (
                <tr key={u.id} className="hover:bg-slate-50/60">
                  <Td className="font-medium text-slate-900">{u.ad}</Td>
                  <Td>{u.email}</Td>
                  <Td>
                    <form action={kullaniciRolDegistir} className="flex items-center gap-1.5">
                      <input type="hidden" name="id" value={u.id} />
                      <select name="rol" defaultValue={u.rol} className="rounded-lg border border-slate-300 px-2 py-1 text-xs outline-none focus:border-indigo-500">
                        {Object.entries(ROL_LABEL).map(([k, l]) => (
                          <option key={k} value={k}>{l}</option>
                        ))}
                      </select>
                      {u.rol === 'saha_sorumlusu' || u.lokasyonId ? (
                        <select name="lokasyonId" defaultValue={u.lokasyonId ?? ''} className="rounded-lg border border-slate-300 px-2 py-1 text-xs outline-none focus:border-indigo-500">
                          <option value="">—</option>
                          {lokasyonlar.map((l) => (
                            <option key={l.id} value={l.id}>{l.ad}</option>
                          ))}
                        </select>
                      ) : null}
                      <button type="submit" className="rounded-lg p-1 text-indigo-600 hover:bg-indigo-50" title="Kaydet">
                        <Icon name="check" size={14} />
                      </button>
                    </form>
                  </Td>
                  <Td>{u.lokasyon?.ad ?? '—'}</Td>
                  <Td className="text-right">
                    {u.rol !== 'patron' && (
                      <form action={kullaniciSil}>
                        <input type="hidden" name="id" value={u.id} />
                        <button className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600" title="Sil">
                          <Icon name="x" size={14} />
                        </button>
                      </form>
                    )}
                  </Td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
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