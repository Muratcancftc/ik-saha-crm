'use client'

import { useEffect, useState } from 'react'
import { urlBase64ToUint8Array } from '@/lib/push-client'
import { Icon } from './icons'

type Durum = 'bekliyor' | 'kapali' | 'desteklenmiyor' | 'acik' | 'hata'

export default function PushBildirim() {
  const [durum, setDurum] = useState<Durum>('bekliyor')
  const [yukleniyor, setYukleniyor] = useState(false)

  useEffect(() => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      setDurum('desteklenmiyor')
      return
    }
    navigator.serviceWorker.ready
      .then((reg) => reg.pushManager.getSubscription())
      .then((sub) => setDurum(sub ? 'acik' : 'kapali'))
      .catch(() => setDurum('kapali'))
  }, [])

  async function ac() {
    setYukleniyor(true)
    try {
      if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
        setDurum('desteklenmiyor')
        return
      }
      const reg = await navigator.serviceWorker.register('/sw.js')
      await navigator.serviceWorker.ready
      const izin = await Notification.requestPermission()
      if (izin !== 'granted') {
        setDurum('kapali')
        return
      }
      const anahtar = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
      if (!anahtar) {
        setDurum('hata')
        return
      }
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(anahtar) as BufferSource,
      })
      const res = await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sub.toJSON()),
      })
      if (!res.ok) throw new Error('kayıt başarısız')
      setDurum('acik')
    } catch {
      setDurum('hata')
    } finally {
      setYukleniyor(false)
    }
  }

  async function kapat() {
    const reg = await navigator.serviceWorker.getRegistration('/sw.js')
    const sub = await reg?.pushManager.getSubscription()
    await sub?.unsubscribe()
    setDurum('kapali')
  }

  if (durum === 'acik') {
    return (
      <button
        onClick={kapat}
        title="Push bildirimleri kapat"
        className="relative rounded-lg p-2 text-emerald-600 transition hover:bg-emerald-50"
      >
        <Icon name="bell" />
        <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-emerald-500" />
      </button>
    )
  }

  return (
    <button
      onClick={ac}
      disabled={yukleniyor || durum === 'desteklenmiyor'}
      title={durum === 'desteklenmiyor' ? 'Tarayıcı push desteklemiyor' : 'Bildirimleri aç'}
      className="relative rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 disabled:opacity-50"
    >
      <Icon name="bell" />
      <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-indigo-500 px-1 text-[9px] font-bold text-white">
        +
      </span>
    </button>
  )
}