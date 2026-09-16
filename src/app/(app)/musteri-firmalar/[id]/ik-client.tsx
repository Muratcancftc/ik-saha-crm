'use client'

import { useState } from 'react'
import { setPersonelPeriyot, donemDuzenle } from '@/app/actions/ik'

const PERIYOT_LABEL: Record<string, string> = {
  GUN_ARALIGI: 'Gün aralığı',
  HAFTALIK: 'Haftalık',
  AYLIK: 'Aylık',
  SERBEST: 'Serbest',
}

export function PeriyotSelect({ isciId, periyot, gunAraligi, firmaVarsayilan }: { isciId: number; periyot: string | null; gunAraligi: number | null; firmaVarsayilan: string }) {
  const [p, setP] = useState(periyot ?? '')
  const [gun, setGun] = useState(String(gunAraligi ?? ''))

  function kaydet(pp: string, gg: string) {
    const fd = new FormData()
    fd.set('isciId', String(isciId))
    fd.set('odemePeriyot', pp)
    fd.set('gunAraligi', gg)
    setPersonelPeriyot(fd)
  }

  return (
    <div className="flex items-center gap-1.5">
      <select
        value={p}
        onChange={(e) => {
          const v = e.target.value
          setP(v)
          if (v !== 'GUN_ARALIGI') kaydet(v, gun)
        }}
        className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs outline-none focus:border-indigo-500"
      >
        <option value="">Firma ({firmaVarsayilan})</option>
        {Object.entries(PERIYOT_LABEL).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
      </select>
      {p === 'GUN_ARALIGI' && (
        <input
          type="number"
          min={1}
          value={gun}
          onChange={(e) => setGun(e.target.value)}
          onBlur={() => kaydet('GUN_ARALIGI', gun)}
          placeholder="gün"
          className="w-14 rounded-lg border border-slate-200 px-2 py-1 text-xs outline-none focus:border-indigo-500"
        />
      )}
      {p !== '' && p !== 'GUN_ARALIGI' && (
        <button onClick={() => kaydet(p, gun)} className="rounded-lg p-1 text-emerald-600 hover:bg-emerald-50" title="Kaydet">✓</button>
      )}
      {p === 'GUN_ARALIGI' && (
        <button onClick={() => kaydet('GUN_ARALIGI', gun)} className="rounded-lg p-1 text-emerald-600 hover:bg-emerald-50" title="Kaydet">✓</button>
      )}
    </div>
  )
}

export function DonemDuzenle({ donemId, baslangic, bitis }: { donemId: number; baslangic: string; bitis: string }) {
  const [acik, setAcik] = useState(false)
  const [b, setB] = useState(baslangic)
  const [bit, setBit] = useState(bitis)

  function kaydet() {
    const fd = new FormData()
    fd.set('id', String(donemId))
    fd.set('baslangic', b)
    fd.set('bitis', bit)
    donemDuzenle(fd)
    setAcik(false)
  }

  if (!acik) {
    return <button onClick={() => setAcik(true)} className="rounded-lg bg-white px-2.5 py-1 text-xs font-medium text-slate-600 ring-1 ring-slate-300 hover:bg-slate-50">Tarih Düzenle</button>
  }
  return (
    <div className="flex flex-wrap items-center gap-1.5 rounded-lg bg-slate-50 p-1.5">
      <input type="date" value={b} onChange={(e) => setB(e.target.value)} className="rounded-lg border border-slate-300 px-2 py-1 text-xs outline-none focus:border-indigo-500" />
      <span className="text-[10px] text-slate-400">–</span>
      <input type="date" value={bit} onChange={(e) => setBit(e.target.value)} className="rounded-lg border border-slate-300 px-2 py-1 text-xs outline-none focus:border-indigo-500" />
      <button onClick={kaydet} className="rounded-lg bg-emerald-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-emerald-500">Kaydet</button>
    </div>
  )
}