'use client'

import { useActionState, useEffect, useState } from 'react'
import { createServisci, updateServisci } from '@/app/actions/servis'
import { Icon } from '@/components/icons'

type ServisciDto = {
  id: number
  ad: string
  telefon: string
  bolge: string
  durum: string
  not: string | null
}

export function ServisciForm({ mode, servisci, varsayilanBolge = 'kocaeli' }: { mode: 'create' | 'edit'; servisci?: ServisciDto; varsayilanBolge?: string }) {
  const [open, setOpen] = useState(false)
  const action = mode === 'create' ? createServisci : updateServisci
  const [state, formAction, pending] = useActionState(action, undefined)

  useEffect(() => {
    if (state && 'ok' in state) setOpen(false)
  }, [state])

  return (
    <>
      {mode === 'create' ? (
        <button
          onClick={() => setOpen(true)}
          className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3.5 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-indigo-500"
        >
          <Icon name="plus" size={16} />
          Yeni Servisçi
        </button>
      ) : (
        <button
          onClick={() => setOpen(true)}
          className="rounded-lg p-1.5 text-slate-400 transition hover:bg-indigo-50 hover:text-indigo-600"
          title="Düzenle"
        >
          <Icon name="personel" size={15} />
        </button>
      )}

      {open && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-900/50 p-4 pt-10 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
              <h3 className="text-base font-semibold text-slate-900">
                {mode === 'create' ? 'Yeni Servisçi' : `Servisçi Düzenle — ${servisci?.ad}`}
              </h3>
              <button onClick={() => setOpen(false)} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100">
                <Icon name="x" size={18} />
              </button>
            </div>

            <form action={formAction} className="space-y-4 px-6 py-5">
              {mode === 'edit' && <input type="hidden" name="id" value={servisci?.id} />}

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-slate-600">Ad Soyad *</label>
                  <input name="ad" required defaultValue={servisci?.ad} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500" />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-slate-600">Telefon</label>
                  <input name="telefon" defaultValue={servisci?.telefon} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500" />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-slate-600">Bölge</label>
                  <select name="bolge" defaultValue={servisci?.bolge ?? varsayilanBolge} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500">
                    <option value="kocaeli">Kocaeli</option>
                    <option value="balikesir">Balıkesir</option>
                  </select>
                </div>
                {mode === 'edit' && (
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-slate-600">Durum</label>
                    <select name="durum" defaultValue={servisci?.durum ?? 'aktif'} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500">
                      <option value="aktif">Aktif</option>
                      <option value="pasif">Pasif</option>
                    </select>
                  </div>
                )}
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-slate-600">Not</label>
                <textarea name="not" rows={2} defaultValue={servisci?.not ?? ''} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500" />
              </div>

              <p className="rounded-xl bg-slate-50 px-3 py-2 text-xs text-slate-500">
                Ödemeler <b>kavlî</b> (anlaşmalı) tutar üzerinden ve <b>KDV&apos;siz</b> kaydedilir.
              </p>

              {state && 'error' in state && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{String(state.error)}</div>
              )}

              <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
                <button type="button" onClick={() => setOpen(false)} className="rounded-lg px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100">Vazgeç</button>
                <button type="submit" disabled={pending} className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-indigo-500 disabled:opacity-60">
                  {pending ? 'Kaydediliyor…' : mode === 'create' ? 'Ekle' : 'Güncelle'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}