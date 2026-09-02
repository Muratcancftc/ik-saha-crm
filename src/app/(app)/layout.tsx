import { requireUser } from '@/lib/dal'
import { prisma } from '@/lib/db'
import Sidebar from '@/components/sidebar'
import Topbar from '@/components/topbar'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser()

  const unread = await prisma.bildirim.count({
    where: { okundu: false, ...(user.rol === 'saha_sorumlusu' ? { kullaniciId: user.id } : {}) },
  })

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar rol={user.rol} userAd={user.ad} />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar unread={unread} />
        <main className="flex-1 px-6 py-6">{children}</main>
      </div>
    </div>
  )
}