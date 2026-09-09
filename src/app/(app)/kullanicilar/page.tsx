import { requireRoles } from '@/lib/dal'
import { prisma } from '@/lib/db'
import { Card, CardHeader, Th, Td, Badge } from '@/components/ui'
import { Icon } from '@/components/icons'
import { KullaniciForm } from './kullanici-form'
import { kullaniciRolDegistir, kullaniciSil } from '@/app/actions/ayar'

export const dynamic = 'force-dynamic'

const ROLLER: Record<string, { label: string; desc: string; alanlar: string; tone: string }> = {
  patron: { label: 'Patron', desc: 'Tüm erişim + kullanıcı/yetki yönetimi', alanlar: 'Her şey', tone: 'indigo' },
  operasyon: { label: 'Operasyon', desc: 'Sahadaki işgücü operasyonu', alanlar: 'İşçi havuzu, talepler & atama, puantaj, müşteri firmalar, belge & SGK', tone: 'blue' },
  muhasebe: { label: 'Muhasebe', desc: 'Finans ve bordro', alanlar: 'Hakediş, ödeme, fatura, vergi, personel, raporlar', tone: 'violet' },
  saha_sorumlusu: { label: 'Saha Sorumlusu', desc: 'Lokasyon bazlı saha takibi', alanlar: 'Yalnızca kendi lokasyonunun puantajı ve takvimi', tone: 'amber' },
}

export default async function KullanicilarPage() {
  await requireRoles(['patron'])

  const [kullanicilar, lokasyonlar] = await Promise.all([
    prisma.kullanici.findMany({ include: { lokasyon: true }, orderBy: { id: 'asc' } }),
    prisma.lokasyon.findMany({ include: { firma: true } }),
  ])

  return (
    <div className="space-y-5">
      {/* Başlık + yeni kullanıcı */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold tracking-tight text-slate-900">Kullanıcılar & Yetkiler</h2>
          <p className="text-sm text-slate-500">Ekip üyesi ekleyin, rollerini belirleyin</p>
        </div>
        <KullaniciForm lokasyonlar={lokasyonlar} />
      </div>

      {/* Rol kılavuzu */}
      <Card>
        <CardHeader title="Rol Yetkileri" desc="Her rolün panelde erişebildiği bölümler" />
        <div className="grid grid-cols-1 gap-3 px-5 py-4 sm:grid-cols-2">
          {Object.entries(ROLLER).map(([k, r]) => (
            <div key={k} className="rounded-xl border border-slate-200 bg-slate-50/60 p-4">
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone={r.tone as never}>{r.label}</Badge>
                <span className="text-xs text-slate-400">{r.desc}</span>
              </div>
              <p className="mt-2 text-xs text-slate-600">{r.alanlar}</p>
            </div>
          ))}
        </div>
      </Card>

      {/* Kullanıcı listesi */}
      <Card>
        <CardHeader
          title={`Ekip Üyeleri (${kullanicilar.length})`}
          desc="Rolü değiştirmek için seçim yapıp onayla; saha sorumlusuna lokasyon bağlayın"
        />
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-100">
                <Th>Kullanıcı</Th>
                <Th>Rol</Th>
                <Th>Rol & Lokasyon</Th>
                <Th className="text-right">İşlem</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {kullanicilar.map((u) => {
                const r = ROLLER[u.rol] ?? { label: u.rol, tone: 'slate', desc: '', alanlar: '' }
                return (
                  <tr key={u.id} className="hover:bg-slate-50/60">
                    <Td>
                      <div className="flex items-center gap-2">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-indigo-50 text-xs font-semibold text-indigo-600">
                          {u.ad.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="font-medium text-slate-900">{u.ad}</div>
                          <div className="text-xs text-slate-400">{u.email}</div>
                        </div>
                      </div>
                    </Td>
                    <Td>
                      <Badge tone={r.tone as never}>{r.label}</Badge>
                    </Td>
                    <Td>
                      <form action={kullaniciRolDegistir} className="flex flex-wrap items-center gap-1.5">
                        <input type="hidden" name="id" value={u.id} />
                        <select
                          name="rol"
                          defaultValue={u.rol}
                          title={r.alanlar}
                          className="rounded-lg border border-slate-300 px-2 py-1 text-xs outline-none focus:border-indigo-500"
                        >
                          {Object.entries(ROLLER).map(([k2, rr]) => (
                            <option key={k2} value={k2}>{rr.label}</option>
                          ))}
                        </select>
                        {(u.rol === 'saha_sorumlusu' || u.lokasyonId) && (
                          <select
                            name="lokasyonId"
                            defaultValue={u.lokasyonId ?? ''}
                            className="rounded-lg border border-slate-300 px-2 py-1 text-xs outline-none focus:border-indigo-500"
                          >
                            <option value="">—</option>
                            {lokasyonlar.map((l) => (
                              <option key={l.id} value={l.id}>{l.ad}</option>
                            ))}
                          </select>
                        )}
                        <button type="submit" title="Rolü kaydet" className="rounded-lg p-1 text-indigo-600 hover:bg-indigo-50">
                          <Icon name="check" size={14} />
                        </button>
                      </form>
                    </Td>
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
                )
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}