import { requireRoles } from '@/lib/dal'
import { prisma } from '@/lib/db'
import { tl, num, date, dateLong } from '@/lib/format'
import { daysUntil, startOfDay } from '@/lib/dates'
import { Card, CardHeader, StatCard, Th, Td, EmptyState, Badge } from '@/components/ui'
import { OdemeBadge } from '@/components/status-badge'
import { RESMI_ODEME_TIP } from '@/lib/labels'
import { Icon } from '@/components/icons'
import { OdemeForm } from './odeme-form'
import { resmiOdemeDurum, silResmiOdeme } from '@/app/actions/muhasebe'

export const dynamic = 'force-dynamic'

export default async function VergiOdemelerPage() {
  await requireRoles(['patron', 'muhasebe'])

  const [odemeler, faturalar] = await Promise.all([
    prisma.resmiOdeme.findMany({ orderBy: { sonOdemeTarihi: 'asc' } }),
    prisma.fatura.findMany({ select: { kdvTutar: true, durum: true } }),
  ])

  // Fatura KDV'si vergi ekranına aktarılır (İş kuralı 5)
  const faturaKdv = faturalar
    .filter((f) => f.durum !== 'odendi')
    .reduce((a, f) => a + Number(f.kdvTutar), 0)

  const toplamBekleyen = odemeler.filter((o) => o.durum !== 'odendi').reduce((a, o) => a + Number(o.tutar), 0)
  const toplamOdenen = odemeler.filter((o) => o.durum === 'odendi').reduce((a, o) => a + Number(o.tutar), 0)
  const bugun = startOfDay()

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard icon="vergi" label="Bekleyen Resmi Ödemeler" value={tl(toplamBekleyen)} sub={`${num(odemeler.filter((o) => o.durum !== 'odendi').length)} kalem`} tone="amber" />
        <StatCard icon="check" label="Ödenen" value={tl(toplamOdenen)} sub="Bu yıl içinde yapılan ödemeler" tone="green" />
        <StatCard icon="fatura" label="Tahakkuk Eden KDV (açık fatura)" value={tl(faturaKdv)} sub="Faturalardan otomatik aktarılır" tone="indigo" />
      </div>

      <Card>
        <CardHeader
          title="Resmi Ödemeler"
          desc="KDV, Muhtasar & SGK, maaş ve geçici vergi — sistem hesaplar ve hatırlatır, beyanname mali müşavirdedir"
          action={<OdemeForm />}
        />
        <div className="overflow-x-auto">
          {odemeler.length === 0 ? (
            <EmptyState icon="vergi" title="Ödeme kaydı yok" />
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-100">
                  <Th>Tip</Th>
                  <Th>Son Ödeme Tarihi</Th>
                  <Th className="text-right">Tutar</Th>
                  <Th className="text-left">Durum</Th>
                  <Th className="text-right">İşlem</Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {odemeler.map((o) => {
                  const kalanGun = o.durum === 'odendi' ? null : daysUntil(o.sonOdemeTarihi)
                  return (
                    <tr key={o.id} className="hover:bg-slate-50/60">
                      <Td className="font-medium text-slate-900">{RESMI_ODEME_TIP[o.tip] ?? o.tip}</Td>
                      <Td>
                        {date(o.sonOdemeTarihi)}
                        {o.durum === 'odendi' && o.odemeTarihi ? (
                          <span className="ml-1.5 text-xs text-slate-400">ödendi {date(o.odemeTarihi)}</span>
                        ) : kalanGun !== null && kalanGun < 0 ? (
                          <Badge tone="red" className="ml-1.5">{Math.abs(kalanGun)} gün gecikti</Badge>
                        ) : kalanGun !== null && kalanGun <= 3 ? (
                          <Badge tone="amber" className="ml-1.5">{kalanGun} gün kaldı</Badge>
                        ) : null}
                      </Td>
                      <Td className="text-right font-semibold tabular-nums text-slate-900">{tl(o.tutar)}</Td>
                      <Td><OdemeBadge durum={o.durum} /></Td>
                      <Td className="text-right">
                        <div className="flex justify-end gap-1.5">
                          {o.durum !== 'odendi' && (
                            <form action={resmiOdemeDurum}>
                              <input type="hidden" name="id" value={o.id} />
                              <input type="hidden" name="durum" value="odendi" />
                              <button type="submit" title="Ödendi işaretle" className="rounded-lg p-1.5 text-emerald-600 transition hover:bg-emerald-50">
                                <Icon name="check" size={15} />
                              </button>
                            </form>
                          )}
                          <form action={silResmiOdeme}>
                            <input type="hidden" name="id" value={o.id} />
                            <button type="submit" title="Sil" className="rounded-lg p-1.5 text-slate-400 transition hover:bg-red-50 hover:text-red-600">
                              <Icon name="x" size={15} />
                            </button>
                          </form>
                        </div>
                      </Td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
      </Card>

      <Card className="p-5">
        <div className="text-sm text-slate-600">
          <b className="text-slate-900">Hatırlatma:</b> Bugün <b>{dateLong(bugun)}</b>. Resmi ödeme tutarları
          gelir-gider ve bordrodan otomatik hesaplanır; sistem sadece hatırlatır. Resmi beyanname dışarıda
          (mali müşavir) verilir.
        </div>
      </Card>
    </div>
  )
}