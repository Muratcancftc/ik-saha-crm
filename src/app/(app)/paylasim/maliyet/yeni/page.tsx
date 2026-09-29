import Link from 'next/link'
import { requireRoles } from '@/lib/dal'
import { prisma } from '@/lib/db'
import { maliyetOranlariOku, paylasimLinkGunOku } from '@/lib/maliyet-ayar'
import { MaliyetForm } from '../maliyet-form'

export const dynamic = 'force-dynamic'

export default async function YeniMaliyetPage() {
  await requireRoles(['patron', 'operasyon'])
  const [firmalar, oranlar, varsayilanGun] = await Promise.all([
    prisma.musteriFirma.findMany({ orderBy: { ad: 'asc' } }),
    maliyetOranlariOku(),
    paylasimLinkGunOku(),
  ])

  return (
    <div className="space-y-5">
      <div>
        <Link href="/paylasim/maliyet" className="text-xs text-slate-500 hover:underline">
          ← Maliyet Tabloları
        </Link>
        <h1 className="mt-1 text-lg font-semibold text-slate-900">Yeni Maliyet Tablosu</h1>
      </div>
      {firmalar.length === 0 ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-800">
          Önce bir müşteri firma eklemelisiniz (Müşteri Firmalar).
        </div>
      ) : (
        <MaliyetForm
          firmalar={firmalar.map((f) => ({ id: f.id, ad: f.ad }))}
          guncelOranlar={oranlar}
          varsayilanGun={varsayilanGun}
        />
      )}
    </div>
  )
}
