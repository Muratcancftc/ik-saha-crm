'use client'

import { useActionState, useEffect, useState } from 'react'
import { createFatura } from '@/app/actions/muhasebe'
import { Icon } from '@/components/icons'

type FirmaDto = { id: number; ad: string }

export function FaturaForm({ firmalar }: { firmalar: FirmaDto[] }) {
  const [open, setOpen] = useState(false)
  const [net, setNet] = useState('')
  const [state, formAction, pending] = useActionState(createFatura, undefined)

  useEffect(() => {
    if (state && 'ok' in state) setOpen(false)
  }, [state])

  const netSayi = Number(net) || 0
  const kdv = Math.round(netSayi * 0.2 * 100) / 100
  const genel = Math.round((netSayi + kdv) * 100) / 100

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-indigo-500"
      >
        <Icon name="plus" size={15} />
        Fatura Kes
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-900/50 p-4 pt-12 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
              <h3 className="text-base font-semibold text-slate-900">Fatura Kes</h3>
              <button onClick={() => setOpen(false)} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100">
                <Icon name="x" size={18} />
              </button>
            </div>
            <form action={formAction} className="space-y-4 px-6 py-5">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-slate-600">Müşteri Firma *</label>
                  <select name="firmaId" required className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500">
                    <option value="">Seçiniz</option>
                    {firmalar.map((f) => (
                      <option key={f.id} value={f.id}>{f.ad}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-slate-600">Fatura No</label>
                  <input name="no" placeholder="IKR-2026-006" className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500" />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-slate-600">Dönem *</label>
                  <input name="donem" required placeholder="2026-09" className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500" />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-slate-600">Vade Tarihi *</label>
                  <input name="vadeTarihi" type="date" required className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500" />
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-medium text-slate-600">Net Tutar (ara toplam) *</label>
                <input
                  name="araToplam"
                  type="number"
                  step="0.01"
                  min={0}
                  required
                  value={net}
                  onChange={(e) => setNet(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm tabular-nums outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-3 gap-3 rounded-xl bg-slate-50 p-3 text-sm">
                <div>
                  <div className="text-[10px] uppercase tracking-wide text-slate-400">Ara Toplam</div>
                  <div className="font-semibold tabular-nums text-slate-900">{netSayi.toLocaleString('tr-TR')}</div>
                </div>
                <div>
                  <div className="text-[10px] uppercase tracking-wide text-slate-400">KDV (%20)</div>
                  <div className="font-semibold tabular-nums text-slate-900">+{kdv.toLocaleString('tr-TR')}</div>
                </div>
                <div>
                  <div className="text-[10px] uppercase tracking-wide text-slate-400">Genel Toplam</div>
                  <div className="font-semibold tabular-nums text-indigo-600">{genel.toLocaleString('tr-TR')}</div>
                </div>
              </div>

              {state && 'error' in state && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</div>
              )}

              <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
                <button type="button" onClick={() => setOpen(false)} className="rounded-lg px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100">Vazgeç</button>
                <button type="submit" disabled={pending} className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-indigo-500 disabled:opacity-60">
                  {pending ? 'Kesiliyor…' : 'Faturayı Kes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}