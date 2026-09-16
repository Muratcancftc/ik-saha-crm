import Link from 'next/link'
import { prisma } from '@/lib/db'
import { Card, CardHeader, Th, Td, Badge, EmptyState } from '@/components/ui'
import { PeriyotSelect } from './ik-client'
import { varsayilanUcret, tl, yuvarla, periyotEtiket } from '@/lib/ik'
import { bolgeEtiket, BOLGE_TONE } from '@/lib/bolge'

export const dynamic = 'force-dynamic'

export default async function PersonellerSekme({ firmaId, yazabilir }: { firmaId: number; yazabilir: boolean }) {
  const [sistemGunluk, personel, firmaUcretleri, personelUcretleri] = await Promise.all([
    varsayilanUcret(),
    prisma.isci.findMany({
      where: { firmaId },
      include: { meslekler: { include: { meslek: true } }, firma: true },
      orderBy: { ad: 'asc' },
    }),
    prisma.firmaUcret.findMany({ where: { firmaId, gecerlilikBitis: null } }),
    prisma.personelUcret.findMany({
      where: { isci: { firmaId } },
      orderBy: { gecerlilikBaslangic: 'desc' },
    }),
  ])
  const firma = personel[0]?.firma

  const firmaUcret = firmaUcretleri[0] ? { gunluk: Number(firmaUcretleri[0].gunlukUcret), saatlik: Number(firmaUcretleri[0].saatlikUcret) } : null
  const pUcretMap = new Map<number, { gunluk: number; saatlik: number }>()
  for (const u of personelUcretleri) if (!pUcretMap.has(u.isciId)) pUcretMap.set(u.isciId, { gunluk: Number(u.gunlukUcret), saatlik: Number(u.saatlikUcret) })

  return (
    <div className="space-y-5">
      <Card>
        <CardHeader title={`Personeller (${personel.length})`} desc="Bu firmanın İK personeli — ücret ve ödeme periyodu" />
        <div className="overflow-x-auto">
          {personel.length === 0 ? (
            <EmptyState icon="isci" title="Bu firmada personel yok" desc="İK Personel sayfasından firma atayın" />
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-100">
                  <Th>Personel</Th>
                  <Th>Bölge</Th>
                  <Th>Pozisyon</Th>
                  <Th>Çalışma</Th>
                  <Th className="text-right">Günlük</Th>
                  <Th className="text-right">Saatlik</Th>
                  <Th>Ödeme Yöntemi</Th>
                  <Th>Ödeme Periyodu</Th>
                  <Th>Durum</Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {personel.map((i) => {
                  const u = pUcretMap.get(i.id)
                  const gunluk = u ? u.gunluk : firmaUcret ? firmaUcret.gunluk : sistemGunluk
                  const saatlik = u ? u.saatlik : firmaUcret ? firmaUcret.saatlik : 0
                  const periyot = i.odemePeriyot ?? firma?.odemePeriyot ?? 'AYLIK'
                  const gunAraligi = i.gunAraligi ?? firma?.gunAraligi ?? 30
                  return (
                    <tr key={i.id} className="hover:bg-slate-50/60">
                      <Td>
                        <Link href={`/ik/personel/${i.id}`} className="font-medium text-slate-900 hover:text-indigo-600">{i.ad}</Link>
                      </Td>
                      <Td><Badge tone={BOLGE_TONE[i.bolge]}>{bolgeEtiket(i.bolge)}</Badge></Td>
                      <Td className="text-xs text-slate-500">{i.meslekler.map((m) => m.meslek.ad).join(', ') || '—'}</Td>
                      <Td><Badge tone={i.calismaTipi === 'SAATLIK' ? 'blue' : 'green'}>{i.calismaTipi === 'SAATLIK' ? 'Saatlik' : 'Günlük'}</Badge></Td>
                      <Td className="text-right tabular-nums">{tl(yuvarla(gunluk))}</Td>
                      <Td className="text-right tabular-nums text-slate-500">{saatlik > 0 ? tl(saatlik) : '—'}</Td>
                      <Td><Badge tone={i.varsayilanOdemeYontemi === 'IBAN' ? 'blue' : 'amber'}>{i.varsayilanOdemeYontemi === 'IBAN' ? 'IBAN' : 'Zarf'}</Badge></Td>
                      <Td>
                        {yazabilir ? (
                          <PeriyotSelect isciId={i.id} periyot={i.odemePeriyot} gunAraligi={i.gunAraligi} firmaVarsayilan={periyotEtiket(periyot, gunAraligi)} />
                        ) : (
                          <span className="text-xs text-slate-600">{periyotEtiket(periyot, gunAraligi)}</span>
                        )}
                      </Td>
                      <Td><Badge tone={i.durum === 'aktif' ? 'green' : 'slate'}>{i.durum === 'aktif' ? 'Aktif' : 'Pasif'}</Badge></Td>
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