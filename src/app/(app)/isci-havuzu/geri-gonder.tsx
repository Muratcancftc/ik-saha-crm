'use client'

import { isciAdayaGonder } from '@/app/actions/isci'
import { Icon } from '@/components/icons'

// İşçi havuzundaki işçiyi aday havuzuna geri gönder (onaylı silme davranışı)
export function GeriGonderButton({ id, ad }: { id: number; ad: string }) {
  return (
    <form
      action={isciAdayaGonder}
      onSubmit={(e) => {
        if (!window.confirm(`${ad} aday havuzuna geri gönderilsin mi? (İşçi pasife alınır, geçmişi korunur)`)) e.preventDefault()
      }}
    >
      <input type="hidden" name="id" value={id} />
      <button type="submit" className="rounded-lg p-1.5 text-slate-400 transition hover:bg-amber-50 hover:text-amber-600" title="Aday havuzuna geri gönder">
        <Icon name="chevron" size={16} className="rotate-180" />
      </button>
    </form>
  )
}