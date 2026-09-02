'use client'

import { useState, useEffect, useActionState } from 'react'
import { useRouter } from 'next/navigation'
import { musaitIsciler } from '@/app/actions/takvim'
import { createAtama } from '@/app/actions/talep'
import { Icon } from '@/components/icons'
import {} from '@/components/ui'
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
  telefon: string
  puan: number
  beklenti: number
  meslekler: string[]
  belgeYaklasan: boolean
}

export function Takvim(props: Seri) {
  const router = useRouter()
  const [seciliGun, setSeciliGun] = useState(0)
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

  const seciliTalep = secili ? props.talepler.find((t) => t.id === secili.talepId) : null
  const seciliGunIso = props.gunler[seciliGun]?.iso

  return (
    <div className="flex flex-col gap-4 xl:flex-row">
      {/* Hafta başlığı + gezinme */}
      <div className="flex flex-wrap items-center justify-between gap-2 xl:flex-1">
        <h2 className="text-lg font-semibold text-slate-900">Vardiya / Takvim</h2>
        <div className="flex items-center gap-1.5">
          <button onClick={() => git(-7)} className="rounded-lg border border-slate-300 bg-white p-2 text-slate-600 hover:bg-slate-50" title="Önceki hafta">
            <Icon name="chevron" size={16} className="rotate-90" />
          </button>
          <button onClick={() => git(7)} className="rounded-lg border border-slate-300 bg-white p-2 text-slate-600 hover:bg-slate-50" title="Sonraki hafta">
            <Icon name="chevron" size={16} className="-rotate-90" />
          </button>
          <a href="/takvim" className="rounded-lg px-3 py-1.5 text-xs font-medium text-indigo-600 hover:bg-indigo-50">Bu hafta</a>
        </div>
      </div>

      {/* Grid */}
      <div className="min-w-0 flex-1 overflow-x-auto">
        <div className="min-w-[860px] rounded-2xl border border-slate-200 bg-white">
          {/* Başlık satırı: günler */}
          <div className="grid grid-cols-[220px_repeat(7,1fr)] border-b border-slate-200">
            <div className="px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-slate-400">Firma / Lokasyon</div>
            {props.gunler.map((g, i) => (
              <button
                key={g.iso}
                onClick={() => setSeciliGun(i)}
                className={`px-2 py-2 text-center text-[11px] font-semibold transition ${seciliGun === i ? 'bg-indigo-50 text-indigo-700' : 'text-slate-500 hover:bg-slate-50'}`}
              >
                {g.etiket}
              </button>
            ))}
          </div>

          {props.satirlar.length === 0 && (
            <div className="px-4 py-14 text-center text-sm text-slate-400">Bu hafta talep yok</div>
          )}

          {/* Satırlar */}
          {props.satirlar.map((satir) => (
            <div key={satir.lokasyonId} className="grid grid-cols-[220px_repeat(7,1fr)] border-b border-slate-100 last:border-0">
              <div className="px-3 py-2">
                <div className="text-sm font-medium text-slate-800">{satir.ad}</div>
                <div className="text-xs text-slate-400">{satir.firma}</div>
              </div>
              {props.gunler.map((g) => {
                const gTalepler = props.talepler.filter((t) => t.lokasyonId === satir.lokasyonId && t.tarih === g.iso)
                return (
                  <div key={g.iso} className="border-l border-slate-100 px-1.5 py-1.5">
                    {gTalepler.length === 0 ? (
                      <div className="h-full min-h-12 rounded-lg bg-slate-50/50" />
                    ) : (
                      gTalepler.map((t) => (
                        <div key={t.id} className="space-y-1">
                          {t.kalemler.map((k) => {
                            const doldu = k.atanan >= k.adet
                            return (
                              <button
                                key={k.meslekId}
                                onClick={() => setSecili({ talepId: t.id, meslekId: k.meslekId, meslekAd: k.meslekAd })}
                                className={`block w-full rounded-lg px-2 py-1 text-left text-[11px] transition ${
                                  secili?.talepId === t.id && secili?.meslekId === k.meslekId
                                    ? 'bg-indigo-600 text-white'
                                    : doldu
                                      ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200 hover:ring-emerald-400'
                                      : 'bg-amber-50 text-amber-700 ring-1 ring-amber-200 hover:ring-amber-400'
                                }`}
                                title={`${k.meslekAd}: ${k.atanan}/${k.adet} — tıkla ve ata`}
                              >
                                <div className="flex items-center justify-between gap-1">
                                  <span className="truncate font-medium">{k.meslekAd}</span>
                                  <span className="tabular-nums">{k.atanan}/{k.adet}</span>
                                </div>
                                {t.aciliyet === 'acil' && <span className="text-[9px] font-bold text-red-600">ACİL</span>}
                              </button>
                            )
                          })}
                          {t.vardiya === 'gece' && <span className="text-[9px] text-slate-400">🌙 gece</span>}
                        </div>
                      ))
                    )}
                  </div>
                )
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Sağ panel: seçili hücre ataması + boştaki işçiler */}
      <div className="w-full shrink-0 space-y-4 xl:w-80">
        {secili && seciliTalep ? (
          <div>
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-900">Atama Yap</h3>
              <button onClick={() => setSecili(null)} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100">
                <Icon name="x" size={15} />
              </button>
            </div>
            <p className="mb-2 text-xs text-slate-500">
              {seciliGunIso} · {secili.meslekAd}
            </p>
            <AtamaPaneli talepId={secili.talepId} meslekId={secili.meslekId} meslekAd={secili.meslekAd} tarih={seciliGunIso ?? ''} />
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-slate-300 px-4 py-6 text-center text-xs text-slate-400">
            Bir gün ve hücre seçerek atama yapın.
          </div>
        )}

        {/* Boştaki müsait işçiler */}
        <div className="rounded-2xl border border-slate-200 bg-white">
          <div className="border-b border-slate-100 px-4 py-2.5">
            <h3 className="text-sm font-semibold text-slate-900">Boştaki Müsait İşçiler</h3>
            <p className="text-[11px] text-slate-400">{props.gunler[seciliGun]?.etiket} · {secili ? `${secili.meslekAd} filtreli` : 'tümü'}</p>
          </div>
          <div className="max-h-80 overflow-y-auto p-2">
            {!free ? (
              <p className="px-2 py-4 text-xs text-slate-400">Yükleniyor…</p>
            ) : free.length === 0 ? (
              <p className="px-2 py-4 text-xs text-slate-400">Boşta işçi yok</p>
            ) : (
              <ul className="space-y-1.5">
                {free.map((w) => (
                  <li key={w.id} className="rounded-lg px-2 py-1.5 hover:bg-slate-50">
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <div className="truncate text-xs font-medium text-slate-800">{w.ad}</div>
                        <div className="truncate text-[10px] text-slate-400">
                          {w.ilce} · {w.meslekler.join(', ')} · {tl(w.beklenti)}
                        </div>
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
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">{mesaj}</div>
        )}
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
      <button className="rounded-md px-2 py-1 text-[10px] font-medium text-slate-400 ring-1 ring-slate-200">
        önce hücre seç
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
        className="rounded-md bg-indigo-600 px-2 py-1 text-[10px] font-medium text-white transition hover:bg-indigo-500 disabled:opacity-60"
      >
        Ata
      </button>
    </form>
  )
}