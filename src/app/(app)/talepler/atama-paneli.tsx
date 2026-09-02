'use client'

import { useState } from 'react'
import { oneriGetir, createAtama } from '@/app/actions/talep'
import { Icon } from '@/components/icons'
import { Badge } from '@/components/ui'
import { tl } from '@/lib/format'
import { useActionState, useEffect } from 'react'

type Aday = {
  id: number
  ad: string
  ilce: string
  puan: number
  beklenti: number
  bolgeUyum: boolean
  belgeYaklasan: boolean
  skor: number
  meslekler: string[]
}

export function AtamaPaneli({ talepId, meslekId, meslekAd, tarih }: { talepId: number; meslekId: number; meslekAd: string; tarih: string }) {
  const [adaylar, setAdaylar] = useState<Aday[] | null>(null)
  const [yukleniyor, setYukleniyor] = useState(false)
  const [secili, setSecili] = useState<number | null>(null)
  const [uyari, setUyari] = useState<string | null>(null)
  const [state, formAction, pending] = useActionState(createAtama, undefined)

  useEffect(() => {
    if (state && 'ok' in state) {
      setUyari(state.uyari ?? null)
      setSecili(null)
    }
  }, [state])

  async function getir() {
    setYukleniyor(true)
    setUyari(null)
    const list = await oneriGetir(talepId, meslekId)
    setAdaylar(list)
    setYukleniyor(false)
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-3">
      <div className="flex items-center justify-between gap-2">
        <div className="text-xs font-medium text-slate-700">
          <b>{meslekAd}</b> ataması
          {adaylar ? (
            <span className="text-slate-400"> · {adaylar.length} uygun işçi</span>
          ) : null}
        </div>
        <button
          onClick={getir}
          disabled={yukleniyor}
          className="inline-flex items-center gap-1 rounded-lg bg-indigo-600 px-2.5 py-1.5 text-xs font-medium text-white transition hover:bg-indigo-500 disabled:opacity-60"
        >
          <Icon name="users" size={14} />
          {yukleniyor ? 'Taranıyor…' : 'Uygun İşçi Öner'}
        </button>
      </div>

      {uyari && (
        <div className="mt-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs text-amber-700">
          {uyari}
        </div>
      )}
      {state && 'error' in state && state.error && (
        <div className="mt-2 rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs text-red-700">
          {state.error}
        </div>
      )}

      {adaylar && adaylar.length === 0 && (
        <p className="mt-3 text-xs text-slate-500">Bu meslek için uygun (aktif, çakışmasız, belgesi geçerli) işçi yok.</p>
      )}

      {adaylar && adaylar.length > 0 && (
        <ul className="mt-3 space-y-1.5">
          {adaylar.map((a) => (
            <li
              key={a.id}
              className={`flex cursor-pointer items-center justify-between gap-2 rounded-lg border bg-white px-3 py-2 transition ${
                secili === a.id ? 'border-indigo-500 ring-2 ring-indigo-500/20' : 'border-slate-200'
              }`}
              onClick={() => setSecili(a.id)}
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2 text-sm font-medium text-slate-900">
                  {a.ad}
                  {a.bolgeUyum && <Badge tone="green">Bölge ✓</Badge>}
                  {a.belgeYaklasan && <Badge tone="amber">Belge yakın</Badge>}
                </div>
                <div className="mt-0.5 flex items-center gap-2 text-xs text-slate-500">
                  <span>{a.ilce}</span>
                  <span className="text-slate-300">·</span>
                  <span>Puan {a.puan}</span>
                  <span className="text-slate-300">·</span>
                  <span className="tabular-nums">{tl(a.beklenti)}/gün</span>
                </div>
              </div>
              {secili === a.id && (
                <form
                  action={formAction}
                  onClick={(e) => e.stopPropagation()}
                  className="shrink-0"
                >
                  <input type="hidden" name="talepId" value={talepId} />
                  <input type="hidden" name="isciId" value={a.id} />
                  <input type="hidden" name="meslekId" value={meslekId} />
                  <button
                    type="submit"
                    disabled={pending}
                    className="inline-flex items-center gap-1 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-indigo-500 disabled:opacity-60"
                  >
                    <Icon name="check" size={13} />
                    Ata
                  </button>
                </form>
              )}
            </li>
          ))}
        </ul>
      )}
      <p className="mt-2 text-[10px] text-slate-400">Tarih: {tarih} — aynı güne atanan işçiler listelenmez.</p>
    </div>
  )
}