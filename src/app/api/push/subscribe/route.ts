import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireUser } from '@/lib/dal'

export async function POST(req: Request) {
  try {
    const user = await requireUser()
    const { endpoint, keys } = await req.json()
    if (!endpoint || !keys?.p256dh || !keys?.auth) {
      return NextResponse.json({ error: 'Geçersiz abonelik.' }, { status: 400 })
    }

    await prisma.pushAbonelik.upsert({
      where: { endpoint },
      update: { p256dh: keys.p256dh, auth: keys.auth, kullaniciId: user.id },
      create: { endpoint, p256dh: keys.p256dh, auth: keys.auth, kullaniciId: user.id },
    })

    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'Yetkisiz.' }, { status: 401 })
  }
}