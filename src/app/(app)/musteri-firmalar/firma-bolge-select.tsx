'use client'

import { setFirmaBolge } from '@/app/actions/firma'

export function FirmaBolgeSelect({ firmaId, bolge }: { firmaId: number; bolge: string }) {
  return (
    <form action={setFirmaBolge} onChange={(e) => (e.currentTarget as HTMLFormElement).requestSubmit()}>
      <input type="hidden" name="firmaId" value={firmaId} />
      <select
        name="bolge"
        defaultValue={bolge}
        title="Bölgeyi değiştir"
        className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs outline-none focus:border-indigo-500"
      >
        <option value="kocaeli">Kocaeli</option>
        <option value="balikesir">Balıkesir</option>
      </select>
    </form>
  )
}