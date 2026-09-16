'use client'

import { useActionState, useState } from 'react'
import { sistemAyarlariGuncelle, firmaUcretKaydet, firmaUcretToplu } from '@/app/actions/ik'
import { Icon } from '@/components/icons'

function Mesaj({ state }: { state: { error?: string; ok?: boolean } | undefined }) {
  if (!state) return null
  if ('error' in state && state.error) return <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</div>
  if ('ok' in state && state.ok) return <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">Kaydedildi.</div>
  return null
}

export function SistemAyarForm({ varsayilan, saatlik, carpan, duzenlenebilir }: { varsayilan: number; saatlik: number; carpan: number; duzenlenebilir: boolean }) {
  const [state, formAction, pending] = useActionState(sistemAyarlariGuncelle, undefined)
  if (!duzenlenebilir) {
    return (
      <div className="flex flex-wrap gap-6 px-5 py-4 text-sm">
        <div><span className="text-slate-400">Varsayılan günlük ücret: </span><b className="text-slate-900">{varsayilan.toLocaleString('tr-TR')} ₺</b></div>
        <div><span className="text-slate-400">Varsayılan saatlik ücret: </span><b className="text-slate-900">{saatlik.toLocaleString('tr-TR')} ₺</b></div>
        <div><span className="text-slate-400">Mesai çarpanı: </span><b className="text-slate-900">{carpan}x</b></div>
      </div>
    )
  }
  return (
    <form action={formAction} className="space-y-4 px-5 py-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div>
          <label className="mb-1.5 block text-xs font-medium text-slate-600">Varsayılan Günlük Ücret (₺)</label>
          <input name="varsayilanUcret" type="number" step="1" min={0} defaultValue={varsayilan} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500" />
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-medium text-slate-600">Varsayılan Saatlik Ücret (₺)</label>
          <input name="saatlikUcret" type="number" step="1" min={0} defaultValue={saatlik} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500" />
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-medium text-slate-600">Fazla Mesai Çarpanı</label>
          <input name="mesaiCarpan" type="number" step="0.1" min={1} defaultValue={carpan} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500" />
        </div>
      </div>
      <Mesaj state={state} />
      <div className="flex justify-end">
        <button type="submit" disabled={pending} className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-60">
          {pending ? 'Kaydediliyor…' : 'Kaydet'}
        </button>
      </div>
    </form>
  )
}

export function FirmaUcretInline({ firmaId, gunluk, saatlik }: { firmaId: number; gunluk: number | null; saatlik: number | null }) {
  const [state, formAction, pending] = useActionState(firmaUcretKaydet, undefined)
  return (
    <form action={formAction} className="flex flex-wrap items-center gap-1.5">
      <input type="hidden" name="firmaId" value={firmaId} />
      <input type="hidden" name="gecerlilikBaslangic" value={new Date().toISOString().slice(0, 10)} />
      <input name="gunlukUcret" type="number" step="1" min={0} placeholder="Günlük ₺" defaultValue={gunluk ?? ''} className="w-24 rounded-lg border border-slate-200 px-2 py-1 text-right text-xs tabular-nums outline-none focus:border-indigo-500" />
      <input name="saatlikUcret" type="number" step="1" min={0} placeholder="Saatlik ₺" defaultValue={saatlik ?? ''} className="w-24 rounded-lg border border-slate-200 px-2 py-1 text-right text-xs tabular-nums outline-none focus:border-indigo-500" />
      <button type="submit" disabled={pending} className="rounded-lg p-1.5 text-emerald-600 transition hover:bg-emerald-50 disabled:opacity-50" title="Kaydet">
        <Icon name="check" size={14} />
      </button>
      {state && 'error' in state && state.error && <span className="text-[10px] text-red-600">{state.error}</span>}
    </form>
  )
}

export function FirmaUcretToplu({ firmalar }: { firmalar: Array<{ id: number; ad: string }> }) {
  const [state, formAction, pending] = useActionState(firmaUcretToplu, undefined)
  const [open, setOpen] = useState(false)
  return (
    <div>
      <button onClick={() => setOpen(!open)} className="rounded-lg bg-indigo-50 px-3 py-2 text-sm font-medium text-indigo-700 ring-1 ring-indigo-200 transition hover:bg-indigo-100">
        Toplu Güncelle
      </button>
      {open && (
        <form action={formAction} className="mt-3 space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
          <div className="flex flex-wrap gap-2">
            {firmalar.map((f) => (
              <label key={f.id} className="flex cursor-pointer items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-700 has-[:checked]:border-indigo-500 has-[:checked]:bg-indigo-50">
                <input type="checkbox" name="firmaIds" value={f.id} className="accent-indigo-600" />
                {f.ad}
              </label>
            ))}
          </div>
          <div className="flex flex-wrap items-end gap-2">
            <div>
              <label className="mb-1 block text-[10px] text-slate-500">Günlük ₺</label>
              <input name="gunlukUcret" type="number" step="1" min={0} required className="w-28 rounded-lg border border-slate-300 px-2 py-1.5 text-xs outline-none focus:border-indigo-500" />
            </div>
            <div>
              <label className="mb-1 block text-[10px] text-slate-500">Saatlik ₺</label>
              <input name="saatlikUcret" type="number" step="1" min={0} defaultValue={0} className="w-28 rounded-lg border border-slate-300 px-2 py-1.5 text-xs outline-none focus:border-indigo-500" />
            </div>
            <div>
              <label className="mb-1 block text-[10px] text-slate-500">Geçerlilik</label>
              <input name="gecerlilikBaslangic" type="date" required defaultValue={new Date().toISOString().slice(0, 10)} className="rounded-lg border border-slate-300 px-2 py-1.5 text-xs outline-none focus:border-indigo-500" />
            </div>
            <button type="submit" disabled={pending} className="rounded-lg bg-indigo-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-indigo-500 disabled:opacity-60">
              {pending ? 'Uygulanıyor…' : 'Seçili Firmalara Uygula'}
            </button>
          </div>
          {state && 'error' in state && state.error && <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">{state.error}</div>}
          {state && 'ok' in state && state.ok && <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-700">Uygulandı.</div>}
        </form>
      )}
    </div>
  )
}