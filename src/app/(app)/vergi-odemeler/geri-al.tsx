'use client'

import { odenmediyeDon } from '@/app/actions/vergi'

export function GeriAlButon({ id }: { id: number }) {
  return (
    <form
      action={odenmediyeDon}
      onSubmit={(e) => {
        if (!window.confirm('Ödendi durumundan geri alınacak. Onaylıyor musunuz?')) e.preventDefault()
      }}
    >
      <input type="hidden" name="id" value={id} />
      <button className="rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-200" title="Ödenmediye dön">
        Geri Al
      </button>
    </form>
  )
}