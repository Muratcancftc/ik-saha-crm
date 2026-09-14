'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { bildirimKaldir } from '@/app/actions/belge'
import { Icon } from './icons'

type FeedItem = { id: number; tur: string; mesaj: string; ilgiliId: number | null; tarih: string }

const SES_KEY = 'ikcrm_bildirim_sesi'
const POLL_MS = 15000

const TUR_RENK: Record<string, string> = {
  talep: 'bg-indigo-500',
  website: 'bg-emerald-500',
  belge: 'bg-amber-500',
  sgk: 'bg-amber-500',
  fatura: 'bg-rose-500',
  vergi: 'bg-violet-500',
}

function turHedef(tur: string, mesaj: string): string {
  if (tur === 'website') return /aday/i.test(mesaj) ? '/adaylar' : '/talepler'
  if (tur === 'talep') return '/talepler'
  if (tur === 'belge' || tur === 'sgk') return '/belge-sgk'
  if (tur === 'fatura') return '/faturalar'
  if (tur === 'vergi') return '/vergi-odemeler'
  return '/bildirimler'
}

export default function HeaderNotificationFeed({ onUnreadCount }: { onUnreadCount: (n: number) => void }) {
  const [items, setItems] = useState<FeedItem[]>([])
  const [ses, setSes] = useState(() => localStorage.getItem(SES_KEY) !== '0')
  const audioReady = useRef(false)
  const sonId = useRef<number | null>(null)
  const audioEl = useRef<HTMLAudioElement | null>(null)

  const cal = useCallback(
    () => {
      if (!ses || !audioReady.current) return
      try {
        if (!audioEl.current) audioEl.current = new Audio('/sounds/notification.wav')
        void audioEl.current.play().catch(() => {})
      } catch {
        // ses engellenirse uygulama bozulmaz
      }
    },
    [ses]
  )

  const getir = useCallback(async () => {
    try {
      const res = await fetch('/api/bildirimler/latest', { cache: 'no-store' })
      if (!res.ok) return
      const data = await res.json()
      onUnreadCount(data.unreadCount)
      const liste: FeedItem[] = data.items ?? []
      // Yeni bildirim var mı? (ilk yüklemede eskilere ses çalma)
      const maxId = liste.length ? Math.max(...liste.map((i: FeedItem) => i.id)) : (sonId.current ?? 0)
      if (sonId.current !== null && maxId > sonId.current && audioReady.current) {
        cal()
      }
      if (sonId.current === null && liste.length) sonId.current = maxId
      else if (sonId.current !== null && maxId > sonId.current) sonId.current = maxId
      setItems(liste)
    } catch {
      // sessizce geç
    }
  }, [cal, onUnreadCount])

  // Ses kilidi: ilk kullanıcı etkileşiminden sonra aktif
  useEffect(() => {
    const kilidiAc = () => {
      audioReady.current = true
      window.removeEventListener('pointerdown', kilidiAc)
      window.removeEventListener('keydown', kilidiAc)
    }
    window.addEventListener('pointerdown', kilidiAc)
    window.addEventListener('keydown', kilidiAc)
    return () => {
      window.removeEventListener('pointerdown', kilidiAc)
      window.removeEventListener('keydown', kilidiAc)
    }
  }, [])

  useEffect(() => {
    getir()
    const iv = setInterval(getir, POLL_MS)
    const odak = () => getir()
    window.addEventListener('focus', odak)
    return () => {
      clearInterval(iv)
      window.removeEventListener('focus', odak)
    }
  }, [getir])

  async function kaldir(id: number) {
    const onceki = items
    setItems((cur) => cur.filter((i) => i.id !== id))
    try {
      const fd = new FormData()
      fd.set('id', String(id))
      await bildirimKaldir(fd)
      // Dismiss sonrası güncel okunmamış sayıyı çek (badge için)
      const res = await fetch('/api/bildirimler/latest', { cache: 'no-store' })
      const data = await res.json()
      onUnreadCount(data.unreadCount)
    } catch {
      setItems(onceki)
    }
  }

  function sesDegistir() {
    const yeni = !ses
    setSes(yeni)
    localStorage.setItem(SES_KEY, yeni ? '1' : '0')
  }

  if (items.length === 0) {
    return <div className="hidden min-w-0 flex-1 lg:block" aria-hidden="true" />
  }

  return (
    <div className="hidden min-w-0 flex-1 items-center gap-2 px-2 lg:flex" aria-live="polite">
      <div className="flex min-w-0 items-center gap-1.5 overflow-hidden">
        {items.slice(0, 2).map((b) => (
          <Link
            key={b.id}
            href={turHedef(b.tur, b.mesaj)}
            className="group flex min-w-0 max-w-[22rem] items-center gap-2 rounded-lg border border-slate-200 bg-slate-50/80 py-1 pl-2 pr-1 transition hover:bg-indigo-50"
          >
            <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${TUR_RENK[b.tur] ?? 'bg-slate-400'}`} />
            <span className="truncate text-xs text-slate-700">{b.mesaj}</span>
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                void kaldir(b.id)
              }}
              aria-label="Bildirimi kaldır"
              className="shrink-0 rounded p-0.5 text-slate-400 transition hover:bg-slate-200 hover:text-slate-600"
            >
              <Icon name="x" size={13} />
            </button>
          </Link>
        ))}
      </div>
      <button
        type="button"
        onClick={sesDegistir}
        aria-label={ses ? 'Bildirim sesini kapat' : 'Bildirim sesini aç'}
        title={ses ? 'Ses açık' : 'Ses kapalı'}
        className="shrink-0 rounded-lg p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
      >
        {ses ? '🔊' : '🔇'}
      </button>
    </div>
  )
}