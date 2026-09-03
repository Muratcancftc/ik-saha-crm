import { requireRoles } from '@/lib/dal'
import { prisma } from '@/lib/db'
import { date, num } from '@/lib/format'
import { Card, CardHeader, Th, Td, Badge, EmptyState } from '@/components/ui'
import { Icon } from '@/components/icons'
import { EvrakForm } from './evrak-form'
import { evrakSil } from '@/app/actions/evrak'
import { SilOnayForm } from '@/components/sil-onay'

export const dynamic = 'force-dynamic'

const TIP: Record<string, { label: string; tone: string }> = {
  firma_sozlesme: { label: 'Firma Sözleşme', tone: 'indigo' },
  isci_is_sozlesme: { label: 'İşçi İş Sözleşme', tone: 'blue' },
  kvkk_acik_riza: { label: 'KVKK Açık Rıza', tone: 'violet' },
  diger: { label: 'Diğer', tone: 'slate' },
}

export default async function EvrakPage() {
  await requireRoles(['patron', 'operasyon', 'muhasebe'])

  const [evraklar, firmalar, isciler] = await Promise.all([
    prisma.evrak.findMany({
      include: { firma: true, isci: true },
      orderBy: { yuklemeTarihi: 'desc' },
    }),
    prisma.musteriFirma.findMany({ orderBy: { ad: 'asc' } }),
    prisma.isci.findMany({ orderBy: { ad: 'asc' } }),
  ])

  const firmalarSeri = firmalar.map((f) => ({ id: f.id, ad: f.ad }))
  const iscilerSeri = isciler.map((i) => ({ id: i.id, ad: i.ad }))

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-slate-500">
          <b className="text-slate-900">{num(evraklar.length)}</b> evrak
        </p>
        <EvrakForm firmalar={firmalarSeri} isciler={iscilerSeri} />
      </div>

      <Card>
        <CardHeader title="Sözleşme & Evrak" desc="Firma sözleşmeleri, işçi iş sözleşmeleri, KVKK açık rıza formları — dosya yükle/sakla" />
        <div className="overflow-x-auto">
          {evraklar.length === 0 ? (
            <EmptyState icon="belge" title="Evrak yok" desc="Yukarıdan dosya yükleyin" />
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-100">
                  <Th>Tip</Th>
                  <Th>Başlık</Th>
                  <Th>Bağlı</Th>
                  <Th>Dosya</Th>
                  <Th>Yükleme</Th>
                  <Th className="text-right">İşlem</Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {evraklar.map((e) => {
                  const t = TIP[e.tip] ?? { label: e.tip, tone: 'slate' }
                  const bagli = e.firma ? (
                    <a href={`/musteri-firmalar/${e.firma.id}`} className="text-indigo-600 hover:underline">{e.firma.ad}</a>
                  ) : e.isci ? (
                    <a href={`/isci-havuzu/${e.isci.id}`} className="text-indigo-600 hover:underline">{e.isci.ad}</a>
                  ) : '—'
                  return (
                    <tr key={e.id} className="hover:bg-slate-50/60">
                      <Td><Badge tone={t.tone as never}>{t.label}</Badge></Td>
                      <Td className="font-medium text-slate-900">{e.baslik}</Td>
                      <Td>{bagli}</Td>
                      <Td>
                        <a href={e.dosyaYol} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-indigo-600 hover:underline">
                          <Icon name="belge" size={14} />
                          {e.dosyaAdi}
                        </a>
                      </Td>
                      <Td>{date(e.yuklemeTarihi)}</Td>
                      <Td className="text-right">
                        <SilOnayForm action={evrakSil} id={e.id} baslik={`${e.baslik} evrakı`} />
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