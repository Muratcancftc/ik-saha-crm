'use client'

import { useActionState, useEffect, useState } from 'react'
import { vergiEkle, vergiGuncelle, odendiIsaretle, topluOdendi, vergiSablonEkle } from '@/app/actions/vergi'
import { Icon } from '@/components/icons'

type FirmaDto = { id: number; ad: string }
type VergiKayit = { id: number; firmaAd: string; tur: string; donem: string; tahakkuk: number }

const TUR = ['KDV', 'MUHTASAR', 'STOPAJ', 'GECICI_VERGI', 'KURUMLAR', 'SGK', 'BAGKUR', 'DAMGA', 'DIGER']
const TUR_LABEL: Record<string, string> = {
  KDV: 'KDV', MUHTASAR: 'Muhtasar', STOPAJ: 'Stopaj', GECICI_VERGI: 'Geçici Vergi', KURUMLAR: 'Kurumlar',
  SGK: 'SGK Primi', BAGKUR: 'BAĞ-KUR', DAMGA: 'Damga Vergisi', DIGER: 'Diğer',
}
const YONTEM = ['BANKA', 'KREDI_KARTI', 'NAKIT']
const YONTEM_LABEL: Record<string, string> = { BANKA: 'Banka', KREDI_KARTI: 'Kredi Kartı', NAKIT: 'Nakit' }

const tl = (n: number) => new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(n)

function Mesaj({ state }: { state: { error?: string; ok?: boolean; uyari?: string } | undefined }) {
  if (!state) return null
  if (state.error) return <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</div>
  if (state.uyari) return <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700">{state.uyari}</div>
  return null
}

export function VergiForm({ mode, kayit, firmalar }: { mode: 'create' | 'edit'; kayit?: Partial<VergiKayit> & { firmaId?: number; sonOdemeTarihi?: string; not?: string; vergiTuruDiger?: string }; firmalar: FirmaDto[] }) {
  const [open, setOpen] = useState(false)
  const [tur, setTur] = useState(kayit?.tur ?? 'KDV')
  const action = mode === 'create' ? vergiEkle : vergiGuncelle
  const [state, formAction, pending] = useActionState(action, undefined)

  useEffect(() => {
    if (state && 'ok' in state) setOpen(false)
  }, [state])

  return (
    <>
      {mode === 'create' ? (
        <button onClick={() => setOpen(true)} className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3.5 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-indigo-500">
          <Icon name="plus" size={16} /> Vergi Ödemesi Ekle
        </button>
      ) : (
        <button onClick={() => setOpen(true)} className="rounded-lg p-1.5 text-slate-400 transition hover:bg-indigo-50 hover:text-indigo-600" title="Düzenle">
          <Icon name="personel" size={15} />
        </button>
      )}

      {open && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-900/50 p-4 pt-12 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
              <h3 className="text-base font-semibold text-slate-900">{mode === 'create' ? 'Vergi Ödemesi Ekle' : 'Vergi Ödemesi Düzenle'}</h3>
              <button onClick={() => setOpen(false)} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100"><Icon name="x" size={18} /></button>
            </div>
            <form action={formAction} className="space-y-4 px-6 py-5">
              {mode === 'edit' && <input type="hidden" name="id" value={kayit?.id} />}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-slate-600">Firma *</label>
                  <select name="firmaId" required defaultValue={kayit?.firmaId ?? ''} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500">
                    <option value="">Seçiniz</option>
                    {firmalar.map((f) => <option key={f.id} value={f.id}>{f.ad}</option>)}
                  </select>
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-slate-600">Vergi Türü *</label>
                  <select name="vergiTuru" value={tur} onChange={(e) => setTur(e.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500">
                    {TUR.map((t) => <option key={t} value={t}>{TUR_LABEL[t]}</option>)}
                  </select>
                </div>
                {tur === 'DIGER' && (
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-slate-600">Diğer (açıklama) *</label>
                    <input name="vergiTuruDiger" required defaultValue={kayit?.vergiTuruDiger} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500" />
                  </div>
                )}
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-slate-600">Dönem *</label>
                  <input name="donem" defaultValue={kayit?.donem ?? ''} placeholder="2026-09 veya 2026 Q3" required className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500" />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-slate-600">Tahakkuk Tutarı (₺) *</label>
                  <input name="tahakkukTutari" type="number" step="0.01" min={0.01} required defaultValue={kayit?.tahakkuk} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500" />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-slate-600">Son Ödeme Tarihi *</label>
                  <input name="sonOdemeTarihi" type="date" required defaultValue={kayit?.sonOdemeTarihi} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500" />
                </div>
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-slate-600">Not</label>
                <input name="not" defaultValue={kayit?.not} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500" />
              </div>
              <p className="rounded-xl bg-slate-50 px-3 py-2 text-xs text-slate-500">Kayıt varsayılan <b>Ödenmedi</b> durumunda oluşur; ödeme &quot;Ödendi&quot; butonundan yapılır.</p>
              <Mesaj state={state} />
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

export function OdeModal({ kayit }: { kayit: VergiKayit }) {
  const [open, setOpen] = useState(false)
  const [dosyaSayi, setDosyaSayi] = useState(0)
  const [state, formAction, pending] = useActionState(odendiIsaretle, undefined)

  useEffect(() => {
    if (state && 'ok' in state) setOpen(false)
  }, [state])

  function submit(e: React.FormEvent<HTMLFormElement>) {
    if (dosyaSayi === 0) {
      const onay = window.confirm('Dekont eklemeden kaydetmek istediğinize emin misiniz?')
      if (!onay) {
        e.preventDefault()
        return
      }
    }
  }

  return (
    <>
      <button onClick={() => setOpen(true)} className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-emerald-500">Ödendi</button>
      {open && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-900/50 p-4 pt-16 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
              <div>
                <h3 className="text-base font-semibold text-slate-900">Ödendi İşaretle</h3>
                <p className="mt-0.5 text-xs text-slate-500">{kayit.firmaAd} · {kayit.tur} · {kayit.donem} · Tahakkuk <b>{tl(kayit.tahakkuk)}</b></p>
              </div>
              <button onClick={() => setOpen(false)} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100"><Icon name="x" size={18} /></button>
            </div>
            <form action={formAction} onSubmit={submit} className="space-y-4 px-6 py-5">
              <input type="hidden" name="id" value={kayit.id} />
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-slate-600">Ödeme Tarihi *</label>
                  <input name="odemeTarihi" type="date" required defaultValue={new Date().toISOString().slice(0, 10)} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500" />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-slate-600">Ödenen Tutar (₺) *</label>
                  <input name="odenenTutar" type="number" step="0.01" min={0.01} required defaultValue={kayit.tahakkuk} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500" />
                </div>
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-slate-600">Ödeme Yöntemi</label>
                <select name="odemeYontemi" className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500">
                  {YONTEM.map((y) => <option key={y} value={y}>{YONTEM_LABEL[y]}</option>)}
                </select>
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-slate-600">Dekont (çoklu, PDF/JPG/PNG, max 10MB)</label>
                <input
                  name="dekontlar"
                  type="file"
                  multiple
                  accept=".pdf,.jpg,.jpeg,.png,.webp,.gif"
                  onChange={(e) => setDosyaSayi(e.target.files?.length ?? 0)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500"
                />
                <p className="mt-1 text-[11px] text-slate-400">Yüklenmezse &quot;dekont eksik&quot; rozeti gösterilir ve onay istenir.</p>
              </div>
              <Mesaj state={state} />
              <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
                <button type="button" onClick={() => setOpen(false)} className="rounded-lg px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100">Vazgeç</button>
                <button type="submit" disabled={pending} className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-emerald-500 disabled:opacity-60">
                  {pending ? 'Kaydediliyor…' : 'Ödendi Olarak Kaydet'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}

export function TopluOde({ secili }: { secili: VergiKayit[] }) {
  const [open, setOpen] = useState(false)
  const [state, formAction, pending] = useActionState(topluOdendi, undefined)
  useEffect(() => {
    if (state && 'ok' in state) setOpen(false)
  }, [state])
  const toplam = secili.reduce((a, k) => a + k.tahakkuk, 0)

  return (
    <>
      <button onClick={() => setOpen(true)} disabled={secili.length === 0} className="rounded-lg bg-white px-3 py-2 text-sm font-medium text-slate-700 ring-1 ring-slate-300 hover:bg-slate-50 disabled:opacity-40">
        Seçilenleri Ödendi Yap ({secili.length})
      </button>
      {open && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-900/50 p-4 pt-16 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
              <div>
                <h3 className="text-base font-semibold text-slate-900">Toplu Ödendi</h3>
                <p className="mt-0.5 text-xs text-slate-500">{secili.length} kayıt · toplam <b>{tl(toplam)}</b></p>
              </div>
              <button onClick={() => setOpen(false)} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100"><Icon name="x" size={18} /></button>
            </div>
            <form action={formAction} className="space-y-4 px-6 py-5">
              {secili.map((k) => <input key={k.id} type="hidden" name="ids" value={k.id} />)}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-slate-600">Ödeme Tarihi *</label>
                  <input name="odemeTarihi" type="date" required defaultValue={new Date().toISOString().slice(0, 10)} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500" />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-slate-600">Yöntem</label>
                  <select name="odemeYontemi" className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500">
                    {YONTEM.map((y) => <option key={y} value={y}>{YONTEM_LABEL[y]}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-slate-600">Dekont (opsiyonel, tek dosya)</label>
                <input name="dekontlar" type="file" accept=".pdf,.jpg,.jpeg,.png,.webp,.gif" className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500" />
              </div>
              <Mesaj state={state} />
              <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
                <button type="button" onClick={() => setOpen(false)} className="rounded-lg px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100">Vazgeç</button>
                <button type="submit" disabled={pending} className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-emerald-500 disabled:opacity-60">
                  {pending ? 'İşleniyor…' : 'Toplu Ödendi Yap'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}

export function SablonForm({ firmalar }: { firmalar: FirmaDto[] }) {
  const [open, setOpen] = useState(false)
  const [tur, setTur] = useState('KDV')
  const [state, formAction, pending] = useActionState(vergiSablonEkle, undefined)
  useEffect(() => {
    if (state && 'ok' in state) setOpen(false)
  }, [state])
  return (
    <>
      <button onClick={() => setOpen(true)} className="rounded-lg bg-white px-3 py-2 text-sm font-medium text-slate-700 ring-1 ring-slate-300 hover:bg-slate-50">+ Şablon</button>
      {open && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-900/50 p-4 pt-16 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
              <h3 className="text-base font-semibold text-slate-900">Tekrarlayan Şablon</h3>
              <button onClick={() => setOpen(false)} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100"><Icon name="x" size={18} /></button>
            </div>
            <form action={formAction} className="space-y-4 px-6 py-5">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-slate-600">Firma *</label>
                  <select name="firmaId" required className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500">
                    <option value="">Seçiniz</option>
                    {firmalar.map((f) => <option key={f.id} value={f.id}>{f.ad}</option>)}
                  </select>
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-slate-600">Vergi Türü *</label>
                  <select name="vergiTuru" value={tur} onChange={(e) => setTur(e.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500">
                    {TUR.map((t) => <option key={t} value={t}>{TUR_LABEL[t]}</option>)}
                  </select>
                </div>
                {tur === 'DIGER' && (
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-slate-600">Diğer *</label>
                    <input name="vergiTuruDiger" required className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500" />
                  </div>
                )}
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-slate-600">Tahakkuk (₺) *</label>
                  <input name="tahakkukTutari" type="number" step="0.01" min={0.01} required className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500" />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-slate-600">Son Ödeme Günü (1-28) *</label>
                  <input name="sonOdemeGun" type="number" min={1} max={28} required defaultValue={26} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500" />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-slate-600">Dönem Etiketi</label>
                  <input name="donemEtiketi" placeholder="Q3 (boş = aylık)" className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500" />
                </div>
              </div>
              <p className="rounded-xl bg-slate-50 px-3 py-2 text-xs text-slate-500">&quot;Şimdi Oluştur&quot; ile mevcut dönemin kaydı otomatik (varsa atlanır) Ödenmedi olarak açılır.</p>
              <Mesaj state={state} />
              <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
                <button type="button" onClick={() => setOpen(false)} className="rounded-lg px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100">Vazgeç</button>
                <button type="submit" disabled={pending} className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-indigo-500 disabled:opacity-60">
                  {pending ? 'Kaydediliyor…' : 'Şablonu Kaydet'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}