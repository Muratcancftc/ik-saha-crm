'use client'

import { useActionState, useEffect, useMemo, useState } from 'react'
import { ikPersonelKaydet } from '@/app/actions/ik'
import { Icon } from '@/components/icons'

type FirmaDto = { id: number; ad: string; gunlukUcret: number | null; saatlikUcret: number | null }
type MeslekDto = { id: number; ad: string }

type PersonelDto = {
  id: number
  ad: string
  telefon: string
  bolge: string
  firmaId: number | null
  calismaTipi: string
  odemeYontemi: string
  meslekId: number | null
  gunlukUcret: number
  saatlikUcret: number
  odemePeriyot: string | null
  gunAraligi: number | null
}

const tl = (n: number) => n.toLocaleString('tr-TR') + ' ₺'

export function IkPersonelForm({
  mode,
  personel,
  firmalar,
  meslekler,
  varsayilanGunluk,
  varsayilanSaatlik,
}: {
  mode: 'create' | 'edit'
  personel?: PersonelDto
  firmalar: FirmaDto[]
  meslekler: MeslekDto[]
  varsayilanGunluk: number
  varsayilanSaatlik: number
}) {
  const [open, setOpen] = useState(false)
  const [firmaId, setFirmaId] = useState<number | ''>(personel?.firmaId ?? '')
  const [calismaTipi, setCalismaTipi] = useState(personel?.calismaTipi ?? 'GUNLUK')
  const [periyot, setPeriyot] = useState(personel?.odemePeriyot ?? '')
  const [gunAraligi, setGunAraligi] = useState(personel?.gunAraligi ? String(personel.gunAraligi) : '')
  const [gunluk, setGunluk] = useState<string>(personel ? String(personel.gunlukUcret) : '')
  const [saatlik, setSaatlik] = useState<string>(personel ? String(personel.saatlikUcret || '') : '')
  const [state, formAction, pending] = useActionState(ikPersonelKaydet, undefined)

  useEffect(() => {
    if (state && 'ok' in state) setOpen(false)
  }, [state])

  // Seçili firmanın varsayılan ücretleri (yoksa sistem varsayılanı)
  const firmaVarsayilan = useMemo(() => {
    const f = firmalar.find((x) => x.id === Number(firmaId))
    return {
      gunluk: f?.gunlukUcret ?? varsayilanGunluk,
      saatlik: f?.saatlikUcret ?? varsayilanSaatlik,
    }
  }, [firmaId, firmalar, varsayilanGunluk, varsayilanSaatlik])

  function firmaDegisti(v: string) {
    const id = v ? Number(v) : ''
    setFirmaId(id)
    // Ücret alanlarını firma varsayılanıyla doldur (kullanıcı üzerine yazabilir)
    const f = firmalar.find((x) => x.id === Number(id))
    setGunluk(String(f?.gunlukUcret ?? varsayilanGunluk))
    setSaatlik(f?.saatlikUcret ? String(f.saatlikUcret) : String(varsayilanSaatlik))
  }

  function gunlukBol8() {
    const g = Number(gunluk)
    if (g > 0) setSaatlik(String(Math.round(g / 8)))
  }

  const ozelUcret = Number(gunluk) !== firmaVarsayilan.gunluk

  return (
    <>
      {mode === 'create' ? (
        <button
          onClick={() => setOpen(true)}
          className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3.5 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-indigo-500"
        >
          <Icon name="plus" size={16} />
          Yeni İK Personel
        </button>
      ) : (
        <button
          onClick={() => setOpen(true)}
          className="rounded-lg p-1.5 text-slate-400 transition hover:bg-indigo-50 hover:text-indigo-600"
          title="Personel düzenle"
        >
          <Icon name="personel" size={15} />
        </button>
      )}

      {open && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-900/50 p-4 pt-8 backdrop-blur-sm">
          <div className="w-full max-w-2xl rounded-2xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
              <h3 className="text-base font-semibold text-slate-900">
                {mode === 'create' ? 'Yeni İK Personel' : `Personel Düzenle — ${personel?.ad}`}
              </h3>
              <button onClick={() => setOpen(false)} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100">
                <Icon name="x" size={18} />
              </button>
            </div>

            <form action={formAction} className="space-y-5 px-6 py-5">
              {mode === 'edit' && <input type="hidden" name="id" value={personel?.id} />}

              {/* Temel bilgiler */}
              <div>
                <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">Temel Bilgiler</div>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-slate-600">Ad Soyad *</label>
                    <input name="ad" required defaultValue={personel?.ad} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500" />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-slate-600">Telefon</label>
                    <input name="telefon" defaultValue={personel?.telefon} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500" />
                  </div>
                  {mode === 'create' && (
                    <>
                      <div>
                        <label className="mb-1.5 block text-xs font-medium text-slate-600">TC Kimlik <span className="text-slate-400">(boşsa üretilir)</span></label>
                        <input name="tc" maxLength={11} placeholder="11 hane" className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500" />
                      </div>
                      <div>
                        <label className="mb-1.5 block text-xs font-medium text-slate-600">IBAN <span className="text-slate-400">(boşsa üretilir)</span></label>
                        <input name="iban" placeholder="TR00 0000 …" className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500" />
                      </div>
                      <div>
                        <label className="mb-1.5 block text-xs font-medium text-slate-600">İşe Başlama Tarihi</label>
                        <input name="iseBaslama" type="date" className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500" />
                      </div>
                    </>
                  )}
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-slate-600">Bölge</label>
                    <select name="bolge" defaultValue={personel?.bolge ?? 'kocaeli'} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500">
                      <option value="kocaeli">Kocaeli</option>
                      <option value="balikesir">Balıkesir</option>
                    </select>
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-slate-600">Pozisyon (Meslek)</label>
                    <select name="meslekId" defaultValue={personel?.meslekId ?? ''} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500">
                      <option value="">Seçiniz</option>
                      {meslekler.map((m) => <option key={m.id} value={m.id}>{m.ad}</option>)}
                    </select>
                  </div>
                </div>
              </div>

              {/* Atama & ödeme */}
              <div>
                <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">Atama & Ödeme</div>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-slate-600">Firma</label>
                    <select
                      name="firmaId"
                      value={firmaId}
                      onChange={(e) => firmaDegisti(e.target.value)}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500"
                    >
                      <option value="">— Firma yok —</option>
                      {firmalar.map((f) => <option key={f.id} value={f.id}>{f.ad}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-slate-600">Çalışma Tipi</label>
                    <select name="calismaTipi" value={calismaTipi} onChange={(e) => setCalismaTipi(e.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500">
                      <option value="GUNLUK">Günlük (Yevmiye)</option>
                      <option value="SAATLIK">Saatlik</option>
                    </select>
                  </div>
<div>
                  <label className="mb-1.5 block text-xs font-medium text-slate-600">Ödeme Yöntemi</label>
                  <select name="odemeYontemi" defaultValue={personel?.odemeYontemi ?? 'ELDEN'} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500">
                    <option value="ELDEN">Elden (Zarf)</option>
                    <option value="IBAN">IBAN (Havale)</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-slate-600">Ödeme Periyodu</label>
                  <select name="odemePeriyot" value={periyot} onChange={(e) => setPeriyot(e.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500">
                    <option value="">Firma varsayılanı</option>
                    <option value="GUN_ARALIGI">Gün aralığı (kaç günde bir)</option>
                    <option value="HAFTALIK">Haftalık</option>
                    <option value="AYLIK">Aylık</option>
                    <option value="SERBEST">Serbest</option>
                  </select>
                  {periyot === 'GUN_ARALIGI' && (
                    <input name="gunAraligi" type="number" min={1} value={gunAraligi} onChange={(e) => setGunAraligi(e.target.value)} placeholder="kaç günde bir?" className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500" />
                  )}
                </div>
              </div>
            </div>

              {/* Ücret bilgileri */}
              <div className="rounded-xl border border-indigo-100 bg-indigo-50/40 p-4">
                <div className="mb-3 flex items-center justify-between">
                  <div className="text-xs font-semibold uppercase tracking-wide text-indigo-700">Ücret Bilgileri</div>
                  {ozelUcret && <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-700">Özel ücret</span>}
                </div>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-slate-600">Günlük Yevmiye (₺) *</label>
                    <input
                      name="gunlukUcret"
                      type="number"
                      step="1"
                      min={1}
                      required
                      value={gunluk}
                      onChange={(e) => setGunluk(e.target.value)}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500"
                    />
                    <p className="mt-1 text-[11px] text-slate-500">
                      Firma varsayılanı: <b>{tl(firmaVarsayilan.gunluk)}</b>{firmaId === '' ? ' (sistem)' : ''}
                    </p>
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-slate-600">Saatlik Ücret (₺)</label>
                    <div className="flex items-center gap-1.5">
                      <input
                        name="saatlikUcret"
                        type="number"
                        step="1"
                        min={0}
                        value={saatlik}
                        onChange={(e) => setSaatlik(e.target.value)}
                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500"
                      />
                      <button
                        type="button"
                        onClick={gunlukBol8}
                        title="Günlük / 8 ile doldur (elle ezilebilir)"
                        className="shrink-0 rounded-lg bg-white px-2 py-2 text-[11px] font-medium text-indigo-700 ring-1 ring-indigo-200 hover:bg-indigo-100"
                      >
                        günlük / 8
                      </button>
                    </div>
                    <p className="mt-1 text-[11px] text-slate-500">
                      Ayrı ve bağımsız girilir; mesai hesabında kullanılır. Firma: <b>{tl(firmaVarsayilan.saatlik)}</b>
                    </p>
                  </div>
                </div>
                <p className="mt-3 text-[11px] text-slate-500">
                  Hesaplamada çalışma tipine göre günlük veya saatlik kullanılır; diğeri fazla mesai için saklanır.
                </p>
                {mode === 'edit' && (
                  <div className="mt-3 border-t border-indigo-100 pt-3">
                    <label className="mb-1.5 block text-xs font-medium text-slate-600">Yeni ücret hangi tarihten itibaren geçerli?</label>
                    <input name="gecerlilikBaslangic" type="date" defaultValue={new Date().toISOString().slice(0, 10)} className="w-full max-w-56 rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500" />
                    <p className="mt-1 text-[11px] text-slate-400">Eski kayıt otomatik kapanır (silinmez). Geçmiş puantaj ve ödenmiş hakedişler etkilenmez.</p>
                  </div>
                )}
              </div>

              {state && 'error' in state && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{String(state.error)}</div>
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