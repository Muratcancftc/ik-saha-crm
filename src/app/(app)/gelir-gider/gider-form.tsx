'use client'

import { useActionState, useEffect, useState } from 'react'
import { createGider } from '@/app/actions/muhasebe'
import { Icon } from '@/components/icons'
import { Badge } from '@/components/ui'

export const GiderKategoriLabel: Record<string, string> = {
  isci_yevmiye: 'Saha İşçi Yevmiye',
  personel_bordro: 'Personel Bordro',
  kira: 'Kira',
  ulasim: 'Ulaşım',
  yakit: 'Yakıt',
  sarf_malzeme: 'Sarf Malzeme',
  diger: 'Diğer',
}

const KATEGORILER = Object.entries(GiderKategoriLabel)

export function GiderKategoriLabelBadge({ kategori }: { kategori: string }) {
  const tones: Record<string, string> = {
    isci_yevmiye: 'indigo',
    personel_bordro: 'violet',
    kira: 'blue',
    ulasim: 'slate',
    yakit: 'amber',
    sarf_malzeme: 'slate',
    diger: 'slate',
  }
  return <Badge tone={(tones[kategori] ?? 'slate') as never}>{GiderKategoriLabel[kategori] ?? kategori}</Badge>
}

export function GiderForm() {
  const [open, setOpen] = useState(false)
  const [state, formAction, pending] = useActionState(createGider, undefined)

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
        Gider Ekle
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-900/50 p-4 pt-16 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
              <h3 className="text-base font-semibold text-slate-900">Gider Ekle</h3>
              <button onClick={() => setOpen(false)} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100">
                <Icon name="x" size={18} />
              </button>
            </div>
            <form action={formAction} className="space-y-4 px-6 py-5">
              <div>
                <label className="mb-1.5 block text-xs font-medium text-slate-600">Kategori</label>
                <select name="kategori" className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500">
                  {KATEGORILER.map(([k, l]) => (
                    <option key={k} value={k}>{l}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-slate-600">Tutar (₺) *</label>
                  <input name="tutar" type="number" step="0.01" min={0} required className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500" />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-slate-600">Tarih</label>
                  <input name="tarih" type="date" className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500" />
                </div>
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-slate-600">Açıklama</label>
                <input name="aciklama" className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500" />
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