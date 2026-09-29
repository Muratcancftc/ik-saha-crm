'use client'

import { useActionState, useEffect, useState } from 'react'
import { linkOlustur, type PaylasimState } from '@/app/actions/paylasim'
import { Icon } from '@/components/icons'

type Secenek = { id: number; ad: string; firmaAd?: string | null }

export function KopyalaButonu({ metin, etiket = 'Kopyala' }: { metin: string; etiket?: string }) {
  const [kopyalandi, setKopyalandi] = useState(false)
  async function kopyala() {
    try {
      await navigator.clipboard.writeText(metin)
    } catch {
      const el = document.createElement('textarea')
      el.value = metin
      document.body.appendChild(el)
      el.select()
      document.execCommand('copy')
      document.body.removeChild(el)
    }
    setKopyalandi(true)
    setTimeout(() => setKopyalandi(false), 2000)
  }
  return (
    <button type="button" onClick={kopyala} className="inline-flex items-center gap-1 rounded-lg bg-indigo-600 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-indigo-500">
      <Icon name="link" size={13} /> {kopyalandi ? 'Kopyalandı' : etiket}
    </button>
  )
}

function rastgele5(): string {
  const a = new Uint32Array(1)
  crypto.getRandomValues(a)
  return String(a[0] % 100000).padStart(5, '0')
}

export function LinkOlusturDialog({
  tur,
  secenekler,
  linkGunVarsayilan,
  baslik,
}: {
  tur: 'SUNUM' | 'MALIYET'
  secenekler: Secenek[]
  linkGunVarsayilan: number
  baslik?: string
}) {
  const [open, setOpen] = useState(false)
  const [secenekId, setSecenekId] = useState<number | null>(secenekler[0]?.id ?? null)
  const [sifre, setSifre] = useState('')
  const [state, formAction, pending] = useActionState<PaylasimState, FormData>(linkOlustur, undefined)

  const seciliFirma = secenekler.find((s) => s.id === secenekId)?.firmaAd ?? ''

  useEffect(() => {
    if (state?.ok) {
      // link hazır
    }
  }, [state])

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-500"
      >
        <Icon name="link" size={15} /> Link Oluştur
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-900/50 p-4 pt-12 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
              <h3 className="text-base font-semibold text-slate-900">{baslik ?? 'Paylaşım Linki Oluştur'}</h3>
              <button onClick={() => setOpen(false)} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100" aria-label="Kapat">
                <Icon name="x" size={18} />
              </button>
            </div>

            {state?.ok && state.link ? (
              <div className="space-y-4 px-6 py-5">
                <p className="text-sm text-slate-600">Link oluşturuldu. Alıcıya kendi e-postanızdan gönderebilirsiniz.</p>
                <div>
                  <div className="mb-1 text-xs font-medium text-slate-500">Bağlantı</div>
                  <div className="flex items-center gap-2">
                    <input readOnly value={state.link} className="w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-xs" />
                    <KopyalaButonu metin={state.link} />
                  </div>
                </div>
                {state.sifre && (
                  <div>
                    <div className="mb-1 text-xs font-medium text-slate-500">Erişim şifresi</div>
                    <div className="flex items-center gap-2">
                      <input readOnly value={state.sifre} className="w-28 rounded-lg border border-slate-300 bg-amber-50 px-3 py-2 text-sm font-semibold tracking-widest" />
                      <KopyalaButonu metin={state.sifre} />
                    </div>
                    <p className="mt-1 text-[11px] text-amber-700">Şifre güvenlik için yalnızca şimdi gösterilir; not alın.</p>
                  </div>
                )}
                <div className="flex justify-end">
                  <button onClick={() => setOpen(false)} className="rounded-lg bg-slate-100 px-3 py-2 text-sm text-slate-700 hover:bg-slate-200">
                    Kapat
                  </button>
                </div>
              </div>
            ) : (
              <form action={formAction} className="space-y-4 px-6 py-5">
                <input type="hidden" name="tur" value={tur} />

                <div>
                  <label className="mb-1.5 block text-xs font-medium text-slate-600">{tur === 'SUNUM' ? 'Sunum *' : 'Maliyet Tablosu *'}</label>
                  <select
                    name={tur === 'SUNUM' ? 'sunumId' : 'maliyetTablosuId'}
                    value={secenekId ?? ''}
                    onChange={(e) => setSecenekId(Number(e.target.value) || null)}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                  >
                    {secenekler.length === 0 && <option value="">Kayıtlı içerik yok</option>}
                    {secenekler.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.ad}
                        {s.firmaAd ? ` — ${s.firmaAd}` : ''}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-slate-600">Firma adı *</label>
                    <input name="firmaAd" key={seciliFirma} defaultValue={seciliFirma} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-slate-600">Alıcı (ad soyad) *</label>
                    <input name="aliciAd" className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
                  </div>
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-medium text-slate-600">Alıcı e-posta *</label>
                  <input name="aliciEmail" type="email" className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" placeholder="sadece kayıt amaçlı" />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-slate-600">Geçerlilik (gün)</label>
                    <input name="gecerlilikGun" type="number" min={1} defaultValue={linkGunVarsayilan} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-slate-600">Erişim şifresi (ops.)</label>
                    <div className="flex gap-1.5">
                      <input name="sifre" value={sifre} onChange={(e) => setSifre(e.target.value.replace(/\D/g, '').slice(0, 6))} placeholder="4–6 hane" className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
                      <button type="button" onClick={() => setSifre(rastgele5())} className="shrink-0 rounded-lg bg-slate-100 px-2.5 text-xs text-slate-600 hover:bg-slate-200" title="Rastgele üret">
                        <Icon name="yenile" size={14} />
                      </button>
                    </div>
                  </div>
                </div>

                {tur === 'MALIYET' && (
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-slate-600">Görünüm</label>
                    <select name="gorunum" className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm">
                      <option value="TAM">Tam tablo (kâr payı dahil)</option>
                      <option value="KAR_GIZLI">Kâr payı gizli</option>
                    </select>
                  </div>
                )}

                {state?.error && <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</div>}

                <div className="flex justify-end gap-2 pt-1">
                  <button type="button" onClick={() => setOpen(false)} className="rounded-lg bg-slate-100 px-3 py-2 text-sm text-slate-700 hover:bg-slate-200">
                    Vazgeç
                  </button>
                  <button type="submit" disabled={pending || secenekler.length === 0} className="rounded-lg bg-indigo-600 px-3.5 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-60">
                    {pending ? 'Oluşturuluyor…' : 'Link Oluştur'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  )
}
