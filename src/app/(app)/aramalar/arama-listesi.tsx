'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { aramaKaydet } from '@/app/actions/arama'
import { Icon } from '@/components/icons'

type AramaDto = { id: number; tarih: string; kullaniciAd: string | null }
type PersonelDto = {
  id: number
  ad: string
  telefon: string
  firmaAd: string | null
  aramalar: AramaDto[]
}

const ts = (iso: string) =>
  new Intl.DateTimeFormat('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(iso))
const bugunIso = () => {
  const x = new Date()
  x.setMinutes(x.getMinutes() - x.getTimezoneOffset())
  return x.toISOString().slice(0, 10)
}

export function AramaListesi({ personeller, arayabilir }: { personeller: PersonelDto[]; arayabilir: boolean }) {
  const router = useRouter()
  const [q, setQ] = useState('')
  const [filtre, setFiltre] = useState<'tumu' | 'aranmayan' | 'bugun'>('tumu')
  const [acik, setAcik] = useState<number | null>(null)

  const bugun = bugunIso()

  const list = personeller
    .filter((p) => {
      const s = q.trim().toLocaleLowerCase('tr-TR')
      if (s && !p.ad.toLocaleLowerCase('tr-TR').includes(s) && !p.telefon.replace(/\s/g, '').includes(s.replace(/\s/g, ''))) return false
      const son = p.aramalar[0]
      if (filtre === 'aranmayan') return !son
      if (filtre === 'bugun') return son && son.tarih.slice(0, 10) === bugun
      return true
    })
    .sort((a, b) => a.ad.localeCompare(b.ad, 'tr'))

  const aranan = personeller.filter((p) => p.aramalar.length > 0).length
  const bugunAranan = personeller.filter((p) => p.aramalar[0]?.tarih.slice(0, 10) === bugun).length

  async function ara(id: number) {
    await aramaKaydet(id)
    router.refresh()
  }

  return (
    <div className="space-y-4">
      {/* Ara + filtre */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-56 flex-1">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
            <Icon name="search" size={16} />
          </span>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="İsim veya telefon ara…"
            className="w-full rounded-lg border border-slate-300 bg-white py-2 pl-9 pr-3 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
          />
        </div>
        <div className="flex overflow-hidden rounded-lg border border-slate-200">
          {([['tumu', 'Tümü'], ['aranmayan', 'Aranmayanlar'], ['bugun', 'Bugün Arananlar']] as const).map(([k, l]) => (
            <button
              key={k}
              onClick={() => setFiltre(k)}
              className={`px-3 py-2 text-xs font-semibold transition ${filtre === k ? 'bg-indigo-600 text-white' : 'bg-white text-slate-600 hover:bg-slate-50'}`}
            >
              {l}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap gap-2 text-[11px] text-slate-500">
        <span>{personeller.length} personel</span>
        <span>· <b className="text-emerald-600">{aranan}</b> arandı</span>
        <span>· <b className="text-indigo-600">{bugunAranan}</b> bugün arandı</span>
      </div>

      {list.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white px-6 py-14 text-center text-sm text-slate-400">Eşleşen personel yok</div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
          <ul className="divide-y divide-slate-100">
            {list.map((p) => {
              const son = p.aramalar[0]
              return (
                <li key={p.id}>
                  <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-indigo-50 text-xs font-semibold text-indigo-600">
                        {p.ad.split(' ').map((x) => x[0]).slice(0, 2).join('')}
                      </div>
                      <div className="min-w-0">
                        <div className="text-sm font-medium text-slate-900">{p.ad}</div>
                        <div className="flex items-center gap-2 text-xs text-slate-500">
                          {p.firmaAd ?? '—'}
                          <button
                            onClick={() => setAcik(acik === p.id ? null : p.id)}
                            className="text-slate-400 hover:text-indigo-600"
                            title="Arama geçmişi"
                          >
                            ({p.aramalar.length}) ▾
                          </button>
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-3">
                      {p.telefon ? (
                        <a
                          href={`tel:${p.telefon.replace(/\s/g, '')}`}
                          className="inline-flex items-center gap-1.5 rounded-lg bg-white px-3 py-1.5 text-xs font-medium text-slate-700 ring-1 ring-slate-300 hover:bg-indigo-50 hover:text-indigo-700"
                          title="Ara (telefon)"
                        >
                          <Icon name="telefon" size={13} />
                          {p.telefon}
                        </a>
                      ) : (
                        <span className="text-xs text-slate-400">Telefon yok</span>
                      )}
                      <span className="text-xs text-slate-500">
                        {son ? `Son arama: ${ts(son.tarih)}` : <span className="text-slate-400">Aranmadı</span>}
                      </span>
                      {arayabilir && (
                        <button
                          onClick={() => ara(p.id)}
                          className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-emerald-500"
                        >
                          Arandı
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Arama geçmişi (satır açılımı) */}
                  {acik === p.id && (
                    <div className="border-t border-slate-100 bg-slate-50/50 px-5 py-3">
                      {p.aramalar.length === 0 ? (
                        <p className="text-xs text-slate-400">Hiç aranmadı</p>
                      ) : (
                        <ul className="space-y-1">
                          {p.aramalar.map((a) => (
                            <li key={a.id} className="flex items-center gap-2 text-xs text-slate-600">
                              <Icon name="telefon" size={12} className="text-emerald-600" />
                              <span className="tabular-nums">{ts(a.tarih)}</span>
                              <span className="text-slate-400">·</span>
                              <span>Arayan: {a.kullaniciAd ?? '—'}</span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  )}
                </li>
              )
            })}
          </ul>
        </div>
      )}
    </div>
  )
}