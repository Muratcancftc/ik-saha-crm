'use client'

import { useActionState, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { maliyetTablosuKaydet, type PaylasimState } from '@/app/actions/paylasim'
import { maliyetHesapla, type MaliyetGirdi, type MaliyetOranlar } from '@/lib/maliyet'
import { MaliyetTablo } from '@/components/paylasim/maliyet-tablo'
import { Icon } from '@/components/icons'

type Poz = {
  ad: string
  brutUcret: string
  gvMatrahIstisnasi: string
  dvIstisnasi: string
  kidem: string
  ihbar: string
  yillikIzin: string
  yemek: string
  yol: string
  saglikOsgb: string
  kiyafet: string
  maliMesuliyet: string
  karModu: 'YUZDE' | 'HEDEF'
  karOran: string
  hedefTeklif: string
}

const GIRDI_ALANLARI: Array<{ anahtar: keyof Poz; etiket: string }> = [
  { anahtar: 'brutUcret', etiket: 'Brüt ücret' },
  { anahtar: 'gvMatrahIstisnasi', etiket: 'Gelir vergisi matrah istisnası' },
  { anahtar: 'dvIstisnasi', etiket: 'Damga vergisi istisnası' },
  { anahtar: 'kidem', etiket: 'Kıdem tazminatı' },
  { anahtar: 'ihbar', etiket: 'İhbar tazminatı' },
  { anahtar: 'yillikIzin', etiket: 'Yıllık izin ücreti' },
  { anahtar: 'yemek', etiket: 'Yemek' },
  { anahtar: 'yol', etiket: 'Yol' },
  { anahtar: 'saglikOsgb', etiket: 'Sağlık & OSGB' },
  { anahtar: 'kiyafet', etiket: 'Kıyafet & ayakkabı' },
  { anahtar: 'maliMesuliyet', etiket: 'Mali mesuliyet sigortası' },
]

function bosPoz(): Poz {
  return {
    ad: '',
    brutUcret: '',
    gvMatrahIstisnasi: '0',
    dvIstisnasi: '0',
    kidem: '0',
    ihbar: '0',
    yillikIzin: '0',
    yemek: '0',
    yol: '0',
    saglikOsgb: '0',
    kiyafet: '0',
    maliMesuliyet: '0',
    karModu: 'YUZDE',
    karOran: '0',
    hedefTeklif: '0',
  }
}

function girdiye(poz: Poz): MaliyetGirdi {
  return {
    brutUcret: poz.brutUcret,
    gvMatrahIstisnasi: poz.gvMatrahIstisnasi,
    dvIstisnasi: poz.dvIstisnasi,
    kidem: poz.kidem,
    ihbar: poz.ihbar,
    yillikIzin: poz.yillikIzin,
    yemek: poz.yemek,
    yol: poz.yol,
    saglikOsgb: poz.saglikOsgb,
    kiyafet: poz.kiyafet,
    maliMesuliyet: poz.maliMesuliyet,
    karModu: poz.karModu,
    karOran: poz.karOran,
    hedefTeklif: poz.hedefTeklif,
  }
}

export type MaliyetTabloDto = {
  id: number
  ad: string | null
  tarih: string
  gecerlilikTarihi: string | null
  oranlar: MaliyetOranlar
  pozisyonlar: Poz[]
}

export function MaliyetForm({
  tablo,
  guncelOranlar,
  varsayilanGun,
}: {
  tablo?: MaliyetTabloDto
  guncelOranlar: MaliyetOranlar
  varsayilanGun: number
}) {
  const router = useRouter()
  const [state, formAction, pending] = useActionState<PaylasimState, FormData>(maliyetTablosuKaydet, undefined)
  const [ad, setAd] = useState(tablo?.ad ?? '')
  const [tarih, setTarih] = useState(tablo?.tarih?.slice(0, 10) ?? new Date().toISOString().slice(0, 10))
  const [gecerlilik, setGecerlilik] = useState(tablo?.gecerlilikTarihi?.slice(0, 10) ?? '')
  const [pozisyonlar, setPozisyonlar] = useState<Poz[]>(tablo?.pozisyonlar?.length ? tablo.pozisyonlar : [bosPoz()])

  // Düzenlemede tablonun kendi oran snapshot'ı, yeni kayıtta güncel oranlar kullanılır.
  const oranlar = tablo?.oranlar ?? guncelOranlar

  useEffect(() => {
    if (state?.ok) router.push('/paylasim/maliyet')
  }, [state, router])

  function guncelle(i: number, anahtar: keyof Poz, deger: string) {
    setPozisyonlar((prev) => prev.map((p, idx) => (idx === i ? { ...p, [anahtar]: deger } : p)))
  }

  const gorunum = useMemo(
    () =>
      pozisyonlar.map((p) => ({
        ad: p.ad || 'Pozisyon',
        girdi: girdiye(p),
        hesap: maliyetHesapla(girdiye(p), oranlar),
      })),
    [pozisyonlar, oranlar]
  )

  return (
    <form action={formAction} className="space-y-5">
      {tablo && <input type="hidden" name="id" value={tablo.id} />}
      <input type="hidden" name="pozisyonlar" value={JSON.stringify(pozisyonlar)} />

      <div className="rounded-2xl border border-slate-200 bg-white p-5">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-slate-600">Tablo adı</label>
            <input name="ad" value={ad} onChange={(e) => setAd(e.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" placeholder="ör. 2026 Yevmiyeci Maliyet Tablosu" />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-slate-600">Tarih</label>
            <input name="tarih" type="date" value={tarih} onChange={(e) => setTarih(e.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-slate-600">Geçerlilik tarihi</label>
            <input name="gecerlilikTarihi" type="date" value={gecerlilik} onChange={(e) => setGecerlilik(e.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
            <p className="mt-1 text-[11px] text-slate-400">Boş bırakılırsa {varsayilanGun} gün varsayılır.</p>
          </div>
        </div>
      </div>

      {pozisyonlar.map((poz, i) => (
        <div key={i} className="rounded-2xl border border-slate-200 bg-white">
          <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-5 py-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Pozisyon {i + 1}</span>
              <input value={poz.ad} onChange={(e) => guncelle(i, 'ad', e.target.value)} placeholder="ör. Depo Personeli Günlük" className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium" />
            </div>
            {pozisyonlar.length > 1 && (
              <button type="button" onClick={() => setPozisyonlar((prev) => prev.filter((_, idx) => idx !== i))} className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600" title="Pozisyonu sil">
                <Icon name="trash" size={15} />
              </button>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3 px-5 py-4 sm:grid-cols-3 lg:grid-cols-4">
            {GIRDI_ALANLARI.map((a) => (
              <div key={a.anahtar}>
                <label className="mb-1 block text-[11px] font-medium text-slate-500">{a.etiket}</label>
                <input
                  value={String(poz[a.anahtar])}
                  onChange={(e) => guncelle(i, a.anahtar, e.target.value)}
                  inputMode="decimal"
                  className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-sm"
                />
              </div>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-4 border-t border-slate-100 px-5 py-3">
            <div className="flex items-center gap-3">
              <span className="text-[11px] font-medium text-slate-500">Kâr payı modu</span>
              <label className="flex items-center gap-1 text-sm text-slate-700">
                <input type="radio" checked={poz.karModu === 'YUZDE'} onChange={() => guncelle(i, 'karModu', 'YUZDE')} /> Yüzde
              </label>
              <label className="flex items-center gap-1 text-sm text-slate-700">
                <input type="radio" checked={poz.karModu === 'HEDEF'} onChange={() => guncelle(i, 'karModu', 'HEDEF')} /> Hedef teklif
              </label>
            </div>
            {poz.karModu === 'YUZDE' ? (
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-medium text-slate-500">Kâr oranı (ör. 0.0822 = %8,22)</span>
                <input value={poz.karOran} onChange={(e) => guncelle(i, 'karOran', e.target.value)} inputMode="decimal" className="w-24 rounded-lg border border-slate-300 px-3 py-1.5 text-sm" />
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-medium text-slate-500">Hedef teklif bedeli</span>
                <input value={poz.hedefTeklif} onChange={(e) => guncelle(i, 'hedefTeklif', e.target.value)} inputMode="decimal" className="w-28 rounded-lg border border-slate-300 px-3 py-1.5 text-sm" />
              </div>
            )}
          </div>

          <div className="px-5 pb-5">
            <MaliyetTablo oranlar={oranlar} pozisyonlar={[gorunum[i]]} karGizli={false} />
          </div>
        </div>
      ))}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <button type="button" onClick={() => setPozisyonlar((prev) => [...prev, bosPoz()])} className="inline-flex items-center gap-1.5 rounded-lg bg-white px-3 py-2 text-sm font-medium text-indigo-700 ring-1 ring-indigo-200 hover:bg-indigo-50">
          <Icon name="plus" size={15} /> Pozisyon ekle
        </button>
        <div className="flex items-center gap-2">
          {state?.error && <span className="text-sm text-red-600">{state.error}</span>}
          <button type="button" onClick={() => router.push('/paylasim/maliyet')} className="rounded-lg bg-slate-100 px-3 py-2 text-sm text-slate-700 hover:bg-slate-200">Vazgeç</button>
          <button type="submit" disabled={pending} className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-60">
            {pending ? 'Kaydediliyor…' : 'Kaydet'}
          </button>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-5">
        <div className="mb-3 text-sm font-semibold text-slate-900">Tüm pozisyonlar — Önizleme</div>
        <MaliyetTablo oranlar={oranlar} pozisyonlar={gorunum} karGizli={false} />
      </div>
    </form>
  )
}
