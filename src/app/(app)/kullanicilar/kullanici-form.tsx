'use client'

import { useActionState, useEffect, useState } from 'react'
import { kullaniciEkle } from '@/app/actions/ayar'
import { Icon } from '@/components/icons'

type LokasyonDto = { id: number; ad: string }

export function KullaniciForm({ lokasyonlar }: { lokasyonlar: LokasyonDto[] }) {
  const [open, setOpen] = useState(false)
  const [rol, setRol] = useState('operasyon')
  const [state, formAction, pending] = useActionState(kullaniciEkle, undefined)

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
        Kullanıcı Ekle
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-900/50 p-4 pt-14 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
              <h3 className="text-base font-semibold text-slate-900">Yeni Kullanıcı</h3>
              <button onClick={() => setOpen(false)} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100">
                <Icon name="x" size={18} />
              </button>
            </div>
            <form action={formAction} autoComplete="off" className="space-y-4 px-6 py-5">
              <div>
                <label className="mb-1.5 block text-xs font-medium text-slate-600">Ad</label>
                <input name="ad" required autoComplete="off" className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500" />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-slate-600">E-posta</label>
                <input name="email" type="email" required autoComplete="off" className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500" />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-slate-600">Şifre (min 6)</label>
                <input name="sifre" type="password" required minLength={6} autoComplete="new-password" className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500" />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-slate-600">Rol</label>
                <select name="rol" value={rol} onChange={(e) => setRol(e.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500">
                  <option value="operasyon">Operasyon</option>
                  <option value="muhasebe">Muhasebe</option>
                  <option value="saha_sorumlusu">Saha Sorumlusu</option>
                  <option value="patron">Patron</option>
                </select>
              </div>
              {rol === 'saha_sorumlusu' && (
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-slate-600">Lokasyon</label>
                  <select name="lokasyonId" className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500">
                    <option value="">Seçiniz</option>
                    {lokasyonlar.map((l) => (
                      <option key={l.id} value={l.id}>{l.ad}</option>
                    ))}
                  </select>
                </div>
              )}

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