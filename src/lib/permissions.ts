import type { Rol } from '@prisma/client'

export const ROUTES: Record<string, { title: string; roles: Rol[]; desc?: string }> = {
  '/': { title: 'Kontrol Paneli', roles: ['patron', 'operasyon', 'muhasebe', 'saha_sorumlusu'] },
  '/takvim': { title: 'Vardiya / Takvim', roles: ['patron', 'operasyon', 'saha_sorumlusu'] },
  '/talepler': { title: 'Talepler & Atama', roles: ['patron', 'operasyon', 'saha_sorumlusu'] },
  '/isci-havuzu': { title: 'İşçi Havuzu', roles: ['patron', 'operasyon'] },
  '/puantaj': { title: 'Puantaj', roles: ['patron', 'operasyon', 'saha_sorumlusu'] },
  '/adaylar': { title: 'İşe Alım / Aday Havuzu', roles: ['patron', 'operasyon'] },
  '/musteri-firmalar': { title: 'Müşteri Firmalar', roles: ['patron', 'operasyon'] },
  '/belge-sgk': { title: 'Belge & SGK Takibi', roles: ['patron', 'operasyon'] },
  '/odeme': { title: 'Bordro / Ödeme', roles: ['patron', 'muhasebe'] },
  '/faturalar': { title: 'Faturalar & Tahsilat', roles: ['patron', 'muhasebe'] },
  '/hakedis': { title: 'Hakediş & Marj', roles: ['patron', 'muhasebe'] },
  '/gelir-gider': { title: 'Gelir – Gider', roles: ['patron', 'muhasebe'] },
  '/vergi-odemeler': { title: 'Vergi & Resmi Ödemeler', roles: ['patron', 'muhasebe'] },
  '/personel': { title: 'Personel & Bordro', roles: ['patron', 'muhasebe'] },
  '/raporlar': { title: 'Raporlar', roles: ['patron', 'muhasebe', 'operasyon'] },
  '/evrak': { title: 'Sözleşme & Evrak', roles: ['patron', 'operasyon', 'muhasebe'] },
  '/ayarlar': { title: 'Ayarlar', roles: ['patron'] },
  '/bildirimler': { title: 'Bildirimler', roles: ['patron', 'operasyon', 'muhasebe', 'saha_sorumlusu'] },
}

export const NAV_GROUPS: Array<{ label: string; items: Array<{ href: string; icon: string; label: string; roles: Rol[] }> }> = [
  {
    label: 'Genel',
    items: [
      { href: '/', icon: 'dashboard', label: 'Kontrol Paneli', roles: ['patron', 'operasyon', 'muhasebe', 'saha_sorumlusu'] },
      { href: '/bildirimler', icon: 'bell', label: 'Bildirimler', roles: ['patron', 'operasyon', 'muhasebe', 'saha_sorumlusu'] },
    ],
  },
  {
    label: 'Operasyon',
    items: [
      { href: '/takvim', icon: 'puantaj', label: 'Vardiya / Takvim', roles: ['patron', 'operasyon', 'saha_sorumlusu'] },
      { href: '/talepler', icon: 'talep', label: 'Talepler & Atama', roles: ['patron', 'operasyon', 'saha_sorumlusu'] },
      { href: '/isci-havuzu', icon: 'isci', label: 'İşçi Havuzu', roles: ['patron', 'operasyon'] },
      { href: '/puantaj', icon: 'clock', label: 'Puantaj', roles: ['patron', 'operasyon', 'saha_sorumlusu'] },
      { href: '/adaylar', icon: 'users', label: 'Aday Havuzu', roles: ['patron', 'operasyon'] },
      { href: '/musteri-firmalar', icon: 'firma', label: 'Müşteri Firmalar', roles: ['patron', 'operasyon'] },
      { href: '/belge-sgk', icon: 'belge', label: 'Belge & SGK', roles: ['patron', 'operasyon'] },
    ],
  },
  {
    label: 'Finans',
    items: [
      { href: '/odeme', icon: 'wallet', label: 'Bordro / Ödeme', roles: ['patron', 'muhasebe'] },
      { href: '/faturalar', icon: 'fatura', label: 'Faturalar', roles: ['patron', 'muhasebe'] },
      { href: '/hakedis', icon: 'hakedis', label: 'Hakediş & Marj', roles: ['patron', 'muhasebe'] },
      { href: '/gelir-gider', icon: 'gider', label: 'Gelir – Gider', roles: ['patron', 'muhasebe'] },
      { href: '/vergi-odemeler', icon: 'vergi', label: 'Vergi & Ödemeler', roles: ['patron', 'muhasebe'] },
      { href: '/personel', icon: 'personel', label: 'Personel & Bordro', roles: ['patron', 'muhasebe'] },
    ],
  },
  {
    label: 'Yönetim',
    items: [
      { href: '/raporlar', icon: 'gider', label: 'Raporlar', roles: ['patron', 'muhasebe', 'operasyon'] },
      { href: '/evrak', icon: 'belge', label: 'Sözleşme & Evrak', roles: ['patron', 'operasyon', 'muhasebe'] },
      { href: '/ayarlar', icon: 'vergi', label: 'Ayarlar', roles: ['patron'] },
    ],
  },
]

export function canAccess(path: string, rol: Rol): boolean {
  const route = ROUTES[path]
  if (!route) return true
  return route.roles.includes(rol)
}