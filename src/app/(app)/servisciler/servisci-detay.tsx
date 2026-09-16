'use client'

import { useState } from 'react'
import { servisEkle, silServis } from '@/app/actions/servis'
import { Icon } from '@/components/icons'
import { Badge } from '@/components/ui'
import { bolgeEtiket, BOLGE_TONE } from '@/lib/bolge'

type ServisDto = { id: number; tarih: Date; guzergah: string | null; tutar: number; not: string | null }
type ServisciDto = { id: number; ad: string; telefon: string; bolge: string; durum: string }

const tl = (n: number) => new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(n)

export function ServisciDetay({ servisci, servisler }: { servisci: ServisciDto; servisler: ServisDto[] }) {
  const [open, setOpen] = useState(false)
  const toplam = servisler.reduce((a, s) => a + s.tutar, 0)

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="rounded-lg px-2.5 py-1 text-xs font-medium text-indigo-700 ring-1 ring-indigo-200 transition hover:bg-indigo-50"
      >
        Servisler ({servisler.length})
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-900/50 p-4 pt-10 backdrop-blur-sm">
          <div className="w-full max-w-2xl rounded-2xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
              <div>
                <h3 className="text-base font-semibold text-slate-900">{servisci.ad}</h3>
                <p className="mt-0.5 text-xs text-slate-500">
                  {servisci.telefon || 'Telefon yok'} · <Badge tone={BOLGE_TONE[servisci.bolge as 'kocaeli' | 'balikesir']}>{bolgeEtiket(servisci.bolge as 'kocaeli' | 'balikesir')}</Badge>
                </p>
              </div>
              <button onClick={() => setOpen(false)} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100">
                <Icon name="x" size={18} />
              </button>
            </div>

            <div className="px-6 py-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl bg-slate-50 p-3 text-center">
                  <div className="text-xl font-bold tabular-nums text-slate-900">{servisler.length}</div>
                  <div className="mt-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-400">Servis</div>
                </div>
                <div className="rounded-xl bg-emerald-50 p-3 text-center">
                  <div className="text-xl font-bold tabular-nums text-emerald-700">{tl(toplam)}</div>
                  <div className="mt-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-600">Toplam (KDV&apos;siz)</div>
                </div>
              </div>

              {/* Servis ekle */}
              <form action={servisEkle} className="mt-4 grid grid-cols-2 gap-2 rounded-xl border border-slate-200 p-3 sm:grid-cols-4">
                <input type="hidden" name="servisciId" value={servisci.id} />
                <div>
                  <label className="mb-1 block text-[11px] font-medium text-slate-500">Tarih *</label>
                  <input name="tarih" type="date" required className="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-xs outline-none focus:border-indigo-500" />
                </div>
                <div>
                  <label className="mb-1 block text-[11px] font-medium text-slate-500">Ne yaptı / Güzergâh</label>
                  <input name="guzergah" placeholder="Örn. Şantiyeye işçi götürdü" className="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-xs outline-none focus:border-indigo-500" />
                </div>
                <div>
                  <label className="mb-1 block text-[11px] font-medium text-slate-500">Kavli Tutar (₺, KDV&apos;siz) *</label>
                  <input name="tutar" type="number" step="1" min={0} required className="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-xs outline-none focus:border-indigo-500" />
                </div>
                <div className="flex items-end">
                  <button type="submit" className="w-full rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-indigo-500">
                    Servis Ekle
                  </button>
                </div>
              </form>

              {/* Geçmiş */}
              <div className="mt-4">
                <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">Servis Geçmişi</h4>
                {servisler.length === 0 ? (
                  <p className="rounded-xl bg-slate-50 px-3 py-4 text-center text-xs text-slate-400">Henüz servis kaydı yok</p>
                ) : (
                  <ul className="max-h-72 divide-y divide-slate-50 overflow-y-auto">
                    {servisler
                      .slice()
                      .sort((a, b) => b.tarih.getTime() - a.tarih.getTime())
                      .map((s) => (
                        <li key={s.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5">
                          <div className="min-w-0">
                            <div className="text-sm font-medium text-slate-800">
                              {new Intl.DateTimeFormat('tr-TR', { day: '2-digit', month: 'long', year: 'numeric' }).format(new Date(s.tarih))}
                              <span className="ml-2 font-semibold tabular-nums text-emerald-700">{tl(s.tutar)}</span>
                            </div>
                            {s.guzergah && <div className="truncate text-xs text-slate-500">{s.guzergah}</div>}
                            {s.not && <div className="text-xs text-slate-400">{s.not}</div>}
                          </div>
                          <form action={silServis}>
                            <input type="hidden" name="id" value={s.id} />
                            <button className="rounded-lg p-1.5 text-slate-300 transition hover:bg-red-50 hover:text-red-600" title="Sil">
                              <Icon name="x" size={14} />
                            </button>
                          </form>
                        </li>
                      ))}
                  </ul>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}