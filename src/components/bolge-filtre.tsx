'use client'

import { usePathname, useRouter, useSearchParams } from 'next/navigation'

export function BolgeFiltre({ aktif, className }: { aktif: string | null; className?: string }) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  function degistir(v: string) {
    const p = new URLSearchParams(searchParams.toString())
    if (v) p.set('bolge', v)
    else p.delete('bolge')
    const q = p.toString()
    router.push(`${pathname}${q ? `?${q}` : ''}`)
  }

  return (
    <select
      value={aktif ?? ''}
      onChange={(e) => degistir(e.target.value)}
      className={
        className ??
        'rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-indigo-500'
      }
    >
      <option value="">Tüm Bölgeler</option>
      <option value="kocaeli">Kocaeli</option>
      <option value="balikesir">Balıkesir</option>
    </select>
  )
}