'use client'

import { adayBolgeDegistir } from '@/app/actions/aday'

export function AdayBolgeSelect({ adayId, bolge }: { adayId: number; bolge: string | null }) {
  return (
    <form action={adayBolgeDegistir} onChange={(e) => (e.currentTarget as HTMLFormElement).requestSubmit()}>
      <input type="hidden" name="id" value={adayId} />
      <select
        name="bolge"
        defaultValue={bolge ?? ''}
        title="Bölgeye ata"
        className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs outline-none focus:border-indigo-500"
      >
        <option value="">Atanmamış</option>
        <option value="kocaeli">Kocaeli</option>
        <option value="balikesir">Balıkesir</option>
      </select>
    </form>
  )
}