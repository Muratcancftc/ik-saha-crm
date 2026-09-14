'use client'

import { useActionState, useEffect, useState } from 'react'
import { odemeUret } from '@/app/actions/odeme'
import { tl } from '@/lib/format'

function cariAy(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

export function OdemeUretForm() {
  const [donem, setDonem] = useState(cariAy())
  const [onizle, setOnizle] = useState<{ isciSayisi: number; isciTutar: number; personelSayisi: number; personelTutar: number; mevcut: number } | null>(null)
  const [state, formAction, pending] = useActionState(odemeUret, undefined)

  useEffect(() => {
    const iv = setTimeout(async () => {
      try {
        const r = await fetch(`/api/odeme/onizle?donem=${donem}`, { cache: 'no-store' })
        if (r.ok) setOnizle(await r.json())
      } catch {
        // sessizce geç
      }
    }, 300)
    return () => clearTimeout(iv)
  }, [donem])

  return (
    <div className="w-full lg:max-w-lg">
      <form action={formAction} className="rounded-xl border border-slate-200 bg-slate-50/60 p-4">
        <div className="flex flex-wrap items-end gap-2">
          <div>
            <label className="mb-1 block text-[11px] font-medium text-slate-500">Bordro Dönemi</label>
            <input name="donem" type="month" required value={donem} onChange={(e) => setDonem(e.target.value)} className="rounded-lg border border-slate-300 px-2.5 py-1.5 text-sm outline-none focus:border-indigo-500" />
          </div>
          <button type="submit" disabled={pending} className="rounded-lg bg-indigo-600 px-3 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-indigo-500 disabled:opacity-60">
            {pending ? 'Üretiliyor…' : 'Bordro Üret'}
          </button>
        </div>

        {onizle && (
          <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
            <div className="rounded-lg bg-white p-2 ring-1 ring-slate-200">
              <div className="text-slate-400">İşçi hakedişi</div>
              <div className="font-semibold text-slate-900">{onizle.isciSayisi} işçi · {tl(onizle.isciTutar)}</div>
            </div>
            <div className="rounded-lg bg-white p-2 ring-1 ring-slate-200">
              <div className="text-slate-400">Personel maaşı</div>
              <div className="font-semibold text-slate-900">{onizle.personelSayisi} kişi · {tl(onizle.personelTutar)}</div>
            </div>
            {onizle.mevcut > 0 && (
              <div className="col-span-2 rounded-lg bg-emerald-50 p-2 text-emerald-700 ring-1 ring-emerald-200">
                Bu dönemde zaten {onizle.mevcut} ödeme kaydı var — Üret mükerrer eklemez.
              </div>
            )}
          </div>
        )}

        {state && (() => {
          const isci = state.isci ?? 0
          const personel = state.personel ?? 0
          return (
            <div className={`mt-2 rounded-lg border px-3 py-2 text-sm ${isci + personel > 0 ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-amber-200 bg-amber-50 text-amber-700'}`}>
              {isci + personel > 0
                ? `✓ ${isci} işçi + ${personel} personel ödeme kaydı oluşturuldu.`
                : 'Yeni ödeme kaydı eklenmedi (zaten üretilmiş veya bu dönemde hakediş/maaş yok).'}
            </div>
          )
        })()}
      </form>

      <p className="mt-2 text-[11px] leading-relaxed text-slate-400">
        Bu ekran <b>aylık bordroyu hazırlar</b>: dönemdeki işçi hakedişlerinin (net) ve aktif personelin maaşının ödeme kaydına çevrilir.
        Sonra listedeki kayıtları <b>Ödendi</b> işaretleyip <b>Banka CSV</b> ile indirebilirsin.
      </p>
    </div>
  )
}