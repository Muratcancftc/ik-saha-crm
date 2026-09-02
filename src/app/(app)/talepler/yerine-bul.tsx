'use client'

import { useState } from 'react'
import { Icon } from '@/components/icons'
import { AtamaPaneli } from './atama-paneli'

export function YerineBul({
  talepId,
  meslekId,
  meslekAd,
  tarih,
  haricId,
}: {
  talepId: number
  meslekId: number
  meslekAd: string
  tarih: string
  haricId: number
}) {
  const [acik, setAcik] = useState(false)
  return (
    <div>
      <button
        onClick={() => setAcik(!acik)}
        className="inline-flex items-center gap-1 rounded-lg bg-white px-2 py-1.5 text-xs font-medium text-slate-600 ring-1 ring-slate-300 transition hover:bg-slate-50"
        title="Yerine adam bul"
      >
        <Icon name="users" size={13} />
        Yerine bul
      </button>
      {acik && (
        <div className="mt-2">
          <AtamaPaneli talepId={talepId} meslekId={meslekId} meslekAd={meslekAd} tarih={tarih} haricId={haricId} />
        </div>
      )}
    </div>
  )
}