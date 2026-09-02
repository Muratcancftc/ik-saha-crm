'use client'

import { useActionState, useEffect, useState } from 'react'
import { createAday } from '@/app/actions/aday'
import { Icon } from '@/components/icons'

type MeslekDto = { id: number; ad: string }

export function AdayForm({ meslekler }: { meslekler: MeslekDto[] }) {
  const [open, setOpen] = useState(false)
  const [state, formAction, pending] = useActionState(createAday, undefined)

  useEffect(() => {
    if (state && 'ok' in state) setOpen(false)
  }, [state])

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3.5 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-indigo-500"
      >
        <Icon name="plus" size={16} />
        Yeni Aday
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-900/50 p-4 pt-12 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
              <h3 className="text-base font-semibold text-slate-900">Yeni Aday</h3>
              <button onClick={() => setOpen(false)} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100">
                <Icon name="x" size={18} />
              </button>
            </div>
            <form action={formAction} className="space-y-4 px-6 py-5">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-slate-600">Ad Soyad *</label>
                  <input name="ad" required className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500" />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-slate-600">Telefon *</label>
                  <input name="telefon" required placeholder="+90 5xx" className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-slate-600">E-posta</label>
                  <input name="email" type="email" className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500" />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-slate-600">Meslek</label>
                  <select name="meslekId" className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500">
                    <option value="">Seçiniz</option>
                    {meslekler.map((m) => (
                      <option key={m.id} value={m.id}>{m.ad}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-slate-600">Puan (0-100)</label>
                <input name="puan" type="number" min={0} max={100} defaultValue={50} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500" />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-slate-600">Not</label>
                <textarea name="not" rows={2} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500" />
              </div>

              {state && 'error' in state && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</div>
              )}

              <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
                <button type="button" onClick={() => setOpen(false)} className="rounded-lg px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100">Vazgeç</button>
                <button type="submit" disabled={pending} className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-indigo-500 disabled:opacity-60">
                  {pending ? 'Kaydediliyor…' : 'Ekle'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}