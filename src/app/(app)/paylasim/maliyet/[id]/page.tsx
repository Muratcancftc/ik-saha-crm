import Link from 'next/link'
import { notFound } from 'next/navigation'
import { requireRoles } from '@/lib/dal'
import { prisma } from '@/lib/db'
import { paylasimLinkGunOku } from '@/lib/maliyet-ayar'
import { MaliyetForm, type MaliyetTabloDto } from '../maliyet-form'

export const dynamic = 'force-dynamic'

export default async function MaliyetDuzenlePage({ params }: { params: Promise<{ id: string }> }) {
  await requireRoles(['patron', 'operasyon'])
  const { id } = await params
  const tabloId = Number(id)
  if (!tabloId) notFound()

  const [tablo, varsayilanGun] = await Promise.all([
    prisma.maliyetTablosu.findUnique({
      where: { id: tabloId },
      include: { pozisyonlar: { orderBy: { sira: 'asc' } } },
    }),
    paylasimLinkGunOku(),
  ])
  if (!tablo) notFound()

  const dto: MaliyetTabloDto = {
    id: tablo.id,
    ad: tablo.ad,
    tarih: tablo.tarih.toISOString(),
    gecerlilikTarihi: tablo.gecerlilikTarihi?.toISOString() ?? null,
    oranlar: {
      sgkIsci: tablo.sgkIsci.toString(),
      issizlikIsci: tablo.issizlikIsci.toString(),
      sgkIsveren: tablo.sgkIsveren.toString(),
      issizlikIsveren: tablo.issizlikIsveren.toString(),
      gelirVergisi: tablo.gelirVergisi.toString(),
      damgaVergisi: tablo.damgaVergisi.toString(),
    },
    pozisyonlar: tablo.pozisyonlar.map((p) => ({
      ad: p.ad,
      brutUcret: p.brutUcret.toString(),
      gvMatrahIstisnasi: p.gvMatrahIstisnasi.toString(),
      dvIstisnasi: p.dvIstisnasi.toString(),
      kidem: p.kidem.toString(),
      ihbar: p.ihbar.toString(),
      yillikIzin: p.yillikIzin.toString(),
      yemek: p.yemek.toString(),
      yol: p.yol.toString(),
      saglikOsgb: p.saglikOsgb.toString(),
      kiyafet: p.kiyafet.toString(),
      maliMesuliyet: p.maliMesuliyet.toString(),
      karModu: p.karModu,
      karOran: p.karOran.toString(),
      hedefTeklif: p.hedefTeklif?.toString() ?? '0',
    })),
  }

  return (
    <div className="space-y-5">
      <div>
        <Link href="/paylasim/maliyet" className="text-xs text-slate-500 hover:underline">
          ← Maliyet Tabloları
        </Link>
        <h1 className="mt-1 text-lg font-semibold text-slate-900">{tablo.ad ?? `Tablo #${tablo.id}`}</h1>
      </div>
      <MaliyetForm
        tablo={dto}
        guncelOranlar={dto.oranlar}
        varsayilanGun={varsayilanGun}
      />
    </div>
  )
}
