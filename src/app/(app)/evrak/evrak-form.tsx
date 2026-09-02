'use client'

import { useState } from 'react'
import { evrakYukle } from '@/app/actions/evrak'
import { Icon } from '@/components/icons'
import { Button } from '@/components/ui'

type FirmaDto = { id: number; ad: string }
type IsciDto = { id: number; ad: string }

export function EvrakForm({ firmalar, isciler }: { firmalar: FirmaDto[]; isciler: IsciDto[] }) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3.5 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-indigo-500"
      >
        <Icon name="plus" size={16} />
        Evrak Yükle
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-900/50 p-4 pt-14 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
              <h3 className="text-base font-semibold text-slate-900">Evrak Yükle</h3>
              <button onClick={() => setOpen(false)} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100">
                <Icon name="x" size={18} />
              </button>
            </div>
            <form action={evrakYukle} className="space-y-4 px-6 py-5">
              <div>
                <label className="mb-1.5 block text-xs font-medium text-slate-600">Tip</label>
                <select name="tip" className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500">
                  <option value="firma_sozlesme">Firma Sözleşme</option>
                  <option value="isci_is_sozlesme">İşçi İş Sözleşme</option>
                  <option value="kvkk_acik_riza">KVKK Açık Rıza</option>
                  <option value="diger">Diğer</option>
                </select>
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-slate-600">Başlık *</label>
                <input name="baslik" required placeholder="Ör: Artaş 2026 sözleşmesi" className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-slate-600">Firma (ops.)</label>
                  <select name="ilgiliFirmaId" className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500">
                    <option value="">—</option>
                    {firmalar.map((f) => (
                      <option key={f.id} value={f.id}>{f.ad}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-slate-600">İşçi (ops.)</label>
                  <select name="ilgiliIsciId" className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500">
                    <option value="">—</option>
                    {isciler.map((i) => (
                      <option key={i.id} value={i.id}>{i.ad}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-slate-600">Dosya *</label>
                <input name="dosya" type="file" required className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-indigo-50 file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-indigo-700" />
              </div>
              <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
                <button type="button" onClick={() => setOpen(false)} className="rounded-lg px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100">Vazgeç</button>
                <Button type="submit">Yükle</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}