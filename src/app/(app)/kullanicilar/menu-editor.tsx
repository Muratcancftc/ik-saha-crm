'use client'

import { useState } from 'react'
import { kullaniciMenulerGuncelle } from '@/app/actions/ayar'
import { Icon } from '@/components/icons'
import { roleMenuKeys, PATRON_ONLY_ROUTES } from '@/lib/permissions'
import type { Rol } from '@prisma/client'
import { MenuSecimi } from './menu-secimi'

type Props = {
  id: number
  ad: string
  rol: Rol
  menuler: string[]
}

export function MenuEditor({ id, ad, rol, menuler }: Props) {
  const [open, setOpen] = useState(false)
  const [secili, setSecili] = useState<string[]>(
    menuler.length > 0
      ? menuler
      : roleMenuKeys(rol).filter((h) => rol === 'patron' || !PATRON_ONLY_ROUTES.includes(h))
  )

  if (rol === 'patron') {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-slate-400" title="Patron tüm menülere erişir">
        <Icon name="check" size={13} /> Tümü
      </span>
    )
  }

  return (
    <>
      <button
        onClick={() => {
          setSecili(menuler.length > 0 ? menuler : roleMenuKeys(rol).filter((h) => !PATRON_ONLY_ROUTES.includes(h)))
          setOpen(true)
        }}
        className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2 py-1 text-xs font-medium text-slate-600 transition hover:border-indigo-300 hover:text-indigo-600"
        title="Bu kullanıcının görebileceği menüleri düzenle"
      >
        <Icon name="filter" size={13} />
        Menüler
        <span className="rounded-full bg-indigo-50 px-1.5 text-[10px] font-semibold text-indigo-600">
          {menuler.length > 0 ? menuler.length : 'rol'}
        </span>
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-900/50 p-4 pt-14 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
              <div>
                <h3 className="text-base font-semibold text-slate-900">Menü Yetkileri</h3>
                <p className="text-xs text-slate-500">
                  {ad} · rol: {rol.replace('_', ' ')} — yalnızca işaretli menüler görünür
                </p>
              </div>
              <button onClick={() => setOpen(false)} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100">
                <Icon name="x" size={18} />
              </button>
            </div>

            <form action={kullaniciMenulerGuncelle} className="space-y-4 px-6 py-5">
              <input type="hidden" name="id" value={id} />
              <MenuSecimi rol={rol} selected={secili} onChange={setSecili} />

              <div className="flex items-center justify-between border-t border-slate-100 pt-4">
                <p className="text-xs text-slate-400">Hiçbir menü seçilmezse rolün varsayılanı uygulanır.</p>
                <div className="flex gap-2">
                  <button type="button" onClick={() => setOpen(false)} className="rounded-lg px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100">
                    Vazgeç
                  </button>
                  <button
                    type="submit"
                    className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-indigo-500"
                  >
                    Kaydet
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}