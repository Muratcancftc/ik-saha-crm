'use client'

import { useActionState, useEffect, useState } from 'react'
import { sunumEkle, sunumVersiyonEkle, type PaylasimState } from '@/app/actions/paylasim'
import { Icon } from '@/components/icons'

function Mesaj({ state }: { state: PaylasimState }) {
  if (state?.error) return <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</div>
  return null
}

function Modal({
  baslik,
  onClose,
  children,
}: {
  baslik: string
  onClose: () => void
  children: React.ReactNode
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-900/50 p-4 pt-12 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-2xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <h3 className="text-base font-semibold text-slate-900">{baslik}</h3>
          <button onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100" aria-label="Kapat">
            <Icon name="x" size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}

function DosyaAlanlari({ mevcutPdf }: { mevcutPdf?: boolean }) {
  return (
    <>
      <div>
        <label className="mb-1.5 block text-xs font-medium text-slate-600">PDF {mevcutPdf ? '' : '*'}</label>
        <input name="pdf" type="file" accept="application/pdf,.pdf" required={!mevcutPdf} className="block w-full text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-indigo-50 file:px-3 file:py-2 file:text-sm file:font-medium file:text-indigo-700 hover:file:bg-indigo-100" />
        <p className="mt-1 text-[11px] text-slate-400">Görüntüleme için. En fazla 20MB.</p>
      </div>
      <div>
        <label className="mb-1.5 block text-xs font-medium text-slate-600">PPTX (opsiyonel)</label>
        <input name="pptx" type="file" accept=".pptx" className="block w-full text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-slate-100 file:px-3 file:py-2 file:text-sm file:font-medium file:text-slate-700 hover:file:bg-slate-200" />
        <p className="mt-1 text-[11px] text-slate-400">İndirme için. En fazla 20MB.</p>
      </div>
    </>
  )
}

export function SunumForm() {
  const [open, setOpen] = useState(false)
  const [state, formAction, pending] = useActionState<PaylasimState, FormData>(sunumEkle, undefined)

  useEffect(() => {
    if (state?.ok) setOpen(false)
  }, [state])

  return (
    <>
      <button onClick={() => setOpen(true)} className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3.5 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-500">
        <Icon name="plus" size={16} /> Yeni Sunum
      </button>
      {open && (
        <Modal baslik="Yeni Sunum" onClose={() => setOpen(false)}>
          <form action={formAction} className="space-y-4 px-6 py-5">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-slate-600">Başlık *</label>
              <input name="baslik" required className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" placeholder="ör. Atalay İK Kurumsal Sunum" />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-slate-600">Açıklama</label>
              <textarea name="aciklama" rows={2} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-slate-600">Versiyon notu</label>
              <input name="versiyonNotu" className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" placeholder="ör. İlk sürüm" />
            </div>
            <DosyaAlanlari />
            <Mesaj state={state} />
            <div className="flex justify-end gap-2 pt-1">
              <button type="button" onClick={() => setOpen(false)} className="rounded-lg bg-slate-100 px-3 py-2 text-sm text-slate-700 hover:bg-slate-200">Vazgeç</button>
              <button type="submit" disabled={pending} className="rounded-lg bg-indigo-600 px-3.5 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-60">
                {pending ? 'Yükleniyor…' : 'Kaydet'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </>
  )
}

export function VersiyonForm({ sunumId, sonVersiyon }: { sunumId: number; sonVersiyon: number }) {
  const [open, setOpen] = useState(false)
  const [state, formAction, pending] = useActionState<PaylasimState, FormData>(sunumVersiyonEkle, undefined)

  useEffect(() => {
    if (state?.ok) setOpen(false)
  }, [state])

  return (
    <>
      <button onClick={() => setOpen(true)} className="rounded-lg p-1.5 text-slate-400 transition hover:bg-indigo-50 hover:text-indigo-600" title="Yeni sürüm yükle">
        <Icon name="yenile" size={15} />
      </button>
      {open && (
        <Modal baslik={`Yeni Sürüm (v${sonVersiyon + 1})`} onClose={() => setOpen(false)}>
          <form action={formAction} className="space-y-4 px-6 py-5">
            <input type="hidden" name="sunumId" value={sunumId} />
            <div>
              <label className="mb-1.5 block text-xs font-medium text-slate-600">Versiyon notu</label>
              <input name="versiyonNotu" className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" placeholder="ör. 2026 güncellemesi" />
            </div>
            <DosyaAlanlari />
            <Mesaj state={state} />
            <div className="flex justify-end gap-2 pt-1">
              <button type="button" onClick={() => setOpen(false)} className="rounded-lg bg-slate-100 px-3 py-2 text-sm text-slate-700 hover:bg-slate-200">Vazgeç</button>
              <button type="submit" disabled={pending} className="rounded-lg bg-indigo-600 px-3.5 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-60">
                {pending ? 'Yükleniyor…' : 'Kaydet'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </>
  )
}
