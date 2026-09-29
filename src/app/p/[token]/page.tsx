import type { Metadata } from 'next'
import { prisma } from '@/lib/db'
import { tokenHash, oturumOku, istekMeta } from '@/lib/paylasim'
import { linkDurumHesapla, type MaliyetSnapshot } from '@/lib/paylasim-tipleri'
import { maliyetHesapla } from '@/lib/maliyet'
import { MaliyetTablo } from '@/components/paylasim/maliyet-tablo'
import { PaylasimCerceve, DurumKarti } from './cerceve'
import { SifreForm } from './sifre-form'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Atalay İnsan Kaynakları — Paylaşım',
  robots: { index: false, follow: false, nocache: true },
}

export default async function PaylasimSayfasi({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>
  searchParams: Promise<{ hata?: string }>
}) {
  const { token } = await params
  const { hata } = await searchParams

  const link = await prisma.paylasimLink.findUnique({
    where: { tokenHash: tokenHash(token) },
    include: { sunumVersiyon: { include: { sunum: true } }, maliyetTablosu: true },
  })

  if (!link) {
    return (
      <PaylasimCerceve>
        <DurumKarti baslik="Bağlantı bulunamadı" mesaj="Bu bağlantı geçersiz veya kaldırılmış olabilir." />
      </PaylasimCerceve>
    )
  }

  const durum = linkDurumHesapla(link.durum, link.gecerlilikBitis)
  if (durum === 'IPTAL') {
    return (
      <PaylasimCerceve>
        <DurumKarti baslik="Bu bağlantı iptal edildi" mesaj="Paylaşım bağlantısı iptal edilmiş. Güncel bilgi için bizimle iletişime geçebilirsiniz." />
      </PaylasimCerceve>
    )
  }
  if (durum === 'SURESI_DOLDU') {
    return (
      <PaylasimCerceve>
        <DurumKarti baslik="Bağlantının süresi doldu" mesaj="Bu bağlantı artık geçerli değil. Yeni bir bağlantı talep etmek için bizimle iletişime geçebilirsiniz." />
      </PaylasimCerceve>
    )
  }

  if (link.sifreHash && !(await oturumOku(link.id))) {
    return (
      <PaylasimCerceve>
        <SifreForm token={token} hata={hata} />
      </PaylasimCerceve>
    )
  }

  // Erişim kaydı + açılma sayacı
  const meta = await istekMeta()
  await prisma.$transaction([
    prisma.paylasimLink.update({
      where: { id: link.id },
      data: { acilmaSayisi: { increment: 1 }, sonAcilma: new Date(), ilkAcilma: link.ilkAcilma ?? new Date() },
    }),
    prisma.paylasimErisim.create({
      data: { linkId: link.id, ip: meta.ip, userAgent: meta.userAgent, basarili: true, tip: 'goruntuleme' },
    }),
  ])

  if (link.tur === 'SUNUM' && link.sunumVersiyon) {
    const v = link.sunumVersiyon
    return (
      <PaylasimCerceve>
        <div className="rounded-2xl border border-[#12104A]/10 bg-white p-5">
          <h1 className="text-lg font-semibold text-[#12104A]">{v.sunum.baslik}</h1>
          {v.sunum.aciklama && <p className="mt-1 text-sm text-[#12104A]/70">{v.sunum.aciklama}</p>}
          <p className="mt-1 text-xs text-[#12104A]/50">Sürüm v{v.versiyonNo}{v.versiyonNotu ? ` — ${v.versiyonNotu}` : ''}</p>

          <div className="mt-4 flex flex-wrap gap-2">
            <a href={`/api/public/paylasim/${token}/dosya?indir=1`} className="inline-flex items-center gap-1.5 rounded-xl bg-[#12104A] px-4 py-2 text-sm font-semibold text-white hover:bg-[#12104A]/90">
              PDF indir
            </a>
            {v.pptxUrl && (
              <a href={`/api/public/paylasim/${token}/dosya?dosya=pptx&indir=1`} className="inline-flex items-center gap-1.5 rounded-xl bg-[#FCEB8E] px-4 py-2 text-sm font-semibold text-[#12104A] hover:bg-[#FCEB8E]/80">
                PPTX indir
              </a>
            )}
          </div>

          <div className="mt-4 overflow-hidden rounded-xl border border-[#12104A]/10">
            <iframe src={`/api/public/paylasim/${token}/dosya`} title="Sunum" className="h-[70vh] w-full" />
          </div>
        </div>
      </PaylasimCerceve>
    )
  }

  if (link.tur === 'MALIYET' && link.snapshot) {
    const snap = link.snapshot as unknown as MaliyetSnapshot
    const pozisyonlar = snap.pozisyonlar.map((p) => ({
      ad: p.ad,
      girdi: p.girdi,
      hesap: maliyetHesapla(p.girdi, snap.oranlar),
    }))
    const karGizli = snap.gorunum === 'KAR_GIZLI'
    return (
      <PaylasimCerceve>
        <div className="rounded-2xl border border-[#12104A]/10 bg-white p-5">
          <h1 className="text-lg font-semibold text-[#12104A]">
            {snap.tabloAd ?? 'Maliyet Tablosu'}
          </h1>
          <p className="mt-1 text-sm text-[#12104A]/70">{snap.firmaAd}</p>
          <p className="mt-1 text-xs text-[#12104A]/50">
            Tarih: {new Date(snap.tarih).toLocaleDateString('tr-TR')}
            {snap.gecerlilikTarihi ? ` · Geçerlilik: ${new Date(snap.gecerlilikTarihi).toLocaleDateString('tr-TR')}` : ''}
          </p>

          <div className="mt-4">
            <a href={`/p/${token}/print`} target="_blank" className="inline-flex items-center gap-1.5 rounded-xl bg-[#12104A] px-4 py-2 text-sm font-semibold text-white hover:bg-[#12104A]/90">
              PDF indir
            </a>
          </div>

          <div className="mt-4">
            <MaliyetTablo oranlar={snap.oranlar} pozisyonlar={pozisyonlar} karGizli={karGizli} tema="musteri" />
          </div>
        </div>
      </PaylasimCerceve>
    )
  }

  return (
    <PaylasimCerceve>
      <DurumKarti baslik="İçerik görüntülenemiyor" mesaj="Paylaşılan içerik bulunamadı. Lütfen bizimle iletişime geçin." />
    </PaylasimCerceve>
  )
}
