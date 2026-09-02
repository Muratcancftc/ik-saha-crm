'use server'

import bcrypt from 'bcryptjs'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/db'
import { createSession, deleteSession } from '@/lib/auth'

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
  redirect('/')
}

export async function logout() {
  await deleteSession()
  redirect('/giris')
}