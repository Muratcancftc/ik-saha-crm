'use client'

import { useActionState, useEffect, useState } from 'react'
import { createIsci, updateIsci, gizliAlan } from '@/app/actions/isci'
import { Icon } from '@/components/icons'

type IsciDto = {
  id: number
  ad: string
  telefon: string
  tcMasked: string
  ibanMasked: string
  ilce: string
  puan: number
  beklenti: number
  durum: string
  tercihBolgeler: string[]
  dogumTarihi: Date
  meslekIds: number[]
}

type Meslek = { id: number; ad: string }

export function IsciForm({
  mode,
  isci,
  meslekler,
  bolgeler,
}: {
  mode: 'create' | 'edit'
  isci?: IsciDto
  meslekler: Meslek[]
  bolgeler: string[]
}) {
  const [open, setOpen] = useState(false)
  const [gizli, setGizli] = useState<{ tc: string; iban: string } | null>(null)
  const [tcVal, setTcVal] = useState('')
  const [ibanVal, setIbanVal] = useState('')
  const [loading, setLoading] = useState(false)

  const action = mode === 'create' ? createIsci : updateIsci
  const [state, formAction, pending] = useActionState(action, undefined)

  // KVKK: düzenlemede TC/IBAN varsayılan maskeli — tam değer yalnızca "Göster" ile yüklenir
  async function goster(field: 'tc' | 'iban') {
    if (!isci) return
    setLoading(true)
    const d = await gizliAlan(isci.id)
    if (d) {
      if (field === 'tc') setTcVal(d.tc)
      else setIbanVal(d.iban)
      setGizli(d)
    }
    setLoading(false)
  }

  useEffect(() => {
    if (!open) return
    setGizli(null)
    setTcVal('')
    setIbanVal('')
  }, [open])

  useEffect(() => {
    if (state && 'ok' in state) setOpen(false)
  }, [state])

  const dogum = isci ? new Date(isci.dogumTarihi).toISOString().slice(0, 10) : ''

  return (
    <>
      {mode === 'create' ? (
        <button
          onClick={() => setOpen(true)}
          className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3.5 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-indigo-500"
        >
          <Icon name="plus" size={16} />
          Yeni İşçi
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
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-900/50 p-4 pt-10 backdrop-blur-sm">
          <div className="w-full max-w-2xl rounded-2xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
              <h3 className="text-base font-semibold text-slate-900">
                {mode === 'create' ? 'Yeni İşçi' : `İşçi Düzenle — ${isci?.ad}`}
              </h3>
              <button onClick={() => setOpen(false)} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100">
                <Icon name="x" size={18} />
              </button>
            </div>

            <form action={formAction} className="space-y-4 px-6 py-5">
              {mode === 'edit' && <input type="hidden" name="id" value={isci?.id} />}

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-slate-600">Ad Soyad *</label>
                  <input name="ad" required defaultValue={isci?.ad} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20" />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-slate-600">Telefon *</label>
                  <input name="telefon" required defaultValue={isci?.telefon} placeholder="+90 5xx xxx xx xx" className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20" />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-slate-600">
                    TC Kimlik {mode === 'edit' && <span className="text-slate-400">(boşsa korunur · mevcut {isci?.tcMasked})</span>}
                  </label>
                  <div className="flex items-center gap-1.5">
                    <input
                      name="tcKimlik"
                      required={mode === 'create'}
                      value={tcVal}
                      onChange={(e) => setTcVal(e.target.value)}
                      placeholder={mode === 'edit' ? isci?.tcMasked : '11 haneli TC'}
                      maxLength={11}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                    />
                    {mode === 'edit' && (
                      <button type="button" onClick={() => goster('tc')} disabled={loading} className="shrink-0 rounded-lg bg-indigo-50 px-2 py-2 text-[11px] font-medium text-indigo-700 transition hover:bg-indigo-100 disabled:opacity-50">
                        {gizli?.tc && tcVal === gizli.tc ? 'Gizle' : 'Göster'}
                      </button>
                    )}
                  </div>
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-slate-600">
                    IBAN {mode === 'edit' && <span className="text-slate-400">(boşsa korunur · mevcut {isci?.ibanMasked})</span>}
                  </label>
                  <div className="flex items-center gap-1.5">
                    <input
                      name="iban"
                      required={mode === 'create'}
                      value={ibanVal}
                      onChange={(e) => setIbanVal(e.target.value)}
                      placeholder={mode === 'edit' ? isci?.ibanMasked : 'TR00 0000 …'}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                    />
                    {mode === 'edit' && (
                      <button type="button" onClick={() => goster('iban')} disabled={loading} className="shrink-0 rounded-lg bg-indigo-50 px-2 py-2 text-[11px] font-medium text-indigo-700 transition hover:bg-indigo-100 disabled:opacity-50">
                        {gizli?.iban && ibanVal === gizli.iban ? 'Gizle' : 'Göster'}
                      </button>
                    )}
                  </div>
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-slate-600">İlçe *</label>
                  <select name="ilce" required defaultValue={isci?.ilce} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500">
                    <option value="">Seçiniz</option>
                    {bolgeler.map((b) => (
                      <option key={b} value={b}>{b}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-slate-600">Doğum Tarihi</label>
                  <input name="dogumTarihi" type="date" defaultValue={dogum || undefined} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500" />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-slate-600">Puan (0-100)</label>
                  <input name="puan" type="number" min={0} max={100} defaultValue={isci?.puan ?? 50} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500" />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-slate-600">Günlük Ücret Beklentisi (₺)</label>
                  <input name="gunlukUcretBeklentisi" type="number" step="50" defaultValue={isci?.beklenti ?? 0} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500" />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-slate-600">Durum</label>
                  <select name="durum" defaultValue={isci?.durum ?? 'aktif'} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500">
                    <option value="aktif">Aktif</option>
                    <option value="pasif">Pasif</option>
                    <option value="kara_liste">Kara Liste</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-medium text-slate-600">Meslekler</label>
                <div className="flex flex-wrap gap-2">
                  {meslekler.map((m) => (
                    <label key={m.id} className="flex cursor-pointer items-center gap-1.5 rounded-full border border-slate-200 px-3 py-1.5 text-xs text-slate-700 transition has-[:checked]:border-indigo-500 has-[:checked]:bg-indigo-50 has-[:checked]:text-indigo-700">
                      <input
                        type="checkbox"
                        name="meslekler"
                        value={m.id}
                        defaultChecked={isci?.meslekIds.includes(m.id) ?? false}
                        className="sr-only"
                      />
                      {m.ad}
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-medium text-slate-600">Tercih Bölgeleri</label>
                <div className="flex flex-wrap gap-2">
                  {bolgeler.map((b) => (
                    <label key={b} className="flex cursor-pointer items-center gap-1.5 rounded-full border border-slate-200 px-3 py-1.5 text-xs text-slate-700 transition has-[:checked]:border-indigo-500 has-[:checked]:bg-indigo-50 has-[:checked]:text-indigo-700">
                      <input
                        type="checkbox"
                        name="bolgeler"
                        value={b}
                        defaultChecked={isci?.tercihBolgeler.includes(b) ?? false}
                        className="sr-only"
                      />
                      {b}
                    </label>
                  ))}
                </div>
              </div>

              {state && 'error' in state && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                  {String(state.error)}
                </div>
              )}

              <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
                <button type="button" onClick={() => setOpen(false)} className="rounded-lg px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100">
                  Vazgeç
                </button>
                <button type="submit" disabled={pending || loading} className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-indigo-500 disabled:opacity-60">
                  {pending || loading ? 'Kaydediliyor…' : mode === 'create' ? 'Ekle' : 'Güncelle'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}