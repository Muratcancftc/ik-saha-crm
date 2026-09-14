'use client'

import { usePathname } from 'next/navigation'
import { useState } from 'react'
import Link from 'next/link'
import { ROUTES } from '@/lib/permissions'
import { Icon } from './icons'
import PushBildirim from './push-bildirim'
import HeaderNotificationFeed from './header-notification-feed'

export default function Topbar({ unread }: { unread: number }) {
  const pathname = usePathname()
  const title = ROUTES[pathname]?.title ?? 'ATALAY İnsan Kaynakları'
  const [unreadSayi, setUnreadSayi] = useState(unread)

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-2 border-b border-slate-200 bg-white/80 px-4 backdrop-blur sm:px-6">
      <div className="min-w-0 shrink-0">
        <h1 className="truncate text-base font-semibold tracking-tight text-slate-900">{title}</h1>
      </div>

      {/* Header orta: canlı bildirim feed'i (mobilde gizli) */}
      <HeaderNotificationFeed onUnreadCount={setUnreadSayi} />

      <div className="flex shrink-0 items-center gap-1">
        <PushBildirim />
        <Link
          href="/bildirimler"
          className="relative rounded-lg p-2 text-slate-500 transition hover:bg-slate-100"
          aria-label="Bildirimler"
        >
          <Icon name="bell" />
          {unreadSayi > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
              {unreadSayi}
            </span>
          )}
        </Link>
      </div>
    </header>
  )
}