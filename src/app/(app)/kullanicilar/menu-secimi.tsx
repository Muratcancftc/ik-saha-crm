'use client'

import { NAV_GROUPS, PATRON_ONLY_ROUTES, roleMenuKeys } from '@/lib/permissions'
import type { Rol } from '@prisma/client'

type Props = {
  rol: Rol
  selected: string[]
  onChange: (next: string[]) => void
}

// Kullanıcıya özel menü seçimi (rolün varsayılanı üzerinden özelleştirilir).
export function MenuSecimi({ rol, selected, onChange }: Props) {
  const toggle = (href: string) => {
    onChange(selected.includes(href) ? selected.filter((h) => h !== href) : [...selected, href])
  }

  const toggleGrup = (grup: (typeof NAV_GROUPS)[number], acik: boolean) => {
    const grupHrefs = grup.items.map((i) => i.href)
    const tikl = new Set(selected)
    for (const h of grupHrefs) {
      if (rol !== 'patron' && PATRON_ONLY_ROUTES.includes(h)) continue
      if (acik) tikl.add(h)
      else tikl.delete(h)
    }
    onChange([...tikl])
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-slate-600">
          Menüler
          <span className="ml-1 font-normal text-slate-400">(hiçbiri seçilmezse rolün varsayılanı geçerli)</span>
        </p>
        <button
          type="button"
          onClick={() =>
            onChange(roleMenuKeys(rol).filter((h) => rol === 'patron' || !PATRON_ONLY_ROUTES.includes(h)))
          }
          className="text-xs font-medium text-indigo-600 hover:text-indigo-500"
        >
          Rol varsayılanına dön
        </button>
      </div>

      <div className="grid max-h-72 grid-cols-1 gap-3 overflow-y-auto rounded-xl border border-slate-200 bg-slate-50/60 p-3 sm:grid-cols-2">
        {NAV_GROUPS.map((g) => {
          const selectable = g.items.filter((i) => rol === 'patron' || !PATRON_ONLY_ROUTES.includes(i.href))
          const allOn = selectable.length > 0 && selectable.every((i) => selected.includes(i.href))
          const someOn = selectable.some((i) => selected.includes(i.href))
          return (
            <div key={g.label}>
              <label className="mb-1.5 flex cursor-pointer items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest text-slate-500">
                <input
                  type="checkbox"
                  checked={allOn}
                  ref={(el) => {
                    if (el) el.indeterminate = someOn && !allOn
                  }}
                  onChange={(e) => toggleGrup(g, e.target.checked)}
                />
                {g.label}
              </label>
              <div className="space-y-1">
                {g.items.map((item) => {
                  const patronOnly = rol !== 'patron' && PATRON_ONLY_ROUTES.includes(item.href)
                  return (
                    <label
                      key={item.href}
                      className={`flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1 text-sm transition hover:bg-white ${
                        patronOnly ? 'cursor-not-allowed opacity-45' : ''
                      }`}
                    >
                      <input
                        type="checkbox"
                        name="menuler"
                        value={item.href}
                        checked={selected.includes(item.href)}
                        disabled={patronOnly}
                        onChange={() => toggle(item.href)}
                        className="h-4 w-4 rounded border-slate-300 text-indigo-600 accent-indigo-600"
                      />
                      <span className="text-slate-700">{item.label}</span>
                      {patronOnly && <span className="ml-auto text-[10px] text-slate-400">yalnız patron</span>}
                    </label>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}