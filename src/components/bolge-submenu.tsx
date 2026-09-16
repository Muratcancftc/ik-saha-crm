'use client'

import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'
import type { Rol } from '@prisma/client'
import { cn } from '@/lib/utils'
import { bolgeEtiket } from '@/lib/bolge'

type Bolge = 'kocaeli' | 'balikesir'

const TABS: Array<{ key: string; base: string; label: string; roles: Rol[] }> = [
  { key: 'firmalar', base: '/musteri-firmalar', label: 'Firmalar', roles: ['patron', 'operasyon'] },
  { key: 'isci', base: '/isci-havuzu', label: 'İşçi Havuzu', roles: ['patron', 'operasyon'] },
  { key: 'personel', base: '/personel', label: 'Personel', roles: ['patron', 'muhasebe'] },
  { key: 'servisciler', base: '/servisciler', label: 'Servisçiler', roles: ['patron', 'operasyon', 'muhasebe'] },
  { key: 'talepler', base: '/talepler', label: 'Talepler & Atama', roles: ['patron', 'operasyon', 'saha_sorumlusu'] },
  { key: 'takvim', base: '/takvim', label: 'Vardiya / Takvim', roles: ['patron', 'operasyon', 'saha_sorumlusu'] },
  { key: 'puantaj', base: '/puantaj', label: 'Puantaj', roles: ['patron', 'operasyon', 'saha_sorumlusu'] },
  { key: 'belge', base: '/belge-sgk', label: 'Belge & SGK', roles: ['patron', 'operasyon'] },
]

export function BolgeSubMenu({ bolge, rol }: { bolge: Bolge; rol: Rol }) {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const aktif = searchParams.get('bolge')

  const tabs = TABS.filter((t) => t.roles.includes(rol))

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
      <div className="mb-2 flex items-center justify-between px-1">
        <span className="text-xs font-semibold text-slate-700">
          {bolgeEtiket(bolge)} Bölgesi
        </span>
        {aktif && aktif !== bolge && (
          <span className="text-[10px] text-slate-400">tüm bölgelerden filtreleniyor</span>
        )}
      </div>
      <div className="flex flex-wrap gap-1">
        {tabs.map((t) => {
          const active = pathname.startsWith(t.base) && aktif === bolge
          return (
            <Link
              key={t.key}
              href={`${t.base}?bolge=${bolge}`}
              className={cn(
                'rounded-lg px-3 py-1.5 text-xs font-medium transition',
                active
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-600 hover:bg-slate-100'
              )}
            >
              {t.label}
            </Link>
          )
        })}
      </div>
    </div>
  )
}