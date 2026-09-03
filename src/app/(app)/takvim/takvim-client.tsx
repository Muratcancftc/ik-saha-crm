'use client'

import { useState, useEffect, useActionState } from 'react'
import { useRouter } from 'next/navigation'
import { musaitIsciler } from '@/app/actions/takvim'
import { createAtama } from '@/app/actions/talep'
import { Icon } from '@/components/icons'
import { AtamaPaneli } from '../talepler/atama-paneli'
import { TalepDetayModal } from './talep-detay-modal'
import { addDaysIso } from './takvim-utils'

type KalemSeri = { meslekId: number; meslekAd: string; adet: number; atanan: number }
type TalepSeri = { id: number; lokasyonId: number; tarih: string; vardiya: string; durum: string; aciliyet: string; kalemler: KalemSeri[] }
type AyGun = { iso: string; gun: number; ihtiyac: number; atanan: number; acil: boolean; talepSayisi: number }
type Seri = {
  bas: string
  gunler: Array<{ iso: string; etiket: string }>
  satirlar: Array<{ lokasyonId: number; ad: string; firma: string }>
  talepler: TalepSeri[]
  ayGunler: AyGun[]
  ayEtiket: string
  ayIlkGun: number
  ayBas: number
  seciliGunBaslangic: number
}

type FreeWorker = { id: number; ad: string; ilce: string; puan: number; beklenti: number; meslekler: string[]; belgeYaklasan: boolean }

const HAFTANIN_GUNLERI = ['Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi', 'Pazar']
const HAFTANIN_KISA = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz']
const AY_ADLARI = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık']

export function Takvim(props: Seri) {
  const router = useRouter()
  const bugunIso = new Date().toISOString().slice(0, 10)
  const [gorunum, setGorunum] = useState<'hafta' | 'ay'>('hafta')

  const [seciliGun, setSeciliGun] = useState(() => {
    if (props.seciliGunBaslangic >= 0 && props.seciliGunBaslangic < 7) return props.seciliGunBaslangic
    const idx = props.gunler.findIndex((g) => g.iso === bugunIso)
    return idx >= 0 ? idx : 0
  })
  const [secili, setSecili] = useState<{ talepId: number; meslekId: number; meslekAd: string } | null>(null)
  const [free, setFree] = useState<FreeWorker[] | null>(null)
  const [mesaj, setMesaj] = useState<string | null>(null)
  const [detayTalep, setDetayTalep] = useState<number | null>(null)

  useEffect(() => {
    const gun = props.gunler[seciliGun]
    if (!gun) return
    setFree(null)
    musaitIsciler(gun.iso, secili?.meslekId).then(setFree)
  }, [seciliGun, secili?.meslekId, props.bas, props.gunler])

  function git(offset: number) {
    const yeni = addDaysIso(props.bas, offset)
    router.push(`/takvim?bas=${yeni}`)
  }

  function ayGecir(offset: number) {
    const yil = Math.floor(props.ayBas / 100)
    const ay = props.ayBas % 100
    const hedefAy = new Date(yil, ay + offset, 1)
    const ilk = new Date(hedefAy.getFullYear(), hedefAy.getMonth(), 1)
    const gun = (ilk.getDay() + 6) % 7 // pazartesi=0
    const pazartesi = addDaysIso(ilk.toISOString().slice(0, 10), -gun)
    router.push(`/takvim?bas=${pazartesi}`)
  }

  function gunSec(iso: string) {
    const idx = props.gunler.findIndex((g) => g.iso === iso)
    if (idx < 0) {
      // ay görünümünden farklı hafta → o haftaya git ve günü seç
      const d = new Date(iso + 'T00:00:00')
      const gun = (d.getDay() + 6) % 7
      const pazartesi = addDaysIso(iso, -gun)
      router.push(`/takvim?bas=${pazartesi}&gun=${gun}`)
      return
    }
    setSeciliGun(idx)
    setGorunum('hafta')
  }

  const haftaIhtiyac = props.talepler.reduce((a, t) => a + t.kalemler.reduce((x, k) => x + k.adet, 0), 0)
  const haftaAtanan = props.talepler.reduce((a, t) => a + t.kalemler.reduce((x, k) => x + k.atanan, 0), 0)

  const seciliGunIso = props.gunler[seciliGun]?.iso
  const gunNesnesi = new Date((seciliGunIso ?? '') + 'T00:00:00')

  // her günün haftalık toplamı (week footer)
  const gunToplamlari = props.gunler.map((g) => {
    const ihtiyac = props.talepler.filter((t) => t.tarih === g.iso).reduce((a, t) => a + t.kalemler.reduce((x, k) => x + k.adet, 0), 0)
    const atanan = props.talepler.filter((t) => t.tarih === g.iso).reduce((a, t) => a + t.kalemler.reduce((x, k) => x + k.atanan, 0), 0)
    return { ihtiyac, atanan }
  })
  // her satırın toplamı
  const satirToplam = (lokasyonId: number) => {
    const ihtiyac = props.talepler.filter((t) => t.lokasyonId === lokasyonId).reduce((a, t) => a + t.kalemler.reduce((x, k) => x + k.adet, 0), 0)
    const atanan = props.talepler.filter((t) => t.lokasyonId === lokasyonId).reduce((a, t) => a + t.kalemler.reduce((x, k) => x + k.atanan, 0), 0)
    return { ihtiyac, atanan }
  }

  return (
    <div className="space-y-4">
      {/* Üst bar */}
      <div className="rounded-2xl border border-indigo-100 bg-gradient-to-r from-indigo-50 to-white px-5 py-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Haftalık Planlama</h2>
            <p className="text-xs text-slate-500">Firmaların saha talepleri ve işçi atamaları.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
              <button onClick={() => setGorunum('hafta')} className={`px-3 py-2 text-xs font-semibold transition ${gorunum === 'hafta' ? 'bg-indigo-600 text-white' : 'text-slate-600 hover:bg-slate-50'}`}>
                Hafta
              </button>
              <button onClick={() => setGorunum('ay')} className={`px-3 py-2 text-xs font-semibold transition ${gorunum === 'ay' ? 'bg-indigo-600 text-white' : 'text-slate-600 hover:bg-slate-50'}`}>
                Ay
              </button>
            </div>
            <div className="rounded-xl bg-white px-3 py-2 text-sm shadow-sm ring-1 ring-slate-200">
              <span className="text-slate-400">Haftalık: </span>
              <b className="tabular-nums text-slate-900">{haftaAtanan}/{haftaIhtiyac}</b>
            </div>
            <div className="flex overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
              <button onClick={() => git(-7)} className="px-3 py-2 text-slate-600 transition hover:bg-slate-50" title="Önceki hafta">
                <Icon name="chevron" size={16} className="rotate-90" />
              </button>
              <button onClick={() => git(7)} className="border-l border-slate-200 px-3 py-2 text-slate-600 transition hover:bg-slate-50" title="Sonraki hafta">
                <Icon name="chevron" size={16} className="-rotate-90" />
              </button>
            </div>
            <a href="/takvim" className="rounded-xl bg-indigo-600 px-3 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-indigo-500">
              Bugüne dön
            </a>
          </div>
        </div>
      </div>

      {/* Nasıl kullanılır + veri kaynağı */}
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-xs text-slate-600">
          <span className="font-semibold text-slate-800">Nasıl kullanılır:</span>
          <div className="mt-1.5 space-y-1">
            <div className="flex items-center gap-2"><b className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-[9px] text-indigo-700">1</b> Bir hücreye (örn. <b>paketleme 3/5</b>) tıkla → detay açılır</div>
            <div className="flex items-center gap-2"><b className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-[9px] text-indigo-700">2</b> Önerilen uygun işçiden <b>Ata</b>&apos;ya bas</div>
            <div className="flex items-center gap-2"><b className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-[9px] text-indigo-700">3</b> Sağdaki listeden boştaki işçiyi de ata</div>
          </div>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-xs text-slate-600">
          <span className="font-semibold text-slate-800">Veri nereden geliyor?</span>
          <div className="mt-1.5 space-y-1">
            <div className="flex items-center gap-2"><span className="h-2 w-2 rounded bg-indigo-400" /> Satırlar = <b>Lokasyonlar</b> (müşteri firma sahaları)</div>
            <div className="flex items-center gap-2"><span className="h-2 w-2 rounded bg-emerald-400" /> Hücredeki <b>x/y</b> = ihtiyaç vs atanan işçi (Talep kalemleri ↔ Atamalar)</div>
            <div className="flex items-center gap-2"><span className="h-2 w-2 rounded bg-amber-400" /> Renkler = doluluk; sayılar DB&apos;deki <b>Talepler &amp; Atamalar</b> kayıtlarından hesaplanır</div>
          </div>
        </div>
      </div>

      {/* Lejant */}
      <div className="flex flex-wrap gap-4 text-[11px] text-slate-500">
        <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded bg-emerald-400" /> Dolu</span>
        <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded bg-amber-400" /> Kısmi (eksik)</span>
        <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded bg-red-400" /> Boş</span>
        <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded bg-rose-500" /> ACİL</span>
        <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded ring-1 ring-indigo-500" /> Bugün</span>
      </div>

      {gorunum === 'hafta' ? (
        <HaftaGorunumu {...props} seciliGun={seciliGun} setSeciliGun={setSeciliGun} secili={secili} setSecili={setSecili}
          free={free} setFree={setFree} mesaj={mesaj} setMesaj={setMesaj} detayTalep={detayTalep} setDetayTalep={setDetayTalep}
          gunToplamlari={gunToplamlari} satirToplam={satirToplam} bugunIso={bugunIso} gunNesnesi={gunNesnesi} />
      ) : (
        <AyGorunumu props={props} bugunIso={bugunIso} gunSec={gunSec} ayGecir={ayGecir} />
      )}
    </div>
  )
}

// ================= HAFTA GÖRÜNÜMÜ =================
function HaftaGorunumu({
  bas, gunler, satirlar, talepler, seciliGun, setSeciliGun, secili, setSecili,
  free, setFree, mesaj, setMesaj, detayTalep, setDetayTalep,
  gunToplamlari, satirToplam, bugunIso, gunNesnesi,
}: {
  bas: string
  gunler: Array<{ iso: string; etiket: string }>
  satirlar: Array<{ lokasyonId: number; ad: string; firma: string }>
  talepler: TalepSeri[]
  seciliGun: number
  setSeciliGun: (i: number) => void
  secili: { talepId: number; meslekId: number; meslekAd: string } | null
  setSecili: (s: { talepId: number; meslekId: number; meslekAd: string } | null) => void
  free: FreeWorker[] | null
  setFree: (f: FreeWorker[] | null) => void
  mesaj: string | null
  setMesaj: (m: string | null) => void
  detayTalep: number | null
  setDetayTalep: (n: number | null) => void
  gunToplamlari: Array<{ ihtiyac: number; atanan: number }>
  satirToplam: (lokasyonId: number) => { ihtiyac: number; atanan: number }
  bugunIso: string
  gunNesnesi: Date
}) {
  const router = useRouter()
  const seciliGunIso = gunler[seciliGun]?.iso
  const seciliTalep = secili ? talepler.find((t) => t.id === secili.talepId) : null
  useEffect(() => {
    const gun = gunler[seciliGun]
    if (!gun) return
    setFree(null)
    musaitIsciler(gun.iso, secili?.meslekId).then(setFree)
  }, [seciliGun, secili?.meslekId, bas, gunler, setFree])

  return (
    <div className="flex flex-col gap-4 xl:flex-row">
      <div className="min-w-0 flex-1 overflow-x-auto">
        <div className="min-w-[920px] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          {/* Gün başlıkları */}
          <div className="grid grid-cols-[230px_repeat(7,1fr)] border-b border-slate-200">
            <div className="bg-slate-50 px-4 py-3 text-[11px] font-semibold uppercase tracking-wide text-slate-400">Sahalar</div>
            {gunler.map((g, i) => {
              const bugunMu = g.iso === bugunIso
              const haftaSonu = i >= 5
              const tarih = new Date(g.iso + 'T00:00:00')
              return (
                <button key={g.iso} onClick={() => setSeciliGun(i)}
                  className={`relative px-2 py-2.5 text-center transition ${bugunMu ? 'bg-indigo-50' : haftaSonu ? 'bg-slate-50/60' : 'hover:bg-slate-50'} ${seciliGun === i ? 'ring-2 ring-inset ring-indigo-500' : ''}`}>
                  <div className={`text-[10px] font-bold uppercase tracking-wide ${bugunMu ? 'text-indigo-600' : haftaSonu ? 'text-slate-400' : 'text-slate-500'}`}>{HAFTANIN_GUNLERI[i]}</div>
                  <div className={`mt-0.5 text-sm font-semibold ${bugunMu ? 'text-indigo-700' : 'text-slate-700'}`}>{tarih.getDate()} {AY_ADLARI[tarih.getMonth()]}</div>
                  <div className={`mt-0.5 text-[10px] tabular-nums ${gunToplamlari[i].ihtiyac > gunToplamlari[i].atanan ? 'text-amber-600' : 'text-emerald-600'}`}>
                    {gunToplamlari[i].atanan}/{gunToplamlari[i].ihtiyac}
                  </div>
                  {bugunMu && <span className="absolute right-1 top-1 rounded-full bg-indigo-600 px-1.5 text-[9px] font-bold text-white">BUGÜN</span>}
                </button>
              )
            })}
          </div>

          {satirlar.length === 0 && (
            <div className="px-4 py-16 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-400"><Icon name="talep" size={22} /></div>
              <p className="mt-3 text-sm font-medium text-slate-700">Bu hafta talep yok</p>
              <p className="mt-1 text-xs text-slate-400">Haftayı değiştir veya yeni talep oluştur.</p>
              <a href="/talepler" className="mt-3 inline-block rounded-lg bg-indigo-600 px-3.5 py-2 text-sm font-medium text-white transition hover:bg-indigo-500">+ Yeni Talep</a>
            </div>
          )}

          {satirlar.map((satir) => {
            const toplam = satirToplam(satir.lokasyonId)
            return (
              <div key={satir.lokasyonId} className="grid grid-cols-[230px_repeat(7,1fr)] border-b border-slate-100 last:border-0">
                <div className="flex flex-col justify-center bg-slate-50/60 px-4 py-3">
                  <div className="truncate text-sm font-semibold text-slate-800">{satir.ad}</div>
                  <div className="truncate text-xs text-slate-400">{satir.firma}</div>
                  <div className="mt-1 inline-flex w-fit rounded-lg bg-white px-1.5 py-0.5 text-[10px] font-semibold tabular-nums text-slate-600 ring-1 ring-slate-200">
                    {toplam.atanan}/{toplam.ihtiyac}
                  </div>
                </div>
                {gunler.map((g) => {
                  const bugunMu = g.iso === bugunIso
                  const haftaSonu = gunler.findIndex((x) => x.iso === g.iso) >= 5
                  const gTalepler = talepler.filter((t) => t.lokasyonId === satir.lokasyonId && t.tarih === g.iso)
                  return (
                    <div key={g.iso} className={`border-l border-slate-100 p-1.5 ${bugunMu ? 'bg-indigo-50/30' : haftaSonu ? 'bg-slate-50/40' : ''}`}>
                      {gTalepler.length === 0 ? (
                        <div className="flex h-full min-h-14 flex-col items-center justify-center rounded-lg border border-dashed border-slate-200 text-[10px] text-slate-300">—</div>
                      ) : (
                        <div className="space-y-1">
                          {gTalepler.map((t) => (
                            <div key={t.id} className="space-y-1">
                              {t.kalemler.map((k) => {
                                const yuzde = k.adet === 0 ? 0 : Math.round((k.atanan / k.adet) * 100)
                                const renk = k.atanan >= k.adet ? 'border-emerald-300 bg-emerald-50' : k.atanan === 0 ? 'border-red-300 bg-red-50' : 'border-amber-300 bg-amber-50'
                                const aktif = secili?.talepId === t.id && secili?.meslekId === k.meslekId
                                return (
                                  <button key={k.meslekId}
                                    data-talep={t.id}
                                    data-meslek={k.meslekId}
                                    onClick={() => { setSecili({ talepId: t.id, meslekId: k.meslekId, meslekAd: k.meslekAd }); setDetayTalep(t.id) }}
                                    className={`block w-full rounded-lg border px-2 py-1.5 text-left transition ${aktif ? 'border-indigo-500 bg-indigo-600 text-white shadow-sm' : `${renk} hover:shadow-sm`}`}
                                    title={`${k.meslekAd}: ${k.atanan}/${k.adet} işçi — detay için tıkla`}>
                                    <div className="flex items-center justify-between gap-1">
                                      <span className="truncate text-[11px] font-semibold">{k.meslekAd}</span>
                                      <span className="text-[11px] font-bold tabular-nums">{k.atanan}/{k.adet}</span>
                                    </div>
                                    <div className="mt-1 h-1 w-full overflow-hidden rounded-full bg-black/10">
                                      <div className={`h-full rounded-full ${aktif ? 'bg-white' : 'bg-slate-900/40'}`} style={{ width: `${yuzde}%` }} />
                                    </div>
                                    <div className="mt-0.5 flex items-center gap-1">
                                      {t.aciliyet === 'acil' && <span className="rounded bg-rose-500 px-1 text-[8px] font-bold text-white">ACİL</span>}
                                      {t.vardiya === 'gece' && <span className="text-[9px] text-slate-500">🌙</span>}
                                      <span className={`ml-auto text-[8px] font-semibold ${aktif ? 'text-white/90' : 'text-slate-400'}`}>ata →</span>
                                    </div>
                                  </button>
                                )
                              })}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )
          })}

          {/* Gün toplamları */}
          <div className="grid grid-cols-[230px_repeat(7,1fr)] border-t border-slate-200 bg-slate-50/80">
            <div className="px-4 py-2 text-[11px] font-semibold uppercase tracking-wide text-slate-400">Gün toplamı</div>
            {gunToplamlari.map((t, i) => (
              <div key={i} className="border-l border-slate-200 px-2 py-2 text-center text-xs font-bold tabular-nums">
                <span className={t.ihtiyac > t.atanan ? 'text-amber-600' : 'text-emerald-600'}>{t.atanan}/{t.ihtiyac}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Sağ panel */}
      <div className="w-full shrink-0 space-y-4 xl:w-80">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-900">Atama Yap</h3>
            {secili && <button onClick={() => setSecili(null)} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100"><Icon name="x" size={15} /></button>}
          </div>
          {secili && seciliTalep ? (
            <>
              <div className="mt-1 mb-3 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                <span className="rounded-lg bg-slate-100 px-2 py-0.5 font-medium text-slate-700">{HAFTANIN_GUNLERI[seciliGun]} {gunNesnesi.getDate()} {AY_ADLARI[gunNesnesi.getMonth()]}</span>
                <span className="rounded-lg bg-indigo-50 px-2 py-0.5 font-medium text-indigo-700">{secili.meslekAd}</span>
              </div>
              <AtamaPaneli talepId={secili.talepId} meslekId={secili.meslekId} meslekAd={secili.meslekAd} tarih={seciliGunIso ?? ''} />
            </>
          ) : (
            <div className="mt-1 space-y-3">
              <p className="text-xs leading-relaxed text-slate-500">Takvimde <b>bir hücreye tıkla</b> — o günün detayı ve atama paneli burada açılır.</p>
              <div className="rounded-xl bg-slate-50 p-3 text-xs text-slate-600">
                <div className="flex items-center gap-2"><span className="text-indigo-600">1.</span> Hücreyi seç</div>
                <div className="mt-1.5 flex items-center gap-2"><span className="text-indigo-600">2.</span> Önerilen uygun işçilere bak</div>
                <div className="mt-1.5 flex items-center gap-2"><span className="text-indigo-600">3.</span> <b>Ata</b>&apos;ya bas</div>
              </div>
            </div>
          )}
        </div>

        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-4 py-3">
            <h3 className="text-sm font-semibold text-slate-900">Boştaki Müsait İşçiler</h3>
            <p className="text-[11px] text-slate-400">{HAFTANIN_GUNLERI[seciliGun]} · {secili ? `${secili.meslekAd} filtreli` : 'tüm meslekler'}</p>
          </div>
          <div className="max-h-96 overflow-y-auto p-2">
            {!free ? <p className="px-2 py-4 text-xs text-slate-400">Yükleniyor…</p>
              : free.length === 0 ? <p className="px-2 py-4 text-xs text-slate-400">Bu gün boşta işçi yok</p>
              : (
                <ul className="space-y-1">
                  {free.map((w) => (
                    <li key={w.id} className="rounded-lg px-2 py-2 transition hover:bg-slate-50">
                      <div className="flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <div className="truncate text-xs font-semibold text-slate-800">{w.ad}</div>
                          <div className="truncate text-[10px] text-slate-400">{w.meslekler.join(', ')} · {w.ilce}</div>
                          {w.belgeYaklasan && <div className="text-[9px] text-amber-600">⚠ belge yakın</div>}
                        </div>
                        <QuickAta worker={w} secili={secili} seciliGunIso={seciliGunIso} onDone={() => router.refresh()} onMesaj={setMesaj} />
                      </div>
                    </li>
                  ))}
                </ul>
              )}
          </div>
          {!secili && <div className="border-t border-slate-100 px-4 py-2 text-[10px] text-slate-400">Hızlı atama için önce takvimde bir hücre seç.</div>}
        </div>

        {mesaj && <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">{mesaj}</div>}
      </div>

      {detayTalep && (
        <TalepDetayModal
          talepId={detayTalep}
          acik={true}
          yenileAnahtari={talepler.find((t) => t.id === detayTalep) ? JSON.stringify(talepler.filter((t) => t.id === detayTalep).flatMap((t) => t.kalemler.map((k) => k.atanan))) : ''}
          kapat={() => { router.refresh(); setDetayTalep(null) }}
        />
      )}
    </div>
  )
}

// ================= AY GÖRÜNÜMÜ =================
function AyGorunumu({ props, bugunIso, gunSec, ayGecir }: { props: Seri; bugunIso: string; gunSec: (iso: string) => void; ayGecir: (o: number) => void }) {
  const bugunGun = Number(bugunIso.slice(8, 10))
  const bosBaslangic = props.ayIlkGun // 0=Sun..6=Sat, grid Pzt başlar
  const bosPzt = (bosBaslangic + 6) % 7
  const hucreler: Array<{ tip: 'bos' } | { tip: 'gun'; g: (typeof props.ayGunler)[number] }> = []
  for (let i = 0; i < bosPzt; i++) hucreler.push({ tip: 'bos' })
  for (const g of props.ayGunler) hucreler.push({ tip: 'gun', g })

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <button onClick={() => ayGecir(-1)} className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-50" title="Önceki ay">‹ {AY_ADLARI[(props.ayBas % 100 + 10) % 12]}</button>
        <h3 className="text-base font-semibold text-slate-900">{props.ayEtiket}</h3>
        <button onClick={() => ayGecir(1)} className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-50" title="Sonraki ay">{AY_ADLARI[(props.ayBas % 100 + 12) % 12]} ›</button>
      </div>

      <div className="grid grid-cols-7 gap-1.5">
        {HAFTANIN_KISA.map((g) => (
          <div key={g} className="pb-1 text-center text-[11px] font-bold uppercase tracking-wide text-slate-400">{g}</div>
        ))}
        {hucreler.map((h, i) =>
          h.tip === 'bos' ? (
            <div key={`b${i}`} className="aspect-[4/3] rounded-xl bg-slate-50/50" />
          ) : (
            <button key={h.g.iso} onClick={() => gunSec(h.g.iso)}
              className={`relative aspect-[4/3] rounded-xl border p-1.5 text-left transition ${
                h.g.iso === bugunIso
                  ? 'border-indigo-500 bg-indigo-50 ring-2 ring-indigo-500/20'
                  : h.g.acil
                    ? 'border-rose-200 bg-rose-50 hover:border-rose-300'
                    : h.g.ihtiyac === 0
                      ? 'border-slate-100 bg-slate-50/40 hover:border-slate-300'
                      : h.g.ihtiyac > h.g.atanan
                        ? 'border-amber-200 bg-amber-50 hover:border-amber-300'
                        : 'border-emerald-200 bg-emerald-50 hover:border-emerald-300'
              }`}>
              <div className={`text-sm font-bold tabular-nums ${h.g.gun === bugunGun && h.g.iso.slice(0,7) === bugunIso.slice(0,7) ? 'text-indigo-700' : 'text-slate-700'}`}>{h.g.gun}</div>
              {h.g.ihtiyac > 0 && (
                <div className={`mt-0.5 text-[10px] font-semibold tabular-nums ${h.g.ihtiyac > h.g.atanan ? 'text-amber-700' : 'text-emerald-700'}`}>
                  {h.g.atanan}/{h.g.ihtiyac} işçi
                </div>
              )}
              {h.g.acil && <div className="mt-0.5 inline-block rounded bg-rose-500 px-1 text-[8px] font-bold text-white">ACİL</div>}
            </button>
          )
        )}
      </div>
      <p className="mt-3 text-center text-[11px] text-slate-400">Bir güne tıklayınca o hafta açılır — hücre detayından atama yapılır.</p>
    </div>
  )
}

function QuickAta({
  worker,
  secili,
  seciliGunIso,
  onDone,
  onMesaj,
}: {
  worker: FreeWorker
  secili: { talepId: number; meslekId: number } | null
  seciliGunIso?: string
  onDone: () => void
  onMesaj: (m: string | null) => void
}) {
  const [state, formAction, pending] = useActionState(createAtama, undefined)
  useEffect(() => {
    if (state && 'ok' in state) { onMesaj(null); onDone() }
    else if (state && 'error' in state) { onMesaj(String(state.error)) }
  }, [state, onDone, onMesaj])
  if (!secili || !seciliGunIso) {
    return <button className="cursor-not-allowed rounded-lg bg-slate-100 px-2.5 py-1 text-[10px] font-semibold text-slate-400" disabled title="Önce takvimde bir hücre seç">hücre seç</button>
  }
  return (
    <form action={formAction} onClick={(e) => e.stopPropagation()}>
      <input type="hidden" name="talepId" value={secili.talepId} />
      <input type="hidden" name="isciId" value={worker.id} />
      <input type="hidden" name="meslekId" value={secili.meslekId} />
      <button type="submit" disabled={pending} className="rounded-lg bg-indigo-600 px-2.5 py-1 text-[10px] font-semibold text-white transition hover:bg-indigo-500 disabled:opacity-60">
        {pending ? '…' : 'Ata'}
      </button>
    </form>
  )
}