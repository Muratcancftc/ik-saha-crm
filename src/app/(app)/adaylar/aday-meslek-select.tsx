'use client'

import { adayMeslekDegistir } from '@/app/actions/aday'

export function AdayMeslekSelect({
  adayId,
  meslekId,
  meslekler,
}: {
  adayId: number
  meslekId: number | null
  meslekler: { id: number; ad: string }[]
}) {
  return (
    <form action={adayMeslekDegistir} onChange={(e) => (e.currentTarget as HTMLFormElement).requestSubmit()}>
      <input type="hidden" name="id" value={adayId} />
      <select
        name="meslekId"
        defaultValue={meslekId ?? ''}
        title="Meslek ata"
        className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs outline-none focus:border-indigo-500"
      >
        <option value="">Meslek seçin</option>
        {meslekler.map((m) => (
          <option key={m.id} value={m.id}>
            {m.ad}
          </option>
        ))}
      </select>
    </form>
  )
}
