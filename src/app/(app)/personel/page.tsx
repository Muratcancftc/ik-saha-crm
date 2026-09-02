import { requireRoles } from '@/lib/dal'
import { prisma } from '@/lib/db'
import { tl, num, date } from '@/lib/format'
import { maskIBAN, decrypt } from '@/lib/crypto'
import { Card, CardHeader, StatCard, Th, Td, EmptyState, Badge } from '@/components/ui'
import { Icon } from '@/components/icons'
import { PersonelForm } from './personel-form'
import { togglePersonelDurum } from '@/app/actions/personel'

export const dynamic = 'force-dynamic'

export default async function PersonelPage() {
  await requireRoles(['patron', 'muhasebe'])

  const personel = await prisma.personel.findMany({ orderBy: { ad: 'asc' } })

  const rows = personel.map((p) => ({
    id: p.id,
    ad: p.ad,
    departman: p.departman,
    rol: p.rol,
    iseGiris: p.iseGiris,
    maas: Number(p.maas),
    iban: p.iban,
    sgkDurum: p.sgkDurum,
    izinBakiyesi: p.izinBakiyesi,
    durum: p.durum,
  }))

  const aylikMaas = personel.filter((p) => p.durum === 'aktif').reduce((a, p) => a + Number(p.maas), 0)
  const isverenPayi = Math.round(aylikMaas * 0.205) // SGK işveren ~%20,5
  const aylikToplamMaliyet = aylikMaas + isverenPayi
  const yillik = aylikToplamMaliyet * 12

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard icon="personel" label="Aylık Net Maaş Toplamı" value={tl(aylikMaas)} sub={`${num(personel.filter((p) => p.durum === 'aktif').length)} aktif personel`} tone="indigo" />
        <StatCard icon="vergi" label="İşveren SGK Payı (~%20,5)" value={tl(isverenPayi)} sub="Otomatik tahmini hesaplama" tone="amber" />
        <StatCard icon="wallet" label="Aylık İşveren Maliyeti" value={tl(aylikToplamMaliyet)} sub={`Yıllık ≈ ${tl(yillik)}`} tone="green" />
      </div>

      <Card>
        <CardHeader
          title={`İç Kadro (${num(rows.length)})`}
          desc="Personel bordro ve IBAN bilgileri (IBAN şifreli, maskeli görünür)"
          action={<PersonelForm mode="create" />}
        />
        <div className="overflow-x-auto">
          {rows.length === 0 ? (
            <EmptyState icon="personel" title="Personel kaydı yok" />
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-100">
                  <Th>Personel</Th>
                  <Th>Departman / Rol</Th>
                  <Th>İşe Giriş</Th>
                  <Th className="text-right">Maaş</Th>
                  <Th>IBAN</Th>
                  <Th>SGK Durum</Th>
                  <Th className="text-right">İzin</Th>
                  <Th>Durum</Th>
                  <Th className="text-right">İşlem</Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {rows.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50/60">
                    <Td>
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-violet-50 text-xs font-semibold text-violet-600">
                          {p.ad.split(' ').map((x) => x[0]).slice(0, 2).join('')}
                        </div>
                        <a href={`/personel/${p.id}`} className="font-medium text-slate-900 hover:text-indigo-600">{p.ad}</a>
                      </div>
                    </Td>
                    <Td>
                      <div>{p.departman}</div>
                      <div className="text-xs text-slate-400">{p.rol}</div>
                    </Td>
                    <Td>{date(p.iseGiris)}</Td>
                    <Td className="text-right font-medium tabular-nums text-slate-900">{tl(p.maas)}</Td>
                    <Td className="tabular-nums text-slate-500">{maskIBAN(decrypt(p.iban))}</Td>
                    <Td>
                      <Badge tone={p.sgkDurum.includes('Aktif') ? 'green' : 'amber'}>{p.sgkDurum}</Badge>
                    </Td>
                    <Td className="text-right tabular-nums">{p.izinBakiyesi} gün</Td>
                    <Td>
                      <Badge tone={p.durum === 'aktif' ? 'green' : 'slate'}>{p.durum === 'aktif' ? 'Aktif' : 'Pasif'}</Badge>
                    </Td>
                    <Td className="text-right">
                      <div className="flex justify-end gap-1.5">
                        <PersonelForm mode="edit" personel={p} />
                        <form action={togglePersonelDurum}>
                          <input type="hidden" name="id" value={p.id} />
                          <input type="hidden" name="hedef" value={p.durum === 'aktif' ? 'pasif' : 'aktif'} />
                          <button className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700" title="Durum değiştir">
                            <Icon name="x" size={15} />
                          </button>
                        </form>
                      </div>
                    </Td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </Card>
    </div>
  )
}