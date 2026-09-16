'use client'

import { useActionState, useEffect, useState } from 'react'
import { createPersonelIsg } from '@/app/actions/belge'
import { Icon } from '@/components/icons'

type PersonelDto = { id: number; ad: string }

export function PersonelIsgForm({ personeller }: { personeller: PersonelDto[] }) {
  const [open, setOpen] = useState(false)
  const [state, formAction, pending] = useActionState(createPersonelIsg, undefined)

  useEffect(() => {
    if (state && 'ok' in state) setOpen(false)
  }, [state])

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-indigo-500"
      >
        <Icon name="plus" size={15} />
        İSG Belgesi Ekle
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-900/50 p-4 pt-16 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
              <h3 className="text-base font-semibold text-slate-900">Personel İSG Belgesi Ekle</h3>
              <button onClick={() => setOpen(false)} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100">
                <Icon name="x" size={18} />
              </button>
            </div>
            <form action={formAction} className="space-y-4 px-6 py-5">
              <div>
                <label className="mb-1.5 block text-xs font-medium text-slate-600">Personel *</label>
                <select name="personelId" required className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500">
                  <option value="">Seçiniz</option>
                  {personeller.map((p) => (
                    <option key={p.id} value={p.id}>{p.ad}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-slate-600">Bitiş Tarihi *</label>
                <input name="bitisTarihi" type="date" required className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500" />
              </div>
              <p className="rounded-xl bg-slate-50 px-3 py-2 text-xs text-slate-500">
                İSG (İş Sağlığı ve Güvenliği) belgesi eklendiğinde Personel menüsünde adın yanında <b>İSG √</b> rozeti görünür.
              </p>

              {state && 'error' in state && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{String(state.error)}</div>
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