'use client'

import { useActionState, useEffect, useState } from 'react'
import { odemeKaydet } from '@/app/actions/ik'
import { Icon } from '@/components/icons'

type DonemDto = {
  id: number
  isciAd: string
  firmaAd: string
  netOdenecek: number
  odenen: number
  varsayilanYontem: string
  iban: string
  hesapSahibi: string
}

const tl = (n: number) => new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(n)

function ibanGrup(v: string) {
  return v.replace(/\s+/g, '').toUpperCase().slice(0, 26).replace(/(.{4})/g, '$1 ').trim()
}

export function OdemeForm({ donem }: { donem: DonemDto }) {
  const [open, setOpen] = useState(false)
  const [yontem, setYontem] = useState(donem.varsayilanYontem)
  const [iban, setIban] = useState(donem.iban ? ibanGrup(donem.iban) : '')
  const [hesapSahibi, setHesapSahibi] = useState(donem.hesapSahibi)
  const [state, formAction, pending] = useActionState(odemeKaydet, undefined)

  useEffect(() => {
    if (state && 'ok' in state) setOpen(false)
  }, [state])

  const kalan = Math.max(0, donem.netOdenecek - donem.odenen)
  const ibanOk = /^TR\d{24}$/.test(iban.replace(/\s+/g, ''))

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-indigo-500"
      >
        Öde
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-900/50 p-4 pt-12 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
              <div>
                <h3 className="text-base font-semibold text-slate-900">Ödeme — {donem.isciAd}</h3>
                <p className="mt-0.5 text-xs text-slate-500">{donem.firmaAd} · Kalan: <b>{tl(kalan)}</b></p>
              </div>
              <button onClick={() => setOpen(false)} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100">
                <Icon name="x" size={18} />
              </button>
            </div>

            <form action={formAction} className="space-y-4 px-6 py-5">
              <input type="hidden" name="donemId" value={donem.id} />
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-slate-600">Tutar (₺) *</label>
                  <input name="tutar" type="number" step="0.01" min={0.01} defaultValue={kalan || donem.netOdenecek} required className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500" />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-slate-600">Tarih</label>
                  <input name="tarih" type="date" defaultValue={new Date().toISOString().slice(0, 10)} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500" />
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-medium text-slate-600">Ödeme Yöntemi</label>
                <div className="flex overflow-hidden rounded-lg border border-slate-200">
                  <button type="button" onClick={() => setYontem('ELDEN')} className={`flex-1 px-3 py-2 text-sm font-medium ${yontem === 'ELDEN' ? 'bg-amber-500 text-white' : 'bg-white text-slate-600'}`}>Elden (Zarf)</button>
                  <button type="button" onClick={() => setYontem('IBAN')} className={`flex-1 border-l border-slate-200 px-3 py-2 text-sm font-medium ${yontem === 'IBAN' ? 'bg-sky-600 text-white' : 'bg-white text-slate-600'}`}>IBAN (Havale)</button>
                </div>
                <input type="hidden" name="yontem" value={yontem} />
              </div>

              {yontem === 'IBAN' ? (
                <div className="space-y-3 rounded-xl bg-sky-50/50 p-3 ring-1 ring-sky-100">
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-slate-600">IBAN (TR + 24 hane) *</label>
                    <input
                      name="iban"
                      value={iban}
                      onChange={(e) => setIban(ibanGrup(e.target.value))}
                      placeholder="TR00 0000 0000 0000 0000 0000 00"
                      required
                      className={`w-full rounded-lg border px-3 py-2 font-mono text-sm outline-none ${iban && !ibanOk ? 'border-red-300 focus:border-red-500' : 'border-slate-300 focus:border-indigo-500'}`}
                    />
                    {iban && !ibanOk && <p className="mt-1 text-[11px] text-red-600">IBAN formatı geçersiz (TR + 24 hane).</p>}
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-slate-600">Hesap Sahibi</label>
                    <input name="hesapSahibi" value={hesapSahibi} onChange={(e) => setHesapSahibi(e.target.value)} placeholder="Ad Soyad" className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500" />
                  </div>
                  <label className="flex items-center gap-2 text-xs font-medium text-slate-600">
                    <input type="checkbox" name="yakininaOdeme" value="1" className="rounded accent-indigo-600" defaultChecked={!!hesapSahibi && hesapSahibi !== donem.isciAd} />
                    Hesap sahibi personelden farklı (yakınına ödeniyor)
                  </label>
                  <input name="yakinlikNotu" placeholder="Yakınlık / açıklama (ops.)" className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500" />
                  <p className="text-[11px] text-slate-500">Dekont dosyası yükleme bu sürümde manuel arşivlenir; kayıt notuna ekleyebilirsiniz.</p>
                </div>
              ) : (
                <div className="space-y-3 rounded-xl bg-amber-50/50 p-3 ring-1 ring-amber-100">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="mb-1.5 block text-xs font-medium text-slate-600">Zarf No</label>
                      <input name="zarfNo" placeholder={`ZRF-${donem.id}`} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500" />
                    </div>
                    <div>
                      <label className="mb-1.5 block text-xs font-medium text-slate-600">Teslim Alan</label>
                      <input name="teslimAlan" defaultValue={donem.isciAd} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500" />
                    </div>
                  </div>
                  <p className="text-[11px] text-slate-500">Teslim eden kullanıcı otomatik kaydedilir. İmza/teslim belgesi fotoğrafı bu sürümde manuel arşivlenir.</p>
                </div>
              )}

              <div>
                <label className="mb-1.5 block text-xs font-medium text-slate-600">Not</label>
                <input name="not" className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500" />
              </div>

              {state && 'error' in state && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{String(state.error)}</div>
              )}

              <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
                <button type="button" onClick={() => setOpen(false)} className="rounded-lg px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100">Vazgeç</button>
                <button type="submit" disabled={pending || (yontem === 'IBAN' && !ibanOk)} className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-indigo-500 disabled:opacity-60">
                  {pending ? 'Kaydediliyor…' : 'Ödemeyi Kaydet'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}