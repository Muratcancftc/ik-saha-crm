'use client'

import { useActionState, useEffect, useState } from 'react'
import { createPersonel, updatePersonel, personelGizli } from '@/app/actions/personel'
import { Icon } from '@/components/icons'

type PersonelDto = {
  id: number
  ad: string
  departman: string
  rol: string
  iseGiris: Date
  maas: number
  iban: string
  sgkDurum: string
  izinBakiyesi: number
  durum: string
}

export function PersonelForm({ mode, personel }: { mode: 'create' | 'edit'; personel?: PersonelDto }) {
  const [open, setOpen] = useState(false)
  const [iban, setIban] = useState('')
  const [gizli, setGizli] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const action = mode === 'create' ? createPersonel : updatePersonel
  const [state, formAction, pending] = useActionState(action, undefined)

  useEffect(() => {
    if (state && 'ok' in state) setOpen(false)
  }, [state])

  useEffect(() => {
    if (!open) return
    setIban('')
    setGizli(null)
  }, [open])

  // KVKK: IBAN varsayılan maskeli — tam değer yalnızca "Göster" ile yüklenir
  async function gosterIban() {
    if (!personel) return
    setLoading(true)
    const g = await personelGizli(personel.id)
    if (g) { setIban(g.iban); setGizli(g.iban) }
    setLoading(false)
  }

  const giris = personel ? new Date(personel.iseGiris).toISOString().slice(0, 10) : ''

  return (
    <>
      {mode === 'create' ? (
        <button
          onClick={() => setOpen(true)}
          className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3.5 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-indigo-500"
        >
          <Icon name="plus" size={15} />
          Personel Ekle
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
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-900/50 p-4 pt-12 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
              <h3 className="text-base font-semibold text-slate-900">
                {mode === 'create' ? 'Personel Ekle' : `Personel Düzenle — ${personel?.ad}`}
              </h3>
              <button onClick={() => setOpen(false)} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100">
                <Icon name="x" size={18} />
              </button>
            </div>

            <form action={formAction} className="space-y-4 px-6 py-5">
              {mode === 'edit' && <input type="hidden" name="id" value={personel?.id} />}

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-slate-600">Ad Soyad *</label>
                  <input name="ad" required defaultValue={personel?.ad} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500" />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-slate-600">Departman</label>
                  <input name="departman" defaultValue={personel?.departman} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500" />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-slate-600">Rol</label>
                  <input name="rol" defaultValue={personel?.rol} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500" />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-slate-600">İşe Giriş Tarihi</label>
                  <input name="iseGiris" type="date" defaultValue={giris || undefined} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500" />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-slate-600">Aylık Maaş (₺) *</label>
                  <input name="maas" type="number" step="0.01" min={0} required defaultValue={personel?.maas ?? ''} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500" />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-slate-600">İzin Bakiyesi (gün)</label>
                  <input name="izinBakiyesi" type="number" defaultValue={personel?.izinBakiyesi ?? 0} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500" />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-slate-600">SGK Durum</label>
                  <input name="sgkDurum" defaultValue={personel?.sgkDurum ?? 'Aktif SGK'} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500" />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-slate-600">
                    IBAN {mode === 'edit' && <span className="text-slate-400">(şifreli saklanır)</span>}
                  </label>
                  <div className="flex items-center gap-1.5">
                    <input
                      name="iban"
                      value={iban}
                      onChange={(e) => setIban(e.target.value)}
                      placeholder={mode === 'edit' ? '••••• (boşsa korunur)' : 'TR00 0000 …'}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500"
                    />
                    {mode === 'edit' && (
                      <button type="button" onClick={gosterIban} disabled={loading} className="shrink-0 rounded-lg bg-indigo-50 px-2 py-2 text-[11px] font-medium text-indigo-700 transition hover:bg-indigo-100 disabled:opacity-50">
                        {gizli && iban === gizli ? 'Gizle' : 'Göster'}
                      </button>
                    )}
                  </div>
                </div>
                {mode === 'edit' && (
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-slate-600">Durum</label>
                    <select name="durum" defaultValue={personel?.durum ?? 'aktif'} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500">
                      <option value="aktif">Aktif</option>
                      <option value="pasif">Pasif</option>
                    </select>
                  </div>
                )}
              </div>

              {state && 'error' in state && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</div>
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