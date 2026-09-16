import Link from 'next/link'
import { notFound } from 'next/navigation'
import { requireUser } from '@/lib/dal'
import { prisma } from '@/lib/db'
import { lokasyonFilter, atamaLokasyonFilter } from '@/lib/queries'
import { bolgeEtiket } from '@/lib/bolge'
import { tl, num, dateLong } from '@/lib/format'
import { startOfDay, addDays } from '@/lib/dates'
import { StatCard, Card } from '@/components/ui'
import { Icon } from '@/components/icons'
import type { Bolge } from '@prisma/client'

export const dynamic = 'force-dynamic'

const BOLGELER: Bolge[] = ['kocaeli', 'balikesir']

const MODUL_LINKS: Array<{ href: (b: Bolge) => string; icon: 'firma' | 'isci' | 'personel' | 'talep' | 'puantaj' | 'clock' | 'belge' | 'servis'; label: string; desc: string; roles: Array<'patron' | 'operasyon' | 'muhasebe' | 'saha_sorumlusu' | 'ik' | 'izleyici'> }> = [
  { href: (b) => `/musteri-firmalar?bolge=${b}`, icon: 'firma', label: 'Müşteri Firmalar', desc: 'Firma ekle, lokasyon ve fiyat anlaşmaları', roles: ['patron', 'operasyon'] },
  { href: (b) => `/isci-havuzu?bolge=${b}`, icon: 'isci', label: 'İşçi Havuzu', desc: 'İşçi ekle, bölgeye göre havuzu gör', roles: ['patron', 'operasyon'] },
  { href: (b) => `/personel?bolge=${b}`, icon: 'personel', label: 'Personel', desc: 'Bölge personeli ve bordro', roles: ['patron', 'muhasebe'] },
  { href: (b) => `/servisciler?bolge=${b}`, icon: 'servis', label: 'Servisçiler', desc: 'Servis şoförleri, servis sayısı ve KDV\'siz ödemeler', roles: ['patron', 'operasyon', 'muhasebe'] },
  { href: (b) => `/talepler?bolge=${b}`, icon: 'talep', label: 'Talepler & Atama', desc: 'Bölge talepleri ve işçi atama', roles: ['patron', 'operasyon', 'saha_sorumlusu'] },
  { href: (b) => `/puantaj?bolge=${b}`, icon: 'clock', label: 'Puantaj', desc: 'Bölge puantajı ve manuel puantaj', roles: ['patron', 'operasyon', 'saha_sorumlusu'] },
  { href: (b) => `/takvim?bolge=${b}`, icon: 'puantaj', label: 'Vardiya / Takvim', desc: 'Haftalık vardiya planlaması', roles: ['patron', 'operasyon', 'saha_sorumlusu'] },
  { href: (b) => `/belge-sgk?bolge=${b}`, icon: 'belge', label: 'Belge & SGK', desc: 'Bölge işçilerinin belge ve SGK takibi', roles: ['patron', 'operasyon'] },
]

export default async function BolgePage({ params }: { params: Promise<{ bolge: string }> }) {
  const { bolge: slug } = await params
  if (!BOLGELER.includes(slug as Bolge)) notFound()
  const bolge = slug as Bolge
  const user = await requireUser()

  const bugun = startOfDay()
  const yarin = addDays(bugun, 1)

  const [firmaSayisi, aktifIsci, personelSayisi, bugunAtama, acikTalep, personel] = await Promise.all([
    prisma.musteriFirma.count({ where: { bolge } }),
    prisma.isci.count({ where: { bolge, durum: 'aktif' } }),
    prisma.personel.count({ where: { bolge, durum: 'aktif' } }),
    prisma.atama.count({
      where: {
        tarih: { gte: bugun, lt: yarin },
        durum: { not: 'iptal' },
        talep: { firma: { bolge } },
        ...atamaLokasyonFilter(user),
      },
    }),
    prisma.talep.count({
      where: {
        durum: { in: ['acik', 'kismi'] },
        tarih: { gte: bugun },
        firma: { bolge },
        ...lokasyonFilter(user),
      },
    }),
    prisma.personel.findMany({
      where: { bolge, durum: 'aktif' },
      select: { ad: true, rol: true, departman: true, maas: true },
      orderBy: { ad: 'asc' },
    }),
  ])

  const maasToplam = personel.reduce((a, p) => a + Number(p.maas), 0)

  return (
    <div className="space-y-5">
      {/* Bölge başlığı */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 text-white">
              <Icon name="bolge" size={20} />
            </div>
            <div>
              <h2 className="text-xl font-semibold tracking-tight text-slate-900">{bolgeEtiket(bolge)} Bölgesi</h2>
              <p className="mt-0.5 text-sm text-slate-500">{dateLong(new Date())} · bölge operasyon özeti</p>
            </div>
          </div>
        </div>
        <Link
          href={`/musteri-firmalar?bolge=${bolge}`}
          className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3.5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-500"
        >
          <Icon name="plus" size={16} />
          Yeni Firma
        </Link>
      </div>

      {/* KPI */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-5">
        <StatCard icon="firma" label="Müşteri Firma" value={num(firmaSayisi)} sub={`${bolgeEtiket(bolge)} bölgesi`} tone="indigo" />
        <StatCard icon="isci" label="Aktif İşçi" value={num(aktifIsci)} sub="havuzda" tone="violet" />
        <StatCard icon="personel" label="Personel" value={num(personelSayisi)} sub={`maaş: ${tl(maasToplam)}`} tone="blue" />
        <StatCard icon="clock" label="Bugünkü Atama" value={num(bugunAtama)} sub="sahada" tone="green" />
        <StatCard icon="talep" label="Açık Talep" value={num(acikTalep)} sub="dolmayı bekliyor" tone="amber" />
      </div>

      {/* Bölge menüleri */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {MODUL_LINKS.filter((m) => m.roles.includes(user.rol)).map((m) => (
          <Link
            key={m.label}
            href={m.href(bolge)}
            className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition hover:border-indigo-300 hover:shadow-md"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 transition group-hover:bg-indigo-600 group-hover:text-white">
                <Icon name={m.icon} size={19} />
              </div>
              <Icon name="chevron" size={16} className="-rotate-90 text-slate-300 transition group-hover:text-indigo-500" />
            </div>
            <div className="mt-3 text-sm font-semibold text-slate-900">{m.label}</div>
            <div className="mt-0.5 text-xs text-slate-500">{m.desc}</div>
          </Link>
        ))}
      </div>

      {/* Bölge personeli */}
      <Card>
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <div>
            <h3 className="text-sm font-semibold text-slate-900">{bolgeEtiket(bolge)} Personeli</h3>
            <p className="mt-0.5 text-xs text-slate-500">Aktif personel · toplam maaş {tl(maasToplam)}/ay</p>
          </div>
          <Link href={`/personel?bolge=${bolge}`} className="text-xs font-medium text-indigo-600 hover:underline">
            Personel sayfası
          </Link>
        </div>
        {personel.length === 0 ? (
          <p className="px-5 py-8 text-center text-xs text-slate-400">Bu bölgede aktif personel yok</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {personel.map((p) => (
              <li key={p.ad} className="flex items-center justify-between gap-3 px-5 py-3">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-violet-50 text-xs font-semibold text-violet-600">
                    {p.ad.split(' ').map((x) => x[0]).slice(0, 2).join('')}
                  </div>
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium text-slate-900">{p.ad}</div>
                    <div className="truncate text-xs text-slate-500">{p.departman} · {p.rol}</div>
                  </div>
                </div>
                <span className="shrink-0 text-sm font-semibold tabular-nums text-slate-900">{tl(Number(p.maas))}</span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  )
}