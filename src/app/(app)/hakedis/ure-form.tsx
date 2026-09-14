'use client'

import { useActionState, useEffect, useState } from 'react'
import { hakedisUret } from '@/app/actions/hakedis'
import { Icon } from '@/components/icons'

function ayBasLang(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`
}
function ayBitLang(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate()}`
}

export function HakUretForm() {
  const [bas, setBas] = useState(ayBasLang())
  const [bit, setBit] = useState(ayBitLang())
  const [onizle, setOnizle] = useState<{ uygunAtama: number; uygunIsci: number } | null>(null)
  const [state, formAction, pending] = useActionState(hakedisUret, undefined)

  useEffect(() => {
    const iv = setTimeout(async () => {
      try {
        const r = await fetch(`/api/hakedis/onizle?bas=${bas}&bit=${bit}`, { cache: 'no-store' })
        if (r.ok) {
          const d = await r.json()
          setOnizle({ uygunAtama: d.uygunAtama, uygunIsci: d.uygunIsci })
        }
      } catch {
        // sessizce geç
      }
    }, 300)
    return () => clearTimeout(iv)
  }, [bas, bit])

  return (
    <div className="w-full lg:max-w-lg">
      <form action={formAction} className="rounded-xl border border-slate-200 bg-slate-50/60 p-4">
        <div className="flex flex-wrap items-end gap-2">
          <div>
            <label className="mb-1 block text-[11px] font-medium text-slate-500">Başlangıç</label>
            <input name="donemBas" type="date" required value={bas} onChange={(e) => setBas(e.target.value)} className="rounded-lg border border-slate-300 px-2.5 py-1.5 text-sm outline-none focus:border-indigo-500" />
          </div>
          <div>
            <label className="mb-1 block text-[11px] font-medium text-slate-500">Bitiş</label>
            <input name="donemBitis" type="date" required value={bit} onChange={(e) => setBit(e.target.value)} className="rounded-lg border border-slate-300 px-2.5 py-1.5 text-sm outline-none focus:border-indigo-500" />
          </div>
          <button type="submit" disabled={pending} className="rounded-lg bg-indigo-600 px-3 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-indigo-500 disabled:opacity-60">
            {pending ? 'Üretiliyor…' : 'Dönemi Üret'}
          </button>
        </div>

        {onizle && (
          <p className="mt-2 text-xs text-slate-600">
            {onizle.uygunAtama > 0 ? (
              <>Bu aralıkta <b className="text-indigo-700">{onizle.uygunAtama}</b> tamamlanmış+puanlı atama (<b>{onizle.uygunIsci}</b> işçi) hakedişe dönüşebilir.</>
            ) : (
              <>Bu aralıkta üretilecek <b>hakediş ataması yok</b> — önce talepleri tamamlayıp puantaj işaretleyin.</>
            )}
          </p>
        )}

        {state && (
          <div className={`mt-2 rounded-lg border px-3 py-2 text-sm ${state.olusturulan ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-amber-200 bg-amber-50 text-amber-700'}`}>
            {state.olusturulan
              ? `✓ ${state.olusturulan} hakediş üretildi${state.kayitSayisi !== undefined && state.olusturulan !== state.kayitSayisi ? ` (${state.kayitSayisi} atamadan)` : ''}.`
              : 'Bu dönemde üretilecek hakediş yok.'}
          </div>
        )}
      </form>

      <div className="mt-2 flex items-start gap-1.5 text-[11px] text-slate-400">
        <Icon name="talep" size={13} className="mt-0.5 shrink-0" />
        <span>
          Hakediş, atama <b>Tamamla</b> olunca ve puantaj <b>Geldi/Geç/Yarım</b> işaretlenince otomatik üretilir. Bu buton geçmiş dönemleri topluca hesaplar; tekrarlarsan mükerrer kayıt oluşmaz.
        </span>
      </div>
    </div>
  )
}