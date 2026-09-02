import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { decrypt, SESSION_COOKIE } from '@/lib/auth'
import { canAccess } from '@/lib/permissions'

const PUBLIC_PATHS = ['/giris']

export async function proxy(request: NextRequest) {
  const path = request.nextUrl.pathname
  const token = request.cookies.get(SESSION_COOKIE)?.value
  const session = await decrypt(token)

  const isPublic = PUBLIC_PATHS.some((p) => path.startsWith(p))
  const isStatic =
    path.startsWith('/_next') ||
    path.startsWith('/api') ||
    path.startsWith('/static') ||
    path.includes('.')

  // statik/API isteklerine dokunma
  if (isStatic) return NextResponse.next()

  // giriş yapmamış → giriş sayfasına
  if (!session?.userId && !isPublic) {
    return NextResponse.redirect(new URL('/giris', request.url))
  }

  // NOT: public sayfaları (/giris) oturum olsa bile /'ye yönlendirmeyin —
  // bayat/silinmiş kullanıcı çereziyle /giris ↔ / arasında sonsuz loop oluşur.
  // /giris her zaman render olsun; gerçek koruma DAL'da yapılır.

  // rol tabanlı route koruması (optimistik kontrol)
  if (session?.userId && session.rol && !canAccess(path, session.rol)) {
    return NextResponse.redirect(new URL('/', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}