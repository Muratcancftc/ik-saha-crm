import { NextResponse } from 'next/server'
import { getSession } from '@/lib/dal'
import { prisma } from '@/lib/db'
import { startOfDay } from '@/lib/dates'

export const dynamic = 'force-dynamic'

// İstemciden periyodik heartbeat: aktif dakika + son aktivite + sayfa ziyareti
export async function POST(req: Request) {
  const user = await getSession()
  if (!user) return NextResponse.json({ ok: false })

  let path = ''
  try {
    const b = (await req.json()) as { path?: string }
    path = String(b?.path ?? '')
  } catch {
    path = ''
  }

  const bugun = startOfDay()
  const simdi = new Date()

  const mevcut = await prisma.kullaniciEtkinlik.findUnique({
    where: { kullaniciId_tarih: { kullaniciId: user.id, tarih: bugun } },
  })

  if (mevcut) {
    // Son heartbeat'ten en az ~45sn geçtiyse 1 dakika say (çok sekmeli çift sayımı azaltır)
    const artir = mevcut.sonAktivite && simdi.getTime() - mevcut.sonAktivite.getTime() >= 45000 ? 1 : 0
    await prisma.kullaniciEtkinlik.update({
      where: { id: mevcut.id },
      data: { aktifDakika: mevcut.aktifDakika + artir, sonAktivite: simdi },
    })
  } else {
    await prisma.kullaniciEtkinlik.create({ data: { kullaniciId: user.id, tarih: bugun, aktifDakika: 1, sonAktivite: simdi } })
  }

  // Sayfa ziyareti: ardışık aynı kayıtları tekrarlama (ne yapmış → hangi sayfalara girmiş)
  if (path) {
    const son = await prisma.etkinlikKayit.findFirst({ where: { kullaniciId: user.id }, orderBy: { tarih: 'desc' } })
    const islem = `Sayfa: ${path}`
    if (!son || son.islem !== islem) {
      await prisma.etkinlikKayit.create({ data: { kullaniciId: user.id, islem } })
    }
  }

  return NextResponse.json({ ok: true })
}