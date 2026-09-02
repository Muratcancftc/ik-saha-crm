'use client'

import { useState } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { Icon } from './icons'

// Dönem seçici: URL'deki donem/bas/bit parametrelerini yönetir (server-side render ile çalışır)
export function DonemSecici() {
  const router = useRouter()
  const pathname = usePathname()
  const sp = useSearchParams()
  const [donem, setDonem] = useState(sp.get('donem') ?? 'ay')
  const [ozelBas, setOzelBas] = useState(sp.get('bas') ?? '')
  const [ozelBit, setOzelBit] = useState(sp.get('bit') ?? '')

  function git(p: Record<string, string>) {
    const params = new URLSearchParams(sp.toString())
    // mevcut diğer filtreleri koru ama sayfa/dönem parametrelerini temizle
    for (const k of ['donem', 'bas', 'bit']) params.delete(k)
    for (const [k, v] of Object.entries(p)) if (v) params.set(k, v)
    const q = params.toString()
    router.push(`${pathname}${q ? `?${q}` : ''}`)
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="flex overflow-hidden rounded-lg border border-slate-200 bg-white">
        {(['hafta', 'ay', 'gecenay'] as const).map((d) => {
          const aktif = donem === d
          return (
            <button
              key={d}
              onClick={() => {
                setDonem(d)
                git({ donem: d })
              }}
              className={`px-3 py-1.5 text-xs font-medium transition ${
                aktif ? 'bg-indigo-600 text-white' : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              {d === 'hafta' ? 'Bu hafta' : d === 'ay' ? 'Bu ay' : 'Geçen ay'}
            </button>
          )
        })}
      </div>
      <button
        onClick={() => setDonem('ozel')}
        className={`inline-flex items-center gap-1 rounded-lg border px-3 py-1.5 text-xs font-medium transition ${
          donem === 'ozel' ? 'border-indigo-500 bg-indigo-50 text-indigo-700' : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
        }`}
      >
        <Icon name="clock" size={13} />
        Özel
      </button>

      {donem === 'ozel' && (
        <div className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2 py-1.5">
          <input
            type="date"
            value={ozelBas}
            onChange={(e) => setOzelBas(e.target.value)}
            className="rounded border border-slate-200 px-1.5 py-0.5 text-xs outline-none focus:border-indigo-500"
          />
          <span className="text-xs text-slate-400">→</span>
          <input
            type="date"
            value={ozelBit}
            onChange={(e) => setOzelBit(e.target.value)}
            className="rounded border border-slate-200 px-1.5 py-0.5 text-xs outline-none focus:border-indigo-500"
          />
          <button
            onClick={() => ozelBas && ozelBit && git({ donem: 'ozel', bas: ozelBas, bit: ozelBit })}
            disabled={!ozelBas || !ozelBit}
            className="rounded-md bg-indigo-600 px-2 py-0.5 text-xs font-medium text-white disabled:opacity-50"
          >
            Uygula
          </button>
        </div>
      )}
    </div>
  )
}