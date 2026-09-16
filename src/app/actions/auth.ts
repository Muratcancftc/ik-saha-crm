'use server'

import bcrypt from 'bcryptjs'
import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { prisma } from '@/lib/db'
import { createSession, deleteSession, decrypt, SESSION_COOKIE } from '@/lib/auth'
import { startOfDay } from '@/lib/dates'

export type LoginState = { error?: string } | undefined

export async function login(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const email = String(formData.get('email') ?? '').trim().toLowerCase()
  const password = String(formData.get('password') ?? '')

  if (!email || !password) return { error: 'E-posta ve şifre zorunludur.' }

  const user = await prisma.kullanici.findUnique({ where: { email } })
  if (!user) return { error: 'E-posta veya şifre hatalı.' }

  const ok = await bcrypt.compare(password, user.sifreHash)
  if (!ok) return { error: 'E-posta veya şifre hatalı.' }

  await createSession(user.id, user.rol)

  // Etkinlik logu: günlük giriş sayısı + giriş kaydı
  const bugun = startOfDay()
  const mevcut = await prisma.kullaniciEtkinlik.findUnique({ where: { kullaniciId_tarih: { kullaniciId: user.id, tarih: bugun } } })
  if (mevcut) {
    await prisma.kullaniciEtkinlik.update({ where: { id: mevcut.id }, data: { girisSayisi: mevcut.girisSayisi + 1, sonAktivite: new Date() } })
  } else {
    await prisma.kullaniciEtkinlik.create({ data: { kullaniciId: user.id, tarih: bugun, girisSayisi: 1, sonAktivite: new Date() } })
  }
  await prisma.etkinlikKayit.create({ data: { kullaniciId: user.id, islem: 'Giriş yaptı' } })

  redirect('/')
}

export async function logout() {
  const cookieStore = await cookies()
  const token = cookieStore.get(SESSION_COOKIE)?.value
  const session = await decrypt(token)
  if (session?.userId) {
    await prisma.etkinlikKayit.create({ data: { kullaniciId: session.userId, islem: 'Çıkış yaptı' } })
  }
  await deleteSession()
  redirect('/giris')
}