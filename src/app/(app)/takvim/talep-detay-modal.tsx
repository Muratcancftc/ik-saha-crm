'use client'

import { useEffect, useState, startTransition } from 'react'
import { takvimTalepDetay } from '@/app/actions/takvim'
import { updatePuantaj, sgkBildir, cikarAtama } from '@/app/actions/talep'
import { setAtamaDurumOtomatik } from '@/app/actions/hakedis'
import { AtamaPaneli } from '../talepler/atama-paneli'
import { Icon } from '@/components/icons'
import { Badge, Button } from '@/components/ui'
import { AtamaBadge, PuantajBadge } from '@/components/status-badge'
import { TALEP_DURUM, ACILEYET } from '@/lib/labels'

type Detay = {
  id: number
  firma: string
  lokasyon: string
  tarih: string
  vardiya: string
  aciliyet: string
  durum: string
  not: string | null
  kalemler: Array<{ id: number; meslekId: number; meslekAd: string; adet: number; atanan: number }>
  atamalar: Array<{ id: number; isciId: number; isciAd: string; meslekId: number | null; durum: string; puantaj: string | null; sgkBildirildi: boolean }>
}

export function TalepDetayModal({ talepId, acik, kapat }: { talepId: number; acik: boolean; kapat: () => void }) {
  const [d, setD] = useState<Detay | null>(null)

  useEffect(() => {
    if (!acik) return
    setD(null)
    startTransition(async () => {
      setD(await takvimTalepDetay(talepId))
    })
  }, [acik, talepId])

  if (!acik) return null

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-900/60 p-4 pt-8 backdrop-blur-sm">
      <div className="w-full max-w-2xl rounded-2xl bg-white shadow-2xl">
        <div className="flex items-start justify-between gap-3 rounded-t-2xl bg-gradient-to-r from-indigo-600 to-indigo-500 px-6 py-4 text-white">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-base font-semibold">{d?.firma ?? 'Talep'}</h3>
              {d && (
                <>
                  <Badge tone={TALEP_DURUM[d.durum]?.tone as never}>{TALEP_DURUM[d.durum]?.label}</Badge>
                  <Badge tone={ACILEYET[d.aciliyet]?.tone as never}>{ACILEYET[d.aciliyet]?.label}</Badge>
                  {d.vardiya === 'gece' && <Badge tone="slate" className="bg-white/15 text-white">Gece</Badge>}
                </>
              )}
            </div>
            {d && (
              <p className="mt-1 text-sm text-indigo-100">
                {d.lokasyon} · {d.tarih}
                {d.not && <span className="block text-xs text-indigo-200">Not: {d.not}</span>}
              </p>
            )}
          </div>
          <button onClick={kapat} className="rounded-lg p-1.5 text-white/80 hover:bg-white/10 hover:text-white">
            <Icon name="x" size={20} />
          </button>
        </div>

        {!d ? (
          <div className="px-6 py-16 text-center text-sm text-slate-400">Yükleniyor…</div>
        ) : (
          <div className="space-y-4 px-6 py-5">
            {/* İhtiyaç özeti */}
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {d.kalemler.map((k) => (
                <div key={k.id} className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2">
                  <span className="text-sm font-medium text-slate-700">{k.meslekAd}</span>
                  <span className={`text-sm font-bold tabular-nums ${k.atanan >= k.adet ? 'text-emerald-600' : 'text-amber-600'}`}>
                    {k.atanan}/{k.adet}
                  </span>
                </div>
              ))}
            </div>

            {/* Atama panelleri */}
            <div className="space-y-3">
              <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-400">Atama Yap</h4>
              {d.kalemler.map((k) => (
                <AtamaPaneli key={k.id} talepId={d.id} meslekId={k.meslekId} meslekAd={k.meslekAd} tarih={d.tarih} />
              ))}
            </div>

            {/* Atanan işçiler */}
            <div>
              <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
                Atanan İşçiler ({d.atamalar.length})
              </h4>
              {d.atamalar.length === 0 ? (
                <p className="text-xs text-slate-400">Henüz atama yok</p>
              ) : (
                <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200">
                  {d.atamalar.map((a) => (
                    <li key={a.id} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2.5">
                      <div className="flex items-center gap-2">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-50 text-[11px] font-semibold text-indigo-600">
                          {a.isciAd.split(' ').map((p) => p[0]).slice(0, 2).join('')}
                        </div>
                        <div>
                          <div className="text-sm font-medium text-slate-900">{a.isciAd}</div>
                          <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
                            <AtamaBadge durum={a.durum} />
                            {a.puantaj ? <PuantajBadge durum={a.puantaj} /> : <Badge tone="slate">Puantaj yok</Badge>}
                            {a.sgkBildirildi ? <Badge tone="green">SGK ✓</Badge> : <Badge tone="amber">SGK yok</Badge>}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <form action={updatePuantaj} className="flex overflow-hidden rounded-lg border border-slate-200">
                          <input type="hidden" name="atamaId" value={a.id} />
                          {(['geldi', 'gec', 'gelmedi', 'yarim'] as const).map((pu) => {
                            const aktif = a.puantaj === pu
                            return (
                              <button
                                key={pu}
                                type="submit"
                                name="durum"
                                value={pu}
                                className={`px-2 py-1 text-[11px] font-medium transition ${
                                  aktif
                                    ? pu === 'geldi'
                                      ? 'bg-emerald-500 text-white'
                                      : pu === 'gec'
                                        ? 'bg-amber-500 text-white'
                                        : pu === 'gelmedi'
                                          ? 'bg-red-500 text-white'
                                          : 'bg-sky-500 text-white'
                                    : 'bg-white text-slate-600 hover:bg-slate-50'
                                }`}
                              >
                                {pu === 'geldi' ? 'Geldi' : pu === 'gec' ? 'Geç' : pu === 'gelmedi' ? 'Gelmedi' : 'Yarım'}
                              </button>
                            )
                          })}
                        </form>
                        {!a.sgkBildirildi && (
                          <form action={sgkBildir}>
                            <input type="hidden" name="id" value={a.id} />
                            <Button variant="secondary" size="sm" type="submit">SGK</Button>
                          </form>
                        )}
                        {a.durum !== 'tamamlandi' && (
                          <form action={setAtamaDurumOtomatik}>
                            <input type="hidden" name="id" value={a.id} />
                            <Button variant="secondary" size="sm" type="submit">Tamamla</Button>
                          </form>
                        )}
                        <form action={cikarAtama}>
                          <input type="hidden" name="id" value={a.id} />
                          <button className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600" title="Çıkar">
                            <Icon name="x" size={14} />
                          </button>
                        </form>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="flex justify-end">
              <a
                href={`/talepler?talep=${d.id}`}
                className="text-xs font-medium text-indigo-600 hover:underline"
                onClick={kapat}
              >
                Talepler sayfasında aç →
              </a>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}