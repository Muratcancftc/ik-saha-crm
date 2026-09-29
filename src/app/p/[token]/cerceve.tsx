import Image from 'next/image'
import type { ReactNode } from 'react'

export const ILETISIM = {
  ad: 'Sena Vaykul',
  unvan: 'Operasyon Sorumlusu',
  telefon: '0531 355 0917',
  email: 'info@atalayinsankaynaklari.com',
  adres: 'Mevlana Mah. Soma Maden Şehitleri Bulvarı 45/5, Gebze / Kocaeli',
}

// Müşteriye açılan tüm paylaşım sayfalarının kurumsal iskeleti.
export function PaylasimCerceve({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-[#F3F3EF] text-[#12104A]">
      <header className="bg-[#12104A]">
        <div className="mx-auto flex max-w-4xl items-center gap-3 px-4 py-4">
          <div className="h-10 w-10 shrink-0 overflow-hidden rounded-lg bg-white/10 ring-1 ring-white/15">
            <Image src="/atalay-logo.png" alt="Atalay İnsan Kaynakları" width={40} height={40} className="h-full w-full object-contain" />
          </div>
          <div className="min-w-0">
            <div className="text-sm font-semibold text-white">ATALAY İnsan Kaynakları</div>
            <div className="text-[11px] text-white/60">Teklif & Paylaşım</div>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-6">{children}</main>

      <footer className="mt-8 border-t border-[#12104A]/10 bg-white/60">
        <div className="mx-auto max-w-4xl px-4 py-6 text-xs leading-relaxed text-[#12104A]/70">
          <div className="font-semibold text-[#12104A]">
            {ILETISIM.ad} — {ILETISIM.unvan}
          </div>
          <div className="mt-0.5">
            {ILETISIM.telefon} · <a href={`mailto:${ILETISIM.email}`} className="underline">{ILETISIM.email}</a>
          </div>
          <div className="mt-0.5">{ILETISIM.adres}</div>
        </div>
      </footer>
    </div>
  )
}

export function DurumKarti({ baslik, mesaj }: { baslik: string; mesaj: string }) {
  return (
    <div className="rounded-2xl border border-[#12104A]/10 bg-white p-8 text-center">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#FCEB8E] text-2xl text-[#12104A]">!</div>
      <h1 className="mt-4 text-lg font-semibold text-[#12104A]">{baslik}</h1>
      <p className="mx-auto mt-2 max-w-md text-sm text-[#12104A]/70">{mesaj}</p>
      <div className="mx-auto mt-6 max-w-md rounded-xl bg-[#F3F3EF] p-4 text-xs text-[#12104A]/80">
        Sorularınız için: <strong>{ILETISIM.ad}</strong> · {ILETISIM.telefon} ·{' '}
        <a href={`mailto:${ILETISIM.email}`} className="underline">{ILETISIM.email}</a>
      </div>
    </div>
  )
}
