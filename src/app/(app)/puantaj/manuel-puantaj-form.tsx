'use client'

import { useActionState, useEffect, useState } from 'react'
import { manuelPuantajEkle } from '@/app/actions/puantaj'
import { Icon } from '@/components/icons'

type FirmaDto = { id: number; ad: string; lokasyonlar: { id: number; ad: string }[] }
type IsciDto = { id: number; ad: string }
type MeslekDto = { id: number; ad: string }

export function ManuelPuantajForm({
  isciler,
  firmalar,
  meslekler,
  varsayilanTarih,
}: {
  isciler: IsciDto[]
  firmalar: FirmaDto[]
  meslekler: MeslekDto[]
  varsayilanTarih: string
}) {
  const [open, setOpen] = useState(false)
  const [firmaId, setFirmaId] = useState<number | ''>('')
  const [state, formAction, pending] = useActionState(manuelPuantajEkle, undefined)

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
        Manuel Puantaj Ekle
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-900/50 p-4 pt-8 backdrop-blur-sm">
          <div className="w-full max-w-2xl rounded-2xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
              <h3 className="text-base font-semibold text-slate-900">Manuel Puantaj Ekle</h3>
              <button onClick={() => setOpen(false)} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100">
                <Icon name="x" size={18} />
              </button>
            </div>

            <form action={formAction} className="space-y-4 px-6 py-5">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-slate-600">İşçi *</label>
                  <select name="isciId" required className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500">
                    <option value="">Seçiniz</option>
                    {isciler.map((i) => (
                      <option key={i.id} value={i.id}>{i.ad}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-slate-600">Tarih *</label>
                  <input name="tarih" type="date" required defaultValue={varsayilanTarih} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500" />
                </div>
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
                  <label className="mb-1.5 block text-xs font-medium text-slate-600">Meslek *</label>
                  <select name="meslekId" required className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500">
                    <option value="">Meslek seçin</option>
                    {meslekler.map((m) => (
                      <option key={m.id} value={m.id}>{m.ad}</option>
                    ))}
                  </select>
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
                    <label className="mb-1.5 block text-xs font-medium text-slate-600">Durum</label>
                    <select name="durum" className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500">
                      <option value="geldi">Geldi</option>
                      <option value="gec">Geç</option>
                      <option value="yarim">Yarım</option>
                      <option value="gelmedi">Gelmedi</option>
                    </select>
                  </div>
                </div>
              </div>

              <p className="rounded-xl bg-slate-50 px-3 py-2.5 text-xs text-slate-500">
                Ataması olmayan bir işçi için puantaj + hakediş kaydı otomatik oluşturulur. İşçinin o gün ataması
                zaten varsa yalnızca puantaj durumu kaydedilir.
              </p>

              {state && 'error' in state && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{String(state.error)}</div>
              )}

              <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
                <button type="button" onClick={() => setOpen(false)} className="rounded-lg px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100">
                  Vazgeç
                </button>
                <button type="submit" disabled={pending} className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-indigo-500 disabled:opacity-60">
                  {pending ? 'Kaydediliyor…' : 'Puantaj Ekle'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}