import { cache } from 'react'
import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { decrypt, SESSION_COOKIE } from './auth'
import { prisma } from './db'
import type { Rol } from '@prisma/client'

export type SessionUser = {
  id: number
  ad: string
  email: string
  rol: Rol
  lokasyonId: number | null
}

export const getSession = cache(async (): Promise<SessionUser | null> => {
  const cookieStore = await cookies()
  const token = cookieStore.get(SESSION_COOKIE)?.value
  const session = await decrypt(token)
  if (!session?.userId) return null

  const user = await prisma.kullanici.findUnique({
    where: { id: session.userId },
    select: { id: true, ad: true, email: true, rol: true, lokasyonId: true },
  })
  if (!user) return null
  return user
})

export async function requireUser(): Promise<SessionUser> {
  const user = await getSession()
  if (!user) redirect('/giris')
  return user
}

export async function requireRoles(roles: Rol[]): Promise<SessionUser> {
  const user = await requireUser()
  if (!roles.includes(user.rol)) redirect('/')
  return user
}

// saha_sorumlusu yalnızca kendi lokasyonunu görür
export function scopeLokasyon(user: SessionUser, lokasyonId: number): boolean {
  if (user.rol === 'saha_sorumlusu') return user.lokasyonId === lokasyonId
  return true
}