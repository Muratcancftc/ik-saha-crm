import type { Rol } from '@prisma/client'

export const ROUTES: Record<string, { title: string; roles: Rol[]; desc?: string }> = {
  '/': { title: 'Kontrol Paneli', roles: ['patron', 'operasyon', 'muhasebe', 'saha_sorumlusu'] },
  '/isci-havuzu': { title: 'İşçi Havuzu', roles: ['patron', 'operasyon'] },
  '/talepler': { title: 'Talepler & Atama', roles: ['patron', 'operasyon', 'saha_sorumlusu'] },
  '/puantaj': { title: 'Puantaj', roles: ['patron', 'operasyon', 'saha_sorumlusu'] },
  '/hakedis': { title: 'Hakediş & Marj', roles: ['patron', 'muhasebe'] },
  '/gelir-gider': { title: 'Gelir – Gider', roles: ['patron', 'muhasebe'] },
  '/faturalar': { title: 'Faturalar & Tahsilat', roles: ['patron', 'muhasebe'] },
  '/vergi-odemeler': { title: 'Vergi & Resmi Ödemeler', roles: ['patron', 'muhasebe'] },
  '/musteri-firmalar': { title: 'Müşteri Firmalar', roles: ['patron', 'operasyon'] },
  '/personel': { title: 'Personel & Bordro', roles: ['patron', 'muhasebe'] },
  '/belge-sgk': { title: 'Belge & SGK Takibi', roles: ['patron', 'operasyon'] },
}

export const NAV_GROUPS: Array<{ label: string; items: Array<{ href: string; icon: string; roles: Rol[] }> }> = [
  {
    label: 'Genel',
    items: [{ href: '/', icon: 'dashboard', roles: ['patron', 'operasyon', 'muhasebe', 'saha_sorumlusu'] }],
  },
  {
    label: 'Operasyon',
    items: [
      { href: '/talepler', icon: 'talep', roles: ['patron', 'operasyon', 'saha_sorumlusu'] },
      { href: '/isci-havuzu', icon: 'isci', roles: ['patron', 'operasyon'] },
      { href: '/puantaj', icon: 'puantaj', roles: ['patron', 'operasyon', 'saha_sorumlusu'] },
      { href: '/musteri-firmalar', icon: 'firma', roles: ['patron', 'operasyon'] },
      { href: '/belge-sgk', icon: 'belge', roles: ['patron', 'operasyon'] },
    ],
  },
  {
    label: 'Muhasebe',
    items: [
      { href: '/faturalar', icon: 'fatura', roles: ['patron', 'muhasebe'] },
      { href: '/hakedis', icon: 'hakedis', roles: ['patron', 'muhasebe'] },
      { href: '/gelir-gider', icon: 'gider', roles: ['patron', 'muhasebe'] },
      { href: '/vergi-odemeler', icon: 'vergi', roles: ['patron', 'muhasebe'] },
      { href: '/personel', icon: 'personel', roles: ['patron', 'muhasebe'] },
    ],
  },
]

export function canAccess(path: string, rol: Rol): boolean {
  const route = ROUTES[path]
  if (!route) return true
  return route.roles.includes(rol)
}