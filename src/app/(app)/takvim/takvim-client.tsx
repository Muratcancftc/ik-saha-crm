'use client'

import { useState, useEffect, useActionState } from 'react'
import { useRouter } from 'next/navigation'
import { musaitIsciler } from '@/app/actions/takvim'
import { createAtama } from '@/app/actions/talep'
import { Icon } from '@/components/icons'
import { tl } from '@/lib/format'
import { AtamaPaneli } from '../talepler/atama-paneli'
import { addDaysIso } from './takvim-utils'

type KalemSeri = { meslekId: number; meslekAd: string; adet: number; atanan: number }
type TalepSeri = { id: number; lokasyonId: number; tarih: string; vardiya: string; durum: string; aciliyet: string; kalemler: KalemSeri[] }
type Seri = { bas: string; gunler: Array<{ iso: string; etiket: string }>; satirlar: Array<{ lokasyonId: number; ad: string; firma: string }>; talepler: TalepSeri[] }

type FreeWorker = {
  id: number
  ad: string
  ilce: string
  puan: number
  beklenti: number
  meslekler: string[]
  belgeYaklasan: boolean
}

const HAFTANIN_GUNLERI = ['Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi', 'Pazar']

export function Takvim(props: Seri) {
  const router = useRouter()
  const bugunIso = new Date().toISOString().slice(0, 10)

  // Bugünün indexi (bu haftada)
  const [seciliGun, setSeciliGun] = useState(() => {
    const idx = props.gunler.findIndex((g) => g.iso === bugunIso)
    return idx >= 0 ? idx : 0
  })
  const [secili, setSecili] = useState<{ talepId: number; meslekId: number; meslekAd: string } | null>(null)
  const [free, setFree] = useState<FreeWorker[] | null>(null)
  const [mesaj, setMesaj] = useState<string | null>(null)

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

  // Hafta özeti
  const haftaIhtiyac = props.talepler.reduce((a, t) => a + t.kalemler.reduce((x, k) => x + k.adet, 0), 0)
  const haftaAtanan = props.talepler.reduce((a, t) => a + t.kalemler.reduce((x, k) => x + k.atanan, 0), 0)

  const seciliTalep = secili ? props.talepler.find((t) => t.id === secili.talepId) : null
  const seciliGunIso = props.gunler[seciliGun]?.iso
  const gunEtiketi = props.gunler[seciliGun]?.etiket

  return (
    <div className="space-y-4">
      {/* Üst bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Vardiya / Takvim</h2>
          <p className="text-xs text-slate-400">
            {props.gunler[0]?.etiket} – {props.gunler[6]?.etiket} · hafta
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="rounded-xl bg-white px-3 py-2 text-sm ring-1 ring-slate-200">
            <span className="text-slate-400">İhtiyaç </span>
            <b className="tabular-nums text-slate-900">{haftaIhtiyac}</b>
            <span className="mx-1.5 text-slate-300">·</span>
            <span className="text-slate-400">Atanan </span>
            <b className="tabular-nums text-indigo-600">{haftaAtanan}</b>
          </div>
          <div className="flex overflow-hidden rounded-xl border border-slate-200 bg-white">
            <button onClick={() => git(-7)} className="px-3 py-2 text-slate-600 transition hover:bg-slate-50" title="Önceki hafta">
              <Icon name="chevron" size={16} className="rotate-90" />
            </button>
            <button onClick={() => git(7)} className="border-l border-slate-200 px-3 py-2 text-slate-600 transition hover:bg-slate-50" title="Sonraki hafta">
              <Icon name="chevron" size={16} className="-rotate-90" />
            </button>
          </div>
          <a href="/takvim" className="rounded-xl bg-indigo-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-indigo-500">
            Bu hafta
          </a>
        </div>
      </div>

      {/* Lejant */}
      <div className="flex flex-wrap gap-3 text-[11px] text-slate-500">
        <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded bg-emerald-400" /> Dolu</span>
        <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded bg-amber-400" /> Kısmi / eksik</span>
        <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded bg-red-400" /> Boş</span>
        <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded ring-1 ring-indigo-400" /> Bugün</span>
        <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded bg-rose-500" /> ACİL</span>
      </div>

      <div className="flex flex-col gap-4 xl:flex-row">
        {/* Grid */}
        <div className="min-w-0 flex-1 overflow-x-auto">
          <div className="min-w-[880px] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            {/* Gün başlıkları */}
            <div className="grid grid-cols-[230px_repeat(7,1fr)] border-b border-slate-200">
              <div className="bg-slate-50 px-4 py-3 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                Firma / Lokasyon
              </div>
              {props.gunler.map((g, i) => {
                const bugunMu = g.iso === bugunIso
                return (
                  <button
                    key={g.iso}
                    onClick={() => setSeciliGun(i)}
                    className={`px-2 py-2.5 text-center transition ${bugunMu ? 'bg-indigo-50' : 'hover:bg-slate-50'} ${seciliGun === i ? 'ring-2 ring-inset ring-indigo-500' : ''}`}
                  >
                    <div className={`text-[10px] font-semibold uppercase tracking-wide ${bugunMu ? 'text-indigo-600' : 'text-slate-400'}`}>
                      {HAFTANIN_GUNLERI[i].slice(0, 3)}
                    </div>
                    <div className={`mt-0.5 text-sm font-semibold ${bugunMu ? 'text-indigo-700' : 'text-slate-700'}`}>
                      {new Date(g.iso + 'T00:00:00').getDate()}
                    </div>
                  </button>
                )
              })}
            </div>

            {props.satirlar.length === 0 && (
              <div className="px-4 py-14 text-center text-sm text-slate-400">Bu hafta talep yok</div>
            )}

            {/* Satırlar */}
            {props.satirlar.map((satir) => (
              <div key={satir.lokasyonId} className="grid grid-cols-[230px_repeat(7,1fr)] border-b border-slate-100 last:border-0">
                <div className="flex flex-col justify-center bg-slate-50/60 px-4 py-3">
                  <div className="truncate text-sm font-semibold text-slate-800">{satir.ad}</div>
                  <div className="truncate text-xs text-slate-400">{satir.firma}</div>
                </div>
                {props.gunler.map((g) => {
                  const bugunMu = g.iso === bugunIso
                  const gTalepler = props.talepler.filter((t) => t.lokasyonId === satir.lokasyonId && t.tarih === g.iso)
                  return (
                    <div key={g.iso} className={`border-l border-slate-100 px-1.5 py-1.5 ${bugunMu ? 'bg-indigo-50/30' : ''}`}>
                      {gTalepler.length === 0 ? (
                        <div className="flex h-full min-h-14 items-center justify-center rounded-lg border border-dashed border-slate-200 text-[10px] text-slate-300">
                          —
                        </div>
                      ) : (
                        <div className="space-y-1">
                          {gTalepler.map((t) => (
                            <div key={t.id} className="space-y-1">
                              {t.kalemler.map((k) => {
                                const yuzde = k.adet === 0 ? 0 : Math.round((k.atanan / k.adet) * 100)
                                const renk = k.atanan >= k.adet ? 'border-emerald-300 bg-emerald-50' : k.atanan === 0 ? 'border-red-300 bg-red-50' : 'border-amber-300 bg-amber-50'
                                const aktif = secili?.talepId === t.id && secili?.meslekId === k.meslekId
                                return (
                                  <button
                                    key={k.meslekId}
                                    onClick={() => setSecili({ talepId: t.id, meslekId: k.meslekId, meslekAd: k.meslekAd })}
                                    className={`block w-full rounded-lg border px-2 py-1.5 text-left transition ${aktif ? 'border-indigo-500 bg-indigo-600 text-white shadow-sm' : `${renk} hover:shadow-sm`}`}
                                    title={`${k.meslekAd}: ${k.atanan}/${k.adet} — tıkla ve ata`}
                                  >
                                    <div className="flex items-center justify-between gap-1">
                                      <span className="truncate text-[11px] font-semibold">{k.meslekAd}</span>
                                      <span className="text-[11px] font-bold tabular-nums">{k.atanan}/{k.adet}</span>
                                    </div>
                                    <div className="mt-1 h-1 w-full overflow-hidden rounded-full bg-black/10">
                                      <div className={`h-full rounded-full ${aktif ? 'bg-white' : 'bg-slate-900/40'}`} style={{ width: `${yuzde}%` }} />
                                    </div>
                                    {t.aciliyet === 'acil' && (
                                      <span className="mt-0.5 inline-block rounded bg-rose-500 px-1 text-[9px] font-bold text-white">ACİL</span>
                                    )}
                                    {t.vardiya === 'gece' && (
                                      <span className="ml-1 text-[9px] text-slate-500">🌙</span>
                                    )}
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
            ))}
          </div>
        </div>

        {/* Sağ panel */}
        <div className="w-full shrink-0 space-y-4 xl:w-80">
          {/* Seçili hücre */}
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-900">Atama Yap</h3>
              {secili && (
                <button onClick={() => setSecili(null)} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100">
                  <Icon name="x" size={15} />
                </button>
              )}
            </div>
            {secili && seciliTalep ? (
              <>
                <div className="mt-1 mb-3 flex items-center gap-2 text-xs text-slate-500">
                  <span className="rounded-lg bg-slate-100 px-2 py-0.5 font-medium text-slate-700">{seciliGunIso}</span>
                  <span className="rounded-lg bg-indigo-50 px-2 py-0.5 font-medium text-indigo-700">{secili.meslekAd}</span>
                </div>
                <AtamaPaneli talepId={secili.talepId} meslekId={secili.meslekId} meslekAd={secili.meslekAd} tarih={seciliGunIso ?? ''} />
              </>
            ) : (
              <p className="mt-1 text-xs leading-relaxed text-slate-400">
                Takvimde bir hücreye tıklayarak o gün için atama yapın. Çakışma ve belge kontrolü otomatik çalışır.
              </p>
            )}
          </div>

          {/* Boştaki müsait işçiler */}
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 px-4 py-3">
              <h3 className="text-sm font-semibold text-slate-900">Boştaki Müsait İşçiler</h3>
              <p className="text-[11px] text-slate-400">
                {gunEtiketi} · {secili ? `${secili.meslekAd} filtreli` : 'tümü'}
              </p>
            </div>
            <div className="max-h-96 overflow-y-auto p-2">
              {!free ? (
                <p className="px-2 py-4 text-xs text-slate-400">Yükleniyor…</p>
              ) : free.length === 0 ? (
                <p className="px-2 py-4 text-xs text-slate-400">Boşta işçi yok</p>
              ) : (
                <ul className="space-y-1">
                  {free.map((w) => (
                    <li key={w.id} className="rounded-lg px-2 py-2 transition hover:bg-slate-50">
                      <div className="flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <div className="truncate text-xs font-semibold text-slate-800">{w.ad}</div>
                          <div className="truncate text-[10px] text-slate-400">
                            {w.ilce} · {w.meslekler.join(', ')} · {tl(w.beklenti)}
                          </div>
                          {w.belgeYaklasan && <div className="text-[9px] text-amber-600">belge yakın</div>}
                        </div>
                        <QuickAta worker={w} secili={secili} seciliGunIso={seciliGunIso} onDone={() => router.refresh()} onMesaj={setMesaj} />
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          {mesaj && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">{mesaj}</div>
          )}
        </div>
      </div>
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
    if (state && 'ok' in state) {
      onMesaj(null)
      onDone()
    } else if (state && 'error' in state) {
      onMesaj(String(state.error))
    }
  }, [state, onDone, onMesaj])

  if (!secili || !seciliGunIso) {
    return (
      <button className="rounded-lg px-2 py-1 text-[10px] font-medium text-slate-400 ring-1 ring-slate-200" disabled>
        hücre seç
      </button>
    )
  }
  return (
    <form action={formAction} onClick={(e) => e.stopPropagation()}>
      <input type="hidden" name="talepId" value={secili.talepId} />
      <input type="hidden" name="isciId" value={worker.id} />
      <input type="hidden" name="meslekId" value={secili.meslekId} />
      <button
        type="submit"
        disabled={pending}
        className="rounded-lg bg-indigo-600 px-2.5 py-1 text-[10px] font-semibold text-white transition hover:bg-indigo-500 disabled:opacity-60"
      >
        {pending ? '…' : 'Ata'}
      </button>
    </form>
  )
}