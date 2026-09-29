import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { decrypt, SESSION_COOKIE } from '@/lib/auth'
import { canAccessPath, firstAccessiblePath } from '@/lib/permissions'
import { prisma } from '@/lib/db'

const PUBLIC_PATHS = ['/giris']

export async function proxy(request: NextRequest) {
  const path = request.nextUrl.pathname
  const token = request.cookies.get(SESSION_COOKIE)?.value
  const session = await decrypt(token)

  const isPaylasim = path === '/p' || path.startsWith('/p/')
  const isPublic = isPaylasim || PUBLIC_PATHS.some((p) => path.startsWith(p))
  const isStatic =
    path.startsWith('/_next') ||
    path.startsWith('/api/integrations') ||
    path.startsWith('/api/public') ||
    path.startsWith('/api/cron') || // CRON_SECRET ile korunur (handler içinde)
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

  if (!session?.userId) return NextResponse.next()

  // Kullanıcıya özel menü yetkisi: her istekte DB'den taze okunur, böylece
  // patron menü değişikliği kullanıcının yeniden giriş yapmasını beklemez.
  const user = await prisma.kullanici.findUnique({
    where: { id: session.userId },
    select: { rol: true, menuler: true },
  })
  if (!user) return NextResponse.redirect(new URL('/giris', request.url))

  // rota tabanlı koruma (sayfalar + server action POST'ları + gated API'ler)
  if (!canAccessPath(path, user)) {
    // Erişimi olmayan sayfayı isteyen kullanıcıyı '/' paneline değil, erişebildiği
    // ilk sayfaya yönlendir (ör. ik rolünde '/' yok → sonsuz döngüyü önler).
    return NextResponse.redirect(new URL(firstAccessiblePath(user), request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}