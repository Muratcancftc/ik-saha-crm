'use client'

import { useActionState, useEffect, useState } from 'react'
import { createTalep } from '@/app/actions/talep'
import { Icon } from '@/components/icons'

type FirmaDto = { id: number; ad: string; lokasyonlar: { id: number; ad: string }[] }
type MeslekDto = { id: number; ad: string }

export function TalepForm({ firmalar, meslekler }: { firmalar: FirmaDto[]; meslekler: MeslekDto[] }) {
  const [open, setOpen] = useState(false)
  const [firmaId, setFirmaId] = useState<number | ''>('')
  const [kalemler, setKalemler] = useState([{ meslekId: '', adet: 1 }])
  const [state, formAction, pending] = useActionState(createTalep, undefined)

  useEffect(() => {
    if (state && 'ok' in state) setOpen(false)
  }, [state])

  const lokasyonlar = firmalar.find((f) => f.id === Number(firmaId))?.lokasyonlar ?? []

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3.5 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-indigo-500"
      >
        <Icon name="plus" size={16} />
        Yeni Talep
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-900/50 p-4 pt-8 backdrop-blur-sm">
          <div className="w-full max-w-2xl rounded-2xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
              <h3 className="text-base font-semibold text-slate-900">Yeni Talep</h3>
              <button onClick={() => setOpen(false)} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100">
                <Icon name="x" size={18} />
              </button>
            </div>

            <form action={formAction} className="space-y-4 px-6 py-5">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-slate-600">Müşteri Firma *</label>
                  <select
                    name="firmaId"
                    required
                    value={firmaId}
                    onChange={(e) => setFirmaId(Number(e.target.value))}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500"
                  >
                    <option value="">Seçiniz</option>
                    {firmalar.map((f) => (
                      <option key={f.id} value={f.id}>{f.ad}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-slate-600">Lokasyon *</label>
                  <select name="lokasyonId" required disabled={!firmaId} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500 disabled:bg-slate-50">
                    <option value="">{firmaId ? 'Lokasyon seçin' : 'Önce firma seçin'}</option>
                    {lokasyonlar.map((l) => (
                      <option key={l.id} value={l.id}>{l.ad}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-slate-600">Tarih *</label>
                  <input name="tarih" type="date" required className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-slate-600">Vardiya</label>
                    <select name="vardiya" className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500">
                      <option value="gunduz">Gündüz</option>
                      <option value="gece">Gece</option>
                    </select>
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-slate-600">Aciliyet</label>
                    <select name="aciliyet" className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500">
                      <option value="normal">Normal</option>
                      <option value="acil">Acil</option>
                    </select>
                  </div>
                </div>
              </div>

              <div>
                <div className="mb-1.5 flex items-center justify-between">
                  <label className="text-xs font-medium text-slate-600">Talep Kalemleri</label>
                  <button
                    type="button"
                    onClick={() => setKalemler([...kalemler, { meslekId: '', adet: 1 }])}
                    className="text-xs font-medium text-indigo-600 hover:underline"
                  >
                    + Kalem ekle
                  </button>
                </div>
                <div className="space-y-2">
                  {kalemler.map((k, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <select
                        name="meslekId"
                        required
                        value={k.meslekId}
                        onChange={(e) => setKalemler(kalemler.map((x, i) => (i === idx ? { ...x, meslekId: e.target.value } : x)))}
                        className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500"
                      >
                        <option value="">Meslek seçin</option>
                        {meslekler.map((m) => (
                          <option key={m.id} value={m.id}>{m.ad}</option>
                        ))}
                      </select>
                      <input
                        name="adet"
                        type="number"
                        min={1}
                        value={k.adet}
                        onChange={(e) => setKalemler(kalemler.map((x, i) => (i === idx ? { ...x, adet: Number(e.target.value) } : x)))}
                        className="w-20 rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500"
                      />
                      <button
                        type="button"
                        onClick={() => setKalemler(kalemler.filter((_, i) => i !== idx))}
                        disabled={kalemler.length === 1}
                        className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 disabled:opacity-40"
                      >
                        <Icon name="x" size={16} />
                      </button>
                    </div>
                  ))}
                </div>
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
                  {pending ? 'Oluşturuluyor…' : 'Talep Oluştur'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}