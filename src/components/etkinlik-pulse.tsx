'use client'

import { usePathname } from 'next/navigation'
import { useEffect, useRef } from 'react'

// Kullanıcı etkinliğini ölçer: açılışta + her 60 sn'de bir heartbeat gönderir.
export function EtkinlikPulse() {
  const pathname = usePathname()
  const pathRef = useRef(pathname)

  useEffect(() => {
    pathRef.current = pathname
  }, [pathname])

  useEffect(() => {
    const gonder = () => {
      fetch('/api/etkinlik/heartbeat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: pathRef.current }),
        keepalive: true,
      }).catch(() => {})
    }
    gonder()
    const id = setInterval(gonder, 60000)
    return () => {
      clearInterval(id)
      gonder() // sayfa kapanırken son kayıt (keepalive)
    }
  }, [])

  return null
}