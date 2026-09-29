import Link from 'next/link'
import { requireRoles } from '@/lib/dal'
import { prisma } from '@/lib/db'
import { Card, CardHeader, Badge, EmptyState, Th, Td } from '@/components/ui'
import { Icon } from '@/components/icons'
import { SilOnayForm, OnayForm } from '@/components/sil-onay'
import { maliyetTablosuSil, maliyetTablosuKopyala } from '@/app/actions/paylasim'
import { paylasimLinkGunOku } from '@/lib/maliyet-ayar'
import { date } from '@/lib/format'
import { LinkOlusturDialog } from '@/components/paylasim/link-olustur-dialog'

export const dynamic = 'force-dynamic'

export default async function MaliyetTablolariPage() {
  await requireRoles(['patron', 'operasyon'])

  const [tablolar, linkGun] = await Promise.all([
    prisma.maliyetTablosu.findMany({
      include: { _count: { select: { pozisyonlar: true } } },
      orderBy: { createdAt: 'desc' },
    }),
    paylasimLinkGunOku(),
  ])

  const secenekler = tablolar.map((t) => ({ id: t.id, ad: t.ad ?? `Tablo #${t.id}` }))

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold text-slate-900">Maliyet Tabloları</h1>
          <p className="text-sm text-slate-500">Yevmiyeci maliyet hesaplama ve teklif tabloları</p>
        </div>
        <div className="flex items-center gap-2">
          {secenekler.length > 0 && (
            <LinkOlusturDialog tur="MALIYET" secenekler={secenekler} linkGunVarsayilan={linkGun} baslik="Maliyet Tablosu Paylaşım Linki" />
          )}
          <Link href="/paylasim/maliyet/yeni" className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3.5 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-500">
            <Icon name="plus" size={16} /> Yeni Tablo
          </Link>
        </div>
      </div>

      <Card>
        <CardHeader title="Tablolar" desc={`${tablolar.length} tablo`} />
        {tablolar.length === 0 ? (
          <EmptyState icon="vergi" title="Henüz maliyet tablosu yok" desc="Yeni tablo oluşturarak başlayın." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b border-slate-100 bg-slate-50/60">
                <tr>
                  <Th>Tablo</Th>
                  <Th>Tarih</Th>
                  <Th>Geçerlilik</Th>
                  <Th>Pozisyon</Th>
                  <Th className="text-right">İşlem</Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {tablolar.map((t) => (
                  <tr key={t.id}>
                    <Td className="font-medium text-slate-900">{t.ad ?? `Tablo #${t.id}`}</Td>
                    <Td className="text-xs text-slate-500">{date(t.tarih)}</Td>
                    <Td className="text-xs text-slate-500">{t.gecerlilikTarihi ? date(t.gecerlilikTarihi) : '—'}</Td>
                    <Td>
                      <Badge tone="indigo">{t._count.pozisyonlar}</Badge>
                    </Td>
                    <Td>
                      <div className="flex items-center justify-end gap-1">
                        <Link href={`/paylasim/maliyet/${t.id}`} className="rounded-lg p-1.5 text-slate-400 transition hover:bg-indigo-50 hover:text-indigo-600" title="Düzenle">
                          <Icon name="personel" size={15} />
                        </Link>
                        <OnayForm action={maliyetTablosuKopyala} gizli={{ id: t.id }} onayMetni="Tablo kopyalanacak" title="Kopyala" className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700">
                          <Icon name="belge" size={15} />
                        </OnayForm>
                        <SilOnayForm action={maliyetTablosuSil} id={t.id} baslik={t.ad ?? `Tablo #${t.id}`} onayMetni="Maliyet tablosu silinecek" />
                      </div>
                    </Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {tablolar.length > 0 && (
        <p className="text-xs text-slate-400">
          Not: Bir tabloyu paylaştığınızda o anki hâli dondurulur; tabloda yaptığınız sonraki değişiklikler gönderilmiş linki etkilemez.
        </p>
      )}
    </div>
  )
}
