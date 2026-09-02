import { requireRoles } from '@/lib/dal'
import { prisma } from '@/lib/db'
import { date, num, dateLong } from '@/lib/format'
import { daysUntil, startOfDay } from '@/lib/dates'
import { Card, CardHeader, Th, Td, Badge, EmptyState } from '@/components/ui'
import { Icon } from '@/components/icons'
import { BelgeForm } from './belge-form'
import { silBelge } from '@/app/actions/belge'
import { sgkBildir } from '@/app/actions/talep'

export const dynamic = 'force-dynamic'

export default async function BelgeSgkPage({
  searchParams,
}: {
  searchParams: Promise<{ durum?: string }>
}) {
  await requireRoles(['patron', 'operasyon'])
  const sp = await searchParams
  const durumFiltre = sp.durum ?? 'hepsi'

  const belgeler = await prisma.belge.findMany({
    include: { isci: true },
    orderBy: { bitisTarihi: 'asc' },
  })
  const isciler = await prisma.isci.findMany({ orderBy: { ad: 'asc' } })

  const bugun = startOfDay()
  const siniflandir = (b: (typeof belgeler)[number]) => {
    const g = daysUntil(b.bitisTarihi)
    if (g < 0) return 'doldu'
    if (g <= 30) return 'yaklasiyor'
    return 'gecerli'
  }
  const filtreli = durumFiltre === 'hepsi' ? belgeler : belgeler.filter((b) => siniflandir(b) === durumFiltre)

  const dolan = belgeler.filter((b) => siniflandir(b) === 'doldu').length
  const yaklasan = belgeler.filter((b) => siniflandir(b) === 'yaklasiyor').length

  // SGK giriş bildirimleri
  const sgkEksik = await prisma.atama.findMany({
    where: { sgkBildirildi: false, durum: { in: ['atandi', 'onaylandi'] }, tarih: { gte: bugun } },
    include: { isci: true, talep: { include: { firma: true, lokasyon: true } } },
    orderBy: { tarih: 'asc' },
  })

  return (
    <div className="space-y-5">
      {/* SGK giriş bildirimi */}
      <Card>
        <CardHeader
          title="SGK Giriş Bildirimleri"
          desc="Atama yapılınca bildirim otomatik olarak 'bekliyor' durumundadır — işten 1 gün önce bildirilmelidir"
        />
        <div className="overflow-x-auto">
          {sgkEksik.length === 0 ? (
            <EmptyState icon="check" title="Tüm bildirimler yapılmış" desc="Bekleyen SGK bildirimi yok" />
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-100">
                  <Th>İşçi</Th>
                  <Th>Firma / Lokasyon</Th>
                  <Th>İş Tarihi</Th>
                  <Th>Bildirim</Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {sgkEksik.map((a) => {
                  const g = daysUntil(a.tarih)
                  return (
                    <tr key={a.id} className="hover:bg-slate-50/60">
                      <Td className="font-medium text-slate-900">{a.isci.ad}</Td>
                      <Td>{a.talep.firma.ad} · {a.talep.lokasyon.ad}</Td>
                      <Td>
                        {dateLong(a.tarih)}
                        {g <= 1 && <Badge tone="red" className="ml-1.5">Bugün/Yarın!</Badge>}
                      </Td>
                      <Td>
                        <form action={sgkBildir}>
                          <input type="hidden" name="id" value={a.id} />
                          <button className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-indigo-500">
                            Bildirildi ✓
                          </button>
                        </form>
                      </Td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
      </Card>

      {/* Belge listesi */}
      <Card>
        <CardHeader
          title={`Belge Takibi (${num(belgeler.length)})`}
          desc={`${num(dolan)} süresi doldu · ${num(yaklasan)} yaklaşıyor`}
          action={
            <div className="flex items-center gap-2">
              <form method="get" className="flex items-center gap-2">
                <select
                  name="durum"
                  defaultValue={durumFiltre}
                  className="rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs outline-none focus:border-indigo-500"
                >
                  <option value="hepsi">Hepsi</option>
                  <option value="gecerli">Geçerli</option>
                  <option value="yaklasiyor">30 gün içinde dolacak</option>
                  <option value="doldu">Süresi doldu</option>
                </select>
                <button type="submit" className="rounded-lg bg-white px-2.5 py-1.5 text-xs font-medium ring-1 ring-slate-300 hover:bg-slate-50">
                  Filtrele
                </button>
              </form>
              <BelgeForm isciler={isciler} />
            </div>
          }
        />
        <div className="overflow-x-auto">
          {filtreli.length === 0 ? (
            <EmptyState icon="belge" title="Belge bulunamadı" />
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-100">
                  <Th>İşçi</Th>
                  <Th>Belge Tipi</Th>
                  <Th>Veriliş</Th>
                  <Th>Bitiş</Th>
                  <Th>Durum</Th>
                  <Th className="text-right">İşlem</Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filtreli.map((b) => {
                  const g = daysUntil(b.bitisTarihi)
                  const durum = siniflandir(b)
                  return (
                    <tr key={b.id} className="hover:bg-slate-50/60">
                      <Td className="font-medium text-slate-900">{b.isci.ad}</Td>
                      <Td>{b.tip}</Td>
                      <Td>{date(b.verilisTarihi)}</Td>
                      <Td>{date(b.bitisTarihi)}</Td>
                      <Td>
                        {durum === 'doldu' ? (
                          <Badge tone="red">{Math.abs(g)} gün önce doldu</Badge>
                        ) : durum === 'yaklasiyor' ? (
                          <Badge tone="amber">{g} gün kaldı</Badge>
                        ) : (
                          <Badge tone="green">Geçerli</Badge>
                        )}
                      </Td>
                      <Td className="text-right">
                        <form action={silBelge}>
                          <input type="hidden" name="id" value={b.id} />
                          <button className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600" title="Sil">
                            <Icon name="x" size={14} />
                          </button>
                        </form>
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