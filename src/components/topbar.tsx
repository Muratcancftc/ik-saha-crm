'use client'

import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { ROUTES } from '@/lib/permissions'
import { Icon } from './icons'

export default function Topbar({ unread }: { unread: number }) {
  const pathname = usePathname()
  const title = ROUTES[pathname]?.title ?? 'İK Saha'

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-slate-200 bg-white/80 px-6 backdrop-blur">
      <div>
        <h1 className="text-base font-semibold tracking-tight text-slate-900">{title}</h1>
      </div>
      <Link
        href="/bildirimler"
        className="relative rounded-lg p-2 text-slate-500 transition hover:bg-slate-100"
        aria-label="Bildirimler"
      >
        <Icon name="bell" />
        {unread > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
            {unread}
          </span>
        )}
      </Link>
    </header>
  )
}