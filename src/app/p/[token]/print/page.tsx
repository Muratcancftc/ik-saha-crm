import Image from 'next/image'
import { notFound, redirect } from 'next/navigation'
import { prisma } from '@/lib/db'
import { tokenHash, oturumOku } from '@/lib/paylasim'
import { linkDurumHesapla, type MaliyetSnapshot } from '@/lib/paylasim-tipleri'
import { maliyetHesapla } from '@/lib/maliyet'
import { MaliyetTablo } from '@/components/paylasim/maliyet-tablo'
import { ILETISIM } from '../cerceve'
import { PrintButton } from './print-button'

export const dynamic = 'force-dynamic'

export default async function PaylasimPrintPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const link = await prisma.paylasimLink.findUnique({
    where: { tokenHash: tokenHash(token) },
    include: { sunumVersiyon: true },
  })
  if (!link) notFound()
  if (link.tur !== 'MALIYET') redirect(`/p/${token}`)
  if (linkDurumHesapla(link.durum, link.gecerlilikBitis) !== 'AKTIF') redirect(`/p/${token}`)
  if (link.sifreHash && !(await oturumOku(link.id))) redirect(`/p/${token}`)
  if (!link.snapshot) notFound()

  const snap = link.snapshot as unknown as MaliyetSnapshot
  const pozisyonlar = snap.pozisyonlar.map((p) => ({
    ad: p.ad,
    girdi: p.girdi,
    hesap: maliyetHesapla(p.girdi, snap.oranlar),
  }))
  const karGizli = snap.gorunum === 'KAR_GIZLI'

  return (
    <div className="min-h-screen bg-white text-[#12104A]">
      {/* A4 dikey, satır ortadan bölünmez */}
      <style>{`
        @page { size: A4 portrait; margin: 12mm; }
        @media print {
          .no-print { display: none !important; }
          table { page-break-inside: auto; }
          tr { break-inside: avoid; page-break-inside: avoid; }
        }
      `}</style>

      <div className="mx-auto max-w-4xl p-6 print:p-0">
        <div className="mb-4 flex items-center justify-between border-b-2 border-[#12104A] pb-3">
          <div className="flex items-center gap-3">
            <div className="h-11 w-11 overflow-hidden rounded-xl bg-[#12104A]">
              <Image src="/atalay-logo.png" alt="Atalay" width={44} height={44} className="h-full w-full object-contain" />
            </div>
            <div>
              <div className="text-base font-bold text-[#12104A]">ATALAY İnsan Kaynakları</div>
              <div className="text-xs text-[#12104A]/60">{snap.tabloAd ?? 'Maliyet Tablosu'}</div>
            </div>
          </div>
          <div className="no-print">
            <PrintButton />
          </div>
        </div>

        <div className="mb-3 flex flex-wrap justify-between gap-2 text-sm">
          <div>
            <span className="text-[#12104A]/60">Firma: </span>
            <span className="font-semibold">{snap.firmaAd}</span>
          </div>
          <div className="text-xs text-[#12104A]/60">
            Tarih: {new Date(snap.tarih).toLocaleDateString('tr-TR')}
            {snap.gecerlilikTarihi ? ` · Geçerlilik: ${new Date(snap.gecerlilikTarihi).toLocaleDateString('tr-TR')}` : ''}
          </div>
        </div>

        <MaliyetTablo oranlar={snap.oranlar} pozisyonlar={pozisyonlar} karGizli={karGizli} tema="musteri" />

        <div className="mt-6 border-t border-[#12104A]/10 pt-3 text-[11px] leading-relaxed text-[#12104A]/60">
          {ILETISIM.ad} — {ILETISIM.unvan} · {ILETISIM.telefon} · {ILETISIM.email}
          <br />
          {ILETISIM.adres}
        </div>
      </div>
    </div>
  )
}
