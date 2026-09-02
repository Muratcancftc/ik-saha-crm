'use client'

import { usePathname } from 'next/navigation'
import { useState } from 'react'
import { ROUTES } from '@/lib/permissions'
import { Icon } from './icons'
import { dateTime } from '@/lib/format'
import { bildirimleriTara, bildirimleriOku } from '@/app/actions/belge'

type Bildirim = {
  id: number
  tur: string
  mesaj: string
  tarih: Date | string
}

export default function Topbar({ unread, bildirimler }: { unread: number; bildirimler: Bildirim[] }) {
  const pathname = usePathname()
  const title = ROUTES[pathname]?.title ?? 'İK Saha'
  const [open, setOpen] = useState(false)

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-slate-200 bg-white/80 px-6 backdrop-blur">
      <div>
        <h1 className="text-base font-semibold tracking-tight text-slate-900">{title}</h1>
      </div>
      <div className="relative">
        <button
          onClick={() => setOpen(!open)}
          className="relative rounded-lg p-2 text-slate-500 transition hover:bg-slate-100"
          aria-label="Bildirimler"
        >
          <Icon name="bell" />
          {unread > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
              {unread}
            </span>
          )}
        </button>

        {open && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
            <div className="absolute right-0 z-20 mt-2 w-80 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg">
              <div className="flex items-center justify-between border-b border-slate-100 px-4 py-2.5">
                <span className="text-xs font-semibold text-slate-500">Bildirimler</span>
                <div className="flex gap-1">
                  <form action={bildirimleriTara}>
                    <button className="rounded-md px-2 py-1 text-[11px] font-medium text-indigo-600 hover:bg-indigo-50" type="submit">
                      Tara
                    </button>
                  </form>
                  <form action={bildirimleriOku}>
                    <button className="rounded-md px-2 py-1 text-[11px] font-medium text-slate-500 hover:bg-slate-100" type="submit">
                      Okundu
                    </button>
                  </form>
                </div>
              </div>
              <div className="max-h-80 overflow-y-auto">
                {bildirimler.length === 0 ? (
                  <div className="px-4 py-8 text-center text-xs text-slate-400">
                    Bildirim yok
                  </div>
                ) : (
                  bildirimler.map((b) => (
                    <div key={b.id} className="border-b border-slate-50 px-4 py-3 last:border-0">
                      <div className="flex items-start gap-2.5">
                        <span className="mt-0.5 text-amber-500">
                          <Icon name="alert" size={15} />
                        </span>
                        <div>
                          <p className="text-xs leading-snug text-slate-700">{b.mesaj}</p>
                          <p className="mt-1 text-[11px] text-slate-400">{dateTime(b.tarih)}</p>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </header>
  )
}