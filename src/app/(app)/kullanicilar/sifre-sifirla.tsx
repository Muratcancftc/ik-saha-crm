'use client'

import { useActionState, useEffect, useState } from 'react'
import { kullaniciSifreSifirla } from '@/app/actions/ayar'
import { Icon } from '@/components/icons'

export function SifreSifirlaForm({ id, ad }: { id: number; ad: string }) {
  const [open, setOpen] = useState(false)
  const [state, action, pending] = useActionState(kullaniciSifreSifirla, undefined)

  useEffect(() => {
    if (state && 'ok' in state) setOpen(false)
  }, [state])

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        title="Şifre sıfırla"
        className="rounded-lg p-1.5 text-slate-400 transition hover:bg-amber-50 hover:text-amber-600"
      >
        <Icon name="yenile" size={14} />
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-900/50 p-4 pt-16 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
              <h3 className="text-base font-semibold text-slate-900">Şifre Sıfırla</h3>
              <button onClick={() => setOpen(false)} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100">
                <Icon name="x" size={18} />
              </button>
            </div>
            <form action={action} className="space-y-4 px-5 py-5">
              <input type="hidden" name="id" value={id} />
              <p className="text-xs text-slate-500">{ad} için yeni bir şifre belirleyin.</p>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-slate-600">Yeni şifre (min 6 karakter)</label>
                <input
                  name="sifre"
                  type="password"
                  required
                  minLength={6}
                  autoComplete="new-password"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500"
                />
              </div>
              {state && 'error' in state && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</div>
              )}
              <div className="flex justify-end gap-2 pt-1">
                <button type="button" onClick={() => setOpen(false)} className="rounded-lg px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100">
                  Vazgeç
                </button>
                <button
                  type="submit"
                  disabled={pending}
                  className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-indigo-500 disabled:opacity-60"
                >
                  {pending ? 'Kaydediliyor…' : 'Sıfırla'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
