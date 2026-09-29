import Link from 'next/link'
import { requireRoles } from '@/lib/dal'
import { maliyetOranlariOku, paylasimLinkGunOku } from '@/lib/maliyet-ayar'
import { MaliyetForm } from '../maliyet-form'

export const dynamic = 'force-dynamic'

export default async function YeniMaliyetPage() {
  await requireRoles(['patron', 'operasyon'])
  const [oranlar, varsayilanGun] = await Promise.all([maliyetOranlariOku(), paylasimLinkGunOku()])

  return (
    <div className="space-y-5">
      <div>
        <Link href="/paylasim/maliyet" className="text-xs text-slate-500 hover:underline">
          ← Maliyet Tabloları
        </Link>
        <h1 className="mt-1 text-lg font-semibold text-slate-900">Yeni Maliyet Tablosu</h1>
        <p className="text-sm text-slate-500">Kalem satırları hazır; sadece değerleri girin. Hesaplananlar otomatik çıkar.</p>
      </div>
      <MaliyetForm guncelOranlar={oranlar} varsayilanGun={varsayilanGun} />
    </div>
  )
}
