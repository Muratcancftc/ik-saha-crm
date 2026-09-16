import { requireRoles } from '@/lib/dal'
import { prisma } from '@/lib/db'
import { Card, CardHeader, Th, Td, Badge } from '@/components/ui'
import { SistemAyarForm, FirmaUcretInline, FirmaUcretToplu } from './ucret-ayarlari-client'
import { varsayilanUcret, varsayilanSaatlikUcret, mesaiCarpan, tl } from '@/lib/ik'

export const dynamic = 'force-dynamic'

export default async function UcretAyarlariPage() {
  const user = await requireRoles(['patron', 'muhasebe'])
  const patron = user.rol === 'patron'

  const [varsayilan, saatlik, carpan, firmalar, firmaUcretleri] = await Promise.all([
    varsayilanUcret(),
    varsayilanSaatlikUcret(),
    mesaiCarpan(),
    prisma.musteriFirma.findMany({ orderBy: { ad: 'asc' } }),
    prisma.firmaUcret.findMany({
      where: { gecerlilikBitis: null },
      orderBy: { gecerlilikBaslangic: 'desc' },
    }),
  ])

  const ucretMap = new Map<number, { gunluk: number; saatlik: number }>()
  for (const f of firmaUcretleri) ucretMap.set(f.firmaId, { gunluk: Number(f.gunlukUcret), saatlik: Number(f.saatlikUcret) })

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-semibold tracking-tight text-slate-900">Ücret Ayarları</h2>
        <p className="mt-0.5 text-sm text-slate-500">Öncelik: personel bazlı &gt; firma bazlı &gt; sistem varsayılanı. Saatlik ücret günlükten türetilmez.</p>
      </div>

      <Card>
        <CardHeader title="Sistem Varsayılanı" desc="Personel ve firma ücreti tanımlı değilse uygulanır (değişiklik audit log'a yazılır)" />
        <SistemAyarForm varsayilan={varsayilan} saatlik={saatlik} carpan={carpan} duzenlenebilir={patron} />
      </Card>

      <Card>
        <CardHeader
          title={`Firma Bazlı Ücretler (${firmalar.length})`}
          desc="Her firmanın kendi günlük/saatlik ücreti — satır içi düzenleme"
          action={patron ? <FirmaUcretToplu firmalar={firmalar.map((f) => ({ id: f.id, ad: f.ad }))} /> : undefined}
        />
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-100">
                <Th>Firma</Th>
                <Th>Bölge</Th>
                <Th className="text-right">Günlük Ücret</Th>
                <Th className="text-right">Saatlik Ücret</Th>
                <Th>Kaynak</Th>
                {patron && <Th className="text-right">Düzenle</Th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {firmalar.map((f) => {
                const u = ucretMap.get(f.id)
                return (
                  <tr key={f.id} className="hover:bg-slate-50/60">
                    <Td className="font-medium text-slate-900">{f.ad}</Td>
                    <Td><Badge tone={f.bolge === 'kocaeli' ? 'indigo' : 'amber'}>{f.bolge === 'kocaeli' ? 'Kocaeli' : 'Balıkesir'}</Badge></Td>
                    <Td className="text-right tabular-nums">{u ? tl(u.gunluk) : '—'}</Td>
                    <Td className="text-right tabular-nums">{u && u.saatlik > 0 ? tl(u.saatlik) : '—'}</Td>
                    <Td><Badge tone={u ? 'amber' : 'slate'}>{u ? 'Tanımlı' : 'Sistem kullanılır'}</Badge></Td>
                    {patron && (
                      <Td className="text-right">
                        <FirmaUcretInline firmaId={f.id} gunluk={u?.gunluk ?? null} saatlik={u?.saatlik ?? null} />
                      </Td>
                    )}
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