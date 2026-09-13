import { requireRoles } from '@/lib/dal'
import { prisma } from '@/lib/db'
import { Card, CardHeader, Badge, Th, Td, Button } from '@/components/ui'
import { Icon } from '@/components/icons'
import { createJob, toggleJobYayin, silJob } from '@/app/actions/job'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

const CALISMA_TIPLERI = ['tam_zamanli', 'yari_zamanli', 'part_time', 'sozlesmeli']

export default async function IsIlanlariPage() {
  await requireRoles(['patron', 'operasyon'])

  const ilanlar = await prisma.job.findMany({
    include: { _count: { select: { adaylar: true } } },
    orderBy: { createdAt: 'desc' },
  })

  return (
    <div className="space-y-5">
      {/* Yeni ilan */}
      <Card>
        <CardHeader title="Yeni İş İlanı" desc="Website'te yayınlanacak açık pozisyon ekle" />
        <form action={createJob} className="grid grid-cols-1 gap-3 px-5 py-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-500">Başlık *</label>
            <input name="baslik" required placeholder="CNC Operatörü" className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-500">Slug (boşsa başlıktan üretilir)</label>
            <input name="slug" placeholder="cnc-operatoru" className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-500">Lokasyon</label>
            <input name="lokasyon" placeholder="Gebze, Kocaeli" className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-500">Çalışma Tipi</label>
            <select name="calismaTipi" className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500">
              <option value="">—</option>
              {CALISMA_TIPLERI.map((t) => (
                <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-500">Geçerlilik Tarihi</label>
            <input name="gecerlilikTarihi" type="date" className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-500">Gereksinimler (satır başına bir madde)</label>
            <textarea name="gereksinimler" rows={2} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500" />
          </div>
          <div className="sm:col-span-2">
            <label className="mb-1 block text-xs font-medium text-slate-500">Açıklama</label>
            <textarea name="aciklama" rows={3} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500" />
          </div>
          <div className="sm:col-span-2">
            <Button type="submit">İlan Ekle</Button>
          </div>
        </form>
      </Card>

      {/* İlan listesi */}
      <Card>
        <CardHeader title={`İş İlanları (${ilanlar.length})`} desc="Yayınlanan ilanlar website API'sinden okunur" />
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-100">
                <Th>Başlık</Th>
                <Th>Slug</Th>
                <Th>Lokasyon</Th>
                <Th>Başvuru</Th>
                <Th>Durum</Th>
                <Th className="text-right">İşlem</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {ilanlar.map((i) => (
                <tr key={i.id} className="hover:bg-slate-50/60">
                  <Td className="font-medium text-slate-900">{i.baslik}</Td>
                  <Td className="text-slate-500">{i.slug}</Td>
                  <Td className="text-slate-500">{i.lokasyon ?? '—'}</Td>
                  <Td className="tabular-nums">{i._count.adaylar}</Td>
                  <Td>
                    {i.yayinlandi ? (
                      <Badge tone="green">Yayında</Badge>
                    ) : (
                      <Badge tone="slate">Yayın değil</Badge>
                    )}
                  </Td>
                  <Td className="text-right">
                    <div className="flex justify-end gap-1.5">
                      <form action={toggleJobYayin}>
                        <input type="hidden" name="id" value={i.id} />
                        <button type="submit" className="rounded-lg px-2 py-1 text-xs font-medium text-indigo-700 ring-1 ring-indigo-200 hover:bg-indigo-50" title={i.yayinlandi ? 'Yayından kaldır' : "Website'te yayınla"}>
                          {i.yayinlandi ? 'Kaldır' : 'Yayınla'}
                        </button>
                      </form>
                      <Link href={`/api/public/jobs/${i.slug}`} className="rounded-lg px-2 py-1 text-xs font-medium text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50" title="Public API">
                        API
                      </Link>
                      <form action={silJob}>
                        <input type="hidden" name="id" value={i.id} />
                        <button type="submit" className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600" title="Sil">
                          <Icon name="x" size={14} />
                        </button>
                      </form>
                    </div>
                  </Td>
                </tr>
              ))}
            </tbody>
          </table>
          {ilanlar.length === 0 && (
            <p className="px-5 py-6 text-center text-sm text-slate-400">Henüz iş ilanı yok. Yukarıdan ilk ilanı ekleyin.</p>
          )}
        </div>
      </Card>
    </div>
  )
}