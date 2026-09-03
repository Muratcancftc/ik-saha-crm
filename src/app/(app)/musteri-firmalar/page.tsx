import { requireRoles, requireUser } from '@/lib/dal'
import { prisma } from '@/lib/db'
import { tl, num } from '@/lib/format'
import { Card, EmptyState } from '@/components/ui'
import { Icon } from '@/components/icons'
import { FirmaForm } from './firma-form'
import { setFirmaFiyat, addLokasyon, addYetkili, silFirma } from '@/app/actions/firma'
import { SilOnayForm } from '@/components/sil-onay'

export const dynamic = 'force-dynamic'

export default async function MusteriFirmalarPage() {
  const user = await requireUser()
  await requireRoles(['patron', 'operasyon'])
  const isPatron = user.rol === 'patron'

  const firmalar = await prisma.musteriFirma.findMany({
    include: {
      lokasyonlar: true,
      yetkililer: true,
      fiyatlar: { include: { meslek: true } },
      faturalar: { include: { tahsilatlar: true } },
    },
    orderBy: { ad: 'asc' },
  })
  const meslekler = await prisma.meslek.findMany({ orderBy: { ad: 'asc' } })

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">
          <b className="text-slate-900">{num(firmalar.length)}</b> müşteri firma
        </p>
        <FirmaForm />
      </div>

      {firmalar.length === 0 ? (
        <Card><EmptyState icon="firma" title="Firma eklenmemiş" desc="Yeni firma ekleyerek başlayın" /></Card>
      ) : (
        <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
          {firmalar.map((f) => {
            const ciro = f.faturalar.reduce((a, ft) => a + Number(ft.genelToplam), 0)
            const tahsilat = f.faturalar.reduce(
              (a, ft) => a + ft.tahsilatlar.reduce((x, t) => x + Number(t.tutar), 0),
              0
            )
            const alacak = ciro - tahsilat
            const sonFatura = f.faturalar[0]
            return (
              <Card key={f.id} className="flex flex-col overflow-hidden">
                <div className="border-b border-slate-100 px-5 py-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-sm font-semibold text-slate-900">
                        <a href={`/musteri-firmalar/${f.id}`} className="hover:text-indigo-600">{f.ad}</a>
                      </h3>
                      <p className="mt-0.5 text-xs text-slate-500">
                        {f.vergiNo ? `Vergi No: ${f.vergiNo}` : ''}
                        {f.telefon ? ` · ${f.telefon}` : ''}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-1.5">
                      {isPatron && <SilOnayForm action={silFirma} id={f.id} baslik={`${f.ad} firması`} buttonClass="rounded-lg p-1.5 text-slate-300 transition hover:bg-red-50 hover:text-red-600" />}
                      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                        <Icon name="firma" size={18} />
                      </div>
                    </div>
                  </div>

                  {/* Satış hattı */}
                  <div className="mt-3 grid grid-cols-3 gap-2">
                    <div className="rounded-xl bg-slate-50 p-2.5">
                      <div className="text-[10px] uppercase tracking-wide text-slate-400">Ciro</div>
                      <div className="mt-0.5 text-sm font-semibold tabular-nums text-slate-900">{tl(ciro)}</div>
                    </div>
                    <div className="rounded-xl bg-slate-50 p-2.5">
                      <div className="text-[10px] uppercase tracking-wide text-slate-400">Alacak</div>
                      <div className={`mt-0.5 text-sm font-semibold tabular-nums ${alacak > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>
                        {tl(alacak)}
                      </div>
                    </div>
                    <div className="rounded-xl bg-slate-50 p-2.5">
                      <div className="text-[10px] uppercase tracking-wide text-slate-400">Son Fatura</div>
                      <div className="mt-0.5 truncate text-sm font-semibold tabular-nums text-slate-900">
                        {sonFatura ? tl(sonFatura.genelToplam) : '—'}
                      </div>
                    </div>
                  </div>
                  <a
                    href={`/musteri-firmalar/${f.id}`}
                    className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-indigo-50 px-3 py-1.5 text-xs font-semibold text-indigo-700 transition hover:bg-indigo-100"
                  >
                    Firma Detayı
                    <Icon name="chevron" size={13} className="-rotate-90" />
                  </a>
                </div>

                <div className="grid flex-1 grid-cols-1 gap-4 px-5 py-4 sm:grid-cols-2">
                  {/* Lokasyonlar */}
                  <div>
                    <div className="mb-2 flex items-center justify-between">
                      <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Lokasyonlar</h4>
                      <LokasyonForm firmaId={f.id} />
                    </div>
                    <ul className="space-y-1.5">
                      {f.lokasyonlar.length === 0 && <li className="text-xs text-slate-400">Lokasyon yok</li>}
                      {f.lokasyonlar.map((l) => (
                        <li key={l.id} className="flex items-start gap-2 text-xs text-slate-700">
                          <span className="mt-0.5 text-slate-400"><Icon name="firma" size={13} /></span>
                          <div>
                            <span className="font-medium">{l.ad}</span>
                            {l.adres && <span className="text-slate-400"> — {l.adres}</span>}
                          </div>
                        </li>
                      ))}
                    </ul>

                    <div className="mb-2 mt-4 flex items-center justify-between">
                      <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Yetkililer</h4>
                      <YetkiliForm firmaId={f.id} />
                    </div>
                    <ul className="space-y-1.5">
                      {f.yetkililer.length === 0 && <li className="text-xs text-slate-400">Yetkili yok</li>}
                      {f.yetkililer.map((y) => (
                        <li key={y.id} className="flex items-center gap-2 text-xs text-slate-700">
                          <span className="text-slate-400"><Icon name="personel" size={13} /></span>
                          <span className="font-medium">{y.ad}</span>
                          {y.unvan && <span className="text-slate-400">{y.unvan}</span>}
                          {y.telefon && <span className="text-slate-500">{y.telefon}</span>}
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Fiyat anlaşması */}
                  <div>
                    <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Fiyat Anlaşması (kişi/gün)
                    </h4>
                    <div className="space-y-1.5">
                      {f.fiyatlar.map((p) => (
                        <form key={p.meslekId} action={setFirmaFiyat} className="flex items-center gap-2">
                          <input type="hidden" name="firmaId" value={f.id} />
                          <input type="hidden" name="meslekId" value={p.meslekId} />
                          <span className="w-24 text-xs text-slate-600">{p.meslek.ad}</span>
                          <input
                            name="fiyat"
                            type="number"
                            step="10"
                            defaultValue={Number(p.kisiGunFiyat)}
                            className="w-24 rounded-lg border border-slate-200 px-2 py-1 text-right text-xs tabular-nums outline-none focus:border-indigo-500"
                          />
                          <button
                            type="submit"
                            title="Kaydet"
                            className="rounded-lg p-1 text-emerald-600 transition hover:bg-emerald-50"
                          >
                            <Icon name="check" size={14} />
                          </button>
                        </form>
                      ))}
                      {f.fiyatlar.length === 0 && (
                        <p className="text-xs text-slate-400">Henüz fiyat anlaşması yok</p>
                      )}
                    </div>
                    {/* Fiyat Ekle: tanımlı olmayan mesleklerden seç */}
                    {(() => {
                      const eklenebilir = meslekler.filter((m) => !f.fiyatlar.some((p) => p.meslekId === m.id))
                      if (eklenebilir.length === 0) return null
                      return (
                        <form action={setFirmaFiyat} className="mt-2 flex items-center gap-2 border-t border-slate-100 pt-2">
                          <input type="hidden" name="firmaId" value={f.id} />
                          <select name="meslekId" required className="w-24 rounded-lg border border-slate-200 px-1.5 py-1 text-xs outline-none focus:border-indigo-500">
                            <option value="">+ Ekle</option>
                            {eklenebilir.map((m) => (
                              <option key={m.id} value={m.id}>{m.ad}</option>
                            ))}
                          </select>
                          <input
                            name="fiyat"
                            type="number"
                            step="10"
                            min={0}
                            required
                            placeholder="₺"
                            className="w-24 rounded-lg border border-slate-200 px-2 py-1 text-right text-xs tabular-nums outline-none focus:border-indigo-500"
                          />
                          <button type="submit" title="Fiyat ekle" className="rounded-lg p-1 text-indigo-600 transition hover:bg-indigo-50">
                            <Icon name="plus" size={14} />
                          </button>
                        </form>
                      )
                    })()}
                  </div>
                </div>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}

function LokasyonForm({ firmaId }: { firmaId: number }) {
  return (
    <form action={addLokasyon} className="flex items-center gap-1">
      <input type="hidden" name="firmaId" value={firmaId} />
      <input name="ad" placeholder="Lokasyon adı" className="w-28 rounded-md border border-slate-200 px-2 py-1 text-[11px] outline-none focus:border-indigo-500" />
      <button type="submit" className="rounded-md p-1 text-slate-400 hover:bg-indigo-50 hover:text-indigo-600" title="Lokasyon ekle">
        <Icon name="plus" size={14} />
      </button>
    </form>
  )
}

function YetkiliForm({ firmaId }: { firmaId: number }) {
  return (
    <form action={addYetkili} className="flex items-center gap-1">
      <input type="hidden" name="firmaId" value={firmaId} />
      <input name="ad" placeholder="Ad Soyad" className="w-28 rounded-md border border-slate-200 px-2 py-1 text-[11px] outline-none focus:border-indigo-500" />
      <button type="submit" className="rounded-md p-1 text-slate-400 hover:bg-indigo-50 hover:text-indigo-600" title="Yetkili ekle">
        <Icon name="plus" size={14} />
      </button>
    </form>
  )
}