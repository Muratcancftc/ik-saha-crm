'use client'

import { useEffect, useState, startTransition } from 'react'
import { isciDetay } from '@/app/actions/isci'
import { Icon } from '@/components/icons'
import { Badge } from '@/components/ui'
import { tl, num } from '@/lib/format'
import type { IsciDetay } from '@/lib/queries'

const DURUM_TONE: Record<string, string> = {
  aktif: 'green',
  pasif: 'slate',
  kara_liste: 'red',
}

export function IsciDetayModal({ isciId, isciAd }: { isciId: number; isciAd: string }) {
  const [acik, setAcik] = useState(false)
  const [d, setD] = useState<IsciDetay | null>(null)

  useEffect(() => {
    if (!acik) return
    setD(null)
    startTransition(async () => {
      setD(await isciDetay(isciId))
    })
  }, [acik, isciId])

  return (
    <>
      <button
        onClick={() => setAcik(true)}
        className="rounded-lg p-1.5 text-slate-400 transition hover:bg-indigo-50 hover:text-indigo-600"
        title="İşçi detayı"
      >
        <Icon name="isci" size={15} />
      </button>

      {acik && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-900/50 p-4 pt-8 backdrop-blur-sm">
          <div className="w-full max-w-2xl rounded-2xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-50 text-sm font-semibold text-indigo-600">
                  {isciAd.split(' ').map((p) => p[0]).slice(0, 2).join('')}
                </div>
                <div>
                  <h3 className="text-base font-semibold text-slate-900">{isciAd}</h3>
                  {d && <div className="text-xs text-slate-500">{d.ilce} · {d.telefon}</div>}
                </div>
              </div>
              <button onClick={() => setAcik(false)} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100">
                <Icon name="x" size={18} />
              </button>
            </div>

            {!d ? (
              <div className="px-6 py-14 text-center text-sm text-slate-400">Yükleniyor…</div>
            ) : (
              <div className="space-y-5 px-6 py-5">
                {/* Skorlar */}
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <Kutu label="Puan" value={num(d.puan)} />
                  <Kutu label="Güvenilirlik" value={num(d.guvenilirlik)} tone={d.guvenilirlik >= 70 ? 'text-emerald-600' : d.guvenilirlik >= 45 ? 'text-amber-600' : 'text-red-600'} />
                  <Kutu label="No-Show" value={num(d.noShow)} tone={d.noShow === 0 ? 'text-emerald-600' : 'text-red-600'} />
                  <Kutu label="Beklenti" value={tl(d.beklenti)} />
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  {/* Kimlik */}
                  <div className="rounded-xl bg-slate-50 p-3">
                    <h4 className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-400">Kimlik</h4>
                    <dl className="space-y-1 text-xs text-slate-600">
                      <div className="flex justify-between"><dt className="text-slate-400">TC</dt><dd className="tabular-nums">{d.tcKimlik}</dd></div>
                      <div className="flex justify-between"><dt className="text-slate-400">IBAN</dt><dd className="tabular-nums">{d.iban}</dd></div>
                      <div className="flex justify-between"><dt className="text-slate-400">Doğum</dt><dd>{d.dogumTarihi}</dd></div>
                      <div className="flex justify-between">
                        <dt className="text-slate-400">Durum</dt>
                        <dd><Badge tone={(DURUM_TONE[d.durum] ?? 'slate') as never}>{d.durum}</Badge></dd>
                      </div>
                      <div className="flex justify-between"><dt className="text-slate-400">Tercih</dt><dd>{d.tercihBolgeler.join(', ') || '—'}</dd></div>
                    </dl>
                  </div>

                  {/* Meslekler */}
                  <div className="rounded-xl bg-slate-50 p-3">
                    <h4 className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-400">Meslekler</h4>
                    <div className="flex flex-wrap gap-1.5">
                      {d.meslekler.map((m) => (
                        <Badge key={m} tone="indigo">{m}</Badge>
                      ))}
                    </div>
                    <h4 className="mb-2 mt-4 text-[11px] font-semibold uppercase tracking-wide text-slate-400">Avanslar</h4>
                    {d.avanslar.length === 0 ? (
                      <p className="text-xs text-slate-400">Avans yok</p>
                    ) : (
                      <ul className="space-y-1 text-xs text-slate-600">
                        {d.avanslar.map((a) => (
                          <li key={a.id} className="flex justify-between">
                            <span>{a.tarih}</span>
                            <span className="tabular-nums">{tl(a.tutar)} <Badge tone={a.durum === 'verildi' ? 'amber' : 'green'}>{a.durum}</Badge></span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>

                  {/* Belgeler */}
                  <div className="rounded-xl bg-slate-50 p-3">
                    <h4 className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-400">Belgeler</h4>
                    {d.belgeler.length === 0 ? (
                      <p className="text-xs text-slate-400">Belge yok</p>
                    ) : (
                      <ul className="space-y-1.5">
                        {d.belgeler.map((b) => (
                          <li key={b.id} className="flex items-center justify-between text-xs text-slate-600">
                            <span>{b.tip} · {b.bitisTarihi}</span>
                            {b.durum === 'doldu' ? (
                              <Badge tone="red">{Math.abs(b.kalanGun)} gün doldu</Badge>
                            ) : b.durum === 'yaklasiyor' ? (
                              <Badge tone="amber">{b.kalanGun} gün</Badge>
                            ) : (
                              <Badge tone="green">Geçerli</Badge>
                            )}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>

                  {/* Müsaitlik */}
                  <div className="rounded-xl bg-slate-50 p-3">
                    <h4 className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-400">Müsaitlik</h4>
                    {d.musaitlik.length === 0 ? (
                      <p className="text-xs text-slate-400">Müsaitlik kaydı yok</p>
                    ) : (
                      <ul className="space-y-1 text-xs text-slate-600">
                        {d.musaitlik.map((m) => (
                          <li key={m.id} className="flex justify-between">
                            <span>{m.tarih}</span>
                            <span><Badge tone={m.durum === 'aktif' ? 'green' : 'amber'}>{m.durum}</Badge></span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>

                {/* Geçmiş atamalar */}
                <div className="rounded-xl bg-slate-50 p-3">
                  <h4 className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                    Geçmiş Atamalar ({d.gecmis.length})
                  </h4>
                  {d.gecmis.length === 0 ? (
                    <p className="text-xs text-slate-400">Atama geçmişi yok</p>
                  ) : (
                    <ul className="space-y-1.5">
                      {d.gecmis.slice(0, 10).map((g) => (
                        <li key={g.id} className="flex items-center justify-between text-xs text-slate-600">
                          <span>{g.tarih} · {g.firma} · {g.lokasyon}</span>
                          <span className="flex items-center gap-1">
                            <Badge tone="slate">{g.durum}</Badge>
                            {g.puantaj && <Badge tone={g.puantaj === 'geldi' ? 'green' : g.puantaj === 'gelmedi' ? 'red' : 'amber'}>{g.puantaj}</Badge>}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  )
}

function Kutu({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div className="rounded-xl bg-white p-3 text-center ring-1 ring-slate-200">
      <div className={`text-lg font-semibold tabular-nums ${tone ?? 'text-slate-900'}`}>{value}</div>
      <div className="mt-0.5 text-[10px] font-medium uppercase tracking-wide text-slate-400">{label}</div>
    </div>
  )
}