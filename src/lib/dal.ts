import { cache } from 'react'
import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { decrypt, SESSION_COOKIE } from './auth'
import { prisma } from './db'
import { canAccessPath } from './permissions'
import type { Rol } from '@prisma/client'

export type SessionUser = {
  id: number
  ad: string
  email: string
  rol: Rol
  lokasyonId: number | null
  menuler: string[]
}

export const getSession = cache(async (): Promise<SessionUser | null> => {
  const cookieStore = await cookies()
  const token = cookieStore.get(SESSION_COOKIE)?.value
  const session = await decrypt(token)
  if (!session?.userId) return null

  const user = await prisma.kullanici.findUnique({
    where: { id: session.userId },
    select: { id: true, ad: true, email: true, rol: true, lokasyonId: true, menuler: true },
  })
  // Bayat/silinmiş kullanıcı: render sırasında çerez silinmez (yalnızca Server Action/Route
  // Handler'da silinebilir). Sadece null dön; /giris artık /'ye yönlendirilmediği için döngü olmaz.
  // Kullanıcı yeniden giriş yapınca çerez zaten üzerine yazılır.
  if (!user) return null
  return user
})

export async function requireUser(): Promise<SessionUser> {
  const user = await getSession()
  if (!user) redirect('/giris')
  return user
}

// Rol tabanlı kapı. Kullanıcıya özel menü (menuler) tanımlıysa rota erişimini
// proxy.ts (her istekte taze DB kontrolü) yönetir; burada rol kontrolü atlanır.
// Yalnızca patron-a özel rotalar (roles === ['patron']) her koşulda patron gerektirir.
export async function requireRoles(roles: Rol[]): Promise<SessionUser> {
  const user = await requireUser()
  const patronOnly = roles.length === 1 && roles[0] === 'patron'
  if (patronOnly && user.rol !== 'patron') redirect('/')
  if (user.menuler.length > 0) return user
  if (!roles.includes(user.rol)) redirect('/')
  return user
}

// API Route Handler'ları için 403 döndüren menü+rol kapısı.
export async function requireApiAccess(path: string, roles: Rol[]): Promise<SessionUser | null> {
  const user = await getSession()
  if (!user) return null
  const patronOnly = roles.length === 1 && roles[0] === 'patron'
  if (patronOnly && user.rol !== 'patron') return null
  if (user.menuler.length > 0) {
    return canAccessPath(path, user) ? user : null
  }
  return roles.includes(user.rol) ? user : null
}

// saha_sorumlusu yalnızca kendi lokasyonunu görür
export function scopeLokasyon(user: SessionUser, lokasyonId: number): boolean {
  if (user.rol === 'saha_sorumlusu') return user.lokasyonId === lokasyonId
  return true
}