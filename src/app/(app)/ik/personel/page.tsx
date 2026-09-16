import Link from 'next/link'
import { requireRoles } from '@/lib/dal'
import { prisma } from '@/lib/db'
import { num } from '@/lib/format'
import { Card, CardHeader, Th, Td, Badge, EmptyState } from '@/components/ui'
import { IkPersonelForm } from './ik-personel-form'
import { BolgeFiltre } from '@/components/bolge-filtre'
import { bolgeGecerli, bolgeEtiket, BOLGE_TONE } from '@/lib/bolge'
import { varsayilanUcret, varsayilanSaatlikUcret, tl, yuvarla } from '@/lib/ik'
import type { CalismaTipi, OdemeYontemi } from '@prisma/client'

export const dynamic = 'force-dynamic'

export default async function IkPersonelPage({
  searchParams,
}: {
  searchParams: Promise<{ bolge?: string }>
}) {
  const user = await requireRoles(['patron', 'muhasebe', 'operasyon', 'ik'])
  const sp = await searchParams
  const bolge = bolgeGecerli(sp.bolge)
  const duzenlemeVar = ['patron', 'muhasebe', 'operasyon'].includes(user.rol)

  const [sistemGunluk, sistemSaatlik, isciler, firmalar, meslekler, firmaUcretleri, personelUcretleri] = await Promise.all([
    varsayilanUcret(),
    varsayilanSaatlikUcret(),
    prisma.isci.findMany({
      where: bolge ? { bolge } : {},
      include: { meslekler: { include: { meslek: true } }, firma: true },
      orderBy: { ad: 'asc' },
    }),
    prisma.musteriFirma.findMany({ orderBy: { ad: 'asc' } }),
    prisma.meslek.findMany({ orderBy: { ad: 'asc' } }),
    prisma.firmaUcret.findMany({
      where: { gecerlilikBitis: null },
      orderBy: { gecerlilikBaslangic: 'desc' },
    }),
    prisma.personelUcret.findMany({
      orderBy: { gecerlilikBaslangic: 'desc' },
    }),
  ])

  const firmaUcretMap = new Map<number, { gunluk: number; saatlik: number }>()
  for (const f of firmaUcretleri) {
    if (!firmaUcretMap.has(f.firmaId)) firmaUcretMap.set(f.firmaId, { gunluk: Number(f.gunlukUcret), saatlik: Number(f.saatlikUcret) })
  }
  const personelUcretMap = new Map<number, { gunluk: number; saatlik: number }>()
  for (const p of personelUcretleri) {
    if (!personelUcretMap.has(p.isciId)) personelUcretMap.set(p.isciId, { gunluk: Number(p.gunlukUcret), saatlik: Number(p.saatlikUcret) })
  }

  const firmaUcretDto = firmalar.map((f) => {
    const u = firmaUcretMap.get(f.id)
    return { id: f.id, ad: f.ad, gunlukUcret: u?.gunluk ?? null, saatlikUcret: u?.saatlik ?? null }
  })

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold tracking-tight text-slate-900">İK Personel</h2>
          <p className="mt-0.5 text-sm text-slate-500">Sahada çalışan personel — ücret: personel &gt; firma &gt; sistem ({tl(sistemGunluk)}/gün)</p>
        </div>
        <div className="flex items-center gap-2">
          <BolgeFiltre aktif={bolge} />
          {duzenlemeVar && (
            <IkPersonelForm
              mode="create"
              firmalar={firmaUcretDto}
              meslekler={meslekler.map((m) => ({ id: m.id, ad: m.ad }))}
              varsayilanGunluk={sistemGunluk}
              varsayilanSaatlik={sistemSaatlik}
            />
          )}
        </div>
      </div>

      <Card>
        <CardHeader title={`Personel (${num(isciler.length)})`} desc="Ücret ve ödeme yöntemi bilgileri" />
        <div className="overflow-x-auto">
          {isciler.length === 0 ? (
            <EmptyState icon="isci" title="Personel yok" />
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-100">
                  <Th>Personel</Th>
                  <Th>Bölge</Th>
                  <Th>Firma / Pozisyon</Th>
                  <Th>Çalışma</Th>
                  <Th className="text-right">Günlük Ücret</Th>
                  <Th className="text-right">Saatlik Ücret</Th>
                  <Th>Kaynak</Th>
                  <Th>Ödeme</Th>
                  <Th>Durum</Th>
                  <Th className="text-right">İşlem</Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {isciler.map((i) => {
                  const pUcret = personelUcretMap.get(i.id)
                  const fUcret = i.firmaId ? firmaUcretMap.get(i.firmaId) : null
                  const gunluk = pUcret ? pUcret.gunluk : fUcret ? fUcret.gunluk : sistemGunluk
                  const saatlik = pUcret ? pUcret.saatlik : fUcret ? fUcret.saatlik : 0
                  const kaynak = pUcret ? 'personel' : fUcret ? 'firma' : 'sistem'
                  return (
                    <tr key={i.id} className="hover:bg-slate-50/60">
                      <Td>
                        <Link href={`/ik/personel/${i.id}`} className="flex items-center gap-3">
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-indigo-50 text-xs font-semibold text-indigo-600">
                            {i.ad.split(' ').map((p) => p[0]).slice(0, 2).join('')}
                          </div>
                          <span className="font-medium text-slate-900 hover:text-indigo-600">{i.ad}</span>
                        </Link>
                      </Td>
                      <Td><Badge tone={BOLGE_TONE[i.bolge]}>{bolgeEtiket(i.bolge)}</Badge></Td>
                      <Td>
                        <div>{i.firma?.ad ?? '—'}</div>
                        <div className="text-xs text-slate-400">{i.meslekler.map((m) => m.meslek.ad).join(', ') || '—'}</div>
                      </Td>
                      <Td>
                        <Badge tone={i.calismaTipi === 'SAATLIK' ? 'blue' : 'green'}>{i.calismaTipi === 'SAATLIK' ? 'Saatlik' : 'Günlük'}</Badge>
                      </Td>
                      <Td className="text-right font-semibold tabular-nums text-slate-900">{tl(yuvarla(gunluk))}</Td>
                      <Td className="text-right tabular-nums text-slate-500">{saatlik > 0 ? tl(saatlik) : '—'}</Td>
                      <Td>
                        <Badge tone={kaynak === 'personel' ? 'green' : kaynak === 'firma' ? 'amber' : 'slate'}>
                          {kaynak === 'personel' ? 'Personel' : kaynak === 'firma' ? 'Firma' : 'Sistem'}
                        </Badge>
                      </Td>
                      <Td>
                        <Badge tone={i.varsayilanOdemeYontemi === 'IBAN' ? 'blue' : 'amber'}>
                          {i.varsayilanOdemeYontemi === 'IBAN' ? 'IBAN' : 'Zarf'}
                        </Badge>
                      </Td>
                      <Td><Badge tone={i.durum === 'aktif' ? 'green' : 'slate'}>{i.durum === 'aktif' ? 'Aktif' : 'Pasif'}</Badge></Td>
                      <Td className="text-right">
                        {duzenlemeVar ? (
                          <div className="flex justify-end gap-1.5">
                            <IkPersonelForm
                              mode="edit"
                              personel={{
                                id: i.id,
                                ad: i.ad,
                                telefon: i.telefon,
                                bolge: i.bolge,
                                firmaId: i.firmaId,
                                calismaTipi: i.calismaTipi as CalismaTipi,
                                odemeYontemi: i.varsayilanOdemeYontemi as OdemeYontemi,
                                meslekId: i.meslekler[0]?.meslekId ?? null,
                                gunlukUcret: yuvarla(gunluk),
                                saatlikUcret: yuvarla(saatlik),
                                odemePeriyot: i.odemePeriyot,
                                gunAraligi: i.gunAraligi,
                              }}
                              firmalar={firmaUcretDto}
                              meslekler={meslekler.map((m) => ({ id: m.id, ad: m.ad }))}
                              varsayilanGunluk={sistemGunluk}
                              varsayilanSaatlik={sistemSaatlik}
                            />
                          </div>
                        ) : (
                          <span className="text-[11px] text-slate-400">Salt okunur</span>
                        )}
                      </Td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
      </Card>
    </div>
  )
}