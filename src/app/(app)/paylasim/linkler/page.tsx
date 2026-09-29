import { requireRoles } from '@/lib/dal'
import { prisma } from '@/lib/db'
import { decrypt } from '@/lib/crypto'
import { Card, CardHeader, Badge, EmptyState, Th, Td } from '@/components/ui'
import { SilOnayForm, OnayForm } from '@/components/sil-onay'
import { Icon } from '@/components/icons'
import { linkIptal, linkUzat, linkSil } from '@/app/actions/paylasim'
import { KopyalaButonu } from '@/components/paylasim/link-olustur-dialog'
import { linkDurumHesapla, DURUM_ETIKET, type PaylasimDurumTip } from '@/lib/paylasim-tipleri'
import { paylasimBaseUrlIstek } from '@/lib/paylasim'
import { dateTime } from '@/lib/format'

export const dynamic = 'force-dynamic'

const DURUM_TON: Record<PaylasimDurumTip, 'green' | 'red' | 'amber'> = {
  AKTIF: 'green',
  IPTAL: 'red',
  SURESI_DOLDU: 'amber',
}

const TUR_ETIKET: Record<string, string> = { SUNUM: 'Sunum', MALIYET: 'Maliyet Tablosu' }

export default async function PaylasilanLinklerPage() {
  const user = await requireRoles(['patron', 'operasyon'])
  const isPatron = user.rol === 'patron'

  const [linkler, kullanicilar] = await Promise.all([
    prisma.paylasimLink.findMany({
      include: {
        sunumVersiyon: { include: { sunum: true } },
        maliyetTablosu: true,
      },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.kullanici.findMany({ select: { id: true, ad: true } }),
  ])
  const kullaniciMap = new Map(kullanicilar.map((k) => [k.id, k.ad]))
  const base = await paylasimBaseUrlIstek()

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-lg font-semibold text-slate-900">Paylaşılan Linkler</h1>
        <p className="text-sm text-slate-500">Sunum ve maliyet tablosu paylaşım linklerinin ortak listesi</p>
      </div>

      <Card>
        <CardHeader title="Linkler" desc={`${linkler.length} link`} />
        {linkler.length === 0 ? (
          <EmptyState icon="link" title="Henüz paylaşılan link yok" desc="Sunumlar veya Maliyet Tabloları sayfasından link oluşturun." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b border-slate-100 bg-slate-50/60">
                <tr>
                  <Th>Firma / Alıcı</Th>
                  <Th>İçerik</Th>
                  <Th>Durum</Th>
                  <Th>Geçerlilik</Th>
                  <Th>Son açılma</Th>
                  <Th>Açılma</Th>
                  <Th className="text-right">İşlem</Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {linkler.map((l) => {
                  const durum = linkDurumHesapla(l.durum, l.gecerlilikBitis)
                  const token = l.tokenSifreli ? decrypt(l.tokenSifreli) : ''
                  const link = token ? `${base}/p/${token}` : ''
                  const icerik =
                    l.tur === 'SUNUM'
                      ? l.sunumVersiyon?.sunum.baslik ?? 'Sunum'
                      : l.maliyetTablosu?.ad ?? 'Maliyet Tablosu'
                  return (
                    <tr key={l.id}>
                      <Td>
                        <div className="font-medium text-slate-900">{l.firmaAd}</div>
                        <div className="text-xs text-slate-500">{l.aliciAd} · {l.aliciEmail}</div>
                        <div className="text-[11px] text-slate-400">
                          Oluşturan: {kullaniciMap.get(l.olusturanKullaniciId ?? -1) ?? '—'} · {dateTime(l.createdAt)}
                        </div>
                      </Td>
                      <Td>
                        <Badge tone="indigo">{TUR_ETIKET[l.tur]}</Badge>
                        <div className="mt-1 text-xs text-slate-500">{icerik}</div>
                        {l.tur === 'MALIYET' && (
                          <div className="text-[11px] text-slate-400">{l.gorunum === 'KAR_GIZLI' ? 'Kâr payı gizli' : 'Tam tablo'}</div>
                        )}
                      </Td>
                      <Td>
                        <Badge tone={DURUM_TON[durum]}>{DURUM_ETIKET[durum]}</Badge>
                      </Td>
                      <Td className="text-xs text-slate-500">{dateTime(l.gecerlilikBitis)}</Td>
                      <Td className="text-xs text-slate-500">
                        {l.sonAcilma ? dateTime(l.sonAcilma) : '—'}
                        {l.ilkAcilma && <div className="text-[11px] text-slate-400">ilk: {dateTime(l.ilkAcilma)}</div>}
                      </Td>
                      <Td className="text-sm text-slate-700">{l.acilmaSayisi}</Td>
                      <Td>
                        <div className="flex items-center justify-end gap-1">
                          {link && <KopyalaButonu metin={link} etiket="" />}
                          <OnayForm action={linkUzat} gizli={{ id: l.id, gun: 30 }} onayMetni="Süre 30 gün uzatılacak" title="Süre uzat" className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700">
                            <Icon name="clock" size={15} />
                          </OnayForm>
                          {isPatron && durum !== 'IPTAL' && (
                            <OnayForm action={linkIptal} gizli={{ id: l.id }} onayMetni="Link iptal edilecek (müşteri artık açamaz)" title="İptal et" className="rounded-lg p-1.5 text-slate-400 transition hover:bg-red-50 hover:text-red-600">
                              <Icon name="x" size={15} />
                            </OnayForm>
                          )}
                          {isPatron && <SilOnayForm action={linkSil} id={l.id} baslik={`${l.firmaAd} linki`} onayMetni="Link kaydı ve erişim geçmişi silinecek" />}
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
