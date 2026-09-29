import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { tokenHash, sifreDogrula, oturumImzala, PAYLASIM_COOKIE } from '@/lib/paylasim'
import { linkDurumHesapla } from '@/lib/paylasim-tipleri'
import { metaFromRequest } from '@/lib/paylasim'

export const dynamic = 'force-dynamic'

const KILIT_DAKIKA = 15
const MAX_DENEME = 5

export async function POST(req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const base = new URL(req.url)
  const geri = (hata?: string) =>
    NextResponse.redirect(new URL(`/p/${token}${hata ? `?hata=${hata}` : ''}`, base.origin), 303)

  const link = await prisma.paylasimLink.findUnique({ where: { tokenHash: tokenHash(token) } })
  if (!link || !link.sifreHash) return geri('yok')

  const durum = linkDurumHesapla(link.durum, link.gecerlilikBitis)
  if (durum !== 'AKTIF') return geri('suresiz')

  const now = new Date()
  if (link.kilitBitis && link.kilitBitis > now) return geri('kilitli')

  const form = await req.formData().catch(() => null)
  const sifre = String(form?.get('sifre') ?? '').trim()
  const meta = metaFromRequest(req)

  const dogru = sifre.length > 0 && (await sifreDogrula(sifre, link.sifreHash))

  if (!dogru) {
    const deneme = link.kilitliDeneme + 1
    const kilitli = deneme >= MAX_DENEME
    await prisma.$transaction([
      prisma.paylasimLink.update({
        where: { id: link.id },
        data: {
          kilitliDeneme: kilitli ? 0 : deneme,
          kilitBitis: kilitli ? new Date(now.getTime() + KILIT_DAKIKA * 60 * 1000) : null,
        },
      }),
      prisma.paylasimErisim.create({
        data: { linkId: link.id, ip: meta.ip, userAgent: meta.userAgent, basarili: false, tip: 'sifre_denemesi' },
      }),
    ])
    return geri(kilitli ? 'kilitlendi' : 'yanlis')
  }

  const oturum = await oturumImzala(link.id)
  const res = geri()
  res.cookies.set(PAYLASIM_COOKIE, oturum, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 24 * 60 * 60,
  })
  // Başarılı şifre denemesi erişim kaydı (açılma kaydı sayfada ayrıca tutulur)
  await prisma.$transaction([
    prisma.paylasimLink.update({ where: { id: link.id }, data: { kilitliDeneme: 0, kilitBitis: null } }),
    prisma.paylasimErisim.create({
      data: { linkId: link.id, ip: meta.ip, userAgent: meta.userAgent, basarili: true, tip: 'sifre_basarili' },
    }),
  ])
  return res
}
