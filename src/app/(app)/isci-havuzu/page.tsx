import { requireRoles } from '@/lib/dal'
import { prisma } from '@/lib/db'
import { maskTC, maskIBAN, decrypt } from '@/lib/crypto'
import { tl, num } from '@/lib/format'
import { daysUntil } from '@/lib/dates'
import { Card, Badge, Select, Input, EmptyState } from '@/components/ui'
import { IsciBadge } from '@/components/status-badge'
import { Icon } from '@/components/icons'
import { IsciForm } from './isci-form'
import { IsciDetayModal } from './isci-detay-modal'
import { toggleIsciDurum } from '@/app/actions/isci'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

const BOLGELER = [
  'Ümraniye', 'Üsküdar', 'Pendik', 'Kartal', 'Maltepe', 'Kadıköy',
  'Beylikdüzü', 'Esenyurt', 'Başakşehir', 'Tuzla', 'Ataşehir', 'Sancaktepe',
]

export default async function IsciHavuzuPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; meslek?: string; bolge?: string; durum?: string }>
}) {
  await requireRoles(['patron', 'operasyon'])
  const sp = await searchParams
  const q = sp.q?.trim() ?? ''
  const meslek = sp.meslek
  const bolge = sp.bolge
  const durum = sp.durum

  const meslekler = await prisma.meslek.findMany({ orderBy: { ad: 'asc' } })

  const isciler = await prisma.isci.findMany({
    where: {
      ...(q ? { ad: { contains: q, mode: 'insensitive' } } : {}),
      ...(meslek ? { meslekler: { some: { meslekId: Number(meslek) } } } : {}),
      ...(bolge ? { ilce: bolge } : {}),
      ...(durum ? { durum: durum as never } : {}),
    },
    include: {
      meslekler: { include: { meslek: true } },
      belgeler: true,
      atamalar: { include: { puantaj: true } },
    },
    orderBy: { ad: 'asc' },
  })

  const rows = isciler.map((i) => {
    const noShow = i.atamalar.filter((a) => a.puantaj?.durum === 'gelmedi').length
    return {
      id: i.id,
      ad: i.ad,
      telefon: i.telefon,
      tcMasked: maskTC(decrypt(i.tcKimlik)),
      ibanMasked: maskIBAN(decrypt(i.iban)),
      ilce: i.ilce,
      puan: i.puan,
      beklenti: Number(i.gunlukUcretBeklentisi),
      durum: i.durum,
      noShow,
      tercihBolgeler: i.tercihBolgeler,
      dogumTarihi: i.dogumTarihi,
      meslekIds: i.meslekler.map((m) => m.meslekId),
      meslekler: i.meslekler.map((m) => m.meslek.ad),
      belgeMin: i.belgeler.length ? Math.min(...i.belgeler.map((b) => daysUntil(b.bitisTarihi))) : null,
    }
  })

  const aktif = rows.filter((r) => r.durum === 'aktif').length

  return (
    <div className="space-y-5">
      {/* Filtre çubuğu */}
      <Card className="p-4">
        <form method="get" className="flex flex-wrap items-end gap-3">
          <div className="min-w-56 flex-1">
            <label className="mb-1.5 block text-xs font-medium text-slate-600">Ara</label>
            <div className="relative">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                <Icon name="search" size={16} />
              </span>
              <Input name="q" defaultValue={q} placeholder="İşçi adı veya telefon…" className="pl-9" />
            </div>
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-slate-600">Meslek</label>
            <Select name="meslek" defaultValue={meslek ?? ''}>
              <option value="">Tümü</option>
              {meslekler.map((m) => (
                <option key={m.id} value={m.id}>{m.ad}</option>
              ))}
            </Select>
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-slate-600">Bölge (İlçe)</label>
            <Select name="bolge" defaultValue={bolge ?? ''}>
              <option value="">Tümü</option>
              {BOLGELER.map((b) => (
                <option key={b} value={b}>{b}</option>
              ))}
            </Select>
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-slate-600">Durum</label>
            <Select name="durum" defaultValue={durum ?? ''}>
              <option value="">Tümü</option>
              <option value="aktif">Aktif</option>
              <option value="pasif">Pasif</option>
              <option value="kara_liste">Kara Liste</option>
            </Select>
          </div>
          <button
            type="submit"
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-indigo-500"
          >
            Filtrele
          </button>
          <Link
            href="/isci-havuzu"
            className="rounded-lg px-3 py-2 text-sm font-medium text-slate-500 hover:bg-slate-100"
          >
            Temizle
          </Link>
        </form>
      </Card>

      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">
          <b className="text-slate-900">{num(rows.length)}</b> işçi · <b className="text-emerald-600">{num(aktif)}</b> aktif
        </p>
        <IsciForm
          mode="create"
          meslekler={meslekler}
          bolgeler={BOLGELER}
        />
      </div>

      <Card>
        {rows.length === 0 ? (
          <EmptyState title="Eşleşen işçi bulunamadı" desc="Filtreleri değiştirin veya yeni işçi ekleyin" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500">İşçi</th>
                  <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500">Bölge</th>
                  <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500">Meslekler</th>
                  <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500">Puan</th>
                  <th className="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-wide text-slate-500">Beklenti</th>
                  <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500">Belge</th>
                  <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500">Durum</th>
                  <th className="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-wide text-slate-500">İşlem</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {rows.map((i) => (
                  <tr key={i.id} className="group hover:bg-slate-50/60">
                    <td className="whitespace-nowrap px-5 py-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-indigo-50 text-xs font-semibold text-indigo-600">
                          {i.ad.split(' ').map((p) => p[0]).slice(0, 2).join('')}
                        </div>
                        <div className="min-w-0">
                          <Link href={`/isci-havuzu/${i.id}`} className="block max-w-44 truncate text-sm font-medium text-slate-900 hover:text-indigo-600" title={i.ad}>
                            {i.ad}
                          </Link>
                          <div className="whitespace-nowrap text-xs text-slate-500">{i.telefon}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-700">{i.ilce}</td>
                    <td className="px-4 py-3">
                      <div className="flex max-w-52 flex-wrap gap-1">
                        {i.meslekler.map((m) => (
                          <Badge key={m} tone="slate">{m}</Badge>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 w-10 overflow-hidden rounded-full bg-slate-100">
                          <div
                            className="h-full rounded-full bg-indigo-500"
                            style={{ width: `${i.puan}%` }}
                          />
                        </div>
                        <span className="text-xs tabular-nums text-slate-600">{i.puan}</span>
                        {i.noShow > 0 && (
                          <Badge tone="red">{i.noShow} no-show</Badge>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right text-sm tabular-nums text-slate-700">{tl(i.beklenti)}</td>
                    <td className="px-4 py-3">
                      {i.belgeMin === null ? (
                        <Badge tone="slate">Belge yok</Badge>
                      ) : i.belgeMin < 0 ? (
                        <Badge tone="red">Süresi doldu</Badge>
                      ) : i.belgeMin <= 30 ? (
                        <Badge tone="amber">{i.belgeMin} gün kaldı</Badge>
                      ) : (
                        <Badge tone="green">Geçerli</Badge>
                      )}
                    </td>
                    <td className="px-4 py-3"><IsciBadge durum={i.durum} /></td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1.5">
                        <IsciDetayModal isciId={i.id} isciAd={i.ad} />
                        <IsciForm mode="edit" isci={i} meslekler={meslekler} bolgeler={BOLGELER} />
                        <form action={toggleIsciDurum}>
                          <input type="hidden" name="id" value={i.id} />
                          <input type="hidden" name="hedef" value={i.durum === 'aktif' ? 'pasif' : 'aktif'} />
                          <button className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700" title="Durum değiştir">
                            <Icon name="x" size={16} />
                          </button>
                        </form>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <p className="px-1 text-[11px] text-slate-400">
        KVKK gereği TC Kimlik ve IBAN şifreli saklanır; arayüzde maskeli gösterilir.
      </p>
    </div>
  )
}