'use client'

import { useState } from 'react'
import { Icon } from './icons'

// KVKK: değer varsayılan maskeli; yetkili kullanıcı "Göster" ile açabilir
export function MaskedValue({ value, mask, mono = true }: { value: string; mask: string; mono?: boolean }) {
  const [goster, setGoster] = useState(false)
  return (
    <span className={`inline-flex items-center gap-1.5 ${mono ? 'tabular-nums' : ''}`}>
      <span className={goster ? 'text-slate-800' : 'text-slate-400'}>{goster ? value : mask}</span>
      <button
        type="button"
        onClick={() => setGoster(!goster)}
        className="rounded-md px-1.5 py-0.5 text-[10px] font-semibold text-indigo-600 transition hover:bg-indigo-50"
        title={goster ? 'Gizle' : 'Göster'}
      >
        <span className="inline-flex items-center gap-0.5">
          <Icon name={goster ? 'x' : 'isci'} size={11} />
          {goster ? 'gizle' : 'göster'}
        </span>
      </button>
    </span>
  )
}