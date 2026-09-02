'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import type { Rol } from '@prisma/client'
import { NAV_GROUPS } from '@/lib/permissions'
import { logout } from '@/app/actions/auth'
import { Icon, type IconName } from './icons'
import { cn } from '@/lib/utils'

function LogoutButton() {
  return (
    <form action={logout}>
      <button
        type="submit"
        className="mt-2 flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm text-slate-400 transition hover:bg-white/5 hover:text-white"
      >
        <Icon name="logout" size={18} />
        Çıkış Yap
      </button>
    </form>
  )
}

export default function Sidebar({ rol, userAd }: { rol: Rol; userAd: string }) {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)

  const isActive = (href: string) =>
    href === '/' ? pathname === '/' : pathname.startsWith(href)

  const nav = NAV_GROUPS.map((g) => ({
    ...g,
    items: g.items.filter((i) => i.roles.includes(rol)),
  })).filter((g) => g.items.length > 0)

  return (
    <>
      {/* mobil üst çubuk */}
      <div className="sticky top-0 z-40 flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3 lg:hidden">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 text-sm font-bold text-white">
            İ
          </div>
          <span className="font-semibold tracking-tight text-slate-900">İK Saha</span>
        </div>
        <button
          onClick={() => setOpen(!open)}
          className="rounded-lg p-2 text-slate-600 hover:bg-slate-100"
          aria-label="Menü"
        >
          <Icon name={open ? 'x' : 'menu'} />
        </button>
      </div>

      {/* mobil drawer */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/50 lg:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex w-72 flex-col bg-slate-900 transition-transform lg:static lg:translate-x-0',
          open ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="flex h-16 items-center gap-3 px-5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-500 text-base font-bold text-white">
            İ
          </div>
          <div>
            <div className="text-sm font-semibold text-white">İK Saha</div>
            <div className="text-[11px] text-slate-400">Saha İşgücü Otomasyonu</div>
          </div>
        </div>

        <nav className="flex-1 space-y-7 overflow-y-auto px-3 pb-6 pt-3">
          {nav.map((group) => (
            <div key={group.label}>
              <div className="mb-2 px-3 text-[10px] font-bold uppercase tracking-widest text-slate-500">
                {group.label}
              </div>
              <div className="space-y-1">
                {group.items.map((item) => {
                  const active = isActive(item.href)
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setOpen(false)}
                      className={cn(
                        'group relative flex items-center gap-3 rounded-xl px-3 py-2 text-sm transition-all duration-150',
                        active
                          ? 'bg-indigo-600 font-semibold text-white shadow-sm'
                          : 'text-slate-400 hover:bg-white/[0.06] hover:text-white'
                      )}
                    >
                      {active && <span className="absolute left-0 top-1/2 h-5 w-1 -translate-y-1/2 rounded-r-full bg-white/90" />}
                      <Icon
                        name={item.icon as IconName}
                        size={18}
                        className={cn('shrink-0 transition-colors', active ? 'text-white' : 'text-slate-500 group-hover:text-white')}
                      />
                      <span className="truncate">{item.label}</span>
                    </Link>
                  )
                })}
              </div>
            </div>
          ))}
        </nav>

        <div className="border-t border-white/10 p-3">
          <div className="flex items-center gap-3 rounded-xl bg-white/5 px-3 py-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-500/30 text-xs font-bold text-white">
              {userAd.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <div className="truncate text-sm font-medium text-white">{userAd}</div>
              <div className="text-[11px] capitalize text-slate-400">{rol.replace('_', ' ')}</div>
            </div>
          </div>
          <LogoutButton />
        </div>
      </aside>
    </>
  )
}