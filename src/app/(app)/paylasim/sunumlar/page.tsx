import Link from 'next/link'
import { requireRoles } from '@/lib/dal'
import { prisma } from '@/lib/db'
import { Card, CardHeader, Badge, EmptyState, Th, Td } from '@/components/ui'
import { Icon } from '@/components/icons'
import { SilOnayForm } from '@/components/sil-onay'
import { sunumSil } from '@/app/actions/paylasim'
import { paylasimLinkGunOku } from '@/lib/maliyet-ayar'
import { date } from '@/lib/format'
import { LinkOlusturDialog } from '@/components/paylasim/link-olustur-dialog'
import { SunumForm, VersiyonForm } from './sunum-formlar'

export const dynamic = 'force-dynamic'

export default async function SunumlarPage() {
  const user = await requireRoles(['patron', 'operasyon'])
  const isPatron = user.rol === 'patron'

  const [sunumlar, linkGun] = await Promise.all([
    prisma.sunum.findMany({
      include: { versiyonlar: { orderBy: { versiyonNo: 'desc' } } },
      orderBy: { createdAt: 'desc' },
    }),
    paylasimLinkGunOku(),
  ])

  const secenekler = sunumlar
    .filter((s) => s.versiyonlar.length > 0)
    .map((s) => ({ id: s.id, ad: s.baslik }))

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold text-slate-900">Sunumlar</h1>
          <p className="text-sm text-slate-500">Kurumsal tanıtım sunumları (PDF görüntüleme + PPTX indirme)</p>
        </div>
        <div className="flex items-center gap-2">
          {secenekler.length > 0 && (
            <LinkOlusturDialog tur="SUNUM" secenekler={secenekler} linkGunVarsayilan={linkGun} baslik="Sunum Paylaşım Linki" />
          )}
          {isPatron && <SunumForm />}
        </div>
      </div>

      <Card>
        <CardHeader title="Sunum Arşivi" desc={`${sunumlar.length} sunum`} />
        {sunumlar.length === 0 ? (
          <EmptyState icon="sunum" title="Henüz sunum yok" desc={isPatron ? 'Yeni sunum yükleyerek başlayın.' : 'Admin henüz sunum yüklemedi.'} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b border-slate-100 bg-slate-50/60">
                <tr>
                  <Th>Başlık</Th>
                  <Th>Sürüm</Th>
                  <Th>Dosyalar</Th>
                  <Th>Oluşturma</Th>
                  <Th className="text-right">İşlem</Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {sunumlar.map((s) => {
                  const aktif = s.versiyonlar.find((v) => v.aktif) ?? s.versiyonlar[0]
                  const platformOf = s.versiyonlar.length
                  return (
                    <tr key={s.id}>
                      <Td>
                        <div className="font-medium text-slate-900">{s.baslik}</div>
                        {s.aciklama && <div className="text-xs text-slate-500">{s.aciklama}</div>}
                      </Td>
                      <Td>
                        <Badge tone="indigo">v{aktif?.versiyonNo ?? 1}</Badge>
                        {platformOf > 1 && <span className="ml-2 text-xs text-slate-400">{platformOf} sürüm</span>}
                        {aktif?.versiyonNotu && <div className="mt-1 text-xs text-slate-500">{aktif.versiyonNotu}</div>}
                      </Td>
                      <Td>
                        {aktif && (
                          <div className="flex items-center gap-3">
                            <Link href={`/api/paylasim/dosya/${aktif.id}`} target="_blank" className="inline-flex items-center gap-1 text-xs text-red-600 hover:underline">
                              <Icon name="pdf" size={14} /> PDF
                            </Link>
                            {aktif.pptxUrl && (
                              <Link href={`/api/paylasim/dosya/${aktif.id}?dosya=pptx&indir=1`} className="inline-flex items-center gap-1 text-xs text-slate-600 hover:underline">
                                <Icon name="belge" size={14} /> PPTX
                              </Link>
                            )}
                          </div>
                        )}
                      </Td>
                      <Td className="text-xs text-slate-500">{date(s.createdAt)}</Td>
                      <Td>
                        <div className="flex items-center justify-end gap-1">
                          {isPatron && aktif && <VersiyonForm sunumId={s.id} sonVersiyon={aktif.versiyonNo} />}
                          {isPatron && <SilOnayForm action={sunumSil} id={s.id} baslik={s.baslik} onayMetni="Sunum ve tüm sürümleri silinecek" />}
                        </div>
                      </Td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  )
}
