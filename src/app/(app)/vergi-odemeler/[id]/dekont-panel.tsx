'use client'

import { useActionState, useEffect, useState } from 'react'
import { dekontYukle, dekontSil } from '@/app/actions/vergi'
import { Icon } from '@/components/icons'

type DekontDto = { id: number; dosyaAdi: string; dosyaTipi: string; dosyaBoyutu: number | null; yukleyen: string | null; tarih: Date }

const GORSEL = ['jpg', 'jpeg', 'png', 'webp', 'gif']

export function DekontPanel({ dekontlar, vergiOdemeId, yazabilir, dekontSilYetkisi }: { dekontlar: DekontDto[]; vergiOdemeId: number; yazabilir: boolean; dekontSilYetkisi: boolean }) {
  const [state, formAction, pending] = useActionState(dekontYukle, undefined)
  const [onizleme, setOnizleme] = useState<DekontDto | null>(null)

  useEffect(() => {
    if (state && 'ok' in state) return
  }, [state])

  return (
    <div>
      {yazabilir && (
        <form action={formAction} className="mb-4 rounded-xl border border-slate-200 bg-slate-50 p-3">
          <input type="hidden" name="id" value={vergiOdemeId} />
          <div className="flex items-center gap-2">
            <input name="dekontlar" type="file" multiple accept=".pdf,.jpg,.jpeg,.png,.webp,.gif" className="flex-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-500" />
            <button type="submit" disabled={pending} className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-60">
              {pending ? 'Yükleniyor…' : 'Dekont Yükle'}
            </button>
          </div>
          <p className="mt-1.5 text-[11px] text-slate-400">PDF/JPG/PNG/WebP/GIF · max 10MB · çoklu yükleme desteklenir</p>
          {state && 'error' in state && state.error && <div className="mt-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</div>}
        </form>
      )}

      {dekontlar.length === 0 ? (
        <p className="py-4 text-center text-xs text-slate-400">Dekont yok</p>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {dekontlar.map((d) => {
            const gorsel = GORSEL.includes(d.dosyaTipi)
            return (
              <div key={d.id} className="group rounded-xl border border-slate-200 bg-white p-3">
                <button onClick={() => setOnizleme(d)} className="flex h-24 w-full items-center justify-center rounded-lg bg-slate-50 hover:bg-slate-100">
                  {gorsel ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={`/api/dekont/indir/${d.id}`} alt={d.dosyaAdi} className="h-full w-full rounded-lg object-cover" />
                  ) : (
                    <div className="flex flex-col items-center text-slate-400">
                      <Icon name="pdf" size={28} />
                      <span className="mt-1 text-[10px] uppercase">PDF</span>
                    </div>
                  )}
                </button>
                <div className="mt-2 truncate text-xs font-medium text-slate-800" title={d.dosyaAdi}>{d.dosyaAdi}</div>
                <div className="flex items-center justify-between text-[10px] text-slate-400">
                  <span>{d.yukleyen ?? '—'} · {new Intl.DateTimeFormat('tr-TR').format(new Date(d.tarih))}</span>
                  <span className="flex gap-1">
                    <a href={`/api/dekont/indir/${d.id}?indir=1`} className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-indigo-600" title="İndir">
                      <Icon name="yenile" size={13} />
                    </a>
                    {dekontSilYetkisi && (
                      <form action={dekontSil} onSubmit={(e) => { if (!window.confirm('Dekont silinsin mi?')) e.preventDefault() }}>
                        <input type="hidden" name="id" value={d.id} />
                        <button className="rounded p-1 text-slate-400 hover:bg-red-50 hover:text-red-600" title="Sil">
                          <Icon name="x" size={13} />
                        </button>
                      </form>
                    )}
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Önizleme modalı */}
      {onizleme && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 p-4 backdrop-blur-sm" onClick={() => setOnizleme(null)}>
          <div className="max-h-[90vh] w-full max-w-2xl overflow-auto rounded-2xl bg-white" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3">
              <div className="truncate text-sm font-semibold text-slate-900">{onizleme.dosyaAdi}</div>
              <div className="flex items-center gap-2">
                <a href={`/api/dekont/indir/${onizleme.id}?indir=1`} className="rounded-lg bg-indigo-50 px-3 py-1.5 text-xs font-semibold text-indigo-700 hover:bg-indigo-100">İndir</a>
                <button onClick={() => setOnizleme(null)} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100"><Icon name="x" size={18} /></button>
              </div>
            </div>
            <div className="p-3">
              {GORSEL.includes(onizleme.dosyaTipi) ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={`/api/dekont/indir/${onizleme.id}`} alt={onizleme.dosyaAdi} className="mx-auto max-h-[80vh] rounded-lg" />
              ) : (
                <iframe src={`/api/dekont/indir/${onizleme.id}`} className="h-[80vh] w-full rounded-lg" title={onizleme.dosyaAdi} />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}