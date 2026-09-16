import type { Rol } from '@prisma/client'

export const ROUTES: Record<string, { title: string; roles: Rol[]; desc?: string }> = {
  '/': { title: 'Kontrol Paneli', roles: ['patron', 'operasyon', 'muhasebe', 'saha_sorumlusu', 'izleyici'] },
  '/kocaeli': { title: 'Kocaeli Bölgesi', roles: ['patron', 'operasyon', 'muhasebe', 'saha_sorumlusu'] },
  '/balikesir': { title: 'Balıkesir Bölgesi', roles: ['patron', 'operasyon', 'muhasebe', 'saha_sorumlusu'] },
  '/takvim': { title: 'Vardiya / Takvim', roles: ['patron', 'operasyon', 'saha_sorumlusu'] },
  '/talepler': { title: 'Talepler & Atama', roles: ['patron', 'operasyon', 'saha_sorumlusu'] },
  '/isci-havuzu': { title: 'İşçi Havuzu', roles: ['patron', 'operasyon'] },
  '/servisciler': { title: 'Servisçiler', roles: ['patron', 'operasyon', 'muhasebe'] },
  '/puantaj': { title: 'Puantaj', roles: ['patron', 'operasyon', 'saha_sorumlusu'] },
  '/aramalar': { title: 'Telefon Aramalar', roles: ['patron', 'operasyon', 'muhasebe', 'ik', 'izleyici'] },
  '/ik/personel': { title: 'İK Personel', roles: ['patron', 'muhasebe', 'operasyon', 'ik'] },
  '/ik/puantaj': { title: 'İK Puantaj', roles: ['patron', 'muhasebe', 'operasyon', 'ik'] },
  '/ik/hakedis': { title: 'Hakediş & Ödeme', roles: ['patron', 'muhasebe', 'operasyon', 'ik'] },
  '/odeme-plani': { title: 'Ödeme Planı', roles: ['patron', 'muhasebe', 'ik'] },
  '/ik/ucret-ayarlari': { title: 'Ücret Ayarları', roles: ['patron', 'muhasebe'] },
  '/ik/raporlar': { title: 'İK Raporları', roles: ['patron', 'muhasebe', 'ik'] },
  '/adaylar': { title: 'İşe Alım / Aday Havuzu', roles: ['patron', 'operasyon'] },
  '/musteri-firmalar': { title: 'Müşteri Firmalar', roles: ['patron', 'operasyon'] },
  '/belge-sgk': { title: 'Belge & SGK Takibi', roles: ['patron', 'operasyon'] },
  '/is-ilanlari': { title: 'İş İlanları', roles: ['patron', 'operasyon'] },
  '/odeme': { title: 'Bordro / Ödeme', roles: ['patron', 'muhasebe'] },
  '/faturalar': { title: 'Faturalar & Tahsilat', roles: ['patron', 'muhasebe'] },
  '/hakedis': { title: 'Hakediş & Marj', roles: ['patron', 'muhasebe'] },
  '/gelir-gider': { title: 'Gelir – Gider', roles: ['patron', 'muhasebe'] },
  '/vergi-odemeler': { title: 'Vergi & Resmi Ödemeler', roles: ['patron', 'muhasebe', 'ik', 'operasyon', 'izleyici'] },
  '/personel': { title: 'Personel & Bordro', roles: ['patron', 'muhasebe'] },
  '/raporlar': { title: 'Raporlar', roles: ['patron', 'muhasebe', 'operasyon'] },
  '/evrak': { title: 'Sözleşme & Evrak', roles: ['patron', 'operasyon', 'muhasebe'] },
  '/ayarlar': { title: 'Ayarlar', roles: ['patron'] },
  '/etkinlik': { title: 'Etkinlik Logu', roles: ['patron'] },
  '/kullanicilar': { title: 'Kullanıcılar & Yetkiler', roles: ['patron'] },
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
    label: 'Bölgeler',
    items: [
      { href: '/kocaeli', icon: 'bolge', label: 'Kocaeli', roles: ['patron', 'operasyon', 'muhasebe', 'saha_sorumlusu'] },
      { href: '/balikesir', icon: 'bolge', label: 'Balıkesir', roles: ['patron', 'operasyon', 'muhasebe', 'saha_sorumlusu'] },
    ],
  },
  {
    label: 'Operasyon',
    items: [
      { href: '/takvim', icon: 'puantaj', label: 'Vardiya / Takvim', roles: ['patron', 'operasyon', 'saha_sorumlusu'] },
      { href: '/talepler', icon: 'talep', label: 'Talepler & Atama', roles: ['patron', 'operasyon', 'saha_sorumlusu'] },
      { href: '/isci-havuzu', icon: 'isci', label: 'İşçi Havuzu', roles: ['patron', 'operasyon'] },
      { href: '/aramalar', icon: 'telefon', label: 'Telefon Aramalar', roles: ['patron', 'operasyon', 'muhasebe', 'ik', 'izleyici'] },
      { href: '/servisciler', icon: 'servis', label: 'Servisçiler', roles: ['patron', 'operasyon', 'muhasebe'] },
      { href: '/puantaj', icon: 'clock', label: 'Puantaj', roles: ['patron', 'operasyon', 'saha_sorumlusu'] },
      { href: '/adaylar', icon: 'users', label: 'Aday Havuzu', roles: ['patron', 'operasyon'] },
      { href: '/musteri-firmalar', icon: 'firma', label: 'Müşteri Firmalar', roles: ['patron', 'operasyon'] },
      { href: '/is-ilanlari', icon: 'belge', label: 'İş İlanları', roles: ['patron', 'operasyon'] },
      { href: '/belge-sgk', icon: 'belge', label: 'Belge & SGK', roles: ['patron', 'operasyon'] },
    ],
  },
  {
    label: 'İK & Ödeme',
    items: [
      { href: '/ik/personel', icon: 'isci', label: 'İK Personel', roles: ['patron', 'muhasebe', 'operasyon', 'ik'] },
      { href: '/ik/puantaj', icon: 'clock', label: 'Puantaj Girişi', roles: ['patron', 'muhasebe', 'operasyon', 'ik'] },
      { href: '/ik/hakedis', icon: 'hakedis', label: 'Hakediş & Ödeme', roles: ['patron', 'muhasebe', 'operasyon', 'ik'] },
      { href: '/odeme-plani', icon: 'wallet', label: 'Ödeme Planı', roles: ['patron', 'muhasebe', 'ik'] },
      { href: '/ik/ucret-ayarlari', icon: 'vergi', label: 'Ücret Ayarları', roles: ['patron', 'muhasebe'] },
      { href: '/ik/raporlar', icon: 'gider', label: 'İK Raporları', roles: ['patron', 'muhasebe', 'ik'] },
    ],
  },
  {
    label: 'Finans',
    items: [
      { href: '/odeme', icon: 'wallet', label: 'Bordro / Ödeme', roles: ['patron', 'muhasebe'] },
      { href: '/faturalar', icon: 'fatura', label: 'Faturalar', roles: ['patron', 'muhasebe'] },
      { href: '/hakedis', icon: 'hakedis', label: 'Hakediş & Marj', roles: ['patron', 'muhasebe'] },
      { href: '/gelir-gider', icon: 'gider', label: 'Gelir – Gider', roles: ['patron', 'muhasebe'] },
      { href: '/vergi-odemeler', icon: 'vergi', label: 'Vergi & Ödemeler', roles: ['patron', 'muhasebe', 'ik', 'operasyon', 'izleyici'] },
      { href: '/personel', icon: 'personel', label: 'Personel & Bordro', roles: ['patron', 'muhasebe'] },
    ],
  },
  {
    label: 'Yönetim',
    items: [
      { href: '/raporlar', icon: 'gider', label: 'Raporlar', roles: ['patron', 'muhasebe', 'operasyon'] },
      { href: '/evrak', icon: 'belge', label: 'Sözleşme & Evrak', roles: ['patron', 'operasyon', 'muhasebe'] },
      { href: '/kullanicilar', icon: 'users', label: 'Kullanıcılar & Yetkiler', roles: ['patron'] },
      { href: '/etkinlik', icon: 'clock', label: 'Etkinlik Logu', roles: ['patron'] },
      { href: '/ayarlar', icon: 'vergi', label: 'Ayarlar', roles: ['patron'] },
    ],
  },
]

export function canAccess(path: string, rol: Rol): boolean {
  const route = ROUTES[path]
  if (!route) return true
  return route.roles.includes(rol)
}