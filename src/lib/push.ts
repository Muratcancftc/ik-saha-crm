import webpush from 'web-push'
import { prisma } from './db'
import { urlBase64ToUint8Array } from './push-client'

export { urlBase64ToUint8Array }

// VAPID kimliği (server'da gizli anahtar okunur)
const VAPID_PUBLIC = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? ''
const VAPID_PRIVATE = process.env.VAPID_PRIVATE_KEY ?? ''
const VAPID_SUBJECT = process.env.VAPID_SUBJECT ?? 'mailto:info@atalayik.com.tr'

let hazir = false
function vpidHazirla() {
  if (hazir || !VAPID_PUBLIC || !VAPID_PRIVATE) return false
  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC, VAPID_PRIVATE)
  hazir = true
  return true
}

// Tüm aboneliklere tarayıcı push bildirimi gönder
export async function pushBildirimGonder(title: string, body: string, url = '/bildirimler') {
  if (!vpidHazirla()) return
  const abonelikler = await prisma.pushAbonelik.findMany()
  if (abonelikler.length === 0) return

  const payload = JSON.stringify({ title, body, url })
  const silinecek: number[] = []

  await Promise.all(
    abonelikler.map(async (s) => {
      try {
        await webpush.sendNotification(
          { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
          payload
        )
      } catch (e) {
        const err = e as { statusCode?: number }
        // abonelik geçersiz (410 Gone) → temizle
        if (err.statusCode === 404 || err.statusCode === 410) silinecek.push(s.id)
      }
    })
  )

  if (silinecek.length > 0) {
    await prisma.pushAbonelik.deleteMany({ where: { id: { in: silinecek } } })
  }
}
